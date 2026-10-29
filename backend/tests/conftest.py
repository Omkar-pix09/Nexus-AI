import os
import tempfile

os.environ["NEXUS_DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["NEXUS_AUTOSEED"] = "false"
os.environ["NEXUS_LLM_PROVIDER"] = "mock"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seed import seed


@pytest.fixture(scope="session")
def client():
    seed(force=True)
    with TestClient(app) as c:
        yield c
