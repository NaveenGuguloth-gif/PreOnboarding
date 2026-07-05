import logging
import asyncio
import json
import httpx
import os

from typing import List, Dict, AsyncGenerator, Optional, Tuple

from openai import OpenAI
from backend.settings import settings

from backend.emb_model_loader import CustomAPIEmbeddings
from backend.prompts.prompts_manager import PromptEngine


# -----------------------------
# Logger
# -----------------------------
logger = logging.getLogger(__name__)


# -----------------------------
# RAG + Model Setup
# -----------------------------
openai_api_base = settings.openai_api_base

embedding_url = f"{settings.allMini_emb_api}"

emb_model_obj = CustomAPIEmbeddings(
    api_url=embedding_url,
    model_name=settings.model_name_emb,
    key=settings.openai_api_key,
)

httpx_client = httpx.Client(verify=False)

model = settings.model_name_llm

openai_client = OpenAI(
    api_key=settings.openai_api_key,
    http_client=httpx_client,
    base_url=settings.openai_api_base,
)


# -----------------------------
# Constants
# -----------------------------
SYSTEM_PROMPT = (
    "You are a helpful AI assistant. Provide concise and accurate answers "
    "based on the conversation history."
)

TITLE_GENERATION_PROMPT = """Based on the following conversation, generate a short, concise title (4-5 words max).
Do not use any quotation marks or labels in your response. Just provide the title text.

CONVERSATION:

{conversation_text}
"""

HISTORY_LENGTH = 10
LLAMA_ENDPOINT_URL = f"{openai_api_base}/chat/completions"


# -----------------------------
# Retrieval (RAG)
# -----------------------------
async def _query_from_db(user_query: str, top_k: int = 3) -> list[str]:
    payload = {
        "query": user_query,
        "openai_api_key": settings.openai_api_key,
        "model_name_emb": settings.model_name_emb,
        "vector_db_name": settings.vector_db_name,
        "collection_name": settings.collection_name,
        "milvus_user": settings.milvus_user,
        "milvus_password": settings.milvus_password,
    }

    headers = {"Content-Type": "application/json"}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            settings.retrieval_api,
            json=payload,
            headers=headers,
        )

    result = response.json()

    docs = []

    # Prefer reranked nodes
    if "reranked_nodes" in result and isinstance(result["reranked_nodes"], list):
        docs = [
            node.get("document", {}).get("text", "")
            for node in result["reranked_nodes"][:top_k]
        ]

    # Fallback
    elif "retrieved_nodes" in result and isinstance(result["retrieved_nodes"], list):
        docs = result["retrieved_nodes"][:top_k]

    return docs


async def _get_prompt(instruction: str) -> str:
    db_response = await _query_from_db(instruction)

    if db_response:
        engine = PromptEngine("prompts/prompts.yaml")

        out1, merged_inputs1 = engine.render(
            template_name="generic_chatbot",
            template_key="TEMPLATE_1",
            runtime_inputs={"db_response": db_response},
        )

        return out1

    return "Not available"


# -----------------------------
# Streaming Core (HTTPX SSE)
# -----------------------------
async def _stream_response_httpx(
    endpoint_url: str,
    api_key: str,
    model: str,
    messages: List[Dict[str, str]],
    **kwargs,
) -> AsyncGenerator[Tuple[Optional[str], Optional[str]], None]:

    stream_id = (
        asyncio.current_task().get_name()
        if asyncio.current_task()
        else "unknown_stream"
    )

    logger.info(
        f"[{stream_id}] Starting HTTPX stream. Endpoint: {endpoint_url}, Model: {model}"
    )

    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        **kwargs,
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }

    if api_key and api_key != "EMPTY":
        headers["Authorization"] = f"Bearer {api_key}"

    chunk_count = 0

    try:
        async with httpx.AsyncClient(timeout=None, verify=False) as client:
            async with client.stream(
                "POST",
                endpoint_url,
                json=payload,
                headers=headers,
            ) as response:

                logger.info(
                    f"[{stream_id}] Status: {response.status_code}"
                )

                if response.status_code >= 400:
                    error_body = await response.aread()
                    logger.error(
                        f"[{stream_id}] Error {response.status_code}: "
                        f"{error_body.decode()}"
                    )
                    yield None, f"LLM API Error ({response.status_code})"
                    return

                async for line in response.aiter_lines():

                    if not line.startswith("data:"):
                        continue

                    data_json = line[len("data:"):].strip()

                    if data_json == "[DONE]":
                        logger.info(f"[{stream_id}] Stream complete.")
                        break

                    try:
                        item = json.loads(data_json)
                        choices = item.get("choices")

                        if choices:
                            content = choices[0].get("delta", {}).get("content")

                            if content:
                                chunk_count += 1
                                yield content, None

                    except json.JSONDecodeError:
                        yield None, "Failed to decode stream data."

                    except Exception as parse_exc:
                        logger.error(
                            f"[{stream_id}] Parse error: {parse_exc}",
                            exc_info=True,
                        )
                        yield None, f"Stream parse error: {parse_exc}"

        logger.info(
            f"[{stream_id}] Stream finished. Chunks: {chunk_count}"
        )

    except httpx.RequestError as e:
        logger.error(
            f"[{stream_id}] Connection error: {e}",
            exc_info=True,
        )
        yield None, f"Network error: {e}"

    except Exception as e:
        logger.error(
            f"[{stream_id}] Streaming error: {e}",
            exc_info=True,
        )
        yield None, f"Streaming error: {e}"


# -----------------------------
# Chat Completion (WS)
# -----------------------------
async def stream_llama_chat_completion_ws(
    text: str,
    history: List[Dict[str, str]],
) -> AsyncGenerator[Tuple[Optional[str], Optional[str]], None]:

    logger.info(
        f"WS completion started: '{text[:50]}...'"
    )

    model_to_use = model

    messages_to_send = history[-(HISTORY_LENGTH * 2):]

    if messages_to_send and messages_to_send[0]["role"] == "assistant":
        messages_to_send.pop(0)

    message_payload = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ] + messages_to_send

    if (
        not message_payload
        or message_payload[-1].get("content") != text
        or message_payload[-1].get("role") != "user"
    ):
        message_payload.append(
            {"role": "user", "content": text}
        )

    async for chunk, error in _stream_response_httpx(
        endpoint_url=LLAMA_ENDPOINT_URL,
        api_key=settings.openai_api_key,
        model=model_to_use,
        messages=message_payload,
        temperature=0.6,
        stop=["<|eot_id|>", "<|end_header_id|>"],
    ):
        yield chunk, error


# -----------------------------
# Title Generation
# -----------------------------
async def generate_chat_title(
    messages_for_title_generation: List[Dict[str, str]]
) -> Optional[str]:

    if not messages_for_title_generation:
        return None

    logger.info(
        f"Generating title from {len(messages_for_title_generation)} messages"
    )

    conversation_summary = "\n".join(
        f"{msg['role']}: {msg['content']}"
        for msg in messages_for_title_generation
    )

    prompt = TITLE_GENERATION_PROMPT.format(
        conversation_text=conversation_summary
    )

    try:
        completion = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=20,
            stream=False,
            stop=["\n"],
        )

        title = completion.choices[0].message.content.strip().strip('"').strip("'")

        if title:
            logger.info(f"Generated title: {title}")
            return title

        logger.warning("Empty title generated")
        return None

    except Exception as e:
        logger.error(
            f"Title generation failed: {e}",
            exc_info=True,
        )
        return None