from pathlib import Path

from .services import ingestion

SAMPLES = Path(__file__).resolve().parents[1] / "data" / "samples"


def seed(force: bool = False) -> int:
    existing = {d["name"] for d in ingestion.list_documents()}
    if existing and not force:
        return 0
    n = 0
    for p in sorted(SAMPLES.glob("*.md")):
        if p.name not in existing:
            ingestion.ingest(p.name, p.read_bytes())
            n += 1
    return n


if __name__ == "__main__":
    print(f"seeded {seed(force=True)} documents")
