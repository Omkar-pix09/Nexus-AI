from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="NEXUS_", extra="ignore")

    app_name: str = "NEXUS AI"
    db_path: str = "./data/nexus.db"
    autoseed: bool = True
    cors_origins: str = "http://localhost:5173"

    # LLM: mock | anthropic | gemini  (mock = deterministic offline mode, no key needed)
    llm_provider: str = "mock"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"  # verify against current Gemini model list

    # Embeddings: hash (offline) | gemini
    embed_provider: str = "hash"
    gemini_embed_model: str = "gemini-embedding-001"

    abstain_threshold: float = 0.22
    sim_efficiency: float = 0.8  # fraction of planned hours that become productive study


settings = Settings()
