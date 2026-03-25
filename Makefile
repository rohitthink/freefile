.PHONY: dev setup backend frontend build-desktop

# Run both servers (development)
dev:
	bash scripts/dev.sh

# First-time setup
setup:
	python3 -m venv venv
	. venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install

# Run backend only
backend:
	. venv/bin/activate && uvicorn backend.main:app --reload --port 8000

# Run frontend only
frontend:
	cd frontend && npm run dev

# Build desktop app (Tauri + PyInstaller)
build-desktop:
	bash scripts/build-desktop.sh
