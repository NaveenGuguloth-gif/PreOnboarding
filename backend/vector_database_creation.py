import os
import re
import math
import glob
import argparse
import numpy as np

from typing import List, Dict

from pymilvus import (
    connections,
    Collection,
    CollectionSchema,
    FieldSchema,
    DataType,
    utility,
    db,
)

from backend.settings import settings
from backend.emb_model_loader import CustomAPIEmbeddings


# -----------------------------
# Embeddings Setup
# -----------------------------
embedding_url = f"{settings.allMini_emb_api}"

emb_model_obj = CustomAPIEmbeddings(
    api_url=embedding_url,
    model_name=settings.model_name_emb,
    key=settings.openai_api_key,
)


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embedding wrapper"""
    return emb_model_obj.embed_documents(texts)


# -----------------------------
# Text Chunking
# -----------------------------
def chunk_for_nodes(doc: str) -> List[str]:
    """
    Split PDF text into page-based chunks.
    """

    chunks = re.split(r"--- Page \d+ ---", doc)
    chunks = [c.strip() for c in chunks if c.strip()]

    formatted_chunks = []
    for chunk in chunks:
        formatted_chunks.append(chunk)

    return formatted_chunks


# -----------------------------
# Cleaning Utilities
# -----------------------------
def clean_text(text: str) -> str:
    text = text.replace("\uf0b4", "-")
    text = text.replace("·", "-")
    text = text.replace("\xa0", " ")
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    return text.strip()


MAX_CHARS = 800


def split_large_chunks(chunks: List[str]) -> List[str]:
    small_chunks = []

    for chunk in chunks:
        chunk = clean_text(chunk)

        if len(chunk) <= MAX_CHARS:
            small_chunks.append(chunk)
        else:
            lines = chunk.split("\n")
            temp = ""

            for line in lines:
                if len(temp) + len(line) + 1 > MAX_CHARS:
                    small_chunks.append(temp.strip())
                    temp = line
                else:
                    temp += "\n" + line

            if temp.strip():
                small_chunks.append(temp.strip())

    return small_chunks


# -----------------------------
# Milvus Setup
# -----------------------------
def ensure_collection(collection_name, embed_dim, metric, nlist):

    db_name = settings.vector_db_name
    user = settings.milvus_user
    password = settings.milvus_password
    port = settings.milvus_port

    print("DB:", db_name)
    print("Host:", settings.milvus_base)
    print("Port:", port)
    print("Collection:", collection_name)

    connections.connect(
        alias="default",
        db_name=db_name,
        host="172.22.95.31",
        port=port,
        user=user,
        password=password,
    )

    if utility.has_collection(collection_name):
        print(f"Dropping existing collection: {collection_name}")
        utility.drop_collection(collection_name)

    fields = [
        FieldSchema(
            name="doc_id",
            dtype=DataType.INT64,
            is_primary=True,
            auto_id=False,
        ),
        FieldSchema(
            name="text",
            dtype=DataType.VARCHAR,
            max_length=4000,
        ),
        FieldSchema(
            name="vector",
            dtype=DataType.FLOAT_VECTOR,
            dim=embed_dim,
        ),
    ]

    schema = CollectionSchema(
        fields,
        description="Document Embeddings Collection",
    )

    col = Collection(collection_name, schema=schema)

    index_params = {
        "index_type": "IVF_FLAT",
        "metric_type": metric,
        "params": {"nlist": nlist},
    }

    col.create_index(
        field_name="vector",
        index_params=index_params,
    )

    return col


# -----------------------------
# Ingestion Pipeline
# -----------------------------
def ingest_text_to_milvus(
    file_path,
    collection_name,
    embed_dim,
    metric,
    nlist,
    batch_size=5,
):

    # 1. Create / Reset Collection
    col = ensure_collection(
        collection_name,
        embed_dim,
        metric,
        nlist,
    )

    # 2. Load File
    if file_path.endswith(".pdf"):
        from PyPDF2 import PdfReader

        reader = PdfReader(file_path)
        doc = "\n".join(
            [
                page.extract_text()
                for page in reader.pages
                if page.extract_text()
            ]
        )
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            doc = f.read()

    if not doc.strip():
        raise RuntimeError("Empty document")

    # 3. Chunking
    formatted_chunks = chunk_for_nodes(doc)

    print(f"Raw chunks: {len(formatted_chunks)}")

    formatted_chunks = split_large_chunks(formatted_chunks)

    print(f"Clean chunks: {len(formatted_chunks)}")

    if not formatted_chunks:
        raise RuntimeError("No valid chunks after processing")

    # 4. Embedding
    all_vectors = []
    all_chunks = []

    num_batches = math.ceil(len(formatted_chunks) / batch_size)

    for i in range(num_batches):
        batch = formatted_chunks[
            i * batch_size : (i + 1) * batch_size
        ]

        vectors = embed_texts(batch)

        if len(vectors) != len(batch):
            batch = [c for c, v in zip(batch, vectors) if v]
            vectors = [v for v in vectors if v]

        all_chunks.extend(batch)
        all_vectors.extend(vectors)

    if not all_vectors:
        raise RuntimeError("Embedding failed completely")

    # 5. Insert into Milvus
    ids = list(range(1, len(all_chunks) + 1))

    col.insert([ids, all_chunks, all_vectors])
    col.flush()

    print(f"Inserted {len(all_chunks)} vectors")

    # 6. Load
    col.load()
    print("Collection loaded")


# -----------------------------
# CLI Runner
# -----------------------------
if __name__ == "__main__":

    files = glob.glob("*.txt")

    if not files:
        print("No files found")
        exit(1)

    print(f"Found {len(files)} files")

    embed_dim = 384
    metric = "L2"
    nlist = 128

    for file_path in files:
        print(f"\nProcessing: {file_path}")

        try:
            ingest_text_to_milvus(
                file_path=file_path,
                collection_name=settings.collection_name,
                embed_dim=embed_dim,
                metric=metric,
                nlist=nlist,
            )

        except Exception as e:
            print(f"Failed: {file_path} -> {e}")