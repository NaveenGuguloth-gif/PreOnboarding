from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import UploadFile
from pymongo import ASCENDING, DESCENDING

from backend.db_manager import client
from backend.document_verification import (
    PROCESSING,
    REJECTED,
    VERIFIED,
    build_verification_result,
    mask_sensitive,
    sha256_file,
)
from backend import hr_repository
from backend.settings import settings


UPLOAD_DIR = Path("storage/uploads")
DOCUMENT_ALLOWED_SUFFIXES = {".pdf", ".jpg", ".jpeg", ".png"}
DOCUMENT_ALLOWED_CONTENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}
DOCUMENT_MAX_SIZE_MB = 10
WELCOME_KIT_ITEM_IDS = ("employee_id", "official_email", "laptop")


def _db():
    if client is None:
        raise RuntimeError("MongoDB is not available")
    return client[settings.DB_NAME]


def _collection(name: str):
    return _db()[name]


def _now():
    return datetime.now(timezone.utc)


def _public(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    return _json_safe(doc)


def _normalize_welcome_kit_items(items: Dict[str, Any]) -> Dict[str, bool]:
    if not isinstance(items, dict):
        return {}
    return {item_id: bool(items.get(item_id)) for item_id in WELCOME_KIT_ITEM_IDS}


def _json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, dict):
        cleaned = dict(value)
        cleaned.pop("_id", None)
        return {key: _json_safe(item) for key, item in cleaned.items()}
    return value


def _file_type(file_name: str = "", content_type: str = "") -> str:
    source = f"{file_name} {content_type}".lower()
    if ".png" in source or "png" in source:
        return "PNG"
    if ".jpg" in source or ".jpeg" in source or "jpeg" in source:
        return "JPG"
    if ".pdf" in source or "pdf" in source:
        return "PDF"
    return "Document"


def _format_file_size(size: Any) -> str:
    try:
        value = int(size or 0)
    except (TypeError, ValueError):
        return ""
    if value <= 0:
        return ""
    if value < 1024:
        return f"{value} B"
    if value < 1024 * 1024:
        return f"{round(value / 1024)} KB"
    return f"{value / (1024 * 1024):.1f} MB"


def _document_audit(candidate_id: str, requirement_id: str) -> List[Dict[str, Any]]:
    try:
        rows = _collection("pre_onboarding_audit_logs").find(
            {
                "entity": "document",
                "entity_id": requirement_id,
                "$or": [
                    {"user_id": candidate_id},
                    {"changes.candidate_id": candidate_id},
                ],
            }
        ).sort("created_at", ASCENDING)
    except RuntimeError:
        return []
    items = []
    labels = {
        "upload": "Candidate uploaded document",
        "view": "HR viewed document",
        "download": "HR downloaded document",
        "review": "HR reviewed document",
        "remove": "Candidate removed document",
    }
    for row in rows:
        changes = row.get("changes") or {}
        action = row.get("action", "")
        status = changes.get("status", "")
        if action == "review" and status == "verified":
            label = "HR verified document"
        elif action == "review" and status == "rejected":
            label = "HR rejected document"
        else:
            label = labels.get(action, action.replace("_", " ").title())
        items.append(
            {
                "id": row.get("id"),
                "action": label,
                "actor": row.get("user_id") or "System",
                "at": row.get("created_at"),
                "note": changes.get("comments") or changes.get("rejection_reason") or changes.get("file_name", ""),
            }
        )
    return _json_safe(items)


def _document_status(status: Optional[str], has_file: bool = False) -> str:
    value = (status or "").strip().lower()
    if value in {"verified", "approved"}:
        return "verified"
    if value in {"rejected", "re-upload", "reupload", "needs_reupload"}:
        return "rejected"
    if value in {"uploaded", "submitted"} or has_file:
        return "uploaded"
    return "pending"


def _document_is_complete(doc: Dict[str, Any]) -> bool:
    return doc.get("status") in {"uploaded", "submitted", "verified", "approved"}


def _submission_file_path(submission: Dict[str, Any]) -> str:
    file_path = submission.get("file_path") or ""
    if file_path and Path(file_path).exists():
        return file_path
    file_name = submission.get("file_name") or ""
    if file_name:
        inferred = UPLOAD_DIR / "documents" / file_name
        if inferred.exists():
            return str(inferred)
    return file_path


def _sync_candidate_metrics(candidate_id: str, last_activity: str = ""):
    if not candidate_id or candidate_id == "demo":
        return
    try:
        build_onboarding_status(candidate_id, persist=True, last_activity=last_activity)
    except Exception:
        pass


def _save_upload(
    file: UploadFile,
    folder: str,
    allowed_suffixes: Optional[set[str]] = None,
    allowed_content_types: Optional[set[str]] = None,
    max_size_mb: int = 25,
) -> Dict[str, str]:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    target_dir = UPLOAD_DIR / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix.lower()
    if allowed_suffixes and suffix not in allowed_suffixes:
        raise ValueError(f"Unsupported file type. Allowed formats: {', '.join(sorted(allowed_suffixes))}")
    content_type = file.content_type or "application/octet-stream"
    if allowed_content_types and content_type not in allowed_content_types:
        raise ValueError("Unsupported content type. Upload PDF, JPG, or PNG only.")
    content = file.file.read()
    max_bytes = max_size_mb * 1024 * 1024
    if not content:
        raise ValueError("Uploaded file is empty.")
    if len(content) > max_bytes:
        raise ValueError(f"File too large. Maximum size is {max_size_mb} MB.")
    safe_name = f"{uuid4().hex}{suffix}"
    target = target_dir / safe_name
    with target.open("wb") as out:
        out.write(content)
    sha256_hash = sha256_file(str(target))
    return {
        "file_name": file.filename or safe_name,
        "file_path": str(target),
        "storage_key": f"{folder}/{safe_name}",
        "content_type": content_type,
        "file_size": len(content),
        "sha256_hash": sha256_hash,
    }


def ensure_indexes():
    db = _db()
    db.pre_onboarding_departments.create_index([("name", ASCENDING)], unique=True)
    db.pre_onboarding_tasks.create_index([("department", ASCENDING), ("status", ASCENDING)])
    db.pre_onboarding_document_requirements.create_index([("name", ASCENDING)], unique=True)
    db.pre_onboarding_document_submissions.create_index([("candidate_id", ASCENDING), ("requirement_id", ASCENDING)])
    db.document_versions.create_index([("document_id", ASCENDING), ("version", DESCENDING)])
    db.document_extractions.create_index([("document_id", ASCENDING), ("created_at", DESCENDING)])
    db.verification_checks.create_index([("document_id", ASCENDING), ("created_at", DESCENDING)])
    db.verification_provider_results.create_index([("document_id", ASCENDING), ("created_at", DESCENDING)])
    db.verification_decisions.create_index([("document_id", ASCENDING), ("decided_at", DESCENDING)])
    db.document_review_actions.create_index([("document_id", ASCENDING), ("created_at", DESCENDING)])
    db.document_audit_logs.create_index([("document_id", ASCENDING), ("created_at", DESCENDING)])
    db.pre_onboarding_document_submissions.create_index([("sha256_hash", ASCENDING)])
    db.pre_onboarding_notifications.create_index([("user_id", ASCENDING), ("read", ASCENDING), ("created_at", DESCENDING)])
    db.pre_onboarding_audit_logs.create_index([("created_at", DESCENDING)])


def audit(user_id: str, action: str, entity: str, entity_id: str, changes: Optional[Dict[str, Any]] = None, ip: str = ""):
    try:
        _collection("pre_onboarding_audit_logs").insert_one(
            {
                "id": f"audit_{uuid4().hex[:12]}",
                "user_id": user_id,
                "action": action,
                "entity": entity,
                "entity_id": entity_id,
                "changes": changes or {},
                "ip": ip,
                "created_at": _now(),
            }
        )
    except RuntimeError:
        return


def refresh_all_onboarding_statuses():
    try:
        candidates = hr_repository.list_candidates(page=1, limit=1000).get("candidates", [])
        for candidate in candidates:
            candidate_id = candidate.get("id")
            if candidate_id:
                build_onboarding_status(candidate_id, persist=True)
    except Exception:
        pass


def seed_if_empty():
    ensure_indexes()
    departments = _collection("pre_onboarding_departments")
    if departments.count_documents({}) == 0:
        departments.insert_many(
            [
                {"id": "dept_vehicle_software", "name": "Vehicle Software", "manager_name": "Ananya Rao", "department_hr": "Meera Shah", "created_at": _now(), "updated_at": _now()},
                {"id": "dept_manufacturing", "name": "Manufacturing", "manager_name": "Sanjay Patel", "department_hr": "Meera Shah", "created_at": _now(), "updated_at": _now()},
                {"id": "dept_quality", "name": "Quality", "manager_name": "Ritika Sen", "department_hr": "Meera Shah", "created_at": _now(), "updated_at": _now()},
                {"id": "dept_production", "name": "Production", "manager_name": "Vikram Iyer", "department_hr": "Meera Shah", "created_at": _now(), "updated_at": _now()},
            ]
        )

    requirements = _collection("pre_onboarding_document_requirements")
    if requirements.count_documents({}) == 0:
        for name in ["PAN Card", "Aadhaar Card", "Bank Details", "Graduation Certificate", "Medical Fitness Form", "Passport Photo"]:
            requirements.insert_one(
                {
                    "id": f"docreq_{uuid4().hex[:10]}",
                    "name": name,
                    "mandatory": True,
                    "accepted_formats": [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"],
                    "max_file_size_mb": 10,
                    "approval_required": True,
                    "due_days_before_joining": 7,
                    "created_at": _now(),
                    "updated_at": _now(),
                }
            )

    tasks = _collection("pre_onboarding_tasks")
    sample_tasks = [
            {
                "id": "task-hr-video-day-one",
                "title": "Day-one plant orientation video",
                "description": "HR-uploaded video briefing covering gate entry, reporting flow, PPE basics, and first-day support contacts.",
                "department": "All",
                "applicable_candidates": [],
                "version": "1.0",
                "uploaded_by": "HR Learning Team",
                "expiry_date": None,
                "mandatory": True,
                "visibility": "employees",
                "status": "published",
                "content_type": "video",
                "duration_minutes": 6,
                "file_name": "day-one-plant-orientation.mp4",
                "file_url": "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4",
            },
            {
                "id": "task-video-company-culture",
                "title": "Company Culture: How We Work",
                "description": "A concise video introduction to collaboration norms, ownership principles, and inclusive workplace behaviors.",
                "department": "All",
                "applicable_candidates": [],
                "version": "1.0",
                "uploaded_by": "People Experience",
                "expiry_date": None,
                "mandatory": True,
                "visibility": "employees",
                "status": "published",
                "content_type": "video",
                "duration_minutes": 8,
                "file_name": "company-culture-how-we-work.mp4",
                "file_url": "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4",
            },
            {
                "id": "task-video-workplace-safety",
                "title": "Workplace Safety Essentials",
                "description": "Required safety orientation covering PPE, emergency exits, incident reporting, and shop-floor movement rules.",
                "department": "Manufacturing",
                "applicable_candidates": [],
                "version": "1.0",
                "uploaded_by": "Safety Team",
                "expiry_date": None,
                "mandatory": True,
                "visibility": "employees",
                "status": "published",
                "content_type": "video",
                "duration_minutes": 10,
                "file_name": "workplace-safety-essentials.mp4",
                "file_url": "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4",
            },
            {
                "id": "task-video-manufacturing-basics",
                "title": "Manufacturing Basics: From Line to Quality Gate",
                "description": "Overview of production flow, takt time, quality checkpoints, and escalation practices for plant-facing teams.",
                "department": "Manufacturing",
                "applicable_candidates": [],
                "version": "1.0",
                "uploaded_by": "Manufacturing Academy",
                "expiry_date": None,
                "mandatory": False,
                "visibility": "employees",
                "status": "published",
                "content_type": "video",
                "duration_minutes": 12,
                "file_name": "manufacturing-basics-quality-gate.mp4",
                "file_url": "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4",
            },
            {
                "id": "task-pdf-code-of-conduct",
                "title": "Code of Conduct Handbook",
                "description": "PDF handbook covering ethical decision-making, conflicts of interest, confidentiality, and escalation channels.",
                "department": "All",
                "applicable_candidates": [],
                "version": "1.0",
                "uploaded_by": "Compliance Team",
                "expiry_date": None,
                "mandatory": True,
                "visibility": "employees",
                "status": "published",
                "content_type": "pdf",
                "duration_minutes": 18,
                "file_name": "code-of-conduct-handbook.pdf",
                "file_url": "https://www.tata.com/content/dam/tata/pdf/Tata-Code-of-Conduct.pdf",
            },
            {
                "id": "task-pdf-employee-benefits",
                "title": "Employee Benefits Overview",
                "description": "PDF guide summarizing health coverage, leave policies, wellness support, and employee assistance programs.",
                "department": "All",
                "applicable_candidates": [],
                "version": "1.0",
                "uploaded_by": "HR Benefits Team",
                "expiry_date": None,
                "mandatory": False,
                "visibility": "employees",
                "status": "published",
                "content_type": "pdf",
                "duration_minutes": 12,
                "file_name": "employee-benefits-overview.pdf",
                "file_url": "https://www.tatamotors.com/wp-content/uploads/2024/06/annual-report-2023-24.pdf",
            },
            {
                "id": "task-image-safety-map",
                "title": "Plant Safety Zones Map",
                "description": "Visual reference for PPE zones, visitor walkways, assembly areas, and emergency response points.",
                "department": "Manufacturing",
                "applicable_candidates": [],
                "version": "1.0",
                "uploaded_by": "Safety Team",
                "expiry_date": None,
                "mandatory": False,
                "visibility": "employees",
                "status": "published",
                "content_type": "image",
                "duration_minutes": 5,
                "file_name": "plant-safety-zones-map.jpeg",
                "file_url": "https://images.unsplash.com/photo-1581092335878-1c5f0f15664f?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "id": "task-image-cybersecurity-checklist",
                "title": "Cybersecurity Quick Reference",
                "description": "Image-based checklist for password hygiene, phishing red flags, device locking, and secure data handling.",
                "department": "All",
                "applicable_candidates": [],
                "version": "1.0",
                "uploaded_by": "Information Security",
                "expiry_date": None,
                "mandatory": False,
                "visibility": "employees",
                "status": "published",
                "content_type": "image",
                "duration_minutes": 6,
                "file_name": "cybersecurity-quick-reference.png",
                "file_url": "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "id": "task-link-cybersecurity-awareness",
                "title": "Cybersecurity Awareness Portal",
                "description": "Learning link with phishing simulations, secure browsing guidance, and reporting steps for suspicious emails.",
                "department": "All",
                "applicable_candidates": [],
                "version": "1.0",
                "uploaded_by": "Information Security",
                "expiry_date": None,
                "mandatory": True,
                "visibility": "employees",
                "status": "published",
                "content_type": "link",
                "duration_minutes": 20,
                "link_url": "https://www.cisa.gov/secure-our-world",
            },
            {
                "id": "task-link-company-values",
                "title": "Company Values and Leadership Principles",
                "description": "Curated learning link for company values, leadership expectations, and responsible business practices.",
                "department": "All",
                "applicable_candidates": [],
                "version": "1.0",
                "uploaded_by": "HR Learning Team",
                "expiry_date": None,
                "mandatory": False,
                "visibility": "employees",
                "status": "published",
                "content_type": "link",
                "duration_minutes": 10,
                "link_url": "https://www.tata.com/about-us/tata-values-purpose",
            },
        ]
    for task in sample_tasks:
        tasks.update_one(
            {"id": task["id"]},
            {
                "$setOnInsert": {
                    **task,
                    "created_at": _now(),
                    "updated_at": _now(),
                }
            },
            upsert=True,
        )


def list_departments() -> List[Dict[str, Any]]:
    seed_if_empty()
    return [_public(doc) for doc in _collection("pre_onboarding_departments").find({}).sort("name", ASCENDING)]


def create_department(payload: Dict[str, Any]) -> Dict[str, Any]:
    seed_if_empty()
    doc = {
        "id": payload.get("id") or f"dept_{uuid4().hex[:10]}",
        "name": payload["name"],
        "manager_name": payload.get("manager_name", ""),
        "department_hr": payload.get("department_hr", ""),
        "created_at": _now(),
        "updated_at": _now(),
    }
    _collection("pre_onboarding_departments").insert_one(doc)
    audit("system", "create", "department", doc["id"], doc)
    return _public(doc)


def update_department(department_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    payload = {key: value for key, value in payload.items() if value is not None}
    payload["updated_at"] = _now()
    _collection("pre_onboarding_departments").update_one({"id": department_id}, {"$set": payload})
    audit("system", "update", "department", department_id, payload)
    return _public(_collection("pre_onboarding_departments").find_one({"id": department_id}))


def delete_department(department_id: str) -> bool:
    result = _collection("pre_onboarding_departments").delete_one({"id": department_id})
    audit("system", "delete", "department", department_id)
    return result.deleted_count > 0


def list_tasks(department: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    seed_if_empty()
    query: Dict[str, Any] = {}
    if department:
        query["department"] = department
    if status:
        query["status"] = status
    return [_public(doc) for doc in _collection("pre_onboarding_tasks").find(query).sort("created_at", DESCENDING)]


def create_task(payload: Dict[str, Any], file: Optional[UploadFile] = None) -> Dict[str, Any]:
    seed_if_empty()
    upload = _save_upload(file, "learning") if file else {}
    doc = {
        "id": payload.get("id") or f"task_{uuid4().hex[:10]}",
        "title": payload["title"],
        "description": payload.get("description", ""),
        "department": payload.get("department", "All"),
        "applicable_candidates": payload.get("applicable_candidates", []),
        "version": payload.get("version", "1.0"),
        "uploaded_by": payload.get("uploaded_by", "HR"),
        "expiry_date": payload.get("expiry_date"),
        "mandatory": payload.get("mandatory", False),
        "visibility": payload.get("visibility", "employees"),
        "status": payload.get("status", "published"),
        "duration_minutes": payload.get("duration_minutes", 15),
        "file_url": payload.get("file_url", upload.get("file_url", "")),
        "link_url": payload.get("link_url", ""),
        **upload,
        "file_content_type": upload.get("content_type"),
        "content_type": payload.get("content_type", "document"),
        "created_at": _now(),
        "updated_at": _now(),
    }
    _collection("pre_onboarding_tasks").insert_one(doc)
    audit("system", "create", "task", doc["id"], doc)
    refresh_all_onboarding_statuses()
    return _public(doc)


def update_task(task_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    payload = {key: value for key, value in payload.items() if value is not None}
    payload["updated_at"] = _now()
    _collection("pre_onboarding_tasks").update_one({"id": task_id}, {"$set": payload})
    audit("system", "update", "task", task_id, payload)
    refresh_all_onboarding_statuses()
    return _public(_collection("pre_onboarding_tasks").find_one({"id": task_id}))


def delete_task(task_id: str) -> bool:
    result = _collection("pre_onboarding_tasks").delete_one({"id": task_id})
    audit("system", "delete", "task", task_id)
    refresh_all_onboarding_statuses()
    return result.deleted_count > 0


def learning_modules_for_employee(candidate_id: Optional[str] = None) -> List[Dict[str, Any]]:
    tasks = list_tasks(status="published")
    candidate = None
    if candidate_id and candidate_id != "demo":
        try:
            candidate = hr_repository.get_candidate(candidate_id)
        except RuntimeError:
            candidate = None
    candidate_department = (candidate or {}).get("department", "").strip().lower()
    progress = {
        item["task_id"]: item
        for item in _collection("pre_onboarding_learning_progress").find({"candidate_id": candidate_id or "demo"})
    }
    modules = []
    for task in tasks:
        task_department = (task.get("department") or "All").strip()
        applies_to_employee = (
            not candidate_department
            or task_department.lower() in {"all", "overall", "everyone", "employees"}
            or task_department.lower() == candidate_department
        )
        if not applies_to_employee:
            continue
        item = progress.get(task["id"], {})
        completed = bool(item.get("completed")) or int(item.get("progress", 0) or 0) >= 100
        modules.append(
            {
                "id": task["id"],
                "courseId": task["id"],
                "title": task["title"],
                "description": task.get("description", ""),
                "category": task.get("department", "General"),
                "required": 1 if task.get("mandatory") else 0,
                "duration_minutes": task.get("duration_minutes", 15),
                "file_url": f"/api/learning/modules/{task['id']}/download" if task.get("file_path") else task.get("file_url", ""),
                "video_url": task.get("file_url", "") if task.get("content_type") == "video" else "",
                "link_url": task.get("link_url", ""),
                "content_type": task.get("content_type", "document"),
                "uploaded_by": task.get("uploaded_by", "HR"),
                "progress": item.get("progress", 0),
                "status": "completed" if completed else ("in_progress" if item.get("progress", 0) else "not_started"),
                "completedAt": item.get("completed_at").isoformat() if isinstance(item.get("completed_at"), datetime) else item.get("completed_at"),
            }
        )
    return modules


def update_learning_progress(candidate_id: str, task_id: str, progress: int) -> Dict[str, Any]:
    progress = max(0, min(100, progress))
    completed = progress >= 100
    doc = {
        "candidate_id": candidate_id,
        "task_id": task_id,
        "progress": progress,
        "completed": completed,
        "completed_at": _now() if completed else None,
        "updated_at": _now(),
    }
    _collection("pre_onboarding_learning_progress").update_one(
        {"candidate_id": candidate_id, "task_id": task_id},
        {"$set": doc, "$setOnInsert": {"id": f"learn_{uuid4().hex[:10]}", "created_at": _now()}},
        upsert=True,
    )
    audit(candidate_id, "update_progress", "learning", task_id, {"progress": progress})
    _sync_candidate_metrics(candidate_id, "Learning progress updated")
    return doc


def list_document_requirements() -> List[Dict[str, Any]]:
    seed_if_empty()
    return [_public(doc) for doc in _collection("pre_onboarding_document_requirements").find({}).sort("name", ASCENDING)]


def create_document_requirement(payload: Dict[str, Any]) -> Dict[str, Any]:
    seed_if_empty()
    doc = {
        "id": payload.get("id") or f"docreq_{uuid4().hex[:10]}",
        "name": payload["name"],
        "mandatory": payload.get("mandatory", True),
        "department": payload.get("department"),
        "role": payload.get("role"),
        "due_days_before_joining": payload.get("due_days_before_joining", 7),
        "reminder_days": payload.get("reminder_days", 3),
        "max_file_size_mb": payload.get("max_file_size_mb", 10),
        "accepted_formats": payload.get("accepted_formats", [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"]),
        "approval_required": payload.get("approval_required", True),
        "created_at": _now(),
        "updated_at": _now(),
    }
    _collection("pre_onboarding_document_requirements").insert_one(doc)
    audit("system", "create", "document_requirement", doc["id"], doc)
    refresh_all_onboarding_statuses()
    return _public(doc)


def update_document_requirement(requirement_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    payload = {key: value for key, value in payload.items() if value is not None}
    payload["updated_at"] = _now()
    _collection("pre_onboarding_document_requirements").update_one({"id": requirement_id}, {"$set": payload})
    audit("system", "update", "document_requirement", requirement_id, payload)
    refresh_all_onboarding_statuses()
    return _public(_collection("pre_onboarding_document_requirements").find_one({"id": requirement_id}))


def delete_document_requirement(requirement_id: str) -> bool:
    result = _collection("pre_onboarding_document_requirements").delete_one({"id": requirement_id})
    audit("system", "delete", "document_requirement", requirement_id)
    refresh_all_onboarding_statuses()
    return result.deleted_count > 0


def documents_for_candidate(candidate_id: str = "demo") -> List[Dict[str, Any]]:
    requirements = list_document_requirements()
    submissions = {
        doc["requirement_id"]: doc
        for doc in _collection("pre_onboarding_document_submissions").find({"candidate_id": candidate_id})
    }
    rows = []
    for req in requirements:
        submission = submissions.get(req["id"], {})
        file_path = _submission_file_path(submission)
        has_file = bool(file_path or submission.get("file_name"))
        status = _document_status(submission.get("status"), has_file)
        file_url = f"/api/hr/candidates/{candidate_id}/documents/{req['id']}/download" if has_file else ""
        file_name = submission.get("file_name")
        content_type = submission.get("content_type")
        file_type = _file_type(file_name or "", content_type or "")
        file_size = _format_file_size(submission.get("file_size"))
        uploaded_at = submission.get("uploaded_at").isoformat() if isinstance(submission.get("uploaded_at"), datetime) else submission.get("uploaded_at")
        updated_at = submission.get("updated_at").isoformat() if isinstance(submission.get("updated_at"), datetime) else submission.get("updated_at")
        versions = []
        for index, version in enumerate(submission.get("versions", []), start=1):
            version_file_name = version.get("file_name") or file_name
            version_content_type = version.get("content_type") or content_type
            versions.append(
                {
                    **_json_safe(version),
                    "version": version.get("version") or index,
                    "file_type": _file_type(version_file_name or "", version_content_type or ""),
                    "file_size": _format_file_size(version.get("file_size")),
                    "status": version.get("status") or status,
                    "verified_by": version.get("verified_by") or submission.get("verified_by", ""),
                    "verified_at": version.get("verified_at") or submission.get("verified_at"),
                }
            )
        rows.append(
            {
                "id": req["id"],
                "documentType": req["name"],
                "requirement_id": req["id"],
                "name": req["name"],
                "status": status,
                "deadline": (datetime.now(timezone.utc).date() + timedelta(days=req.get("due_days_before_joining", 7))).isoformat(),
                "file_name": file_name,
                "uploaded_at": uploaded_at,
                "uploadedAt": uploaded_at,
                "uploaded_by": submission.get("uploaded_by") or "Candidate",
                "uploadedBy": submission.get("uploaded_by") or "Candidate",
                "updated_at": updated_at,
                "updatedAt": updated_at,
                "lastUpdated": updated_at,
                "comments": submission.get("comments", ""),
                "rejectionReason": submission.get("rejection_reason") or submission.get("comments", "") if status == "rejected" else "",
                "verifiedBy": submission.get("verified_by", ""),
                "verifiedAt": submission.get("verified_at").isoformat() if isinstance(submission.get("verified_at"), datetime) else submission.get("verified_at"),
                "accepted_formats": req.get("accepted_formats", []),
                "content_type": content_type,
                "file_type": file_type,
                "fileType": file_type,
                "file_size": file_size,
                "fileSize": file_size,
                "file_url": file_url,
                "fileUrl": file_url,
                "version": submission.get("version", len(versions)),
                "versions": versions,
                "upload_status": submission.get("upload_status") or status,
                "uploadStatus": submission.get("upload_status") or status,
                "verification_status": submission.get("verification_status", ""),
                "verificationStatus": submission.get("verification_status", ""),
                "verification_level": submission.get("verification_level", ""),
                "verificationLevel": submission.get("verification_level", ""),
                "overall_score": submission.get("overall_score"),
                "overallScore": submission.get("overall_score"),
                "processed_at": submission.get("processed_at").isoformat() if isinstance(submission.get("processed_at"), datetime) else submission.get("processed_at"),
                "processedAt": submission.get("processed_at").isoformat() if isinstance(submission.get("processed_at"), datetime) else submission.get("processed_at"),
                "verification_explanation": submission.get("verification_explanation", ""),
                "verificationExplanation": submission.get("verification_explanation", ""),
                "document_type": submission.get("document_type", ""),
                "documentTypeKey": submission.get("document_type", ""),
                "extracted_fields": submission.get("extracted_fields", {}),
                "extractedFields": submission.get("extracted_fields", {}),
                "extraction_confidence": submission.get("extraction_confidence", {}),
                "extractionConfidence": submission.get("extraction_confidence", {}),
                "risk_rules": submission.get("risk_rules", []),
                "riskRules": submission.get("risk_rules", []),
                "auditTrail": _document_audit(candidate_id, req["id"]),
            }
        )
    return rows


def _verification_audit(candidate_id: str, requirement_id: str) -> List[Dict[str, Any]]:
    logs = _collection("document_audit_logs").find({"candidate_id": candidate_id, "requirement_id": requirement_id}).sort("created_at", ASCENDING)
    return [_json_safe(log) for log in logs]


def _store_verification_audit(candidate_id: str, requirement_id: str, actor: str, action: str, details: Dict[str, Any]) -> None:
    _collection("document_audit_logs").insert_one(
        {
            "id": f"docaudit_{uuid4().hex[:10]}",
            "document_id": f"{candidate_id}:{requirement_id}",
            "candidate_id": candidate_id,
            "requirement_id": requirement_id,
            "actor": actor,
            "action": action,
            "details": _json_safe(details),
            "created_at": _now(),
        }
    )


def _masked_fields(fields: Dict[str, Any]) -> Dict[str, Any]:
    return {key: mask_sensitive(key, value) for key, value in (fields or {}).items()}


def _persist_verification_artifacts(
    candidate_id: str,
    requirement_id: str,
    submission: Dict[str, Any],
    result: Dict[str, Any],
) -> Dict[str, Any]:
    now = _now()
    document_id = submission.get("id") or f"{candidate_id}:{requirement_id}"
    extraction = result.get("extraction", {})
    fields = extraction.get("fields", {})
    masked_fields = _masked_fields(fields)
    decision = result.get("decision", {})
    checks = result.get("checks", [])
    risk = result.get("risk", {})

    for collection_name in [
        "document_extractions",
        "verification_checks",
        "verification_provider_results",
        "verification_decisions",
    ]:
        _collection(collection_name).delete_many({"document_id": document_id})

    _collection("document_versions").insert_one(
        {
            "id": f"docver_{uuid4().hex[:10]}",
            "document_id": document_id,
            "candidate_id": candidate_id,
            "requirement_id": requirement_id,
            "version": submission.get("version", 1),
            "file_name": submission.get("file_name"),
            "storage_key": submission.get("storage_key"),
            "sha256_hash": submission.get("sha256_hash"),
            "content_type": submission.get("content_type"),
            "file_size": submission.get("file_size"),
            "created_at": now,
        }
    )
    _collection("document_extractions").insert_one(
        {
            "id": f"extract_{uuid4().hex[:10]}",
            "document_id": document_id,
            "candidate_id": candidate_id,
            "requirement_id": requirement_id,
            "provider": extraction.get("provider"),
            "fields": masked_fields,
            "confidence": extraction.get("confidence", {}),
            "raw_response": extraction.get("raw_response", {}),
            "processed_at": now,
        }
    )
    for check in checks:
        _collection("verification_checks").insert_one(
            {
                "id": check.get("id") or f"check_{uuid4().hex[:10]}",
                "document_id": document_id,
                "candidate_id": candidate_id,
                "requirement_id": requirement_id,
                **_json_safe(check),
                "created_at": now,
            }
        )
    for provider_result in result.get("provider_results", []):
        _collection("verification_provider_results").insert_one(
            {
                "id": f"provider_{uuid4().hex[:10]}",
                "document_id": document_id,
                "candidate_id": candidate_id,
                "requirement_id": requirement_id,
                **_json_safe(provider_result),
                "created_at": now,
            }
        )
    _collection("verification_decisions").insert_one(
        {
            "document_id": document_id,
            "candidate_id": candidate_id,
            "requirement_id": requirement_id,
            **_json_safe(decision),
            "risk_rules": risk.get("rules", []),
            "created_at": now,
        }
    )
    payload = {
        "upload_status": "uploaded",
        "verification_status": decision.get("status"),
        "verification_level": decision.get("level"),
        "overall_score": decision.get("overall_score"),
        "processed_at": now,
        "verification_explanation": decision.get("explanation"),
        "document_type": result.get("document_type"),
        "extracted_fields": masked_fields,
        "extraction_confidence": extraction.get("confidence", {}),
        "risk_rules": risk.get("rules", []),
        "updated_at": now,
    }
    _collection("pre_onboarding_document_submissions").update_one(
        {"candidate_id": candidate_id, "requirement_id": requirement_id},
        {"$set": payload},
    )
    _store_verification_audit(candidate_id, requirement_id, "system", "verification_completed", payload)
    return payload


def process_document_verification(candidate_id: str, requirement_id: str) -> Optional[Dict[str, Any]]:
    submissions = _collection("pre_onboarding_document_submissions")
    submission = submissions.find_one({"candidate_id": candidate_id, "requirement_id": requirement_id})
    if not submission or not submission.get("file_path"):
        return None
    requirement = _collection("pre_onboarding_document_requirements").find_one({"id": requirement_id}) or {}
    candidate = hr_repository.get_candidate(candidate_id) or {}
    submissions.update_one(
        {"candidate_id": candidate_id, "requirement_id": requirement_id},
        {"$set": {"verification_status": PROCESSING, "upload_status": "uploaded", "updated_at": _now()}},
    )
    _store_verification_audit(candidate_id, requirement_id, "system", "verification_started", {"file_name": submission.get("file_name")})
    duplicate_query = {
        "sha256_hash": submission.get("sha256_hash"),
        "candidate_id": {"$ne": candidate_id},
    }
    duplicate_count = submissions.count_documents(duplicate_query) if submission.get("sha256_hash") else 0
    result = build_verification_result(submission, candidate, requirement, duplicate_count)
    payload = _persist_verification_artifacts(candidate_id, requirement_id, submission, result)
    document_name = requirement.get("name") or requirement_id
    status = payload.get("verification_status")
    create_notification(candidate_id, "Document verification updated", f"{document_name}: {payload.get('verification_explanation')}", "document_approval")
    if status in {"NEEDS_HR_REVIEW", "REJECTED", "VERIFICATION_UNAVAILABLE"}:
        create_notification("hr", "Document needs review", f"{candidate.get('name') or candidate_id}: {document_name} requires HR review.", "document_approval")
    audit(candidate_id, "verify", "document", requirement_id, {"verification_status": status, "overall_score": payload.get("overall_score")})
    _sync_candidate_metrics(candidate_id, f"Verified {document_name}")
    return document_verification_details(candidate_id, requirement_id)


def document_verification_details(candidate_id: str, requirement_id: str) -> Optional[Dict[str, Any]]:
    submission = _collection("pre_onboarding_document_submissions").find_one({"candidate_id": candidate_id, "requirement_id": requirement_id})
    if not submission:
        return None
    document_id = submission.get("id") or f"{candidate_id}:{requirement_id}"
    latest_extraction = _collection("document_extractions").find_one({"document_id": document_id}, sort=[("processed_at", DESCENDING)])
    checks = [_json_safe(check) for check in _collection("verification_checks").find({"document_id": document_id}).sort("created_at", DESCENDING)]
    provider_results = [_json_safe(item) for item in _collection("verification_provider_results").find({"document_id": document_id}).sort("created_at", DESCENDING)]
    decision = _collection("verification_decisions").find_one({"document_id": document_id}, sort=[("created_at", DESCENDING)])
    actions = [_json_safe(item) for item in _collection("document_review_actions").find({"document_id": document_id}).sort("created_at", DESCENDING)]
    return {
        "submission": _public(submission),
        "extraction": _json_safe(latest_extraction) if latest_extraction else None,
        "checks": checks,
        "provider_results": provider_results,
        "decision": _json_safe(decision) if decision else None,
        "review_actions": actions,
        "audit": _verification_audit(candidate_id, requirement_id),
    }


def retry_document_verification(candidate_id: str, requirement_id: str) -> Optional[Dict[str, Any]]:
    _store_verification_audit(candidate_id, requirement_id, "system", "verification_retry_requested", {})
    return process_document_verification(candidate_id, requirement_id)


def hr_document_review_cases() -> List[Dict[str, Any]]:
    cases = []
    query = {"verification_status": {"$in": ["NEEDS_HR_REVIEW", "REJECTED", "VERIFICATION_UNAVAILABLE"]}}
    for submission in _collection("pre_onboarding_document_submissions").find(query).sort("updated_at", DESCENDING):
        candidate = hr_repository.get_candidate(submission.get("candidate_id")) or {}
        requirement = _collection("pre_onboarding_document_requirements").find_one({"id": submission.get("requirement_id")}) or {}
        cases.append(
            {
                "candidate_id": submission.get("candidate_id"),
                "candidate_name": candidate.get("name") or submission.get("candidate_id"),
                "requirement_id": submission.get("requirement_id"),
                "document_name": requirement.get("name") or submission.get("requirement_id"),
                "verification_status": submission.get("verification_status"),
                "overall_score": submission.get("overall_score"),
                "updated_at": submission.get("updated_at"),
                "explanation": submission.get("verification_explanation"),
            }
        )
    return [_json_safe(item) for item in cases]


def candidate_document_file(candidate_id: str, requirement_id: str) -> Optional[Dict[str, Any]]:
    submission = _collection("pre_onboarding_document_submissions").find_one(
        {"candidate_id": candidate_id, "requirement_id": requirement_id}
    )
    if not submission:
        return None
    file_path = _submission_file_path(submission)
    if not file_path:
        return None
    submission["file_path"] = file_path
    return _public(submission)


def upload_candidate_document(candidate_id: str, requirement_id: str, file: UploadFile) -> Dict[str, Any]:
    upload = _save_upload(
        file,
        "documents",
        allowed_suffixes=DOCUMENT_ALLOWED_SUFFIXES,
        allowed_content_types=DOCUMENT_ALLOWED_CONTENT_TYPES,
        max_size_mb=DOCUMENT_MAX_SIZE_MB,
    )
    requirement = _collection("pre_onboarding_document_requirements").find_one({"id": requirement_id}) or {}
    candidate = hr_repository.get_candidate(candidate_id) or {}
    document_name = requirement.get("name") or requirement_id
    candidate_name = candidate.get("name") or candidate_id
    existing = _collection("pre_onboarding_document_submissions").find_one(
        {"candidate_id": candidate_id, "requirement_id": requirement_id}
    )
    version_entry = {
        "file_name": upload["file_name"],
        "file_path": upload["file_path"],
        "storage_key": upload.get("storage_key"),
        "sha256_hash": upload.get("sha256_hash"),
        "content_type": upload["content_type"],
        "file_size": upload.get("file_size"),
        "uploaded_by": candidate_name,
        "uploaded_at": _now(),
        "status": "uploaded",
    }
    doc = {
        "candidate_id": candidate_id,
        "requirement_id": requirement_id,
        "status": "uploaded",
        "upload_status": "uploaded",
        "verification_status": PROCESSING,
        "comments": "",
        "rejection_reason": "",
        "verified_by": "",
        "verified_at": None,
        "uploaded_by": candidate_name,
        **upload,
        "uploaded_at": _now(),
        "updated_at": _now(),
    }
    update_doc: Dict[str, Any] = {
        "$set": doc,
        "$setOnInsert": {"id": f"docsub_{uuid4().hex[:10]}", "created_at": _now()},
        "$push": {"versions": version_entry},
        "$inc": {"version": 1},
    }
    if existing and existing.get("file_path") and existing.get("file_path") != upload["file_path"]:
        update_doc["$set"]["previous_file_path"] = existing.get("file_path")
    try:
        _collection("pre_onboarding_document_submissions").update_one(
            {"candidate_id": candidate_id, "requirement_id": requirement_id},
            update_doc,
            upsert=True,
        )
    except Exception:
        Path(upload["file_path"]).unlink(missing_ok=True)
        raise
    create_notification(candidate_id, "Document uploaded", f"{document_name} was uploaded for HR review.", "document_approval")
    create_notification("hr", "Document uploaded", f"{candidate_name} uploaded {document_name}.", "document_approval")
    audit(candidate_id, "upload", "document", requirement_id, upload)
    _store_verification_audit(candidate_id, requirement_id, candidate_name, "upload", {"file_name": upload.get("file_name")})
    process_document_verification(candidate_id, requirement_id)
    _sync_candidate_metrics(candidate_id, f"Uploaded {document_name}")
    return _public(_collection("pre_onboarding_document_submissions").find_one({"candidate_id": candidate_id, "requirement_id": requirement_id}))


def remove_candidate_document(candidate_id: str, requirement_id: str) -> bool:
    submissions = _collection("pre_onboarding_document_submissions")
    existing = submissions.find_one({"candidate_id": candidate_id, "requirement_id": requirement_id})
    if not existing:
        return False

    file_path = existing.get("file_path")
    if file_path:
        try:
            Path(file_path).unlink(missing_ok=True)
        except OSError:
            pass

    result = submissions.delete_one({"candidate_id": candidate_id, "requirement_id": requirement_id})
    for collection_name in [
        "document_versions",
        "document_extractions",
        "verification_checks",
        "verification_provider_results",
        "verification_decisions",
        "document_review_actions",
        "document_audit_logs",
    ]:
        _collection(collection_name).delete_many({"candidate_id": candidate_id, "requirement_id": requirement_id})
    audit(candidate_id, "remove", "document", requirement_id, {"file_name": existing.get("file_name")})
    _sync_candidate_metrics(candidate_id, "Removed uploaded document")
    return result.deleted_count > 0


def review_candidate_document(candidate_id: str, requirement_id: str, status: str, comments: str = "") -> Optional[Dict[str, Any]]:
    normalized_status = _document_status(status)
    if normalized_status not in {"verified", "rejected"}:
        normalized_status = "verified" if status == "approved" else status
    verification_status = VERIFIED if normalized_status == "verified" else REJECTED
    payload = {
        "status": normalized_status,
        "verification_status": verification_status,
        "verification_level": "manual_hr_review",
        "verification_explanation": comments or ("HR manually approved this document." if normalized_status == "verified" else "HR rejected this document and requested correction."),
        "comments": comments,
        "rejection_reason": comments if normalized_status == "rejected" else "",
        "verified_by": "HR" if normalized_status == "verified" else "",
        "verified_at": _now() if normalized_status == "verified" else None,
        "reviewed_at": _now(),
        "updated_at": _now(),
    }
    existing = _collection("pre_onboarding_document_submissions").find_one(
        {"candidate_id": candidate_id, "requirement_id": requirement_id}
    )
    versions = existing.get("versions", []) if existing else []
    if versions:
        versions[-1] = {
            **versions[-1],
            "status": normalized_status,
            "verified_by": payload["verified_by"],
            "verified_at": payload["verified_at"],
            "comments": comments,
        }
        payload["versions"] = versions
    _collection("pre_onboarding_document_submissions").update_one(
        {"candidate_id": candidate_id, "requirement_id": requirement_id},
        {"$set": payload},
    )
    document_id = (existing or {}).get("id") or f"{candidate_id}:{requirement_id}"
    _collection("document_review_actions").insert_one(
        {
            "id": f"review_{uuid4().hex[:10]}",
            "document_id": document_id,
            "candidate_id": candidate_id,
            "requirement_id": requirement_id,
            "action": normalized_status,
            "comments": comments,
            "actor": "HR",
            "created_at": _now(),
        }
    )
    _store_verification_audit(candidate_id, requirement_id, "HR", f"manual_{normalized_status}", payload)
    title = "Document verified" if normalized_status == "verified" else "Document rejected"
    message = comments or ("Your document was verified by HR." if normalized_status == "verified" else "Your document was rejected. Please re-upload it.")
    create_notification(candidate_id, title, message, "document_approval")
    audit("system", "review", "document", requirement_id, payload)
    _sync_candidate_metrics(candidate_id, title)
    return _public(_collection("pre_onboarding_document_submissions").find_one({"candidate_id": candidate_id, "requirement_id": requirement_id}))


def create_notification(user_id: str, title: str, message: str, channel: str = "in_app") -> Dict[str, Any]:
    doc = {
        "id": f"notif_{uuid4().hex[:10]}",
        "user_id": user_id,
        "title": title,
        "message": message,
        "channel": channel,
        "type": channel if channel in {"document_approval", "pending_tasks", "hr_announcement", "learning_reminder", "joining_reminder", "welcome"} else "hr_announcement",
        "priority": "high" if channel in {"document_approval", "pending_tasks", "joining_reminder"} else "normal",
        "read": False,
        "created_at": _now(),
    }
    _collection("pre_onboarding_notifications").insert_one(doc)
    if user_id != "hr":
        try:
            build_onboarding_status(user_id, persist=True)
        except Exception:
            pass
    return _public(doc)


def list_notifications(user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {"user_id": user_id}
    if unread_only:
        query["read"] = False
    return [_public(doc) for doc in _collection("pre_onboarding_notifications").find(query).sort("created_at", DESCENDING)]


def mark_notification_read(notification_id: str, user_id: Optional[str] = None, allow_any: bool = False) -> Optional[Dict[str, Any]]:
    query: Dict[str, Any] = {"id": notification_id}
    if user_id and not allow_any:
        query["user_id"] = user_id
    _collection("pre_onboarding_notifications").update_one(query, {"$set": {"read": True}})
    notification = _public(_collection("pre_onboarding_notifications").find_one(query))
    if notification and notification.get("user_id") != "hr":
        try:
            build_onboarding_status(notification["user_id"], persist=True)
        except Exception:
            pass
    return notification


def build_onboarding_status(candidate_id: str, persist: bool = True, last_activity: str = "") -> Dict[str, Any]:
    candidate = hr_repository.get_candidate(candidate_id) or {}
    documents = documents_for_candidate(candidate_id)
    learning = learning_modules_for_employee(candidate_id)
    notifications = list_notifications(candidate_id)
    tasks = [
        {
            "taskId": item["id"],
            "title": item["title"],
            "assignedBy": item.get("uploaded_by", "HR"),
            "status": "completed" if int(item.get("progress", 0) or 0) >= 100 else "pending",
            "completedAt": item.get("completedAt"),
        }
        for item in learning
    ]
    welcome_kit = candidate.get("welcomeKit") or candidate.get("welcome_kit") or {}
    legacy_kit = candidate.get("welcome_kit_assignment") or {}
    if not welcome_kit:
        ready_count = sum(1 for value in legacy_kit.values() if value)
        welcome_kit = {
            "status": "assigned" if ready_count else "not_assigned",
            "trackingId": legacy_kit.get("trackingId", ""),
            "updatedAt": candidate.get("updated_at"),
            "items": legacy_kit,
        }
    welcome_kit_items = _normalize_welcome_kit_items(welcome_kit.get("items") or legacy_kit)
    confirmed_count = sum(1 for value in welcome_kit_items.values() if value)
    welcome_kit = {
        **welcome_kit,
        "status": "received" if confirmed_count == len(WELCOME_KIT_ITEM_IDS) else ("partially_received" if confirmed_count else "not_confirmed"),
        "items": welcome_kit_items,
    }

    document_completion = round((sum(1 for doc in documents if _document_is_complete(doc)) / len(documents)) * 100) if documents else 0
    learning_completion = round(sum(int(module.get("progress", 0) or 0) for module in learning) / len(learning)) if learning else 0
    profile_completion = max(0, min(100, int(candidate.get("profile_completion", 0) or 0)))
    onboarding_progress = round((profile_completion + document_completion + learning_completion) / 3)

    aggregate = {
        "id": candidate.get("id", candidate_id),
        "name": candidate.get("name", ""),
        "email": candidate.get("email", ""),
        "role": candidate.get("role") or candidate.get("designation", ""),
        "department": candidate.get("department", ""),
        "joiningDate": candidate.get("joining_date") or candidate.get("joiningDate", ""),
        "documents": documents,
        "tasks": tasks,
        "learning": learning,
        "welcomeKit": welcome_kit,
        "notifications": notifications,
        "onboardingProgress": onboarding_progress,
        "profileCompletion": profile_completion,
        "documentCompletion": document_completion,
        "learningCompletion": learning_completion,
        "readinessScore": onboarding_progress,
    }

    if persist and candidate:
        update = {
            "documents": documents,
            "tasks": tasks,
            "learning": learning,
            "welcomeKit": welcome_kit,
            "notifications": notifications,
            "onboardingProgress": onboarding_progress,
            "document_completion": document_completion,
            "learning_progress": learning_completion,
            "learning_completion": learning_completion,
            "readiness_score": onboarding_progress,
            "hr_status": "Completed" if onboarding_progress >= 100 else "In Progress",
            "current_stage": "Ready" if onboarding_progress >= 100 else ("Documents" if document_completion < 100 else "Learning"),
        }
        if last_activity:
            update["last_activity"] = last_activity
        hr_repository.update_candidate(candidate_id, update)

    return aggregate


def report_summary() -> Dict[str, Any]:
    from backend import hr_repository

    candidates = hr_repository.list_candidates(limit=100)["candidates"]
    total = len(candidates)
    by_department: Dict[str, int] = {}
    for candidate in candidates:
        by_department[candidate.get("department", "Unknown")] = by_department.get(candidate.get("department", "Unknown"), 0) + 1
    return {
        "totalCandidates": total,
        "documentsCompleted": sum(1 for c in candidates if c.get("document_completion", 0) >= 100),
        "learningCompleted": sum(1 for c in candidates if c.get("learning_progress", c.get("learning_completion", 0)) >= 100),
        "readyCandidates": sum(1 for c in candidates if c.get("readiness_score", 0) >= 90),
        "averageReadiness": round(sum(c.get("readiness_score", 0) for c in candidates) / total) if total else 0,
        "byDepartment": by_department,
    }
