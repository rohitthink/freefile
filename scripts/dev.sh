#!/bin/bash
# Start both frontend and backend for development

DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==================================="
echo "  FreeFile - ITR Filing App"
echo "==================================="
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers."
echo "==================================="
echo ""

# Check venv exists
if [ ! -d "$DIR/venv" ]; then
  echo "ERROR: Python venv not found. Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

# Check node_modules exists
if [ ! -d "$DIR/frontend/node_modules" ]; then
  echo "ERROR: Node modules not found. Run: cd frontend && npm install"
  exit 1
fi

# Start backend
cd "$DIR"
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
cd "$DIR/frontend"
npm run dev -- --port 3000 &
FRONTEND_PID=$!

# Cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

wait
