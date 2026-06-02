#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Iniciando IB Slides..."

# Backend
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  echo "📦 Criando ambiente virtual..."
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt -q
else
  source .venv/bin/activate
fi

uvicorn main:app --port 8000 &
BACKEND_PID=$!
echo "✅ Backend rodando em http://localhost:8000"

# Frontend
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend rodando em http://localhost:5173"

echo ""
echo "⌨️  Ctrl+C para parar ambos"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
