from typing import List

import requests
from rich import print
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.settings import settings


# -----------------------------
# Pydantic Models
# -----------------------------
class EmbedRequest(BaseModel):
    texts: List[str]


class QueryRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


class QueryResponse(BaseModel):
    embedding: List[float]


# -----------------------------
# FastAPI App (optional usage layer)
# -----------------------------
app = FastAPI()


# -----------------------------
# Embedding Wrapper
# -----------------------------
class CustomAPIEmbeddings:
    """
    Wrapper around external embedding API
    """

    def __init__(self, api_url: str, model_name: str, key: str):
        self.model_name = model_name
        self.api_url = api_url
        self.key = key

        # all-MiniLM-L6-v2 dimension
        self.embedding_dimension = 384

    # -------------------------
    # Document Embedding
    # -------------------------
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        valid_texts = [t for t in texts if t and t.strip()]

        if not valid_texts:
            return []

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.key}",
        }

        payload = {
            "model": self.model_name,
            "input": valid_texts,
        }

        try:
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                verify=False,
            )

            response.raise_for_status()
            api_response_data = response.json()

            if isinstance(api_response_data, dict) and "data" in api_response_data:

                if not api_response_data["data"]:
                    print("[Warning] Empty embedding response.")
                    return []

                return [
                    item["embedding"]
                    for item in api_response_data["data"]
                ]

            raise ValueError(
                f"Unexpected response format: {api_response_data}"
            )

        except requests.RequestException as e:
            print(f"[Error] Embedding API request failed: {e}")
            return []

        except ValueError as e:
            print(f"[Error] Embedding parse error: {e}")
            return []

    # -------------------------
    # Query Embedding
    # -------------------------
    def embed_query(self, text: str) -> List[float]:
        embeddings = self.embed_documents([text])

        if embeddings:
            return embeddings[0]

        print(
            f"[Warning] Failed embedding for query: {text}"
        )

        return [0.0] * self.embedding_dimension