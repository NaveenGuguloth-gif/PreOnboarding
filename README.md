# Pre-Onboarding Dashboard Developer Manual

This repository contains a full pre-onboarding dashboard with separate HR and Employee experiences. It includes authentication, candidate readiness tracking, document upload and HR review, HR-created learning content, notifications, welcome-kit aggregation, an AI assistant, and relocation support.

This README is the single onboarding and configuration manual for the project. It documents only the implementation currently present in this repository.

## Quick Start

```bash
# 1. Backend
cd /home/naveen/Pre-Onboarding
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8001

# 2. Frontend
cd /home/naveen/Pre-Onboarding/frontend
npm install
npm run dev
```

Open the frontend at `http://localhost:5173`.

The frontend has a local fallback demo mode in `frontend/src/services/api.js` if the backend or MongoDB is unavailable. Demo users are defined at `frontend/src/services/api.js:21-55`.

Default demo credentials:

| Role | Identifier | Password | Source |
|---|---|---|---|
| Employee | `aarav.kulkarni@tatamotors.com` | `password` | `frontend/src/services/api.js:23-38` |
| HR | `meera.shah@tatamotors.com` | `password` | `frontend/src/services/api.js:40-54` |

## Tech Stack

| Layer | Technology | Real Source |
|---|---|---|
| Frontend | React 18, React Router, Axios, Vite, Tailwind CSS | `frontend/package.json:10-22` |
| Backend | FastAPI, Uvicorn, Pydantic Settings, PyMongo, PyJWT, passlib | `backend/requirements.txt:4-20`, `backend/requirements.txt:41-44` |
| Database | MongoDB via `pymongo` | `backend/db_manager.py:17-29` |
| AI Assistant / Relocation AI | OpenAI-compatible chat completions endpoint configured by env vars | `backend/app.py:1903-1915`, `backend/app.py:2052-2071` |
| Vector RAG | External retrieval API plus Milvus settings | `backend/app.py:1818-1831` |
| Upload Storage | Local filesystem under `storage/uploads` | `backend/preonboarding_repository.py:14`, `backend/preonboarding_repository.py:157-188` |

## Project Architecture

```text
Pre-Onboarding/
  backend/
    app.py                         FastAPI app, routes, auth, assistant, relocation
    settings.py                    All backend env variables and Mongo URI selection
    db_manager.py                  Mongo client and chat/thread collection setup
    hr_repository.py               HR candidate CRUD, filtering, analytics seed data
    preonboarding_repository.py    Departments, learning, documents, notifications, aggregate status
    auth_manager.py                JWT helper functions for auth manager collection
    DemoApp_service.py             WebSocket chat/service integration and RAG helpers
    vector_database_creation.py    Milvus/vector ingestion helpers
    prompts/
      prompts.yaml                 Prompt templates
  frontend/
    src/
      services/api.js              Axios client, API wrappers, local fallback demo state
      routes/AppRoutes.jsx         Route map and HR/employee route guards
      context/AuthContext.jsx      Auth state provider
      pages/dashboard/             Employee dashboard pages
      pages/hr/                    HR dashboard pages
      layouts/                     Shared dashboard/auth layouts
      components/                  Shared UI, sidebar, header, loading components
    public/assets/                 Static frontend assets
    vite.config.js                 Vite base path / PUBLIC_URL handling
    package.json                   Frontend dependencies and scripts
  docs/pre-onboarding-hld-lld.md   Architecture notes for aggregate-backed state
```

## Runtime Architecture

1. Browser renders React routes from `frontend/src/routes/AppRoutes.jsx:39-76`.
2. API wrappers call `frontend/src/services/api.js`, where `BASE_URL` is read from `VITE_API_BASE_URL` at `frontend/src/services/api.js:3`.
3. Backend requests hit FastAPI routes in `backend/app.py`.
4. MongoDB connection comes from `backend/settings.py:54-90` and `backend/db_manager.py:17-29`.
5. HR writes candidate, task, document, notification, or department state.
6. `backend/preonboarding_repository.py:889-958` rebuilds the aggregate onboarding status so HR and Employee views read consistent data.

## Environment Setup

### Backend `.env`

Create `backend/.env`. `backend/settings.py` loads this file at `backend/settings.py:67-69`.

```env
# Runtime
ENV=dev
FRONTEND_URL=http://127.0.0.1:5173
BACKEND_URL=http://127.0.0.1:8001
APP_NAME=pre_onboarding

# Auth
JWT_SECRET=change-this-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# OAuth - optional. Leave blank if not using provider login.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# MongoDB. Use either MONGODB_URI or the dynamic company DB fields below.
MONGODB_URI=
DATABASE_NAME=
mongo_username=
mongo_password=
MONGO_HOST=localhost
MONGO_PORT=27017
DB_NAME_DEV=pre_onboarding
DB_NAME_PROD=pre_onboarding
MONGO_COLLECTION_NAME=pre_onboarding_logs

# OpenAI-compatible / Neuroverse AI
openai_api_base=https://neuroverse.tatamotors.com/monitoring_v2/v1
openai_api_key=EMPTY
model_name_llm=neuroverse-meta-llama--Llama-3.1-8B-Instruct
router_model_name=neuroverse-gpt-oss-120b
vision_model_name=neuroverse-Qwen2.5-VL-72B-Instruct
code_model_name=neuroverse-gpt-oss-120b

# Embeddings / vector retrieval
allMini_emb_api=https://neuroverse.tatamotors.com/monitoring_v2/v1/embeddings
model_name_emb=neuroverse-all-MiniLM-L6-v2
milvus_base=
milvus_port=19530
milvus_user=
milvus_password=
vector_db_name=
collection_name=Pre-onboarding
retrieval_api=

# Speech endpoints used by /transcribe_audio and /text_to_speech.
STT_API_URL=https://neuroverse.tatamotors.com/code-stt/transcribe_audio
TTS_API_URL=https://neuroverse.tatamotors.com/code-tts/text_to_speech
```

### Frontend `.env`

Create `frontend/.env` if changing defaults.

```env
VITE_API_BASE_URL=http://localhost:8001
PUBLIC_URL=/
```

`VITE_API_BASE_URL` is read at `frontend/src/services/api.js:3` and `frontend/src/pages/dashboard/Learning.jsx:7`. `PUBLIC_URL` is read by Vite at `frontend/vite.config.js:5-12` and consumed by React Router at `frontend/src/App.jsx:5-10`.

## Environment Variables

| Variable | Used By | Code Reference | Purpose | Default |
|---|---|---|---|---|
| `ENV` | Backend | `backend/settings.py:10`, `backend/settings.py:72-79` | Selects dev/prod DB name when `DATABASE_NAME` is not set | `dev` |
| `FRONTEND_URL` | Backend OAuth | `backend/settings.py:19`, `backend/app.py:622-626` | OAuth callback redirect target | `http://127.0.0.1:5173` |
| `BACKEND_URL` | Backend OAuth | `backend/settings.py:20`, `backend/app.py:599-600` | OAuth provider redirect URI base | `http://127.0.0.1:8001` |
| `JWT_SECRET` | Auth | `backend/settings.py:15`, `backend/app.py:650-662` | Signs app tokens and OAuth state | `change-me-in-env` |
| `JWT_ALGORITHM` | Auth | `backend/settings.py:16`, `backend/app.py:650-662` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Auth | `backend/settings.py:17`, `backend/auth_manager.py:17-19` | Token expiry for helper auth manager | `480` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth | `backend/settings.py:22-23`, `backend/app.py:570-578` | Google OAuth | blank |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` | OAuth | `backend/settings.py:24-26`, `backend/app.py:579-586` | Microsoft OAuth | `common` tenant |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | OAuth | `backend/settings.py:27-28`, `backend/app.py:587-595` | GitHub OAuth | blank |
| `MONGODB_URI` | Database | `backend/settings.py:54`, `backend/settings.py:82-84` | Full Mongo connection URI override | blank |
| `DATABASE_NAME` | Database | `backend/settings.py:55`, `backend/settings.py:72-75` | Overrides `DB_NAME_DEV` / `DB_NAME_PROD` | blank |
| `mongo_username`, `mongo_password` | Database | `backend/settings.py:56-58`, `backend/settings.py:85-90` | Dynamic Mongo URI credentials | blank |
| `MONGO_HOST`, `MONGO_PORT` | Database | `backend/settings.py:59-60`, `backend/settings.py:86-89` | Dynamic Mongo host and port | `localhost`, `27017` |
| `DB_NAME_DEV`, `DB_NAME_PROD` | Database | `backend/settings.py:61-63`, `backend/settings.py:72-79` | Environment-specific DB names | `pre_onboarding` |
| `MONGO_COLLECTION_NAME` | Chat logs | `backend/settings.py:63`, `backend/db_manager.py:17-29` | Thread/chat collection name | `pre_onboarding_logs` |
| `APP_NAME` | Backend router prefix metadata | `backend/settings.py:64`, `backend/app.py:73-75` | Prefix on unused `router` object | `pre_onboarding` |
| `openai_api_base` | Assistant, relocation, chat service | `backend/settings.py:35`, `backend/app.py:1903-1915`, `backend/app.py:2052-2071` | OpenAI-compatible API base | Neuroverse URL |
| `openai_api_key` | Assistant, relocation, embeddings | `backend/settings.py:36`, `backend/app.py:1906-1908`, `backend/app.py:2054-2057` | AI API key | `EMPTY` |
| `model_name_llm` | Chat service | `backend/settings.py:31`, `backend/DemoApp_service.py:37-42` | Base LLM model | Neuroverse Llama |
| `router_model_name` | Assistant, relocation | `backend/settings.py:32`, `backend/app.py:1909`, `backend/app.py:2060` | Chat/completion model for assistant and relocation JSON | `neuroverse-gpt-oss-120b` |
| `vision_model_name`, `code_model_name` | Config only / future use | `backend/settings.py:33-34` | Available model config values | Neuroverse defaults |
| `allMini_emb_api`, `model_name_emb` | Vector RAG | `backend/settings.py:12-13`, `backend/app.py:1822-1824` | Embedding API/model for retrieval | Neuroverse defaults |
| `milvus_base`, `milvus_port`, `milvus_user`, `milvus_password`, `vector_db_name`, `collection_name` | Vector DB | `backend/settings.py:40-46`, `backend/vector_database_creation.py:103-106`, `backend/app.py:1824-1827` | Milvus/retrieval configuration | mostly blank |
| `retrieval_api` | Assistant vector RAG | `backend/settings.py:46`, `backend/app.py:1829-1831` | External retrieval endpoint | blank |
| `STT_API_URL`, `TTS_API_URL` | Speech routes | `backend/settings.py:49-50`, `backend/app.py:96-97`, `backend/app.py:160-185` | Speech-to-text and text-to-speech endpoints | Neuroverse defaults |
| `VITE_API_BASE_URL` | Frontend API | `frontend/src/services/api.js:3`, `frontend/src/pages/dashboard/Learning.jsx:7` | Backend URL for Axios/media URL resolution | `http://localhost:8001` |
| `PUBLIC_URL` | Frontend deployment base | `frontend/vite.config.js:5-12`, `frontend/src/App.jsx:5-10` | Base path for deployed SPA | `/` |

## Database Setup

The backend supports two MongoDB connection modes.

### Direct URI Mode

Set `MONGODB_URI` in `backend/.env`. `settings.MONGO_URI` returns it directly at `backend/settings.py:82-84`.

```env
MONGODB_URI=mongodb+srv://user:password@cluster/dbname?retryWrites=true&w=majority
```

### Company DB Dynamic URI Mode

Leave `MONGODB_URI` empty and set:

```env
ENV=dev
mongo_username=DemoApp_Admin
mongo_password=<company-mongo-password>
MONGO_HOST=172.22.95.31
MONGO_PORT=27017
DB_NAME_DEV=Dev_DemoApp
DB_NAME_PROD=Prod_DemoApp
```

The URI is built at `backend/settings.py:85-90`:

```text
mongodb://<mongo_username>:<url_encoded_password>@<MONGO_HOST>:<MONGO_PORT>/<DB_NAME>?authSource=<DB_NAME>
```

`DB_NAME` is selected at `backend/settings.py:72-79`: `DATABASE_NAME` wins; otherwise `ENV=prod` or `ENV=production` uses `DB_NAME_PROD`; everything else uses `DB_NAME_DEV`.

### Collections

| Collection | Purpose | Code Reference |
|---|---|---|
| `users` | Auth users for signup/login/OAuth | `backend/auth_manager.py:8`, `backend/app.py:815-906` |
| `MONGO_COLLECTION_NAME` value | Chat/thread logs | `backend/db_manager.py:17-29`, `backend/db_manager.py:43-45` |
| `pre_onboarding_candidates` | HR candidate records and aggregate status fields | `backend/hr_repository.py:11-27` |
| `pre_onboarding_departments` | HR-managed departments | `backend/preonboarding_repository.py:191-194`, `backend/preonboarding_repository.py:445-476` |
| `pre_onboarding_tasks` | HR-created learning/tasks: videos, PDFs, images, links | `backend/preonboarding_repository.py:194`, `backend/preonboarding_repository.py:479-532` |
| `pre_onboarding_document_requirements` | HR document requirements | `backend/preonboarding_repository.py:195`, `backend/preonboarding_repository.py:603-643` |
| `pre_onboarding_document_submissions` | Employee document uploads and versions | `backend/preonboarding_repository.py:196`, `backend/preonboarding_repository.py:646-844` |
| `pre_onboarding_learning_progress` | Per-candidate learning progress | `backend/preonboarding_repository.py:544-599` |
| `pre_onboarding_notifications` | HR and system notifications | `backend/preonboarding_repository.py:197`, `backend/preonboarding_repository.py:847-886` |
| `pre_onboarding_audit_logs` | Audit trail for documents/tasks/etc. | `backend/preonboarding_repository.py:198`, `backend/preonboarding_repository.py:201-210` |

Indexes are created in `backend/preonboarding_repository.py:191-198` and `backend/hr_repository.py:17-27`.

### Seed Data

Candidate seed data lives in `backend/hr_repository.py:30-103`. Learning/task seed data lives in `backend/preonboarding_repository.py:263-442`. The task seed is upserted by stable task IDs, so existing records are not overwritten.

## Installation and Run Commands

### Backend

```bash
cd /home/naveen/Pre-Onboarding
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8001
```

### Frontend

```bash
cd /home/naveen/Pre-Onboarding/frontend
npm install
npm run dev
```

### Build

```bash
cd /home/naveen/Pre-Onboarding/frontend
npm run build
npm run preview
```

Frontend scripts are defined at `frontend/package.json:5-9`.

### Smoke Checks

```bash
cd /home/naveen/Pre-Onboarding
python3 -m py_compile backend/app.py backend/preonboarding_repository.py

cd frontend
npm run build
```

## Production Deployment Notes

1. Set production backend env vars in `backend/.env` or your secret manager.
2. Use `ENV=prod` or `DATABASE_NAME=<exact-db>` for production Mongo selection.
3. Set `FRONTEND_URL` to the production SPA origin and `BACKEND_URL` to the public API origin. OAuth redirect URIs depend on these at `backend/app.py:599-626`.
4. Set frontend `VITE_API_BASE_URL` to the production backend URL.
5. If deploying under a path, set `PUBLIC_URL` before `npm run build`; Vite uses it at `frontend/vite.config.js:5-12`.
6. Serve `frontend/dist` from a static host and run FastAPI with a production ASGI server/process manager.
7. Persist `storage/uploads` or replace local upload storage with managed object storage. The current code writes to `storage/uploads` at `backend/preonboarding_repository.py:14` and `backend/preonboarding_repository.py:157-188`.

## API Surface

All API calls use cookies (`withCredentials: true`) from `frontend/src/services/api.js:8-12`.

| Area | Method/Path | Backend Reference | Frontend Wrapper |
|---|---|---|---|
| OAuth start/callback | `GET /api/auth/oauth/{provider}/start`, `GET /api/auth/oauth/{provider}/callback` | `backend/app.py:741-813` | `frontend/src/services/api.js:1227-1229` |
| Signup/login/me/logout | `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` | `backend/app.py:815-914` | `frontend/src/services/api.js:1230-1328` |
| Candidate profile/metrics | `GET /api/candidate/me`, `GET /api/candidate/metrics`, `PATCH /api/candidate/profile`, `GET /api/candidate/peers` | `backend/app.py:948-998` | `frontend/src/services/api.js:1330-1384` |
| HR candidates | `GET/POST/PATCH/DELETE /api/hr/candidates` | `backend/app.py:1084-1235` | `frontend/src/services/api.js:1607-1834` |
| Departments | `GET/POST/PATCH/DELETE /api/hr/departments` | `backend/app.py:1337-1375` | `frontend/src/services/api.js:1835-1869` |
| HR tasks/learning uploads | `GET/POST/PATCH/DELETE /api/hr/tasks` | `backend/app.py:1383-1459` | `frontend/src/services/api.js:1870-1917` |
| Employee learning | `GET /api/learning/modules`, `GET /api/learning/modules/{task_id}/download`, `POST /api/learning/progress` | `backend/app.py:1462-1495` | `frontend/src/services/api.js:1491-1524` |
| HR document requirements | `GET/POST/PATCH/DELETE /api/hr/document-requirements` | `backend/app.py:1500-1527` | `frontend/src/services/api.js:1918-1952` |
| Employee documents | `GET /api/documents`, `POST /api/documents/upload`, `DELETE /api/documents/{document_id}` | `backend/app.py:1538-1565` | `frontend/src/services/api.js:1386-1489` |
| HR document review | `POST /api/hr/candidates/{candidate_id}/documents/{requirement_id}/review` | `backend/app.py:1586-1607` | `frontend/src/services/api.js:1690-1745` |
| Notifications | `GET /api/notifications`, `POST /api/notifications`, `POST /api/notifications/{id}/read` | `backend/app.py:1607-1628` | `frontend/src/services/api.js:1569-1604` |
| AI Assistant | `POST /api/assistant/chat` | `backend/app.py:1860-1938` | `frontend/src/services/api.js:1559-1567` |
| Relocation | `POST /api/relocation/search` | `backend/app.py:2012-2104` | `frontend/src/services/api.js:1526-1557` |
| Reports | `GET /api/hr/reports/summary` | `backend/app.py:2107-2112` | no dedicated page wrapper |
| Speech | `POST /transcribe_audio`, `POST /text_to_speech` | `backend/app.py:160-185` | no dashboard wrapper |

## HR to Employee Data Flow

The central consistency mechanism is `build_onboarding_status` at `backend/preonboarding_repository.py:889-958`. It composes candidate, documents, learning, notifications, tasks, welcome kit, and progress metrics into one aggregate and persists it back to the candidate record when possible.

### Learning Flow

| Step | Code |
|---|---|
| HR creates content in `/hr/tasks` | UI form: `frontend/src/pages/hr/HrTasks.jsx:116-171` |
| Allowed content types | UI options: `frontend/src/pages/hr/HrTasks.jsx:135-142`; API guard: `backend/app.py:1308`, `backend/app.py:1413-1414` |
| HR upload/link becomes `FormData` | `frontend/src/services/api.js:1872-1879` |
| Backend creates task | `backend/app.py:1395-1432` |
| File stored under `storage/uploads/learning` | `_save_upload(file, "learning")`: `backend/preonboarding_repository.py:489-507` |
| Task stored in Mongo | `pre_onboarding_tasks`: `backend/preonboarding_repository.py:513-516` |
| Employee modules generated from published tasks | `backend/preonboarding_repository.py:535-579` |
| Employee page loads modules | `frontend/src/pages/dashboard/Learning.jsx:49-58` |
| Employee watch/open progress saved | UI: `frontend/src/pages/dashboard/Learning.jsx:60-71`; API: `backend/app.py:1485-1495`; storage: `backend/preonboarding_repository.py:582-600` |
| HR-side impact | `/hr/tasks` list updates from `hrApi.listTasks`: `frontend/src/pages/hr/HrTasks.jsx:26-34` |
| Employee-side impact | `/dashboard/learning` shows Netflix-style cards/player from same module data: `frontend/src/pages/dashboard/Learning.jsx:100-164` |

### Document Flow

| Step | Code |
|---|---|
| HR creates requirements | UI: `frontend/src/pages/hr/HrDocuments.jsx:50-69`; API wrapper: `frontend/src/services/api.js:1918-1952`; backend: `backend/preonboarding_repository.py:603-643` |
| Employee sees requirements and verification summary | `documents_for_candidate`: `backend/preonboarding_repository.py:672`; UI: `frontend/src/pages/dashboard/Documents.jsx:240` |
| Employee uploads file | UI: `frontend/src/pages/dashboard/Documents.jsx:50-75`; wrapper: `frontend/src/services/api.js:1202`; backend route: `backend/app.py:1558` |
| Backend validates/stores file | allowed suffix/content type/max size: `backend/preonboarding_repository.py:15-17`; upload: `backend/preonboarding_repository.py:978` |
| Verification pipeline | provider/risk logic: `backend/document_verification.py`; orchestration: `backend/preonboarding_repository.py:889`; detail API: `backend/app.py:1597` |
| HR reviews file | HR console: `frontend/src/pages/hr/CandidateDetail.jsx:206`; wrapper: `frontend/src/services/api.js:1559`, `frontend/src/services/api.js:1593`; backend: `backend/preonboarding_repository.py:1074` |
| Storage | `pre_onboarding_document_requirements`, `pre_onboarding_document_submissions`, `document_versions`, `document_extractions`, `verification_checks`, `verification_provider_results`, `verification_decisions`, `document_review_actions`, `document_audit_logs`, uploaded files in `storage/uploads/documents` |
| Output | Employee sees upload and verification status; HR sees extracted fields, checks, provider availability, risk score, manual approve/reject/re-upload, retry, and audit |
| Detailed module doc | `docs/document-verification.md` |

### Notifications Flow

| Step | Code |
|---|---|
| HR sends candidate reminder | wrapper: `frontend/src/services/api.js:1799-1834`; backend route: `backend/app.py:1235` |
| System creates document/learning notifications | document upload/review: `backend/preonboarding_repository.py:783-785`, `backend/preonboarding_repository.py:839-843`; notification helper: `backend/preonboarding_repository.py:847-865` |
| Employee lists/marks read | wrapper: `frontend/src/services/api.js:1569-1604`; backend repository: `backend/preonboarding_repository.py:868-886` |
| Storage | `pre_onboarding_notifications` |
| Output | `/dashboard/notifications` receives user-scoped notifications |

### Candidate / Readiness / Welcome Kit Flow

| Step | Code |
|---|---|
| HR creates/updates candidate | `backend/hr_repository.py:213+`, routes at `backend/app.py:1179-1217` |
| Employee signup creates HR candidate row | `backend/app.py:815-858` |
| Aggregate computes readiness | `backend/preonboarding_repository.py:915-958` |
| Welcome kit source | Candidate fields `welcomeKit`, `welcome_kit`, or `welcome_kit_assignment`: `backend/preonboarding_repository.py:904-913` |
| HR impact | Candidate table and detail pages consume readiness/document/learning fields |
| Employee impact | Dashboard metrics and onboarding status are returned from candidate/metrics/status APIs |

## Feature Reference

| Feature | Purpose | Input | Processing | Storage | API/Service | Output | HR-side Impact | Employee-side Impact |
|---|---|---|---|---|---|---|---|---|
| Authentication | Login/signup/OAuth with role separation | Email/password, role, OAuth provider | JWT cookie auth, role guard, OAuth user upsert | `users`, cookies | `backend/app.py:741-914`, `frontend/src/services/api.js:1227-1328` | Authenticated user object | HR routes allowed only when `userType === "hr"` at `frontend/src/routes/AppRoutes.jsx:24-29` | Employee dashboard access |
| HR Candidates | Manage onboarding population | Candidate profile, filters, joining date, department | Repository filtering, analytics, aggregate updates | `pre_onboarding_candidates` | `backend/hr_repository.py:162-210`, `backend/app.py:1084-1235` | Candidate rows, analytics | HR dashboard and candidate details | Candidate status/metrics derive from same record |
| Learning | Publish and consume Videos/PDFs/Images/Links | HR task form fields and file/link | Task validation, file storage, published task filtering, progress tracking | `pre_onboarding_tasks`, `pre_onboarding_learning_progress`, `storage/uploads/learning` | `backend/app.py:1383-1495`, `frontend/src/services/api.js:1491-1524`, `frontend/src/services/api.js:1870-1917` | Netflix-style Employee Learning | HR controls content and status | Employee sees same published tasks and progress |
| Documents | Required joining docs, AI-assisted review, and HR decisioning | HR requirement fields; employee file uploads | File validation/versioning, malware scan, classification, OCR adapter, profile match, duplicate hash check, trusted provider adapters, risk scoring, HR review, audit trail, aggregate rebuild | `pre_onboarding_document_requirements`, `pre_onboarding_document_submissions`, `document_versions`, `document_extractions`, `verification_checks`, `verification_provider_results`, `verification_decisions`, `document_review_actions`, `document_audit_logs`, `storage/uploads/documents` | `backend/app.py:1558-1684`, `backend/document_verification.py`, `frontend/src/services/api.js:1202-1287`, `frontend/src/services/api.js:1559-1648` | Statused document rows with `verification_status`, `verification_explanation`, and `overall_score` | HR sets requirements, reviews verification details, retries checks, approves/rejects | Employee uploads/reuploads and sees practical verification status |
| Notifications | HR and system messages | title, message, channel/user | Notification creation and read tracking | `pre_onboarding_notifications` | `backend/app.py:1607-1628`, `backend/preonboarding_repository.py:847-886` | Notification list/read state | HR reminders and document activity | Employee sees reminders/approvals |
| AI Assistant | Answer from onboarding and HR material | Employee message, candidate ID | Structured RAG + vector retrieval + OpenAI-compatible model | Chat logs in `MONGO_COLLECTION_NAME`; source data from candidates/tasks/docs | `backend/app.py:1818-1938`, `frontend/src/services/api.js:1559-1567` | Grounded answer with sources | HR-uploaded docs/tasks become source material | Employee asks onboarding questions |
| Relocation | Search nearby accommodation/support resources | Location string | OpenAI-compatible JSON generation with fallback resources | no persistent collection in current implementation | UI `frontend/src/pages/dashboard/Relocation.jsx:285-328`; API `backend/app.py:2012-2104` | Resource cards and category groups | No HR UI impact | Employee can search and compare options |
| Welcome Kit | Include kit assignment in aggregate | Candidate `welcomeKit`, `welcome_kit`, or `welcome_kit_assignment` | Aggregate normalizes legacy/current fields | candidate record | `backend/preonboarding_repository.py:904-913` | Welcome kit object in onboarding status | HR candidate record can carry kit fields | Employee status can display kit state where UI consumes it |
| Reports | HR readiness summary | none | Counts candidates by readiness/doc/learning | candidates | `backend/preonboarding_repository.py:961-976`, `backend/app.py:2107-2112` | Summary JSON | HR reporting integration point | none directly |

## Learning Module Configuration

### Where HR Uploads Videos, PDFs, Images, and Links

HR uses `/hr/tasks`. The route is declared at `frontend/src/routes/AppRoutes.jsx:68`; the page is `frontend/src/pages/hr/HrTasks.jsx`.

Supported content types:

| Type | UI Option | Input Format | File/URL Handling | Code |
|---|---|---|---|---|
| Video | `video` | `.mp4`, `.webm`, `.mov`, `.avi` | File upload | `frontend/src/pages/hr/HrTasks.jsx:135-159` |
| PDF | `pdf` | `.pdf` | File upload | `frontend/src/pages/hr/HrTasks.jsx:135-159` |
| Image | `image` | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` | File upload | `frontend/src/pages/hr/HrTasks.jsx:135-159` |
| Link | `link` | URL string | `link_url` text input | `frontend/src/pages/hr/HrTasks.jsx:149-150` |

Backend allowed types are exactly `{"video", "pdf", "image", "link"}` at `backend/app.py:1308` and enforced at `backend/app.py:1413-1414` and `backend/app.py:1440-1442`.

Sample HR-published learning content is seeded in:

- Frontend fallback: `frontend/src/services/api.js:145-290`
- Backend Mongo seed: `backend/preonboarding_repository.py:263-442`

Do not add employee-only sample content to the Employee Learning component. Employee Learning consumes `learningApi.listModules` at `frontend/src/pages/dashboard/Learning.jsx:49-58`, which reads `/api/learning/modules` via `frontend/src/services/api.js:1491-1498`.

### Employee Learning UI

The Netflix-style layout is implemented in `frontend/src/pages/dashboard/Learning.jsx`:

- URL resolution and content type detection: `frontend/src/pages/dashboard/Learning.jsx:7-37`
- Module load and progress update: `frontend/src/pages/dashboard/Learning.jsx:49-71`
- Filters for all/videos/PDFs/images/links: `frontend/src/pages/dashboard/Learning.jsx:114-135`
- Horizontal content rows/cards: `frontend/src/pages/dashboard/Learning.jsx:209-264`
- Thumbnail rendering: `frontend/src/pages/dashboard/Learning.jsx:267-289`
- Medium centered streaming player: `frontend/src/pages/dashboard/Learning.jsx:291-469`

## Company Configuration Guide

| Feature | What to Change | Exact File Path | Config/Variable | Code Section/Line Reference | Input Format | Expected Output |
|---|---|---|---|---|---|---|
| Backend API base for frontend | Point frontend to backend | `frontend/.env` | `VITE_API_BASE_URL` | Read at `frontend/src/services/api.js:3`; media URLs at `frontend/src/pages/dashboard/Learning.jsx:7-31` | URL, e.g. `https://api.company.com` | Axios and media files use that backend |
| Frontend deployment subpath | Change app base path | `frontend/.env` | `PUBLIC_URL` | `frontend/vite.config.js:5-12`, `frontend/src/App.jsx:5-10` | Path, e.g. `/preboarding/` | Router/assets work under subpath |
| MongoDB direct URI | Use Atlas or full company URI | `backend/.env` | `MONGODB_URI` | `backend/settings.py:82-84` | MongoDB URI string | Backend connects directly |
| MongoDB dynamic company DB | Build URI from fields | `backend/.env` | `mongo_username`, `mongo_password`, `MONGO_HOST`, `MONGO_PORT`, `DB_NAME_DEV`, `DB_NAME_PROD`, `ENV` | `backend/settings.py:72-90` | Strings/port | Backend selects dev/prod DB |
| Chat log collection | Change thread collection | `backend/.env` | `MONGO_COLLECTION_NAME` | `backend/settings.py:63`, `backend/db_manager.py:17-29` | Collection name | Chat logs stored in selected collection |
| Auth token secret | Secure cookies/JWT | `backend/.env` | `JWT_SECRET` | `backend/settings.py:15`, `backend/app.py:650-662` | Secret string | Valid signed auth tokens |
| OAuth redirect origins | Production OAuth URLs | `backend/.env` | `FRONTEND_URL`, `BACKEND_URL` | `backend/settings.py:19-20`, `backend/app.py:599-626` | Full origins | Provider callbacks redirect correctly |
| Google OAuth | Enable Google login/signup | `backend/.env` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `backend/settings.py:22-23`, `backend/app.py:570-578` | Provider credentials | `/api/auth/oauth/google/start` works |
| Microsoft OAuth | Enable Microsoft login/signup | `backend/.env` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` | `backend/settings.py:24-26`, `backend/app.py:579-586` | Provider credentials/tenant | Microsoft OAuth works |
| GitHub OAuth | Enable GitHub login/signup | `backend/.env` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `backend/settings.py:27-28`, `backend/app.py:587-595` | Provider credentials | GitHub OAuth works |
| AI Assistant model/key | Change assistant and relocation model | `backend/.env` | `openai_api_base`, `openai_api_key`, `router_model_name`, `model_name_llm` | `backend/settings.py:31-36`, `backend/app.py:1903-1915`, `backend/app.py:2052-2071` | OpenAI-compatible base/key/model | Assistant and relocation use selected model |
| Vector retrieval | Connect retrieval service | `backend/.env` | `retrieval_api`, `model_name_emb`, `vector_db_name`, `collection_name`, `milvus_user`, `milvus_password` | `backend/settings.py:12-13`, `backend/settings.py:40-46`, `backend/app.py:1818-1831` | URL and Milvus values | Assistant includes vector KB sources |
| Videos | Add/replace video samples | `backend/preonboarding_repository.py`, `frontend/src/services/api.js` | task object with `content_type: "video"`, `file_url` | Backend seed `backend/preonboarding_repository.py:263-330`; fallback seed `frontend/src/services/api.js:145-210`; HR UI `frontend/src/pages/hr/HrTasks.jsx:135-159` | MP4/WebM/MOV/AVI upload or URL in seed | HR task appears; Employee card/player appears |
| PDFs | Add/replace PDF samples | `backend/preonboarding_repository.py`, `frontend/src/services/api.js` | task object with `content_type: "pdf"`, `file_url` | Backend seed `backend/preonboarding_repository.py:331-363`; fallback seed `frontend/src/services/api.js:212-242`; HR UI `frontend/src/pages/hr/HrTasks.jsx:135-159` | PDF upload or PDF URL | Employee opens PDF and marks progress |
| Images | Add/replace image samples | `backend/preonboarding_repository.py`, `frontend/src/services/api.js` | task object with `content_type: "image"`, `file_url` | Backend seed `backend/preonboarding_repository.py:365-397`; fallback seed `frontend/src/services/api.js:244-274`; HR UI `frontend/src/pages/hr/HrTasks.jsx:135-159` | Image upload or URL | Employee sees image thumbnail/card |
| Learning Links | Add/replace links | `backend/preonboarding_repository.py`, `frontend/src/services/api.js` | task object with `content_type: "link"`, `link_url` | Backend seed `backend/preonboarding_repository.py:399-429`; fallback seed `frontend/src/services/api.js:276-290`; HR link field `frontend/src/pages/hr/HrTasks.jsx:149-150` | URL string | Employee opens link and progress becomes complete |
| Learning upload storage | Change local upload root | `backend/preonboarding_repository.py` | `UPLOAD_DIR` | `backend/preonboarding_repository.py:14`, `_save_upload` at `backend/preonboarding_repository.py:157-188` | `Path(...)` | Files stored under chosen folder |
| Document accepted uploads | Change employee document constraints | `backend/preonboarding_repository.py`, `frontend/src/pages/dashboard/Documents.jsx` | `DOCUMENT_ALLOWED_SUFFIXES`, `DOCUMENT_ALLOWED_CONTENT_TYPES`, `DOCUMENT_MAX_SIZE_MB`, file input `accept` | Backend `backend/preonboarding_repository.py:15-17`; frontend `frontend/src/pages/dashboard/Documents.jsx:228-244` | suffix/MIME/max MB | Upload validation changes |
| HR document requirements | Change requirement defaults | `frontend/src/pages/hr/HrDocuments.jsx`, `backend/preonboarding_repository.py` | form defaults / `accepted_formats` | UI defaults `frontend/src/pages/hr/HrDocuments.jsx:6-15`, payload `frontend/src/pages/hr/HrDocuments.jsx:54-60`, backend `backend/preonboarding_repository.py:608-627` | requirement object | New requirements affect employee uploads |
| Relocation default location resources | Change fallback/default relocation cards | `frontend/src/pages/dashboard/Relocation.jsx`, `backend/app.py` | `generatedResourcesFor`, `_fallback_relocation_resources` | Frontend `frontend/src/pages/dashboard/Relocation.jsx:171-283`; backend `backend/app.py:1941-1980` | JS/Python resource objects | Different fallback search cards |
| Relocation plant map image | Replace plant layout | `frontend/public/assets/tata-motors-pune-layout.jpeg` and `frontend/src/pages/dashboard/Relocation.jsx` | image file path in `<img src>` | `frontend/src/pages/dashboard/Relocation.jsx:419-425` | JPEG/PNG static asset | Company map updates |
| Relocation map highlights | Change clickable map guide text | `frontend/src/pages/dashboard/Relocation.jsx` | `companyMapHighlights` | `frontend/src/pages/dashboard/Relocation.jsx:144-169` | array of highlight objects | New sidebar points/details |
| Relocation Map API key | No real map API exists in current code | Not implemented | Not implemented | Relocation uses static image and AI/fallback search: `frontend/src/pages/dashboard/Relocation.jsx:367-381`, `backend/app.py:2012-2104` | N/A | To add a map provider, create a new env var and integrate it in this page/API |
| CORS origins | Add frontend origins | `backend/app.py` | `allow_origins` list | `backend/app.py:80-92` | URL list | Browser requests allowed |
| Sample candidate data | Change seeded candidates | `backend/hr_repository.py`, `frontend/src/services/api.js` | seed docs/demo state users/candidates | Backend `backend/hr_repository.py:30-103`; fallback users `frontend/src/services/api.js:21-55` | candidate/user objects | Demo/live seed data changes |

## Common Developer Changes

### Add a new HR learning content type

Current allowed types are `video`, `pdf`, `image`, and `link`.

Change all of these places together:

1. Backend guard: `LEARNING_CONTENT_TYPES` at `backend/app.py:1308`.
2. HR UI select options at `frontend/src/pages/hr/HrTasks.jsx:135-142`.
3. HR upload accept logic at `frontend/src/pages/hr/HrTasks.jsx:149-164`.
4. Employee type detection/rendering at `frontend/src/pages/dashboard/Learning.jsx:31-37` and `frontend/src/pages/dashboard/Learning.jsx:267-289`.
5. Fallback local state filter at `frontend/src/services/api.js:6` and `frontend/src/services/api.js:785`.

### Replace company learning samples

For live Mongo seed, edit `sample_tasks` in `backend/preonboarding_repository.py:263-442`. For frontend fallback demo mode, mirror equivalent task objects in `frontend/src/services/api.js:145-290`. Keep stable `id` values if you want existing progress records to remain valid. Use:

```js
{
  id: "task-company-example",
  title: "Company Example",
  description: "Short employee-facing description.",
  department: "All",
  version: "1.0",
  uploaded_by: "HR Learning Team",
  mandatory: true,
  visibility: "employees",
  status: "published",
  content_type: "video", // video | pdf | image | link
  duration_minutes: 10,
  file_name: "example.mp4",
  file_url: "https://...",
  link_url: "https://..."
}
```

Only set `link_url` for links. For uploads made through HR UI, the backend stores `file_path` and exposes downloads through `/api/learning/modules/{task_id}/download`.

### Change dashboard routes

Routes live in `frontend/src/routes/AppRoutes.jsx:39-76`. Employee routes are `frontend/src/routes/AppRoutes.jsx:53-61`; HR routes are `frontend/src/routes/AppRoutes.jsx:63-71`. HR-only enforcement is in `PrivateRoute` at `frontend/src/routes/AppRoutes.jsx:24-29`.

### Change fallback demo behavior

The frontend fallback is in `frontend/src/services/api.js`. Key sections:

- Demo state starts at `frontend/src/services/api.js:21`.
- Local storage keys are `frontend/src/services/api.js:3-6`.
- `getState` merges new seed data into local storage at `frontend/src/services/api.js:878-901`.
- `withFallback` sends API failures into local state at `frontend/src/services/api.js:951-952`.

If data looks stale during frontend-only development, clear browser local storage key `preonboarding_demo_state`.

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| Backend logs Mongo connection failure | Wrong Mongo env or no DB access | Check `MONGODB_URI` or dynamic fields in `backend/settings.py:54-90`; verify network/VPN |
| Frontend silently uses demo data | Backend request failed and `withFallback` handled it | Check browser network tab and backend logs; `withFallback` is at `frontend/src/services/api.js:951-952` |
| OAuth says provider not configured | Missing client ID/secret | Set provider env vars; `_oauth_client_config` checks at `backend/app.py:608-619` |
| Employee cannot see HR learning content | Task not `published`, wrong department, or unsupported content type | Check task status/type in `/hr/tasks`; employee filtering is at `backend/preonboarding_repository.py:535-579` |
| Uploaded learning file 404s | Local file missing from `storage/uploads/learning` | Download route checks `file_path` at `backend/app.py:1474-1482` |
| Employee document upload rejected | Invalid suffix/MIME or too large | Backend constraints at `backend/preonboarding_repository.py:15-17`; upload validation at `backend/preonboarding_repository.py:157-188` |
| AI Assistant returns model unavailable message | OpenAI-compatible endpoint/key/model or retrieval service failed | Check `openai_api_base`, `openai_api_key`, `router_model_name`; LLM call at `backend/app.py:1903-1919` |
| Relocation returns fallback results | AI call failed or returned unusable JSON | Fallback is expected at `backend/app.py:2094-2104`; configure AI vars if needed |
| CORS blocks frontend | Origin not allowlisted | Add origin in `backend/app.py:80-92` |
| Production subpath routes fail | `PUBLIC_URL` missing | Set `PUBLIC_URL` before build; see `frontend/vite.config.js:5-12` and `frontend/src/App.jsx:5-10` |

## Security and Data Notes

- Do not commit `backend/.env` or real API keys.
- Current auth uses an HTTP-only `access_token` cookie set at `backend/app.py:871-872` and `backend/app.py:890-893`.
- HR-only API access uses `_require_role("hr")`; route examples include `backend/app.py:1383-1388` and `backend/app.py:1500-1508`.
- Employee candidate ownership checks are applied on learning and document-related APIs, e.g. `backend/app.py:1462-1469` and `backend/app.py:1485-1495`.
- Uploaded files are local by default. For production, put `storage/uploads` on persistent storage or replace `_save_upload` at `backend/preonboarding_repository.py:157-188`.
- The AI Assistant system prompt explicitly restricts answers to provided sources at `backend/app.py:1881-1900`.

## Current Verification Commands

Use these after configuration or code changes:

```bash
cd /home/naveen/Pre-Onboarding
python3 -m py_compile backend/app.py backend/preonboarding_repository.py

cd /home/naveen/Pre-Onboarding/frontend
npm run build
```

The Vite build may show a CJS deprecation warning from Vite internals; it does not block the current build.
