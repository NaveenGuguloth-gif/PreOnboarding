import json, logging, uuid, os, shutil, asyncio, httpx, base64, requests, re

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from pathlib import Path
from urllib.parse import urlencode

from backend.settings import settings

from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Query,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    Request,
    Response,
    FastAPI,
)

from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.DemoApp_service import (
    stream_llama_chat_completion_ws,
    HISTORY_LENGTH,
    generate_chat_title,
)

from backend import preonboarding_repository

from backend.db_manager import (
    get_user_thread_list,
    get_thread_by_id,
    create_thread_in_db,
    update_thread_field,
    add_turn_to_chat,
    update_feedback_in_chat,
    format_timestamp_to_ist_str,
    get_current_ist_datetime,
    mark_thread_as_deleted,
    rename_thread_title,
    COLLECTION_NAME as COLLECTION,
)

import inspect

# -----------------------------
# Global State
# -----------------------------
background_tasks: List[asyncio.Task] = []

session_id = "4654656565"  # dummy session to skip login page

active_sessions: dict[str, dict] = {
    session_id: {
        "user_id": "987456321",
        "username": "dummy_user.ttl",
        "full_name": "Dummy User",
        "domain": "tmindia",
    }
}

logger = logging.getLogger(__name__)

# -----------------------------
# FastAPI Setup
# -----------------------------
router = APIRouter(
    prefix="/" + settings.APP_NAME,
    tags=["DemoApp_template"],
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://neuroverse.tatamotors.com",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Demo App service now uses a domain-driven, separated MongoDB schema.")

STT_API_URL = settings.STT_API_URL
TTS_API_URL = settings.TTS_API_URL

MIN_TURNS_FOR_AUTO_TITLE = 2


# -----------------------------
# Title Generation
# -----------------------------
async def attempt_title_generation_and_notify(
    user_id_local: str,
    thread_id_local: str,
    websocket_local: Optional[WebSocket],
):
    thread_data = get_thread_by_id(thread_id_local, user_id_local, COLLECTION)

    messages_for_title = []

    if thread_data:
        active_source = next(
            (s for s in thread_data.get("sources", []) if s.get("main_chat_messages")),
            None,
        )

        if active_source:
            messages_for_title = active_source.get("main_chat_messages", [])
        else:
            messages_for_title = thread_data.get("messages", [])

    if (
        not thread_data
        or thread_data.get("title_generated", False)
        or len(messages_for_title) < (MIN_TURNS_FOR_AUTO_TITLE * 2)
    ):
        return

    logger.info(
        f"TitleGenTask: Attempting to generate title for thread {thread_id_local}."
    )

    new_title = await generate_chat_title(messages_for_title)

    if new_title and new_title.strip():
        updates = {"title": new_title.strip(), "title_generated": True}
        update_thread_field(thread_id_local, COLLECTION, updates)

        if websocket_local and websocket_local.client_state == websocket_local.client_state.CONNECTED:
            try:
                await websocket_local.send_json(
                    {
                        "type": "thread_title_updated",
                        "thread_id": thread_id_local,
                        "new_title": new_title.strip(),
                    }
                )
            except Exception as e:
                logger.error(f"TitleGenTask: Error sending title update: {e}")
    else:
        update_thread_field(thread_id_local, COLLECTION, {"title_generated": True})


# -----------------------------
# REST APIs
# -----------------------------
@app.post("/transcribe_audio")
async def transcribe_audio(session_id: str = Form(...), audio: UploadFile = File(...)):
    try:
        audio_bytes = await audio.read()

        async with httpx.AsyncClient(timeout=100, verify=False) as client:
            response = await client.post(
                f"{STT_API_URL}",
                data={"session_id": session_id},
                files={
                    "audio": (
                        audio.filename,
                        audio_bytes,
                        audio.content_type,
                    )
                },
            )

        response.raise_for_status()
        return JSONResponse(content=response.json())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT proxy failed: {e}")


@app.post("/text_to_speech")
async def text_to_speech(request: dict):
    try:
        async with httpx.AsyncClient(timeout=100, verify=False) as client:
            response = await client.post(
                f"{TTS_API_URL}",
                json=request,
            )

        response.raise_for_status()
        return JSONResponse(content=response.json())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS proxy failed: {e}")


# -----------------------------
# Streaming Core
# -----------------------------
async def stream_and_save_response(
    websocket: WebSocket,
    user_id: str,
    thread_id: str,
    user_input: str,
    client_msg_id: str,
    active_source_ids: Optional[List[str]],
):
    source_ids = active_source_ids or []

    thread_data = get_thread_by_id(thread_id, user_id, COLLECTION)
    if not thread_data:
        await websocket.send_json(
            {"type": "error", "content": "Thread not found."}
        )
        return

    history_for_llm = thread_data.get("messages", [])

    completion_generator = stream_llama_chat_completion_ws(
        user_input,
        [
            {"role": m["role"], "content": m["content"]}
            for m in history_for_llm[-(HISTORY_LENGTH * 2) :]
        ],
    )

    if not completion_generator:
        await websocket.send_json(
            {
                "type": "error",
                "content": "Could not initialize AI model.",
                "source_ids": source_ids,
            }
        )
        return

    full_bot_response = ""
    stream_successful = True

    bot_client_msg_id = f"bot_client_{uuid.uuid4()}"
    bot_backend_msg_id = f"bot_backend_{uuid.uuid4()}"

    try:
        first_chunk = True

        async for chunk, error in completion_generator:

            if error:
                stream_successful = False
                await websocket.send_json(
                    {"type": "error", "content": error, "source_ids": source_ids}
                )
                break

            if chunk:
                full_bot_response += chunk

                payload = {
                    "type": "content",
                    "content": chunk,
                    "thread_id": thread_id,
                    "source_ids": source_ids,
                }

                if first_chunk:
                    payload.update(
                        {
                            "client_message_id": bot_client_msg_id,
                            "backend_message_id": bot_backend_msg_id,
                        }
                    )
                    first_chunk = False

                await websocket.send_json(payload)

        await websocket.send_json(
            {
                "type": "stream_end",
                "thread_id": thread_id,
                "client_message_id": bot_client_msg_id,
                "source_ids": source_ids,
            }
        )

    except asyncio.CancelledError:
        stream_successful = False
        await websocket.send_json({"type": "stream_end", "cancelled": True})
        raise

    except Exception as e:
        stream_successful = False
        logger.error(f"Stream error: {e}", exc_info=True)

    finally:
        if stream_successful and full_bot_response:
            now_ist = get_current_ist_datetime()

            new_turn = {
                "user_query": user_input,
                "user_timestamp": now_ist,
                "user_client_id": client_msg_id,
                "user_backend_id": f"user_backend_{uuid.uuid4()}",
                "assistant_response": full_bot_response,
                "assistant_timestamp": now_ist,
                "assistant_client_id": bot_client_msg_id,
                "assistant_backend_id": bot_backend_msg_id,
                "feedback": None,
            }

            add_turn_to_chat(thread_id, COLLECTION, new_turn)

            task = asyncio.create_task(
                attempt_title_generation_and_notify(user_id, thread_id, websocket)
            )
            background_tasks.append(task)


# -----------------------------
# WebSocket Routes
# -----------------------------
@app.websocket("/health")
async def test_ws(ws: WebSocket):
    await ws.accept()
    await ws.send_text("hello")
    await ws.close()


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: Optional[str] = Query(None, alias="session_id"),
):
    await validate_and_accept_websocket(websocket, session_id)

    user_id = active_sessions[session_id]["user_id"]
    active_generation_task: Optional[asyncio.Task] = None

    try:
        await send_thread_list(websocket, user_id)

        while True:
            message_data = await receive_json_message(websocket)
            msg_type = message_data.get("type")

            handler = MESSAGE_HANDLERS.get(msg_type)

            if not handler:
                await websocket.send_json(
                    {
                        "type": "error",
                        "content": f"Unsupported message type: {msg_type}",
                        "original": message_data,
                    }
                )
                continue

            if msg_type in CANCEL_TASK_ON:
                active_generation_task = cancel_active_task(active_generation_task)

            if inspect.iscoroutinefunction(handler):
                result_task = await handler(websocket, user_id, message_data)
            else:
                result_task = handler(websocket, user_id, message_data)

            if result_task:
                active_generation_task = result_task

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {user_id}")

    except Exception as e:
        logger.error(f"Unhandled WS exception for {user_id}: {e}", exc_info=True)

    finally:
        cancel_active_task(active_generation_task)
        logger.info(f"WebSocket connection closed for {user_id}")


# -----------------------------
# Helper Functions
# -----------------------------
async def validate_and_accept_websocket(websocket: WebSocket, session_id: Optional[str]):
    if not session_id or session_id not in active_sessions:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise RuntimeError("Invalid session_id provided")

    await websocket.accept()


async def send_thread_list(websocket: WebSocket, user_id: str):
    threads = get_user_thread_list(user_id, COLLECTION)
    await websocket.send_json({"type": "history_list", "threads": threads})


async def receive_json_message(websocket: WebSocket) -> dict:
    data = await websocket.receive_text()
    return json.loads(data)


def cancel_active_task(task: Optional[asyncio.Task]):
    if task and not task.done():
        task.cancel()
    return None


# -----------------------------
# Message Handlers
# -----------------------------
async def handle_create_thread(websocket, user_id, _):
    new_id = str(uuid.uuid4())
    now = get_current_ist_datetime()
    timestamp = format_timestamp_to_ist_str(now)

    new_doc = {
        "id": new_id,
        "user_id": user_id,
        "title": "New Chat",
        "application_name": "Demo App",
        "messages": [],
        "created_at": timestamp,
        "last_updated": timestamp,
        "updated_at": timestamp,
        "title_generated": False,
        "chat_deleted": False,
    }

    create_thread_in_db(new_doc, COLLECTION)

    await websocket.send_json(
        {
            "type": "new_thread_created",
            "thread_id": new_id,
            "title": "New Chat",
        }
    )


async def handle_load_thread(websocket, user_id, data):
    thread_id = data.get("thread_id")

    if not thread_id:
        return

    thread_data = get_thread_by_id(thread_id, user_id, COLLECTION)

    if not thread_data:
        await websocket.send_json(
            {"type": "error", "content": "Thread not found"}
        )
        return

    payload = dict(thread_data)
    payload["type"] = "thread_content"
    payload["thread_id"] = thread_id

    await websocket.send_json(payload)


async def handle_delete_thread(websocket, user_id, data):
    thread_id = data.get("thread_id")

    if thread_id:
        mark_thread_as_deleted(thread_id, COLLECTION)

        await websocket.send_json(
            {"type": "thread_deleted", "thread_id": thread_id}
        )


async def handle_rename_thread(websocket, user_id, data):
    thread_id = data.get("thread_id")
    new_title = data.get("new_title")

    if thread_id and new_title:
        rename_thread_title(thread_id, COLLECTION, new_title)

        await websocket.send_json(
            {
                "type": "thread_title_updated",
                "thread_id": thread_id,
                "new_title": new_title,
            }
        )


def handle_send_message(websocket, user_id, data):
    user_input = data.get("user_input")
    thread_id = data.get("thread_id")
    client_msg_id = data.get("client_message_id")
    active_source_ids = data.get("active_source_ids")

    if not all([user_input, thread_id, client_msg_id]):
        return None

    task = asyncio.create_task(
        stream_and_save_response(
            websocket,
            user_id,
            thread_id,
            user_input,
            client_msg_id,
            active_source_ids,
        )
    )

    background_tasks.append(task)
    return task


def handle_message_feedback(websocket, user_id, data):
    thread_id = data.get("thread_id")
    msg_id = data.get("message_id")
    feedback = data.get("feedback")

    if thread_id and msg_id:
        update_feedback_in_chat(thread_id, COLLECTION, msg_id, feedback)


# -----------------------------
# Handler Registry
# -----------------------------
MESSAGE_HANDLERS = {
    "create_new_thread": handle_create_thread,
    "load_thread": handle_load_thread,
    "delete_thread": handle_delete_thread,
    "rename_thread": handle_rename_thread,
    "send_message": handle_send_message,
    "message_feedback": handle_message_feedback,
}

CANCEL_TASK_ON = {
    "create_new_thread",
    "load_thread",
    "send_message",
}



from pydantic import BaseModel
from fastapi import Depends, Cookie
from jose import jwt
from bson import ObjectId
from backend.auth_manager import (
    users_collection, hash_password, verify_password,
    create_access_token, decode_access_token,
)

class SignupData(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    accountType: Optional[str] = None
    employeeId: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = ""
    location: Optional[str] = ""
    joiningDate: Optional[str] = None

class LoginData(BaseModel):
    identifier: str
    password: str
    role: str  # "employee" | "hr"

OAUTH_PROVIDERS = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
        "client_id": lambda: settings.GOOGLE_CLIENT_ID,
        "client_secret": lambda: settings.GOOGLE_CLIENT_SECRET,
    },
    "microsoft": {
        "authorize_url": lambda: f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize",
        "token_url": lambda: f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token",
        "userinfo_url": "https://graph.microsoft.com/oidc/userinfo",
        "scope": "openid email profile User.Read",
        "client_id": lambda: settings.MICROSOFT_CLIENT_ID,
        "client_secret": lambda: settings.MICROSOFT_CLIENT_SECRET,
    },
    "github": {
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "emails_url": "https://api.github.com/user/emails",
        "scope": "read:user user:email",
        "client_id": lambda: settings.GITHUB_CLIENT_ID,
        "client_secret": lambda: settings.GITHUB_CLIENT_SECRET,
    },
}


def _oauth_redirect_uri(provider: str) -> str:
    return f"{settings.BACKEND_URL.rstrip('/')}/api/auth/oauth/{provider}/callback"


def _provider_url(provider: Dict[str, Any], key: str) -> str:
    value = provider[key]
    return value() if callable(value) else value


def _oauth_client_config(provider_name: str) -> Dict[str, Any]:
    provider = OAUTH_PROVIDERS.get(provider_name)
    if not provider:
        raise HTTPException(status_code=404, detail="Unsupported OAuth provider")
    client_id = provider["client_id"]()
    client_secret = provider["client_secret"]()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=503,
            detail=f"{provider_name.title()} OAuth is not configured on the server.",
        )
    return {**provider, "client_id_value": client_id, "client_secret_value": client_secret}


def _frontend_auth_redirect(status_value: str, role: str = "employee", message: str = "") -> str:
    params = {"status": status_value, "role": role}
    if message:
        params["message"] = message
    return f"{settings.FRONTEND_URL.rstrip('/')}/auth/oauth/callback?{urlencode(params)}"


def _public_auth_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(user.get("_id") or user.get("id")),
        "email": user.get("email"),
        "full_name": user.get("full_name") or user.get("name") or user.get("email"),
        "name": user.get("full_name") or user.get("name") or user.get("email"),
        "role": user.get("role", "employee"),
        "user_type": user.get("role", "employee"),
        "userType": user.get("role", "employee"),
        "employee_id": user.get("employee_id"),
        "employeeId": user.get("employee_id"),
        "department": user.get("department"),
        "location": user.get("location"),
        "designation": user.get("designation"),
        "joining_date": user.get("joining_date"),
        "joiningDate": user.get("joining_date"),
        "auth_provider": user.get("auth_provider"),
        "authProvider": user.get("auth_provider"),
    }


def _create_oauth_state(provider: str, role: str, mode: str) -> str:
    payload = {
        "provider": provider,
        "role": "hr" if role == "hr" else "employee",
        "mode": "signup" if mode == "signup" else "login",
        "nonce": uuid.uuid4().hex,
        "exp": datetime.now(timezone.utc).replace(microsecond=0) + timedelta(minutes=10),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _decode_oauth_state(state: str) -> Dict[str, Any]:
    return jwt.decode(state, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def _find_user_by_id(user_id: str):
    if users_collection is None:
        return None
    try:
        return users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return users_collection.find_one({"_id": user_id})


def _upsert_oauth_user(provider_name: str, role: str, profile: Dict[str, Any]) -> Dict[str, Any]:
    if users_collection is None:
        raise HTTPException(status_code=503, detail="User database is not available")

    email = profile.get("email")
    provider_user_id = str(profile.get("sub") or profile.get("id") or "")
    if not email:
        raise HTTPException(status_code=400, detail="OAuth provider did not return a verified email")

    full_name = profile.get("name") or profile.get("login") or email.split("@")[0]
    query = {
        "$or": [
            {"email": email},
            {"oauth_accounts.provider": provider_name, "oauth_accounts.provider_user_id": provider_user_id},
        ]
    }
    existing = users_collection.find_one(query)
    oauth_account = {
        "provider": provider_name,
        "provider_user_id": provider_user_id,
        "email": email,
        "linked_at": datetime.now(timezone.utc),
    }

    if existing:
        users_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "email": existing.get("email") or email,
                    "full_name": existing.get("full_name") or full_name,
                    "role": existing.get("role") or role,
                    "auth_provider": provider_name,
                    "updated_at": datetime.now(timezone.utc),
                },
                "$addToSet": {"oauth_accounts": oauth_account},
            },
        )
        return users_collection.find_one({"_id": existing["_id"]})

    user_doc = {
        "email": email,
        "full_name": full_name,
        "role": role,
        "auth_provider": provider_name,
        "oauth_accounts": [oauth_account],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = users_collection.insert_one(user_doc)
    return users_collection.find_one({"_id": result.inserted_id})


async def _fetch_github_email(access_token: str) -> Optional[str]:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            OAUTH_PROVIDERS["github"]["emails_url"],
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        )
    if response.status_code >= 400:
        return None
    emails = response.json()
    primary = next((item for item in emails if item.get("primary") and item.get("verified")), None)
    verified = next((item for item in emails if item.get("verified")), None)
    return (primary or verified or {}).get("email")


@app.get("/api/auth/oauth/{provider_name}/start")
def oauth_start(provider_name: str, role: str = "employee", mode: str = "login"):
    provider_name = provider_name.lower()
    provider = _oauth_client_config(provider_name)
    state = _create_oauth_state(provider_name, role, mode)
    params = {
        "client_id": provider["client_id_value"],
        "redirect_uri": _oauth_redirect_uri(provider_name),
        "response_type": "code",
        "scope": provider["scope"],
        "state": state,
    }
    if provider_name == "google":
        params["access_type"] = "online"
        params["prompt"] = "select_account"
    return RedirectResponse(f"{_provider_url(provider, 'authorize_url')}?{urlencode(params)}")


@app.get("/api/auth/oauth/{provider_name}/callback")
async def oauth_callback(provider_name: str, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    provider_name = provider_name.lower()
    role = "employee"

    try:
        if error:
            return RedirectResponse(_frontend_auth_redirect("error", role, error))
        if not code or not state:
            return RedirectResponse(_frontend_auth_redirect("error", role, "Missing OAuth callback data"))

        state_payload = _decode_oauth_state(state)
        if state_payload.get("provider") != provider_name:
            return RedirectResponse(_frontend_auth_redirect("error", role, "Invalid OAuth state"))

        role = "hr" if state_payload.get("role") == "hr" else "employee"
        provider = _oauth_client_config(provider_name)
        token_payload = {
            "client_id": provider["client_id_value"],
            "client_secret": provider["client_secret_value"],
            "code": code,
            "redirect_uri": _oauth_redirect_uri(provider_name),
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            token_response = await client.post(
                _provider_url(provider, "token_url"),
                data=token_payload,
                headers={"Accept": "application/json"},
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            if not access_token:
                return RedirectResponse(_frontend_auth_redirect("error", role, "OAuth token exchange failed"))

            profile_response = await client.get(
                provider["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            )
            profile_response.raise_for_status()
            profile = profile_response.json()

        if provider_name == "github" and not profile.get("email"):
            profile["email"] = await _fetch_github_email(access_token)

        user = _upsert_oauth_user(provider_name, role, profile)
        app_token = create_access_token(str(user["_id"]))
        response = RedirectResponse(_frontend_auth_redirect("success", role))
        response.set_cookie("access_token", app_token, httponly=True, samesite="lax")
        return response
    except Exception as exc:
        logger.exception("OAuth callback failed for %s", provider_name)
        return RedirectResponse(_frontend_auth_redirect("error", role, str(exc)))

@app.post("/api/auth/signup")
def signup(data: SignupData):
    if users_collection is None:
        raise HTTPException(status_code=503, detail="User database is not available")
    if users_collection.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    role = data.role or data.accountType or "employee"
    full_name = data.full_name or data.name or data.email.split("@")[0]
    user_doc = {
        "email": data.email,
        "full_name": full_name,
        "password_hash": hash_password(data.password),
        "role": role,
        "employee_id": data.employeeId,
        "designation": data.designation,
        "department": data.department,
        "location": data.location,
        "joining_date": data.joiningDate,
    }
    result = users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)
    if role == "employee":
        try:
            hr_repository.create_candidate(
                {
                    "id": user_id,
                    "name": full_name,
                    "email": data.email,
                    "employee_id": data.employeeId or f"EMP-{user_id[-6:]}",
                    "department": data.department or "",
                    "designation": data.designation or "",
                    "role": data.designation or "",
                    "location": data.location or "",
                    "joining_date": data.joiningDate or datetime.now(timezone.utc).date().isoformat(),
                    "profile_completion": 0,
                    "document_completion": 0,
                    "learning_progress": 0,
                    "readiness_score": 0,
                    "current_stage": "Registered",
                }
            )
        except Exception:
            logger.exception("Failed to create HR candidate row for new signup")
    token = create_access_token(str(result.inserted_id))
    response = JSONResponse({
        "user": {
            "id": user_id,
            "email": data.email,
            "full_name": full_name,
            "role": role,
            "employee_id": data.employeeId,
            "department": data.department,
            "location": data.location,
            "joining_date": data.joiningDate,
        }
    })
    response.set_cookie("access_token", token, httponly=True)
    return response


@app.post("/api/auth/login")
def login(data: LoginData):
    if users_collection is None:
        raise HTTPException(status_code=503, detail="User database is not available")
    user = users_collection.find_one({"email": data.identifier})

    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get("role") != data.role:
        raise HTTPException(
            status_code=403,
            detail=f"This account is not registered as {data.role}."
        )

    token = create_access_token(str(user["_id"]))
    response = JSONResponse({"user": _public_auth_user(user)})
    response.set_cookie("access_token", token, httponly=True)
    return response

@app.get("/api/auth/me")
def me(access_token: str = Cookie(None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(access_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = _find_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"user": _public_auth_user(user)}


@app.post("/api/auth/logout")
def logout():
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie("access_token")
    return response


def _current_auth_user(access_token: str = Cookie(None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(access_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = _find_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _require_role(required_role: str):
    def dependency(user: Dict[str, Any] = Depends(_current_auth_user)):
        if user.get("role") != required_role:
            raise HTTPException(status_code=403, detail=f"{required_role.upper()} access required")
        return user
    return dependency


def _auth_user_id(user: Dict[str, Any]) -> str:
    return str(user.get("_id") or user.get("id") or "")


def _assert_candidate_access(candidate_id: str, user: Dict[str, Any]):
    if user.get("role") == "hr":
        return
    if candidate_id != _auth_user_id(user):
        raise HTTPException(status_code=403, detail="You can access only your own onboarding data")


@app.get("/api/candidate/me")
def get_candidate_me(user: Dict[str, Any] = Depends(_current_auth_user)):
    return {"user": _public_auth_user(user)}


@app.get("/api/candidate/metrics")
def get_candidate_metrics(user: Dict[str, Any] = Depends(_current_auth_user)):
    candidate_id = str(user.get("_id") or user.get("id"))
    try:
        status_doc = preonboarding_repository.build_onboarding_status(candidate_id, persist=True)
        candidate = hr_repository.get_candidate(candidate_id) or {}
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)

    joining_date = status_doc.get("joiningDate") or candidate.get("joining_date") or user.get("joining_date")
    days_remaining = 0
    if joining_date:
        days_remaining = max(0, (datetime.fromisoformat(joining_date).date() - datetime.now(timezone.utc).date()).days)
    return {
        **status_doc,
        "profileCompletion": status_doc.get("profileCompletion", 0),
        "documentCompletion": status_doc.get("documentCompletion", 0),
        "learningCompletion": status_doc.get("learningCompletion", 0),
        "readinessScore": status_doc.get("readinessScore", 0),
        "daysRemaining": days_remaining,
        "teamAssignment": candidate.get("team_assignment"),
        "welcomeKitAssignment": (status_doc.get("welcomeKit") or {}).get("items", {}),
    }


@app.patch("/api/candidate/profile")
def update_candidate_profile(data: Dict[str, Any], user: Dict[str, Any] = Depends(_current_auth_user)):
    candidate_id = str(user.get("_id") or user.get("id"))
    profile_sections = data.get("profileSections") or data.get("profile_sections")
    update: Dict[str, Any] = {k: v for k, v in data.items() if k not in {"profileSections", "profile_sections"}}
    if "welcome_kit_assignment" in update:
        allowed_kit_items = {"employee_id", "official_email", "laptop"}
        kit_items = update.get("welcome_kit_assignment") or {}
        update["welcome_kit_assignment"] = {
            item_id: bool(kit_items.get(item_id))
            for item_id in allowed_kit_items
        }
        confirmed_count = sum(1 for value in update["welcome_kit_assignment"].values() if value)
        update["welcomeKit"] = {
            "status": "received" if confirmed_count == len(allowed_kit_items) else ("partially_received" if confirmed_count else "not_confirmed"),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "items": update["welcome_kit_assignment"],
        }
    if profile_sections:
        completed = sum(1 for value in profile_sections.values() if value)
        total = max(1, len(profile_sections))
        update["profile_sections"] = profile_sections
        update["profile_completion"] = round((completed / total) * 100)
    elif "profile_completion" not in update:
        update["profile_completion"] = 100
    try:
        candidate = hr_repository.update_candidate(candidate_id, update)
        status_doc = preonboarding_repository.build_onboarding_status(candidate_id, persist=True, last_activity="Profile updated")
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)
    return {"candidate": candidate, "status": status_doc}


@app.get("/api/candidate/peers")
def list_candidate_peers(user: Dict[str, Any] = Depends(_current_auth_user)):
    current_id = str(user.get("_id") or user.get("id") or "")
    current_email = str(user.get("email") or "").lower()
    try:
        candidates = hr_repository.list_candidates(sort="name", order="asc", page=1, limit=1000)["candidates"]
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)

    peers = []
    for candidate in candidates:
        candidate_id = str(candidate.get("id") or "")
        candidate_email = str(candidate.get("email") or "").lower()
        if candidate_id == current_id or (current_email and candidate_email == current_email):
            continue
        peers.append({
            "id": candidate.get("id"),
            "name": candidate.get("name"),
            "email": candidate.get("email"),
            "employee_id": candidate.get("employee_id"),
            "department": candidate.get("department"),
            "role": candidate.get("role") or candidate.get("designation"),
            "location": candidate.get("location"),
            "joining_date": candidate.get("joining_date"),
            "current_stage": candidate.get("current_stage") or candidate.get("status"),
            "readiness_score": candidate.get("readiness_score", 0),
        })
    return {"peers": peers}


# -----------------------------
# HR Candidate Management APIs
# -----------------------------
from backend import hr_repository


class CandidateCreateData(BaseModel):
    name: str
    email: str
    employee_id: str
    department: str
    joining_date: str
    phone: Optional[str] = ""
    designation: Optional[str] = ""
    role: Optional[str] = ""
    location: Optional[str] = ""
    hr_status: Optional[str] = "In Progress"
    manager_status: Optional[str] = "Pending"
    learning_progress: Optional[int] = 0
    document_completion: Optional[int] = 0
    profile_completion: Optional[int] = 0
    readiness_score: Optional[int] = 0
    welcome_kit_assignment: Optional[Dict[str, Any]] = None


class CandidateUpdateData(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    joining_date: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    hr_status: Optional[str] = None
    manager_status: Optional[str] = None
    learning_progress: Optional[int] = None
    document_completion: Optional[int] = None
    profile_completion: Optional[int] = None
    readiness_score: Optional[int] = None
    current_stage: Optional[str] = None
    last_activity: Optional[str] = None
    team_assignment: Optional[Dict[str, Any]] = None
    welcome_kit_assignment: Optional[Dict[str, Any]] = None
    welcomeKit: Optional[Dict[str, Any]] = None


def _mongo_unavailable_response(exc: Exception):
    logger.error(f"HR API unavailable: {exc}", exc_info=True)
    raise HTTPException(
        status_code=503,
        detail="MongoDB is not available. HR APIs require a live database connection.",
    )


@app.get("/api/hr/candidates")
def list_hr_candidates(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    joining_window: Optional[str] = Query(None),
    readiness_min: Optional[int] = Query(None, ge=0, le=100),
    readiness_max: Optional[int] = Query(None, ge=0, le=100),
    sort: str = Query("joining_date"),
    order: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    user: Dict[str, Any] = Depends(_require_role("hr")),
):
    try:
        return hr_repository.list_candidates(
            search=search,
            department=department,
            location=location,
            status=status,
            joining_window=joining_window,
            readiness_min=readiness_min,
            readiness_max=readiness_max,
            sort=sort,
            order=order,
            page=page,
            limit=limit,
        )
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)


@app.get("/api/hr/analytics")
def get_hr_analytics(user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        return hr_repository.analytics()
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)


@app.get("/api/hr/candidates/{candidate_id}")
def get_hr_candidate(candidate_id: str, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        candidate = hr_repository.get_candidate(candidate_id)
        status_doc = preonboarding_repository.build_onboarding_status(candidate_id, persist=True) if candidate else {}
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate = {**candidate, **status_doc}
    return {
        "candidate": candidate,
        "documents": status_doc.get("documents", []),
        "learning": status_doc.get("learning", []),
        "tasks": status_doc.get("tasks", []),
        "notifications": status_doc.get("notifications", []),
        "onboardingStatus": status_doc,
    }


@app.get("/api/onboarding/status/{candidate_id}")
def get_onboarding_status(candidate_id: str, user: Dict[str, Any] = Depends(_current_auth_user)):
    _assert_candidate_access(candidate_id, user)
    try:
        candidate = hr_repository.get_candidate(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return {"status": preonboarding_repository.build_onboarding_status(candidate_id, persist=True)}
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)


@app.get("/api/hr/candidates/{candidate_id}/documents/{requirement_id}/download")
def download_hr_candidate_document(
    candidate_id: str,
    requirement_id: str,
    user: Dict[str, Any] = Depends(_current_auth_user),
):
    _assert_candidate_access(candidate_id, user)
    try:
        submission = preonboarding_repository.candidate_document_file(candidate_id, requirement_id)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not submission or not submission.get("file_path") or not Path(submission["file_path"]).exists():
        raise HTTPException(status_code=404, detail="Document file not found")
    preonboarding_repository.audit(_auth_user_id(user), "view", "document", requirement_id, {"candidate_id": candidate_id})
    return FileResponse(
        submission["file_path"],
        filename=submission.get("file_name") or "document",
        media_type=submission.get("content_type") or "application/octet-stream",
    )


@app.post("/api/hr/candidates", status_code=201)
def create_hr_candidate(data: CandidateCreateData, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        candidate = hr_repository.create_candidate(data.dict())
        status_doc = preonboarding_repository.build_onboarding_status(candidate["id"], persist=True)
        return {"candidate": {**candidate, **status_doc}}
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)


@app.patch("/api/hr/candidates/{candidate_id}")
def update_hr_candidate(candidate_id: str, data: CandidateUpdateData, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        payload = data.dict(exclude_unset=True)
        payload.pop("welcome_kit_assignment", None)
        payload.pop("welcomeKit", None)
        candidate = hr_repository.update_candidate(candidate_id, payload)
        preonboarding_repository.audit(_auth_user_id(user), "update", "candidate", candidate_id, payload)
        status_doc = preonboarding_repository.build_onboarding_status(
            candidate_id,
            persist=True,
            last_activity=payload.get("last_activity", "Candidate updated"),
        ) if candidate else {}
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"candidate": {**candidate, **status_doc}}


@app.delete("/api/hr/candidates/{candidate_id}")
def delete_hr_candidate(candidate_id: str, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        deleted = hr_repository.delete_candidate(candidate_id)
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)

    if not deleted:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"ok": True}


REMINDER_MESSAGE = (
    "Your joining date is coming soon. Please complete your pending onboarding activities, "
    "including profile details, document upload, learning modules, and readiness tasks before your joining date."
)


@app.post("/api/hr/candidates/{candidate_id}/notify")
def notify_hr_candidate(candidate_id: str, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        candidate = hr_repository.notify_candidate(candidate_id, REMINDER_MESSAGE)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        preonboarding_repository.create_notification(
            candidate_id,
            "Joining date reminder",
            REMINDER_MESSAGE,
            "in_app,email",
        )
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)
    return {"ok": True, "candidate": candidate}


# -----------------------------
# Pre-Onboarding Enterprise APIs
# -----------------------------


class DepartmentData(BaseModel):
    name: str
    manager_name: Optional[str] = ""
    department_hr: Optional[str] = ""


class DocumentRequirementData(BaseModel):
    name: str
    mandatory: Optional[bool] = True
    department: Optional[str] = None
    role: Optional[str] = None
    due_days_before_joining: Optional[int] = 7
    reminder_days: Optional[int] = 3
    max_file_size_mb: Optional[int] = 10
    accepted_formats: Optional[List[str]] = None
    approval_required: Optional[bool] = True


class DocumentReviewData(BaseModel):
    status: str
    comments: Optional[str] = ""


class DocumentRetryData(BaseModel):
    candidate_id: Optional[str] = "demo"


class LearningProgressData(BaseModel):
    moduleId: str
    progress: int
    candidate_id: Optional[str] = "demo"


class NotificationData(BaseModel):
    user_id: str
    title: str
    message: str
    channel: Optional[str] = "in_app"


class TaskUpdateData(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    version: Optional[str] = None
    uploaded_by: Optional[str] = None
    expiry_date: Optional[str] = None
    mandatory: Optional[bool] = None
    visibility: Optional[str] = None
    status: Optional[str] = None
    content_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    link_url: Optional[str] = None


LEARNING_CONTENT_TYPES = {"video", "pdf", "image", "link"}


class RelocationSearchData(BaseModel):
    location: Optional[str] = ""
    destination_city: Optional[str] = ""
    office_location: Optional[str] = ""
    max_distance_km: Optional[float] = None
    monthly_budget: Optional[str] = ""
    profile_type: Optional[str] = ""
    transport_preference: Optional[str] = ""
    preferences: Optional[str] = ""
    city: Optional[str] = ""


class AssistantChatData(BaseModel):
    message: str
    candidate_id: Optional[str] = "demo"
    history: Optional[List[Dict[str, str]]] = []


def _enterprise_unavailable_response(exc: Exception):
    logger.error(f"Enterprise API unavailable: {exc}", exc_info=True)
    raise HTTPException(
        status_code=503,
        detail="MongoDB is not available. This endpoint requires a live database connection.",
    )


@app.get("/api/hr/departments")
def list_departments(user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        return {"departments": preonboarding_repository.list_departments()}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.post("/api/hr/departments", status_code=201)
def create_department(data: DepartmentData, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        return {"department": preonboarding_repository.create_department(data.dict())}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.patch("/api/hr/departments/{department_id}")
def update_department(department_id: str, data: DepartmentData, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        department = preonboarding_repository.update_department(department_id, data.dict(exclude_unset=True))
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"department": department}


@app.delete("/api/hr/departments/{department_id}")
def delete_department(department_id: str, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        deleted = preonboarding_repository.delete_department(department_id)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not deleted:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"ok": True}


@app.get("/api/hr/departments/{department_name}/candidates")
def list_department_candidates(department_name: str, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        return hr_repository.list_candidates(department=department_name)
    except RuntimeError as exc:
        _mongo_unavailable_response(exc)


@app.get("/api/hr/tasks")
def list_tasks(
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(_require_role("hr")),
):
    try:
        return {"tasks": preonboarding_repository.list_tasks(department=department, status=status)}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.post("/api/hr/tasks", status_code=201)
def create_task(
    title: str = Form(...),
    description: str = Form(""),
    department: str = Form("All"),
    version: str = Form("1.0"),
    uploaded_by: str = Form("HR"),
    expiry_date: Optional[str] = Form(None),
    mandatory: bool = Form(False),
    visibility: str = Form("employees"),
    status: str = Form("published"),
    content_type: str = Form("video"),
    duration_minutes: int = Form(15),
    link_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user: Dict[str, Any] = Depends(_require_role("hr")),
):
    try:
        if content_type not in LEARNING_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Learning content type must be video, pdf, image, or link.")
        task = preonboarding_repository.create_task(
            {
                "title": title,
                "description": description,
                "department": department,
                "version": version,
                "uploaded_by": uploaded_by,
                "expiry_date": expiry_date,
                "mandatory": mandatory,
                "visibility": visibility,
                "status": status,
                "content_type": content_type,
                "duration_minutes": duration_minutes,
                "link_url": link_url,
            },
            file,
        )
        return {"task": task}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.patch("/api/hr/tasks/{task_id}")
def update_task(task_id: str, data: TaskUpdateData, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        payload = data.dict(exclude_unset=True)
        if payload.get("content_type") and payload["content_type"] not in LEARNING_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Learning content type must be video, pdf, image, or link.")
        task = preonboarding_repository.update_task(task_id, payload)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task": task}


@app.delete("/api/hr/tasks/{task_id}")
def delete_task(task_id: str, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        deleted = preonboarding_repository.delete_task(task_id)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}


@app.get("/api/learning/modules")
def list_employee_learning_modules(
    candidate_id: str = Query("demo"),
    user: Dict[str, Any] = Depends(_current_auth_user),
):
    _assert_candidate_access(candidate_id, user)
    try:
        return {"modules": preonboarding_repository.build_onboarding_status(candidate_id, persist=True).get("learning", [])}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.get("/api/learning/modules/{task_id}/download")
def download_learning_module(task_id: str, user: Dict[str, Any] = Depends(_current_auth_user)):
    try:
        task = next((item for item in preonboarding_repository.list_tasks() if item["id"] == task_id), None)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not task or not task.get("file_path") or not Path(task["file_path"]).exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(task["file_path"], filename=task.get("file_name"))


@app.post("/api/learning/progress")
def update_learning_progress(data: LearningProgressData, user: Dict[str, Any] = Depends(_current_auth_user)):
    _assert_candidate_access(data.candidate_id or "demo", user)
    try:
        progress = preonboarding_repository.update_learning_progress(data.candidate_id or "demo", data.moduleId, data.progress)
        status_doc = preonboarding_repository.build_onboarding_status(
            data.candidate_id or "demo",
            persist=True,
            last_activity="Learning progress updated",
        )
        return {"progress": progress, "status": status_doc}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.get("/api/hr/document-requirements")
def list_document_requirements(user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        return {"requirements": preonboarding_repository.list_document_requirements()}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.post("/api/hr/document-requirements", status_code=201)
def create_document_requirement(data: DocumentRequirementData, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        return {"requirement": preonboarding_repository.create_document_requirement(data.dict(exclude_none=True))}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.patch("/api/hr/document-requirements/{requirement_id}")
def update_document_requirement(requirement_id: str, data: DocumentRequirementData, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        requirement = preonboarding_repository.update_document_requirement(requirement_id, data.dict(exclude_unset=True))
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not requirement:
        raise HTTPException(status_code=404, detail="Document requirement not found")
    return {"requirement": requirement}


@app.delete("/api/hr/document-requirements/{requirement_id}")
def delete_document_requirement(requirement_id: str, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        deleted = preonboarding_repository.delete_document_requirement(requirement_id)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document requirement not found")
    return {"ok": True}


@app.get("/api/documents")
def list_candidate_documents(candidate_id: str = Query(...), user: Dict[str, Any] = Depends(_current_auth_user)):
    _assert_candidate_access(candidate_id, user)
    try:
        return {"documents": preonboarding_repository.build_onboarding_status(candidate_id, persist=True).get("documents", [])}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.post("/api/documents/upload")
def upload_candidate_document(
    documentId: str = Query(...),
    candidate_id: str = Form(...),
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(_current_auth_user),
):
    _assert_candidate_access(candidate_id, user)
    try:
        upload = preonboarding_repository.upload_candidate_document(candidate_id, documentId, file)
        status_doc = preonboarding_repository.build_onboarding_status(candidate_id, persist=True)
        return {"document": upload, "status": status_doc, "documents": status_doc.get("documents", [])}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.delete("/api/documents/{document_id}")
def remove_candidate_document(
    document_id: str,
    candidate_id: str = Query(...),
    user: Dict[str, Any] = Depends(_current_auth_user),
):
    _assert_candidate_access(candidate_id, user)
    try:
        removed = preonboarding_repository.remove_candidate_document(candidate_id, document_id)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not removed:
        raise HTTPException(status_code=404, detail="Document upload not found")
    status_doc = preonboarding_repository.build_onboarding_status(
        candidate_id,
        persist=True,
        last_activity="Removed uploaded document",
    )
    return {"ok": True, "status": status_doc, "documents": status_doc.get("documents", [])}


@app.get("/api/documents/{document_id}/verification")
def get_document_verification(
    document_id: str,
    candidate_id: str = Query(...),
    user: Dict[str, Any] = Depends(_current_auth_user),
):
    _assert_candidate_access(candidate_id, user)
    try:
        details = preonboarding_repository.document_verification_details(candidate_id, document_id)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not details:
        raise HTTPException(status_code=404, detail="Document verification not found")
    return details


@app.post("/api/documents/{document_id}/verification/retry")
def retry_document_verification(
    document_id: str,
    data: DocumentRetryData,
    user: Dict[str, Any] = Depends(_current_auth_user),
):
    candidate_id = data.candidate_id or "demo"
    _assert_candidate_access(candidate_id, user)
    try:
        details = preonboarding_repository.retry_document_verification(candidate_id, document_id)
        status_doc = preonboarding_repository.build_onboarding_status(candidate_id, persist=True)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not details:
        raise HTTPException(status_code=404, detail="Document submission not found")
    return {"verification": details, "status": status_doc, "documents": status_doc.get("documents", [])}


@app.get("/api/hr/document-verification/review-cases")
def list_document_review_cases(user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        return {"cases": preonboarding_repository.hr_document_review_cases()}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.get("/api/hr/candidates/{candidate_id}/documents/{requirement_id}/verification")
def get_hr_document_verification(
    candidate_id: str,
    requirement_id: str,
    user: Dict[str, Any] = Depends(_require_role("hr")),
):
    try:
        details = preonboarding_repository.document_verification_details(candidate_id, requirement_id)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not details:
        raise HTTPException(status_code=404, detail="Document verification not found")
    return details


@app.post("/api/hr/candidates/{candidate_id}/documents/{requirement_id}/verification/retry")
def retry_hr_document_verification(
    candidate_id: str,
    requirement_id: str,
    user: Dict[str, Any] = Depends(_require_role("hr")),
):
    try:
        details = preonboarding_repository.retry_document_verification(candidate_id, requirement_id)
        status_doc = preonboarding_repository.build_onboarding_status(candidate_id, persist=True)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not details:
        raise HTTPException(status_code=404, detail="Document submission not found")
    return {"verification": details, "status": status_doc, "documents": status_doc.get("documents", [])}


@app.post("/api/hr/candidates/{candidate_id}/documents/{requirement_id}/review")
def review_candidate_document(
    candidate_id: str,
    requirement_id: str,
    data: DocumentReviewData,
    user: Dict[str, Any] = Depends(_require_role("hr")),
):
    if data.status not in {"approved", "verified", "rejected"}:
        raise HTTPException(status_code=400, detail="Status must be approved, verified, or rejected")
    if data.status == "rejected" and not (data.comments or "").strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    try:
        submission = preonboarding_repository.review_candidate_document(candidate_id, requirement_id, data.status, data.comments or "")
        status_doc = preonboarding_repository.build_onboarding_status(candidate_id, persist=True)
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not submission:
        raise HTTPException(status_code=404, detail="Document submission not found")
    return {"submission": submission, "status": status_doc, "documents": status_doc.get("documents", [])}


@app.get("/api/notifications")
def list_notifications(
    user_id: str = Query("demo"),
    unread_only: bool = Query(False),
    user: Dict[str, Any] = Depends(_current_auth_user),
):
    _assert_candidate_access(user_id, user)
    try:
        return {"notifications": preonboarding_repository.list_notifications(user_id, unread_only)}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.post("/api/notifications")
def create_notification(data: NotificationData, user: Dict[str, Any] = Depends(_require_role("hr"))):
    try:
        return {"notification": preonboarding_repository.create_notification(data.user_id, data.title, data.message, data.channel or "in_app")}
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)


@app.post("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, user: Dict[str, Any] = Depends(_current_auth_user)):
    try:
        notification = preonboarding_repository.mark_notification_read(
            notification_id,
            user_id=_auth_user_id(user),
            allow_any=user.get("role") == "hr",
        )
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"notification": notification}


# -----------------------------
# Hybrid RAG Assistant
# -----------------------------
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "for", "from", "how",
    "i", "in", "is", "it", "me", "my", "of", "on", "or", "our", "should", "the",
    "to", "what", "when", "where", "which", "who", "with", "you", "your", "about",
}


def _rag_tokens(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-zA-Z0-9][a-zA-Z0-9_-]{1,}", (text or "").lower())
        if token not in STOPWORDS
    }


def _compact_text(text: str, limit: int = 2200) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text[:limit]


def _read_uploaded_text(file_path: Optional[str], limit: int = 2600) -> str:
    if not file_path:
        return ""
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        return ""

    suffix = path.suffix.lower()
    try:
        if suffix in {".txt", ".md", ".csv"}:
            return _compact_text(path.read_text(encoding="utf-8", errors="ignore"), limit)
        if suffix == ".pdf":
            try:
                import fitz

                parts = []
                with fitz.open(path) as doc:
                    for page in doc[:8]:
                        parts.append(page.get_text("text"))
                return _compact_text("\n".join(parts), limit)
            except Exception as exc:
                logger.warning(f"Could not extract PDF text for RAG: {file_path}: {exc}")
    except Exception as exc:
        logger.warning(f"Could not read uploaded file for RAG: {file_path}: {exc}")
    return ""


def _source_doc(kind: str, title: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {"kind": kind, "title": title or kind, "text": _compact_text(text), "metadata": metadata or {}}


def _collect_structured_rag_docs(candidate_id: str = "demo") -> List[Dict[str, Any]]:
    docs: List[Dict[str, Any]] = []

    try:
        for req in preonboarding_repository.list_document_requirements():
            docs.append(
                _source_doc(
                    "HR Document Requirement",
                    req.get("name", "Document Requirement"),
                    (
                        f"Document: {req.get('name')}. Mandatory: {req.get('mandatory')}. "
                        f"Department: {req.get('department') or 'All'}. Role: {req.get('role') or 'All'}. "
                        f"Due days before joining: {req.get('due_days_before_joining')}. "
                        f"Reminder every days: {req.get('reminder_days')}. "
                        f"Accepted formats: {', '.join(req.get('accepted_formats') or [])}. "
                        f"Maximum file size MB: {req.get('max_file_size_mb')}. "
                        f"Approval required: {req.get('approval_required')}."
                    ),
                    {"id": req.get("id")},
                )
            )
    except Exception as exc:
        logger.warning(f"RAG document requirements unavailable: {exc}")

    try:
        for doc in preonboarding_repository.documents_for_candidate(candidate_id or "demo"):
            docs.append(
                _source_doc(
                    "Employee Document Status",
                    doc.get("name", "Candidate Document"),
                    (
                        f"Candidate document: {doc.get('name')}. Status: {doc.get('status')}. "
                        f"Deadline: {doc.get('deadline')}. Uploaded file: {doc.get('file_name') or 'Not uploaded'}. "
                        f"Uploaded at: {doc.get('uploaded_at') or 'Not available'}. "
                        f"HR comments: {doc.get('comments') or 'None'}."
                    ),
                    {"id": doc.get("id")},
                )
            )
    except Exception as exc:
        logger.warning(f"RAG candidate documents unavailable: {exc}")

    try:
        for task in preonboarding_repository.list_tasks(status="published"):
            uploaded_text = _read_uploaded_text(task.get("file_path"))
            task_text = (
                f"Learning/course: {task.get('title')}. Description: {task.get('description') or 'Not available'}. "
                f"Department: {task.get('department') or 'All'}. Mandatory: {task.get('mandatory')}. "
                f"Content type: {task.get('content_type')}. Duration minutes: {task.get('duration_minutes')}. "
                f"Uploaded by: {task.get('uploaded_by') or 'HR'}. Version: {task.get('version')}. "
                f"Visibility: {task.get('visibility')}. Expiry date: {task.get('expiry_date') or 'Not available'}."
            )
            if uploaded_text:
                task_text += f"\nUploaded HR file extract: {uploaded_text}"
            docs.append(_source_doc("Learning / HR Course", task.get("title", "Learning Module"), task_text, {"id": task.get("id")}))
    except Exception as exc:
        logger.warning(f"RAG learning tasks unavailable: {exc}")

    if not docs:
        fallback_requirements = [
            ("PAN Card", "All", 7, 3, 10, ".pdf, .jpg, .jpeg, .png"),
            ("Aadhaar Card", "All", 7, 3, 10, ".pdf, .jpg, .jpeg, .png"),
            ("Bank Details", "All", 10, 3, 10, ".pdf, .jpg, .jpeg, .png"),
            ("Graduation Certificate", "All", 10, 3, 10, ".pdf, .jpg, .jpeg, .png"),
            ("Medical Fitness Form", "Manufacturing", 12, 5, 15, ".pdf, .jpg, .jpeg, .png"),
            ("Passport Photo", "All", 7, 3, 10, ".jpg, .jpeg, .png"),
        ]
        for name, department, due_days, reminder_days, max_size, formats in fallback_requirements:
            docs.append(
                _source_doc(
                    "Demo HR Document Requirement",
                    name,
                    (
                        f"Document: {name}. Mandatory: True. Department: {department}. "
                        f"Due days before joining: {due_days}. Reminder every days: {reminder_days}. "
                        f"Accepted formats: {formats}. Maximum file size MB: {max_size}. Approval required: True."
                    ),
                    {"fallback": True},
                )
            )

        fallback_courses = [
            ("Welcome to Tata Motors", "Company Orientation", "A quick introduction to Tata Motors, business groups, and how teams work together.", True, 25, "HR Learning Team"),
            ("Code of Conduct and Ethics", "Compliance", "Values, compliance expectations, and workplace conduct standards.", True, 35, "HR Policy Team"),
            ("Plant Safety Essentials", "Workplace Safety", "Safety protocols, emergency guidance, and entry requirements for plant locations.", True, 30, "Safety Team"),
            ("Digital Tools Setup", "IT Enablement", "Collaboration tools, access requests, VPN, and day-one account readiness.", False, 20, "IT Enablement"),
            ("Employee Benefits Policy", "Company Policies", "HR-uploaded policy covering benefits, leave, and employee support programs.", False, 15, "HR Policy Team"),
        ]
        for title, category, description, mandatory, duration, uploaded_by in fallback_courses:
            docs.append(
                _source_doc(
                    "Demo Learning / HR Course",
                    title,
                    (
                        f"Learning/course: {title}. Category: {category}. Description: {description} "
                        f"Mandatory: {mandatory}. Duration minutes: {duration}. Uploaded by: {uploaded_by}."
                    ),
                    {"fallback": True},
                )
            )

    return docs


def _rank_rag_docs(query: str, docs: List[Dict[str, Any]], limit: int = 8) -> List[Dict[str, Any]]:
    query_tokens = _rag_tokens(query)
    if not query_tokens:
        return docs[:limit]
    ranked = []
    for doc in docs:
        haystack = f"{doc.get('kind')} {doc.get('title')} {doc.get('text')}"
        doc_tokens = _rag_tokens(haystack)
        score = len(query_tokens & doc_tokens)
        if query.lower() in haystack.lower():
            score += 4
        if score > 0:
            ranked.append((score, doc))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [doc for _, doc in ranked[:limit]]


async def _vector_rag_docs(query: str, limit: int = 4) -> List[Dict[str, Any]]:
    try:
        payload = {
            "query": query,
            "openai_api_key": settings.openai_api_key,
            "model_name_emb": settings.model_name_emb,
            "vector_db_name": settings.vector_db_name,
            "collection_name": settings.collection_name,
            "milvus_user": settings.milvus_user,
            "milvus_password": settings.milvus_password,
        }
        async with httpx.AsyncClient(timeout=12, verify=False) as client:
            response = await client.post(settings.retrieval_api, json=payload, headers={"Content-Type": "application/json"})
        response.raise_for_status()
        result = response.json()

        raw_docs = []
        if isinstance(result.get("reranked_nodes"), list):
            raw_docs = [
                node.get("document", {}).get("text", "") if isinstance(node, dict) else str(node)
                for node in result["reranked_nodes"]
            ]
        elif isinstance(result.get("retrieved_nodes"), list):
            raw_docs = [node.get("text", "") if isinstance(node, dict) else str(node) for node in result["retrieved_nodes"]]

        return [
            _source_doc("Policy Vector Knowledge Base", f"Policy excerpt {index + 1}", text)
            for index, text in enumerate(raw_docs[:limit])
            if text
        ]
    except Exception as exc:
        logger.warning(f"Vector RAG unavailable: {exc}")
        return []


def _format_rag_context(docs: List[Dict[str, Any]]) -> str:
    blocks = []
    for index, doc in enumerate(docs, start=1):
        blocks.append(f"[S{index}] {doc.get('kind')} - {doc.get('title')}\n{_compact_text(doc.get('text', ''), 1800)}")
    return "\n\n".join(blocks)


@app.post("/api/assistant/chat")
async def assistant_chat(data: AssistantChatData):
    question = (data.message or "").strip()
    if len(question) < 2:
        raise HTTPException(status_code=400, detail="Message must contain at least 2 characters")

    structured_docs = _collect_structured_rag_docs(data.candidate_id or "demo")
    ranked_structured = _rank_rag_docs(question, structured_docs, limit=8)
    vector_docs = await _vector_rag_docs(question, limit=4)
    context_docs = (ranked_structured + vector_docs)[:10]

    if not context_docs:
        return {
            "reply": (
                "I could not find this in the available HR policy, learning, course, or document material. "
                "Please ask HR to upload or publish the relevant document, then I can answer from it."
            ),
            "sources": [],
            "grounded": False,
        }

    messages = [
        {
            "role": "system",
            "content": (
                "You are the Tata Motors pre-onboarding Hybrid RAG assistant. "
                "Answer employees using ONLY the provided SOURCES. "
                "Do not use outside knowledge, assumptions, or invented policy details. "
                "If the sources do not answer the question, say exactly that and suggest contacting HR. "
                "Do not fabricate deadlines, contacts, course requirements, document rules, or policy text. "
                "When answering, include short citations like [S1] or [S2] for every factual claim."
            ),
        },
        {
            "role": "user",
            "content": (
                f"SOURCES:\n{_format_rag_context(context_docs)}\n\n"
                f"EMPLOYEE QUESTION:\n{question}\n\n"
                "Give a clear, concise answer. If the answer is not supported by the sources, say you could not find it in the HR material."
            ),
        },
    ]

    try:
        response = await asyncio.to_thread(
            requests.post,
            f"{settings.openai_api_base.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"},
            json={
                "model": settings.router_model_name or settings.model_name_llm,
                "messages": messages,
                "temperature": 0.0,
                "top_p": 0.1,
            },
            timeout=35,
        )
        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        logger.warning(f"Assistant Hybrid RAG LLM failed: {exc}", exc_info=True)
        fallback_sources = ", ".join(f"[S{i + 1}] {doc['title']}" for i, doc in enumerate(context_docs[:4]))
        reply = (
            "I found relevant HR material, but the AI model is temporarily unavailable. "
            f"Relevant sources: {fallback_sources}. Please try again in a moment."
        )

    return {
        "reply": reply,
        "sources": [
            {
                "id": f"S{index + 1}",
                "kind": doc.get("kind"),
                "title": doc.get("title"),
                "preview": _compact_text(doc.get("text", ""), 220),
            }
            for index, doc in enumerate(context_docs[:6])
        ],
        "grounded": True,
    }


def _fallback_relocation_resources(location: str) -> List[Dict[str, Any]]:
    return []


def _fallback_relocation_categories(location: str) -> List[Dict[str, Any]]:
    return []


def _extract_json_object(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start : end + 1])
        raise


@app.post("/api/relocation/search")
def search_relocation_resources(data: RelocationSearchData):
    location = (data.location or data.destination_city or "").strip()
    if len(location) < 2:
        raise HTTPException(status_code=400, detail="Location must contain at least 2 characters")

    prompt = f"""
You are an enterprise AI Relocation Assistant in an employee pre-onboarding portal.

Employee entered this relocation location/search text:
{location}

Task:
1. Return real nearby places for an employee relocating near the entered location.
2. Include these categories when real data is available: Hospitals, Apartments/PGs, Gyms, Supermarkets, Schools, Transport, Essential Services.
3. Give only places you can identify with high confidence from your available knowledge/context.
4. Never invent place names, phone numbers, addresses, distances, coordinates, ratings, opening status, or contacts.
5. If a field cannot be verified, write "Data unavailable".
6. If no accurate places are available, return an empty resources array.
7. Keep each description short and practical for an employee relocating.

Return JSON only with this exact shape:
{{
  "resources": [
    {{
      "id": "short-id",
      "category": "Apartments",
      "title": "...",
      "name": "...",
      "description": "...",
      "area": "...",
      "locality": "...",
      "address": "...",
      "contact": "...",
      "opening_status": "...",
      "verified_details": "...",
      "distance_km": 1.2,
      "distance": "Distance value",
      "lat": 18.0000,
      "lng": 73.0000
    }}
  ]
}}

Return resources only. Use category names exactly where possible: Hospitals, Apartments/PGs, Gyms, Supermarkets, Schools, Transport, Essential Services.
"""

    try:
      response = requests.post(
          f"{settings.openai_api_base.rstrip('/')}/chat/completions",
          headers={
              "Authorization": f"Bearer {settings.openai_api_key}",
              "Content-Type": "application/json",
          },
          json={
              "model": settings.router_model_name or settings.model_name_llm,
              "messages": [
                  {
                      "role": "system",
                      "content": "You provide concise relocation planning data as strict JSON. Be useful, cautious, and avoid fake exact contacts.",
                  },
                  {"role": "user", "content": prompt},
              ],
              "temperature": 0.7,
          },
          timeout=30,
      )
      response.raise_for_status()
      content = response.json()["choices"][0]["message"]["content"]
      parsed = _extract_json_object(content)
      resources = parsed.get("resources") if isinstance(parsed.get("resources"), list) else []
      categories = parsed.get("categories") if isinstance(parsed.get("categories"), list) else []
      if not resources:
          resources = []
      if not categories:
          categories = []
      for category in categories:
          if isinstance(category, dict):
              category["columns"] = ["Name", "Location", "Contact", "Distance"]
      summary = parsed.get("summary") if isinstance(parsed.get("summary"), dict) else {}
      return {
          "location": parsed.get("location") or summary.get("destination") or location,
          "summary": summary or {"destination": location, "overview": "Data unavailable" if not resources else f"Structured relocation results for {location}."},
          "categories": categories,
          "suggested_best_choice": {},
          "additional_insights": parsed.get("additional_insights") or [],
          "resources": resources,
          "source": "llm",
      }
    except Exception as exc:
      logger.warning(f"Relocation LLM search failed: {exc}", exc_info=True)
      return {
          "location": location,
          "summary": {"destination": location, "overview": "Data unavailable. The ChatGPT/OpenAI relocation search is temporarily unavailable."},
          "categories": [],
          "suggested_best_choice": {},
          "additional_insights": [],
          "resources": [],
          "source": "unavailable",
      }


@app.get("/api/hr/reports/summary")
def get_report_summary():
    try:
        return preonboarding_repository.report_summary()
    except RuntimeError as exc:
        _enterprise_unavailable_response(exc)
