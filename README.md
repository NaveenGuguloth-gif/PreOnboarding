# Pre-Onboarding App

This project has a FastAPI backend and a Vite React frontend.

## MongoDB Migration: Atlas to Company DB

The backend supports two MongoDB connection styles in `backend/settings.py`:

1. **Atlas / direct URI mode**
   - Used when `MONGODB_URI` is set in `backend/.env`.
   - `settings.MONGO_URI` returns `MONGODB_URI`.

2. **Company DB dynamic URI mode**
   - Used when `MONGODB_URI` is empty or removed.
   - `settings.MONGO_URI` builds this format:

```text
mongodb://<mongo_username>:<encoded_password>@<MONGO_HOST>:<MONGO_PORT>/<DB_NAME>?authSource=<DB_NAME>
```

`DB_NAME` is selected from `ENV`:

- `ENV=dev` uses `DB_NAME_DEV`
- `ENV=prod` or `ENV=production` uses `DB_NAME_PROD`
- `DATABASE_NAME`, if set, overrides both

## Company DB `.env` Template

Create or update `backend/.env` like this:

```env
ENV=dev

# Leave this empty or remove it to use company MongoDB fields below.
MONGODB_URI=
DATABASE_NAME=

mongo_username=DemoApp_Admin
mongo_password=<company-mongo-password>
MONGO_HOST=172.22.95.31
MONGO_PORT=27017
DB_NAME_DEV=Dev_DemoApp
DB_NAME_PROD=Prod_DemoApp
MONGO_COLLECTION_NAME=DemoApp_Logs
APP_NAME=DemoApp

JWT_SECRET=change-this-secret

openai_api_base=https://neuroverse.tatamotors.com/monitoring_v2/v1
openai_api_key=<your-openai-compatible-api-key>

allMini_emb_api=https://neuroverse.tatamotors.com/monitoring_v2/v1/embeddings
model_name_emb=neuroverse-all-MiniLM-L6-v2
model_name_llm=neuroverse-meta-llama--Llama-3.1-8B-Instruct
router_model_name=neuroverse-gpt-oss-120b
vision_model_name=neuroverse-Qwen2.5-VL-72B-Instruct
code_model_name=neuroverse-gpt-oss-120b

milvus_base=http://172.22.95.31
milvus_port=19530
milvus_user=<your-milvus-username>
milvus_password=<your-milvus-password>
vector_db_name=<your-vector-db-name>
collection_name=<your-collection-name>
retrieval_api=http://172.22.95.31:8537/retrieve_milvus

STT_API_URL=https://neuroverse.tatamotors.com/code-stt/transcribe_audio
TTS_API_URL=https://neuroverse.tatamotors.com/code-tts/text_to_speech
```

Important:

- Do not commit `backend/.env`.
- Keep secrets only in `.env` or deployment secrets.
- The repository includes `backend/.env.example` for placeholders only.

## Data Migration Steps

### 1. Export current Atlas database

Install MongoDB Database Tools if needed, then run:

```bash
mongodump \
  --uri="mongodb+srv://<atlas_user>:<atlas_password>@<atlas_cluster>/<atlas_db>?retryWrites=true&w=majority" \
  --out ./mongo-dump
```

Replace:

- `<atlas_user>`
- `<atlas_password>`
- `<atlas_cluster>`
- `<atlas_db>`

### 2. Restore into company DB

For development DB:

```bash
mongorestore \
  --uri="mongodb://DemoApp_Admin:<url_encoded_password>@172.22.95.31:27017/Dev_DemoApp?authSource=Dev_DemoApp" \
  --nsFrom="<atlas_db>.*" \
  --nsTo="Dev_DemoApp.*" \
  ./mongo-dump/<atlas_db>
```

For production DB:

```bash
mongorestore \
  --uri="mongodb://DemoApp_Admin:<url_encoded_password>@172.22.95.31:27017/Prod_DemoApp?authSource=Prod_DemoApp" \
  --nsFrom="<atlas_db>.*" \
  --nsTo="Prod_DemoApp.*" \
  ./mongo-dump/<atlas_db>
```

If your password contains special characters such as `@`, encode it first. Python example:

```bash
python3 -c "from urllib.parse import quote_plus; print(quote_plus('<company-mongo-password>'))"
```

Use the printed value as `<url_encoded_password>`.

## Collections Used By This App

The backend creates or reads these collections:

- `MONGO_COLLECTION_NAME` for chat/thread logs
- `pre_onboarding_candidates`
- `pre_onboarding_departments`
- `pre_onboarding_tasks`
- `pre_onboarding_document_requirements`
- `pre_onboarding_document_submissions`
- `pre_onboarding_learning_progress`
- `pre_onboarding_notifications`
- `pre_onboarding_audit_logs`

If you migrate from Atlas, make sure these collections are restored into the selected company database.

## Verify Company DB Connection

From the project root:

```bash
cd backend
python3 -c "from settings import settings; print(settings.DB_NAME); print(settings.MONGO_URI)"
```

Then start the backend:

```bash
cd /home/naveen/Pre-Onboarding
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8001
```

Expected backend log:

```text
Successfully connected to MongoDB and set up all collections.
```

If connection fails:

- Confirm `MONGODB_URI` is empty or removed.
- Confirm `ENV` is correct.
- Confirm `mongo_username`, `mongo_password`, `MONGO_HOST`, `MONGO_PORT`, and DB name.
- Confirm the Mongo user has access to `authSource=<DB_NAME>`.
- Confirm company network/VPN access to `172.22.95.31:27017`.

## Frontend

Install and run:

```bash
cd frontend
npm install
npm run dev
```

`node_modules/` is ignored and must not be committed.
