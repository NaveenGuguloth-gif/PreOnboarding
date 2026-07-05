import logging
import pytz
import uuid
import os

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path

from pymongo import MongoClient, DESCENDING
from backend.settings import settings


# -----------------------------
# MongoDB Configuration
# -----------------------------
MONGO_URI = settings.MONGO_URI
DB_NAME = settings.DB_NAME
COLLECTION_NAME = settings.MONGO_COLLECTION_NAME

logger = logging.getLogger(__name__)
ist_timezone = pytz.timezone("Asia/Kolkata")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ismaster")

    db = client[DB_NAME]
    threads_collection = db[COLLECTION_NAME]

    # Indexes
    for coll in [threads_collection]:
        coll.create_index([("user_id", 1), ("updated_at", DESCENDING)])

    logger.info("Successfully connected to MongoDB and set up all collections.")

except Exception as e:
    logger.critical(f"Failed to connect to MongoDB: {e}", exc_info=True)
    client = None
    threads_collection = None


COLLECTIONS_MAP = {
    COLLECTION_NAME: threads_collection
}


# -----------------------------
# Time Utilities
# -----------------------------
def get_current_ist_datetime() -> datetime:
    """Returns current IST datetime."""
    return datetime.now(ist_timezone)


def parse_ist_str_to_datetime(ist_str: str) -> Optional[datetime]:
    try:
        return datetime.strptime(
            ist_str,
            "%Y/%m/%d %I:%M:%S %p"
        ).replace(tzinfo=ist_timezone)
    except (ValueError, TypeError):
        return None


def format_timestamp_to_ist_str(timestamp_input: Optional[Any]) -> Optional[str]:
    if timestamp_input is None:
        return None

    # Already formatted string
    if isinstance(timestamp_input, str):
        if " AM" in timestamp_input or " PM" in timestamp_input:
            return timestamp_input

        try:
            dt = datetime.fromisoformat(timestamp_input.replace("Z", "+00:00"))

            if dt.tzinfo is None:
                dt = pytz.utc.localize(dt)

            return dt.astimezone(ist_timezone).strftime(
                "%Y/%m/%d %I:%M:%S %p"
            )

        except (ValueError, TypeError):
            logger.warning(
                f"Unexpected timestamp string format: {timestamp_input}"
            )
            return timestamp_input

    # datetime object
    elif isinstance(timestamp_input, datetime):
        dt = timestamp_input

        if dt.tzinfo is None:
            dt = pytz.utc.localize(dt)

        return dt.astimezone(ist_timezone).strftime(
            "%Y/%m/%d %I:%M:%S %p"
        )

    else:
        logger.warning(f"Unsupported timestamp type: {type(timestamp_input)}")
        return str(timestamp_input)


# -----------------------------
# Thread Queries
# -----------------------------
def get_user_thread_list(user_id: str, collection_name: str) -> List[Dict[str, Any]]:
    target_collection = COLLECTIONS_MAP.get(collection_name)
    if target_collection is None:
        return []

    try:
        query_filter = {
            "user_id": user_id,
            "chat_deleted": {"$ne": True}
        }

        projection = {
            "id": 1,
            "title": 1,
            "updated_at": 1,
            "_id": 0
        }

        cursor = (
            target_collection.find(query_filter, projection)
            .sort("updated_at", DESCENDING)
        )

        thread_list = []

        for thread in cursor:
            if "updated_at" in thread:
                thread["last_updated"] = format_timestamp_to_ist_str(
                    thread.pop("updated_at")
                )

            thread_list.append(thread)

        return thread_list

    except Exception as e:
        logger.error(
            f"Error fetching threads for user {user_id}: {e}",
            exc_info=True
        )
        return []


def get_thread_by_id(
    thread_id: str,
    user_id: str,
    collection_name: str
) -> Optional[Dict[str, Any]]:

    target_collection = COLLECTIONS_MAP.get(collection_name)
    if target_collection is None:
        return None

    try:
        db_document = target_collection.find_one(
            {"id": thread_id, "user_id": user_id}
        )

        if not db_document:
            return None

        if collection_name == COLLECTION_NAME:
            return _transform_db_to_runtime_schema(db_document)

        logger.warning(
            f"No transformer for {collection_name}, returning raw"
        )
        return db_document

    except Exception as e:
        logger.error(
            f"Error fetching thread {thread_id}: {e}",
            exc_info=True
        )
        return None


# -----------------------------
# Thread Mutations
# -----------------------------
def mark_thread_as_deleted(thread_id: str, collection_name: str):
    target_collection = COLLECTIONS_MAP.get(collection_name)

    if target_collection is None:
        logger.error("Collection not found")
        return

    try:
        now = get_current_ist_datetime()

        update_payload = {
            "$set": {
                "chat_deleted": True,
                "updated_at": format_timestamp_to_ist_str(now)
            }
        }

        result = target_collection.update_one(
            {"id": thread_id},
            update_payload
        )

        if result.modified_count > 0:
            logger.info(f"Thread {thread_id} marked deleted")
        else:
            logger.warning(f"Thread {thread_id} not found")

    except Exception as e:
        logger.error(f"Delete error: {e}", exc_info=True)


def rename_thread_title(thread_id: str, collection_name: str, new_title: str):
    target_collection = COLLECTIONS_MAP.get(collection_name)

    if target_collection is None:
        return

    try:
        now = get_current_ist_datetime()

        update_payload = {
            "$set": {
                "title": new_title,
                "updated_at": format_timestamp_to_ist_str(now)
            }
        }

        result = target_collection.update_one(
            {"id": thread_id},
            update_payload
        )

        if result.modified_count > 0:
            logger.info(f"Renamed thread {thread_id}")
        else:
            logger.warning("Thread not found")

    except Exception as e:
        logger.error(f"Rename error: {e}", exc_info=True)


# -----------------------------
# DB → Runtime Transformer
# -----------------------------
def _transform_db_to_runtime_schema(db_document: Dict[str, Any]) -> Dict[str, Any]:
    flat_messages = []

    for turn in db_document.get("messages", []):

        user_ts = format_timestamp_to_ist_str(turn.get("user_timestamp"))
        asst_ts = format_timestamp_to_ist_str(turn.get("assistant_timestamp"))

        if turn.get("user_query"):
            flat_messages.append({
                "role": "user",
                "content": turn.get("user_query"),
                "client_message_id": turn.get("user_client_id"),
                "backend_message_id": turn.get("user_backend_id"),
                "timestamp": user_ts
            })

        if turn.get("assistant_response"):
            flat_messages.append({
                "role": "assistant",
                "content": turn.get("assistant_response"),
                "client_message_id": turn.get("assistant_client_id"),
                "backend_message_id": turn.get("assistant_backend_id"),
                "feedback": turn.get("feedback"),
                "timestamp": asst_ts
            })

    return {
        "id": db_document.get("id"),
        "title": db_document.get("title"),
        "last_updated": format_timestamp_to_ist_str(
            db_document.get("updated_at")
        ),
        "messages": flat_messages,
        "title_generated": db_document.get("title_generated", False),
    }


# -----------------------------
# Write Operations
# -----------------------------
def create_thread_in_db(thread_data: Dict[str, Any], collection_name: str):
    target_collection = COLLECTIONS_MAP.get(collection_name)
    if target_collection is None:
        return

    try:
        now = get_current_ist_datetime()

        thread_data["created_at"] = format_timestamp_to_ist_str(now)
        thread_data["last_updated"] = format_timestamp_to_ist_str(now)
        thread_data["updated_at"] = format_timestamp_to_ist_str(now)

        target_collection.insert_one(thread_data)

    except Exception as e:
        logger.error(f"Create thread error: {e}", exc_info=True)


def update_thread_field(
    thread_id: str,
    collection_name: str,
    field_updates: Dict[str, Any]
):
    target_collection = COLLECTIONS_MAP.get(collection_name)

    if target_collection is None:
        return

    try:
        field_updates["updated_at"] = format_timestamp_to_ist_str(
            get_current_ist_datetime()
        )

        target_collection.update_one(
            {"id": thread_id},
            {"$set": field_updates}
        )

    except Exception as e:
        logger.error(f"Update thread error: {e}", exc_info=True)


def add_turn_to_chat(thread_id: str, collection_name: str, turn_data: Dict):
    target_collection = COLLECTIONS_MAP.get(collection_name)

    if target_collection is None:
        return

    try:
        now = get_current_ist_datetime()

        turn_data["user_timestamp"] = format_timestamp_to_ist_str(now)
        turn_data["assistant_timestamp"] = format_timestamp_to_ist_str(now)

        update_payload = {
            "$push": {"messages": turn_data},
            "$set": {"updated_at": format_timestamp_to_ist_str(now)}
        }

        target_collection.update_one(
            {"id": thread_id},
            update_payload
        )

    except Exception as e:
        logger.error(f"Add turn error: {e}", exc_info=True)


def update_feedback_in_chat(
    thread_id: str,
    collection_name: str,
    message_id: str,
    feedback: Optional[str]
):
    target_collection = COLLECTIONS_MAP.get(collection_name)

    if target_collection is None:
        return

    try:
        query = {"id": thread_id}
        update = {"$set": {"messages.$[turn].feedback": feedback}}

        array_filters = [{"turn.assistant_backend_id": message_id}]

        result = target_collection.update_one(
            query,
            update,
            array_filters=array_filters
        )

        if result.matched_count == 0:
            array_filters = [{"turn.assistant_client_id": message_id}]
            target_collection.update_one(
                query,
                update,
                array_filters=array_filters
            )

    except Exception as e:
        logger.error(f"Feedback update error: {e}", exc_info=True)