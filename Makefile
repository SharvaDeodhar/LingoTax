.PHONY: install-backend install-frontend install dev-backend dev-frontend dev

PYTHON := python3
VENV   := backend/.venv

# ── Setup ─────────────────────────────────────────────────────────────────────

install-backend:
	$(PYTHON) -m venv $(VENV)
	$(VENV)/bin/pip install --upgrade pip
	$(VENV)/bin/pip install -r backend/requirements.txt

install-frontend:
	cd frontend && npm install

install: install-backend install-frontend

# ── Run ───────────────────────────────────────────────────────────────────────

dev-backend:
	cd backend && ../$(VENV)/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

# Run both together (Ctrl+C stops both)
dev:
	@echo "Starting backend  → http://localhost:8000"
	@echo "Starting frontend → http://localhost:3000"
	@trap 'kill 0' SIGINT; \
	  (cd backend && ../$(VENV)/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000) & \
	  (cd frontend && npm run dev) & \
	  wait