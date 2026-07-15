# settings.py
 
from pydantic_settings import BaseSettings
from pathlib import Path
from urllib.parse import quote_plus
from typing import Optional
 
 
class Settings(BaseSettings):
    ENV: str = "dev"
    # Base URL for your custom embedding backend
    allMini_emb_api: str = "https://neuroverse.tatamotors.com/monitoring_v2/v1/embeddings"
    model_name_emb: str = "neuroverse-all-MiniLM-L6-v2"
 
    JWT_SECRET: str = "change-me-in-env"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    FRONTEND_URL: str = "http://127.0.0.1:5173"
    BACKEND_URL: str = "http://127.0.0.1:8001"

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_TENANT_ID: str = "common"
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
 
    # LLM configuration
    model_name_llm: str = "neuroverse-meta-llama--Llama-3.1-8B-Instruct"
    router_model_name:str = "neuroverse-gpt-oss-120b"
    vision_model_name:str = "neuroverse-Qwen2.5-VL-72B-Instruct"
    code_model_name:str = "neuroverse-gpt-oss-120b"
    openai_api_base: str ="https://neuroverse.tatamotors.com/monitoring_v2/v1"
    openai_api_key: str = "EMPTY"
   
   
    # Milvus configuration
    milvus_base:str = ""
    milvus_port:str = "19530"
    milvus_user:str = ""                # contact NeuroNest Team
    milvus_password:str = ""             # contact NeuroNest Team
    vector_db_name:str = ""                # contact NeuroNest Team
    collection_name:str = 'Pre-onboarding'       # contact NeuroNest Team  
    retrieval_api:str =""
 
   
    STT_API_URL:str = "https://neuroverse.tatamotors.com/code-stt/transcribe_audio"
    TTS_API_URL:str = "https://neuroverse.tatamotors.com/code-tts/text_to_speech"

    # Document verification configuration
    DOCUMENT_VERIFICATION_INLINE_QUEUE: bool = True
    DOCUMENT_VERIFICATION_MAX_RETRIES: int = 3
    DOCUMENT_VERIFICATION_PROVIDER_TIMEOUT_SECONDS: int = 15
    OCR_PROVIDER: str = "mock"
    OCR_API_KEY: Optional[str] = None
    QR_VERIFICATION_PROVIDER: str = "mock"
    DIGITAL_SIGNATURE_PROVIDER: str = "mock"
    DIGILOCKER_CLIENT_ID: Optional[str] = None
    DIGILOCKER_CLIENT_SECRET: Optional[str] = None
    PAN_VERIFICATION_API_KEY: Optional[str] = None
    UNIVERSITY_VERIFICATION_API_KEY: Optional[str] = None
    DOCUMENT_RETENTION_DAYS: int = 2555
    DOCUMENT_STORAGE_PRIVATE: bool = True
 
 
    ## Mongo Conversation Logging
    MONGODB_URI: Optional[str] = None
    DATABASE_NAME: Optional[str] = None
    mongo_username:str = ""
    mongo_password:str = ""
    encoded_password:str = quote_plus(mongo_password)
    MONGO_HOST: str = "localhost"
    MONGO_PORT: int = 27017
    DB_NAME_DEV:str = "pre_onboarding"
    DB_NAME_PROD:str = "pre_onboarding"
    MONGO_COLLECTION_NAME:str ="pre_onboarding_logs"
    APP_NAME:str = "pre_onboarding"
 
 
    class Config:
        env_file = Path(__file__).with_name(".env")
        env_file_encoding = "utf-8"
 
    @property
    def DB_NAME(self) -> str:
        """Return DB name depending on ENV (dev or prod)."""
        if self.DATABASE_NAME:
            return self.DATABASE_NAME
        env = (self.ENV or "dev").strip().lower()
        if env in ("prod", "production"):
            return self.DB_NAME_PROD
        return self.DB_NAME_DEV
 
    @property
    def MONGO_URI(self) -> str:
        if self.MONGODB_URI:
            return self.MONGODB_URI
        pwd = quote_plus(self.mongo_password)
        return (
            f"mongodb://{self.mongo_username}:{pwd}"
            f"@{self.MONGO_HOST}:{self.MONGO_PORT}"
            f"/{self.DB_NAME}?authSource={self.DB_NAME}"
        )
 
 
# single shared settings instance
settings = Settings()
