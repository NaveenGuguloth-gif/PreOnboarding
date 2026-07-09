# Pre-Onboarding Portal HLD and LLD

## High-Level Design

The portal is built around one canonical candidate onboarding aggregate. Feature pages must not invent independent document, learning, task, welcome kit, or notification state. Backend write operations rebuild the aggregate and persist it on the candidate record so HR and employee views read the same status.

### Core Principles

- Scalability: list APIs use pagination, filters, search, and indexed fields. HR dashboards should never fetch every candidate or every uploaded file.
- Availability: feature endpoints fail independently. UI pages show loading and error states and can retry failed mutations.
- Consistency: document upload, document review, profile update, learning progress, task updates, welcome kit updates, and notification changes rebuild the same onboarding aggregate.
- CAP posture: critical onboarding writes prefer consistency and partition tolerance. Analytics and notifications can lag slightly.
- ACID posture: critical write paths validate input first, perform durable metadata writes, audit actions, notify relevant users, and rebuild progress before returning success. MongoDB transactions should be enabled in deployment where replica set support is available.
- Security: JWT cookie auth, role checks for HR-only APIs, candidate ownership checks for employee APIs, protected file download routes, upload validation, and audit logs.
- Reliability: duplicate uploads replace the active file and keep version history. Rejections require a reason. Failed validation returns 400 before storage mutation.

## Canonical Candidate Aggregate

```text
candidate {
  id,
  name,
  email,
  role,
  department,
  joiningDate,
  documents[],
  tasks[],
  learning[],
  welcomeKit,
  notifications[],
  onboardingProgress,
  profileCompletion,
  documentCompletion,
  learningCompletion,
  readinessScore
}
```

Statuses are normalized before reaching the UI:

- Documents: `pending`, `uploaded`, `verified`, `rejected`
- Tasks: `pending`, `completed`
- Learning: `not_started`, `in_progress`, `completed`
- Welcome kit: `not_assigned`, `assigned`, `dispatched`, `delivered`

## Low-Level Design

### Main Collections

- `pre_onboarding_candidates`: canonical candidate profile plus denormalized onboarding aggregate.
- `pre_onboarding_document_requirements`: HR-managed required document definitions.
- `pre_onboarding_document_submissions`: active uploaded document metadata, candidateId, requirementId, status, version history.
- `pre_onboarding_tasks`: HR-created learning/checklist tasks.
- `pre_onboarding_learning_progress`: per-candidate task progress.
- `pre_onboarding_notifications`: candidate and HR notifications.
- `pre_onboarding_audit_logs`: immutable operational audit trail.

### Relationship Rules

- Documents always reference `candidate_id` and `requirement_id`.
- Learning progress always references `candidate_id` and `task_id`.
- Notifications always reference `user_id` and an action type.
- Critical records maintain `created_at` and `updated_at`.

### API Shape

Current compatible APIs:

- `GET /api/hr/candidates?page&limit&search&department&location&status`
- `GET /api/hr/candidates/{candidate_id}`
- `GET /api/onboarding/status/{candidate_id}`
- `GET /api/documents?candidate_id=...`
- `POST /api/documents/upload`
- `POST /api/hr/candidates/{candidate_id}/documents/{requirement_id}/review`
- `GET /api/learning/modules?candidate_id=...`
- `POST /api/learning/progress`
- `GET /api/notifications`
- `POST /api/notifications/{notification_id}/read`

Enterprise target aliases can be added without changing the service layer:

- `GET /candidates`
- `GET /candidates/:id`
- `POST /candidates/:id/documents`
- `PATCH /documents/:id/status`
- `POST /candidates/:id/tasks`
- `PATCH /tasks/:id/status`
- `PATCH /learning/:id/status`
- `PATCH /welcome-kit/:candidateId/status`
- `GET /notifications`
- `PATCH /notifications/:id/read`

## Critical Flow Guarantees

### Document Upload

1. Authenticate candidate.
2. Verify candidate owns the target `candidate_id`.
3. Validate non-empty file, extension, MIME type, and size.
4. Save file.
5. Upsert document metadata as `uploaded`.
6. Append version history.
7. Notify candidate and HR.
8. Audit upload.
9. Rebuild and persist candidate onboarding aggregate.

### HR Review

1. Authenticate HR.
2. Require status `verified`/`approved` or `rejected`.
3. Require rejection reason for rejected documents.
4. Update document metadata.
5. Notify candidate.
6. Audit review.
7. Rebuild and persist candidate onboarding aggregate.

### Learning and Tasks

HR task changes refresh all candidate aggregates. Candidate progress updates refresh the candidate aggregate and HR dashboard metrics.

### Welcome Kit

Welcome kit updates are made through the HR candidate update endpoint and rebuild the same aggregate. Employee dashboard reads the aggregate-backed status.

## Frontend State Rules

- API service methods pass the logged-in auth user ID for candidate-owned resources.
- After upload, remove, learning progress, notification read, and HR updates, pages refetch or receive aggregate-backed responses.
- UI status labels use the normalized statuses from the backend.
- Demo fallback state exists only for offline development and follows the same status semantics.

## Operational Notes

- Production MongoDB should run as a replica set so multi-document transactions can be enabled for upload/review flows.
- File storage should move to managed object storage with signed URLs for production.
- Analytics and notification counts can be cached or eventually consistent.
- Candidate and HR dashboards should keep pagination limits at or below 100 per request.
