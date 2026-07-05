from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pymongo import ASCENDING, DESCENDING

from backend.db_manager import client
from backend.settings import settings


COLLECTION = "pre_onboarding_candidates"


def _collection():
    if client is None:
        return None
    db = client[settings.DB_NAME]
    collection = db[COLLECTION]
    collection.create_index([("email", ASCENDING)], unique=True)
    collection.create_index([("employee_id", ASCENDING)], unique=True)
    collection.create_index([("department", ASCENDING), ("joining_date", ASCENDING)])
    collection.create_index([("status", ASCENDING)])
    return collection


def _seed_candidates_if_empty(collection):
    if collection.count_documents({}) > 0:
        return

    today = datetime.now(timezone.utc).date()
    docs = [
        {
            "id": "emp-001",
            "name": "Aarav Kulkarni",
            "email": "aarav.kulkarni@tatamotors.com",
            "phone": "+91 98765 43210",
            "employee_id": "TM-2026-1042",
            "department": "Vehicle Software",
            "designation": "Graduate Engineer Trainee",
            "role": "Graduate Engineer Trainee",
            "location": "Pune Plant",
            "joining_date": str(today + timedelta(days=18)),
            "hr_status": "In Progress",
            "manager_status": "Pending",
            "learning_progress": 51,
            "document_completion": 50,
            "profile_completion": 92,
            "readiness_score": 64,
            "current_stage": "Documents",
            "last_activity": "Uploaded Aadhaar Card",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        {
            "id": "emp-002",
            "name": "Nisha Menon",
            "email": "nisha.menon@tatamotors.com",
            "phone": "+91 91234 56780",
            "employee_id": "TM-2026-1065",
            "department": "Manufacturing",
            "designation": "Production Engineer",
            "role": "Production Engineer",
            "location": "Sanand Plant",
            "joining_date": str(today + timedelta(days=24)),
            "hr_status": "In Progress",
            "manager_status": "Approved",
            "learning_progress": 62,
            "document_completion": 75,
            "profile_completion": 85,
            "readiness_score": 73,
            "current_stage": "Learning",
            "last_activity": "Completed Code of Conduct",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        {
            "id": "emp-003",
            "name": "Kabir Singh",
            "email": "kabir.singh@tatamotors.com",
            "phone": "+91 99887 77665",
            "employee_id": "TM-2026-1091",
            "department": "Quality",
            "designation": "Quality Analyst",
            "role": "Quality Analyst",
            "location": "Lucknow Plant",
            "joining_date": str(today + timedelta(days=11)),
            "hr_status": "Completed",
            "manager_status": "Approved",
            "learning_progress": 88,
            "document_completion": 100,
            "profile_completion": 100,
            "readiness_score": 92,
            "current_stage": "Ready",
            "last_activity": "HR approved documents",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
    ]
    collection.insert_many(docs)


def _public(candidate: Dict[str, Any]) -> Dict[str, Any]:
    candidate = dict(candidate)
    candidate.pop("_id", None)
    return candidate


def _query_filter(
    search: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    readiness_min: Optional[int] = None,
    readiness_max: Optional[int] = None,
) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    if search:
      query["$or"] = [
          {"name": {"$regex": search, "$options": "i"}},
          {"employee_id": {"$regex": search, "$options": "i"}},
          {"email": {"$regex": search, "$options": "i"}},
          {"department": {"$regex": search, "$options": "i"}},
          {"hr_status": {"$regex": search, "$options": "i"}},
          {"phone": {"$regex": search, "$options": "i"}},
      ]
    if department:
        query["department"] = department
    if status:
        query["hr_status"] = status
    readiness: Dict[str, int] = {}
    if readiness_min is not None:
        readiness["$gte"] = readiness_min
    if readiness_max is not None:
        readiness["$lte"] = readiness_max
    if readiness:
        query["readiness_score"] = readiness
    return query


def list_candidates(
    search: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    readiness_min: Optional[int] = None,
    readiness_max: Optional[int] = None,
    sort: str = "joining_date",
    order: str = "desc",
    page: int = 1,
    limit: int = 25,
) -> Dict[str, Any]:
    collection = _collection()
    if collection is None:
        raise RuntimeError("MongoDB is not available")
    _seed_candidates_if_empty(collection)

    page = max(page, 1)
    limit = min(max(limit, 1), 100)
    query = _query_filter(search, department, status, readiness_min, readiness_max)
    direction = DESCENDING if order.lower() == "desc" else ASCENDING
    sort_key = sort if sort in {"joining_date", "name", "department", "readiness_score", "document_completion"} else "joining_date"

    total = collection.count_documents(query)
    cursor = (
        collection.find(query)
        .sort(sort_key, direction)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    return {
        "candidates": [_public(candidate) for candidate in cursor],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        },
    }


def get_candidate(candidate_id: str) -> Optional[Dict[str, Any]]:
    collection = _collection()
    if collection is None:
        raise RuntimeError("MongoDB is not available")
    _seed_candidates_if_empty(collection)
    doc = collection.find_one({"id": candidate_id})
    return _public(doc) if doc else None


def create_candidate(payload: Dict[str, Any]) -> Dict[str, Any]:
    collection = _collection()
    if collection is None:
        raise RuntimeError("MongoDB is not available")

    now = datetime.now(timezone.utc)
    doc = {
        "id": payload.get("id") or f"cand_{uuid4().hex[:10]}",
        "name": payload["name"],
        "email": payload["email"],
        "phone": payload.get("phone", ""),
        "employee_id": payload["employee_id"],
        "department": payload["department"],
        "designation": payload.get("designation") or payload.get("role", ""),
        "role": payload.get("role") or payload.get("designation", ""),
        "location": payload.get("location", ""),
        "joining_date": payload["joining_date"],
        "hr_status": payload.get("hr_status", "In Progress"),
        "manager_status": payload.get("manager_status", "Pending"),
        "learning_progress": payload.get("learning_progress", 0),
        "document_completion": payload.get("document_completion", 0),
        "profile_completion": payload.get("profile_completion", 70),
        "readiness_score": payload.get("readiness_score", 0),
        "current_stage": payload.get("current_stage", "Registered"),
        "last_activity": "Candidate registered",
        "created_at": now,
        "updated_at": now,
    }
    collection.insert_one(doc)
    return _public(doc)


def update_candidate(candidate_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    collection = _collection()
    if collection is None:
        raise RuntimeError("MongoDB is not available")
    payload = {k: v for k, v in payload.items() if v is not None}
    payload["updated_at"] = datetime.now(timezone.utc)
    collection.update_one({"id": candidate_id}, {"$set": payload})
    return get_candidate(candidate_id)


def delete_candidate(candidate_id: str) -> bool:
    collection = _collection()
    if collection is None:
        raise RuntimeError("MongoDB is not available")
    result = collection.delete_one({"id": candidate_id})
    return result.deleted_count > 0


def analytics() -> Dict[str, Any]:
    collection = _collection()
    if collection is None:
        raise RuntimeError("MongoDB is not available")
    _seed_candidates_if_empty(collection)
    candidates = [_public(candidate) for candidate in collection.find({})]
    if not candidates:
        return {
            "totalCandidates": 0,
            "avgProfileCompletion": 0,
            "avgDocumentCompletion": 0,
            "avgLearningCompletion": 0,
            "avgReadinessScore": 0,
        }

    def avg(key: str) -> int:
        return round(sum(candidate.get(key, 0) for candidate in candidates) / len(candidates))

    return {
        "totalCandidates": len(candidates),
        "avgProfileCompletion": avg("profile_completion"),
        "avgDocumentCompletion": avg("document_completion"),
        "avgLearningCompletion": avg("learning_progress"),
        "avgReadinessScore": avg("readiness_score"),
        "pendingDocuments": sum(1 for candidate in candidates if candidate.get("document_completion", 0) < 100),
        "readyCandidates": sum(1 for candidate in candidates if candidate.get("readiness_score", 0) >= 90),
        "recentlyRegistered": sum(1 for candidate in candidates if candidate.get("current_stage") == "Registered"),
    }
