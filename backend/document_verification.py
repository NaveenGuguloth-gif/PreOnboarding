from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4


VERIFIED = "VERIFIED"
PROVISIONALLY_VERIFIED = "PROVISIONALLY_VERIFIED"
NEEDS_HR_REVIEW = "NEEDS_HR_REVIEW"
REJECTED = "REJECTED"
VERIFICATION_UNAVAILABLE = "VERIFICATION_UNAVAILABLE"
PROCESSING = "PROCESSING"


DOCUMENT_REGISTRY: Dict[str, Dict[str, Any]] = {
    "aadhaar": {"labels": ["aadhaar", "aadhar"], "required_fields": ["full_name", "document_number"], "number_pattern": r"\d{4}\s?\d{4}\s?\d{4}"},
    "pan": {"labels": ["pan"], "required_fields": ["full_name", "document_number"], "number_pattern": r"[A-Z]{5}[0-9]{4}[A-Z]"},
    "passport": {"labels": ["passport"], "required_fields": ["full_name", "document_number"], "number_pattern": r"[A-Z][0-9]{7}"},
    "driving_licence": {"labels": ["driving", "licence", "license", "dl"], "required_fields": ["full_name", "document_number"], "number_pattern": r"[A-Z]{2}[0-9A-Z]{6,14}"},
    "degree_certificate": {"labels": ["degree", "graduation", "certificate"], "required_fields": ["full_name", "institution", "qualification"], "number_pattern": ""},
    "marks_memo": {"labels": ["marks", "memo", "marksheet"], "required_fields": ["full_name", "institution"], "number_pattern": ""},
    "experience_letter": {"labels": ["experience"], "required_fields": ["full_name", "issuer"], "number_pattern": ""},
    "address_proof": {"labels": ["address"], "required_fields": ["full_name", "address"], "number_pattern": ""},
    "bank_proof": {"labels": ["bank"], "required_fields": ["account_holder_name"], "number_pattern": ""},
    "photograph": {"labels": ["photo", "photograph", "passport photo"], "required_fields": [], "number_pattern": ""},
    "other": {"labels": [], "required_fields": [], "number_pattern": ""},
}


SENSITIVE_KEYS = {"document_number", "account_number", "aadhaar", "pan", "passport"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def mask_sensitive(key: str, value: Any) -> Any:
    if value is None:
        return None
    text = str(value)
    if key not in SENSITIVE_KEYS and "number" not in key:
        return value
    if len(text) <= 4:
        return "****"
    return f"{'*' * max(4, len(text) - 4)}{text[-4:]}"


def normalize_text(value: Any) -> str:
    if not value:
        return ""
    text = str(value).casefold()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_date(value: Any) -> str:
    if not value:
        return ""
    text = str(value).strip()
    for pattern in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(text, pattern).date().isoformat()
        except ValueError:
            continue
    return text


def name_match_score(left: Any, right: Any) -> float:
    left_norm = normalize_text(left)
    right_norm = normalize_text(right)
    if not left_norm or not right_norm:
        return 0.0
    if left_norm == right_norm:
        return 1.0
    left_parts = left_norm.split()
    right_parts = right_norm.split()
    if sorted(left_parts) == sorted(right_parts):
        return 0.94
    overlap = len(set(left_parts) & set(right_parts))
    total = max(len(set(left_parts) | set(right_parts)), 1)
    score = overlap / total
    initials_left = "".join(part[0] for part in left_parts if part)
    initials_right = "".join(part[0] for part in right_parts if part)
    if initials_left and initials_right and (initials_left in initials_right or initials_right in initials_left):
        score = max(score, 0.78)
    return round(score, 2)


def classify_document(requirement_name: str, filename: str = "") -> str:
    source = normalize_text(f"{requirement_name} {filename}")
    for doc_type, config in DOCUMENT_REGISTRY.items():
        if doc_type == "other":
            continue
        if any(label in source for label in config["labels"]):
            return doc_type
    return "other"


@dataclass
class ProviderResult:
    provider: str
    check_type: str
    status: str
    reason: str
    metadata: Dict[str, Any]


class MalwareScanner:
    name = "mock_malware_scanner"

    def scan(self, file_path: str) -> ProviderResult:
        suffix = Path(file_path).suffix.lower()
        if suffix in {".exe", ".js", ".sh", ".bat"}:
            return ProviderResult(self.name, "malware_scan", REJECTED, "Executable file type is not allowed.", {})
        return ProviderResult(self.name, "malware_scan", VERIFIED, "No malware indicators found by configured scanner.", {})


class OcrProvider:
    name = "mock_ocr"

    def extract(self, file_path: str, document_type: str, candidate: Dict[str, Any], requirement: Dict[str, Any]) -> Dict[str, Any]:
        fields: Dict[str, Any] = {}
        confidence: Dict[str, float] = {}
        candidate_name = candidate.get("name") or candidate.get("full_name")
        if candidate_name:
            fields["full_name"] = candidate_name
            confidence["full_name"] = 0.82
        if candidate.get("date_of_birth") or candidate.get("dob"):
            fields["date_of_birth"] = normalize_date(candidate.get("date_of_birth") or candidate.get("dob"))
            confidence["date_of_birth"] = 0.76
        if document_type == "bank_proof":
            fields["account_holder_name"] = candidate_name
            confidence["account_holder_name"] = 0.78
        if document_type in {"degree_certificate", "marks_memo"}:
            fields["institution"] = None
            fields["qualification"] = None
            confidence["institution"] = 0.0
            confidence["qualification"] = 0.0
        return {
            "provider": self.name,
            "raw_response": {"message": "Mock OCR provider. Configure an OCR service for production extraction."},
            "fields": fields,
            "confidence": confidence,
            "processed_at": now_iso(),
        }


class ExternalVerificationProvider:
    name = "mock_external_verification"

    def verify(self, document_type: str, fields: Dict[str, Any]) -> List[ProviderResult]:
        checks = []
        checks.append(ProviderResult("secure_qr", "secure_qr", VERIFICATION_UNAVAILABLE, "Secure QR provider is not configured.", {}))
        checks.append(ProviderResult("digital_signature", "digital_signature", VERIFICATION_UNAVAILABLE, "Digital-signature provider is not configured.", {}))
        checks.append(ProviderResult("trusted_issuer", "trusted_source", VERIFICATION_UNAVAILABLE, f"No trusted issuer adapter configured for {document_type}.", {}))
        return checks


def compare_profile(fields: Dict[str, Any], candidate: Dict[str, Any]) -> List[Dict[str, Any]]:
    checks: List[Dict[str, Any]] = []
    extracted_name = fields.get("full_name") or fields.get("account_holder_name")
    candidate_name = candidate.get("name") or candidate.get("full_name")
    score = name_match_score(extracted_name, candidate_name)
    if extracted_name or candidate_name:
        checks.append({
            "check_type": "profile_name_match",
            "status": VERIFIED if score >= 0.9 else (NEEDS_HR_REVIEW if score >= 0.65 else REJECTED),
            "score": score,
            "reason": "Extracted name compared with employee profile.",
            "extracted_value": extracted_name,
            "profile_value": candidate_name,
        })
    extracted_dob = normalize_date(fields.get("date_of_birth"))
    profile_dob = normalize_date(candidate.get("date_of_birth") or candidate.get("dob"))
    if extracted_dob or profile_dob:
        checks.append({
            "check_type": "profile_dob_match",
            "status": VERIFIED if extracted_dob and extracted_dob == profile_dob else NEEDS_HR_REVIEW,
            "score": 1.0 if extracted_dob and extracted_dob == profile_dob else 0.5,
            "reason": "Extracted date of birth compared with employee profile.",
            "extracted_value": extracted_dob or None,
            "profile_value": profile_dob or None,
        })
    return checks


def risk_score(checks: List[Dict[str, Any]]) -> Dict[str, Any]:
    score = 50
    rules = []
    weights = {
        VERIFIED: 15,
        PROVISIONALLY_VERIFIED: 8,
        VERIFICATION_UNAVAILABLE: 0,
        NEEDS_HR_REVIEW: -15,
        REJECTED: -45,
    }
    for check in checks:
        status = check.get("status")
        delta = weights.get(status, 0)
        score += delta
        rules.append({
            "rule": check.get("check_type"),
            "status": status,
            "weight": delta,
            "reason": check.get("reason", ""),
        })
    return {"score": max(0, min(100, score)), "rules": rules}


def decide_status(checks: List[Dict[str, Any]], score: int) -> Dict[str, Any]:
    statuses = {check.get("status") for check in checks}
    if REJECTED in statuses:
        return {"status": REJECTED, "level": "failed", "explanation": "A critical automated check failed or the file is unsupported."}
    if VERIFIED in statuses and any(check.get("check_type") in {"trusted_source", "secure_qr", "digital_signature"} and check.get("status") == VERIFIED for check in checks):
        return {"status": VERIFIED, "level": "trusted_source", "explanation": "A trusted source, QR code, or digital signature verified the document."}
    if NEEDS_HR_REVIEW in statuses or score < 55:
        return {"status": NEEDS_HR_REVIEW, "level": "manual_review", "explanation": "The document is readable, but one or more fields require HR review."}
    if statuses and statuses <= {VERIFIED, VERIFICATION_UNAVAILABLE}:
        return {"status": PROVISIONALLY_VERIFIED, "level": "automated", "explanation": "OCR/profile checks passed, but no trusted issuer verification is configured."}
    return {"status": VERIFICATION_UNAVAILABLE, "level": "unavailable", "explanation": "No supported verification method is configured for this document type."}


def build_verification_result(
    submission: Dict[str, Any],
    candidate: Dict[str, Any],
    requirement: Dict[str, Any],
    duplicate_count: int = 0,
) -> Dict[str, Any]:
    document_type = classify_document(requirement.get("name", ""), submission.get("file_name", ""))
    scanner_result = MalwareScanner().scan(submission["file_path"])
    extraction = OcrProvider().extract(submission["file_path"], document_type, candidate, requirement)
    fields = extraction.get("fields", {})
    checks: List[Dict[str, Any]] = [
        {
            "id": f"check_{uuid4().hex[:10]}",
            "check_type": scanner_result.check_type,
            "provider": scanner_result.provider,
            "status": scanner_result.status,
            "score": 1.0 if scanner_result.status == VERIFIED else 0.0,
            "reason": scanner_result.reason,
            "metadata": scanner_result.metadata,
        }
    ]
    checks.extend({"id": f"check_{uuid4().hex[:10]}", **check} for check in compare_profile(fields, candidate))
    config = DOCUMENT_REGISTRY.get(document_type, DOCUMENT_REGISTRY["other"])
    pattern = config.get("number_pattern")
    doc_number = fields.get("document_number")
    if pattern and doc_number:
        checks.append({
            "id": f"check_{uuid4().hex[:10]}",
            "check_type": "document_number_format",
            "status": VERIFIED if re.fullmatch(pattern, str(doc_number).strip(), flags=re.IGNORECASE) else NEEDS_HR_REVIEW,
            "score": 1.0,
            "reason": "Document number format checked against registry pattern.",
        })
    missing = [field for field in config.get("required_fields", []) if not fields.get(field)]
    if missing:
        checks.append({
            "id": f"check_{uuid4().hex[:10]}",
            "check_type": "required_fields",
            "status": NEEDS_HR_REVIEW,
            "score": 0.4,
            "reason": f"Missing extracted fields: {', '.join(missing)}.",
            "metadata": {"missing_fields": missing},
        })
    checks.append({
        "id": f"check_{uuid4().hex[:10]}",
        "check_type": "duplicate_file",
        "status": NEEDS_HR_REVIEW if duplicate_count > 0 else VERIFIED,
        "score": 0.3 if duplicate_count > 0 else 1.0,
        "reason": "Duplicate file hash found for another employee." if duplicate_count > 0 else "No duplicate file hash found for another employee.",
        "metadata": {"duplicate_count": duplicate_count},
    })
    for result in ExternalVerificationProvider().verify(document_type, fields):
        checks.append({
            "id": f"check_{uuid4().hex[:10]}",
            "check_type": result.check_type,
            "provider": result.provider,
            "status": result.status,
            "score": 0.0,
            "reason": result.reason,
            "metadata": result.metadata,
        })
    risk = risk_score(checks)
    decision = decide_status(checks, risk["score"])
    return {
        "document_type": document_type,
        "extraction": extraction,
        "checks": checks,
        "provider_results": [check for check in checks if check.get("provider")],
        "risk": risk,
        "decision": {
            "id": f"decision_{uuid4().hex[:10]}",
            **decision,
            "overall_score": risk["score"],
            "decided_at": now_iso(),
        },
    }
