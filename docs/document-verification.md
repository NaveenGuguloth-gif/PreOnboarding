# Document Verification Module

This module adds AI-assisted document review without claiming that AI proves originality or authenticity. Trusted verification is only shown when a configured issuer, QR, or digital-signature provider returns a positive result. Missing providers return `VERIFICATION_UNAVAILABLE`.

## Flow

1. Employee uploads a document through `POST /api/documents/upload`.
2. `backend/preonboarding_repository.py` stores the file in `storage/uploads/documents`, records SHA-256 metadata, creates a document version, and sets `verification_status=PROCESSING`.
3. `backend/document_verification.py` runs the configured pipeline adapters: malware scan, document classification, OCR extraction, profile matching, duplicate hash check, QR/signature/trusted-source checks, risk scoring, and decision assignment.
4. Verification artifacts are stored in MongoDB collections:
   - `document_versions`
   - `document_extractions`
   - `verification_checks`
   - `verification_provider_results`
   - `verification_decisions`
   - `document_review_actions`
   - `document_audit_logs`
5. Employee Documents and HR Candidate Detail read from the same `pre_onboarding_document_submissions` row plus verification detail APIs.

## Statuses

- `VERIFIED`: trusted source, QR, digital signature, or HR manual approval supports the document.
- `PROVISIONALLY_VERIFIED`: configured OCR/profile checks passed, but trusted issuer verification is unavailable.
- `NEEDS_HR_REVIEW`: fields are missing, mismatched, duplicated, or otherwise require manual review.
- `REJECTED`: critical automated check failed or HR rejected the document.
- `VERIFICATION_UNAVAILABLE`: no supported verification path is configured.
- `PROCESSING`: upload is stored and verification is in progress.

## Configuration

Set these in `backend/.env` using `backend/.env.example` as the template:

| Variable | Purpose |
| --- | --- |
| `OCR_PROVIDER` / `OCR_API_KEY` | OCR adapter selection and credential. Current implementation uses `mock` unless replaced. |
| `QR_VERIFICATION_PROVIDER` | Secure QR adapter selection. `mock` returns `VERIFICATION_UNAVAILABLE`. |
| `DIGITAL_SIGNATURE_PROVIDER` | Digital-signature adapter selection. `mock` returns `VERIFICATION_UNAVAILABLE`. |
| `DIGILOCKER_CLIENT_ID` / `DIGILOCKER_CLIENT_SECRET` | Future trusted issuer integration credentials. |
| `PAN_VERIFICATION_API_KEY` | Future PAN verification integration credential. |
| `UNIVERSITY_VERIFICATION_API_KEY` | Future university verification integration credential. |
| `DOCUMENT_VERIFICATION_INLINE_QUEUE` | Keeps processing inline for the current FastAPI app. Replace with a worker-backed queue when needed. |
| `DOCUMENT_STORAGE_PRIVATE` | Documents are served through authenticated API download endpoints. |

## API Surface

- `GET /api/documents?candidate_id=...`: employee document list with verification summary fields.
- `POST /api/documents/upload?documentId=...`: upload and trigger verification.
- `GET /api/documents/{document_id}/verification?candidate_id=...`: employee verification details.
- `POST /api/documents/{document_id}/verification/retry`: employee retry request.
- `GET /api/hr/document-verification/review-cases`: HR queue of documents needing review.
- `GET /api/hr/candidates/{candidate_id}/documents/{requirement_id}/verification`: HR verification details.
- `POST /api/hr/candidates/{candidate_id}/documents/{requirement_id}/verification/retry`: HR retry.
- `POST /api/hr/candidates/{candidate_id}/documents/{requirement_id}/review`: HR manual approve/reject/re-upload request.

## Provider Extension Points

Replace the adapter classes in `backend/document_verification.py`:

- `OcrProvider.extract`
- `MalwareScanner.scan`
- `ExternalVerificationProvider.verify`

Provider failures should be stored as `VERIFICATION_UNAVAILABLE` unless the provider returns a confident rejection. Do not convert unavailable external data into fake place-holder verification.
