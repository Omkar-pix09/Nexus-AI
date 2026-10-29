.PHONY: setup dev-api dev-web test eval build up
setup:      ; cd backend && pip install -r requirements-dev.txt && cd ../frontend && npm install
dev-api:    ; cd backend && uvicorn app.main:app --reload --port 8000
dev-web:    ; cd frontend && npm run dev
test:       ; cd backend && python -m pytest -q
eval:       ; cd backend && python -c "import json;from app.seed import seed;seed();from app.services.evaluation import run;print(json.dumps(run(),indent=2))"
build:      ; cd frontend && npm run build
up:         ; docker compose up --build
