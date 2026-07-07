from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import UploadFile
from pymongo import ASCENDING, DESCENDING

from backend.db_manager import client
from backend import hr_repository
from backend.settings import settings


UPLOAD_DIR = Path("storage/uploads")


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
    doc = dict(doc)
    doc.pop("_id", None)
    for key in ("created_at", "updated_at", "uploaded_at"):
        if isinstance(doc.get(key), datetime):
            doc[key] = doc[key].isoformat()
    return doc


def _sync_candidate_metrics(candidate_id: str, last_activity: str = ""):
    if not candidate_id or candidate_id == "demo":
        return
    try:
        documents = documents_for_candidate(candidate_id)
        modules = learning_modules_for_employee(candidate_id)
        candidate = hr_repository.get_candidate(candidate_id) or {}
        document_completion = round(
            (sum(1 for doc in documents if doc.get("status") != "missing") / len(documents)) * 100
        ) if documents else 0
        learning_progress = round(
            sum(module.get("progress", 0) for module in modules) / len(modules)
        ) if modules else 0
        profile_completion = max(0, min(100, int(candidate.get("profile_completion", 0) or 0)))
        readiness_score = round((profile_completion + document_completion + learning_progress) / 3)
        update = {
            "document_completion": document_completion,
            "learning_progress": learning_progress,
            "learning_completion": learning_progress,
            "readiness_score": readiness_score,
            "hr_status": "Completed" if readiness_score >= 100 else "In Progress",
        }
        if last_activity:
            update["last_activity"] = last_activity
        hr_repository.update_candidate(candidate_id, update)
    except Exception:
        pass


def _save_upload(file: UploadFile, folder: str) -> Dict[str, str]:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    target_dir = UPLOAD_DIR / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix.lower()
    safe_name = f"{uuid4().hex}{suffix}"
    target = target_dir / safe_name
    with target.open("wb") as out:
        out.write(file.file.read())
    return {
        "file_name": file.filename or safe_name,
        "file_path": str(target),
        "content_type": file.content_type or "application/octet-stream",
    }


def ensure_indexes():
    db = _db()
    db.pre_onboarding_departments.create_index([("name", ASCENDING)], unique=True)
    db.pre_onboarding_tasks.create_index([("department", ASCENDING), ("status", ASCENDING)])
    db.pre_onboarding_document_requirements.create_index([("name", ASCENDING)], unique=True)
    db.pre_onboarding_document_submissions.create_index([("candidate_id", ASCENDING), ("requirement_id", ASCENDING)])
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
        "content_type": payload.get("content_type", "document"),
        "duration_minutes": payload.get("duration_minutes", 15),
        **upload,
        "created_at": _now(),
        "updated_at": _now(),
    }
    _collection("pre_onboarding_tasks").insert_one(doc)
    audit("system", "create", "task", doc["id"], doc)
    return _public(doc)


def update_task(task_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    payload = {key: value for key, value in payload.items() if value is not None}
    payload["updated_at"] = _now()
    _collection("pre_onboarding_tasks").update_one({"id": task_id}, {"$set": payload})
    audit("system", "update", "task", task_id, payload)
    return _public(_collection("pre_onboarding_tasks").find_one({"id": task_id}))


def delete_task(task_id: str) -> bool:
    result = _collection("pre_onboarding_tasks").delete_one({"id": task_id})
    audit("system", "delete", "task", task_id)
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
        modules.append(
            {
                "id": task["id"],
                "title": task["title"],
                "description": task.get("description", ""),
                "category": task.get("department", "General"),
                "required": 1 if task.get("mandatory") else 0,
                "duration_minutes": task.get("duration_minutes", 15),
                "file_url": f"/api/learning/modules/{task['id']}/download" if task.get("file_path") else "",
                "content_type": task.get("content_type", "document"),
                "uploaded_by": task.get("uploaded_by", "HR"),
                "progress": item.get("progress", 0),
            }
        )
    return modules


def update_learning_progress(candidate_id: str, task_id: str, progress: int) -> Dict[str, Any]:
    progress = max(0, min(100, progress))
    doc = {
        "candidate_id": candidate_id,
        "task_id": task_id,
        "progress": progress,
        "completed": progress >= 100,
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
    return _public(doc)


def update_document_requirement(requirement_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    payload = {key: value for key, value in payload.items() if value is not None}
    payload["updated_at"] = _now()
    _collection("pre_onboarding_document_requirements").update_one({"id": requirement_id}, {"$set": payload})
    audit("system", "update", "document_requirement", requirement_id, payload)
    return _public(_collection("pre_onboarding_document_requirements").find_one({"id": requirement_id}))


def delete_document_requirement(requirement_id: str) -> bool:
    result = _collection("pre_onboarding_document_requirements").delete_one({"id": requirement_id})
    audit("system", "delete", "document_requirement", requirement_id)
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
        rows.append(
            {
                "id": req["id"],
                "name": req["name"],
                "status": submission.get("status", "missing"),
                "deadline": (datetime.now(timezone.utc).date() + timedelta(days=req.get("due_days_before_joining", 7))).isoformat(),
                "file_name": submission.get("file_name"),
                "uploaded_at": submission.get("uploaded_at").isoformat() if isinstance(submission.get("uploaded_at"), datetime) else submission.get("uploaded_at"),
                "comments": submission.get("comments", ""),
                "accepted_formats": req.get("accepted_formats", []),
            }
        )
    return rows


def upload_candidate_document(candidate_id: str, requirement_id: str, file: UploadFile) -> Dict[str, Any]:
    upload = _save_upload(file, "documents")
    doc = {
        "candidate_id": candidate_id,
        "requirement_id": requirement_id,
        "status": "submitted",
        **upload,
        "uploaded_at": _now(),
        "updated_at": _now(),
    }
    _collection("pre_onboarding_document_submissions").update_one(
        {"candidate_id": candidate_id, "requirement_id": requirement_id},
        {"$set": doc, "$setOnInsert": {"id": f"docsub_{uuid4().hex[:10]}", "created_at": _now(), "version": 1}},
        upsert=True,
    )
    create_notification(candidate_id, "Document uploaded", f"{upload['file_name']} was uploaded for review.")
    audit(candidate_id, "upload", "document", requirement_id, upload)
    _sync_candidate_metrics(candidate_id, f"Uploaded {upload['file_name']}")
    return _public(doc)


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
    audit(candidate_id, "remove", "document", requirement_id, {"file_name": existing.get("file_name")})
    _sync_candidate_metrics(candidate_id, "Removed uploaded document")
    return result.deleted_count > 0


def review_candidate_document(candidate_id: str, requirement_id: str, status: str, comments: str = "") -> Optional[Dict[str, Any]]:
    payload = {"status": status, "comments": comments, "reviewed_at": _now(), "updated_at": _now()}
    _collection("pre_onboarding_document_submissions").update_one(
        {"candidate_id": candidate_id, "requirement_id": requirement_id},
        {"$set": payload},
    )
    create_notification(candidate_id, f"Document {status}", comments or f"Your document was {status}.")
    audit("system", "review", "document", requirement_id, payload)
    _sync_candidate_metrics(candidate_id, f"Document {status}")
    return _public(_collection("pre_onboarding_document_submissions").find_one({"candidate_id": candidate_id, "requirement_id": requirement_id}))


def create_notification(user_id: str, title: str, message: str, channel: str = "in_app") -> Dict[str, Any]:
    doc = {
        "id": f"notif_{uuid4().hex[:10]}",
        "user_id": user_id,
        "title": title,
        "message": message,
        "channel": channel,
        "read": False,
        "created_at": _now(),
    }
    _collection("pre_onboarding_notifications").insert_one(doc)
    return _public(doc)


def list_notifications(user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {"user_id": user_id}
    if unread_only:
        query["read"] = False
    return [_public(doc) for doc in _collection("pre_onboarding_notifications").find(query).sort("created_at", DESCENDING)]


def mark_notification_read(notification_id: str) -> Optional[Dict[str, Any]]:
    _collection("pre_onboarding_notifications").update_one({"id": notification_id}, {"$set": {"read": True}})
    return _public(_collection("pre_onboarding_notifications").find_one({"id": notification_id}))


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
