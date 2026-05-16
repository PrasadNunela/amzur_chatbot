#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PY="$ROOT_DIR/venv/bin/python"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -x "$VENV_PY" ]]; then
  echo "Error: backend virtual environment not found at $VENV_PY"
  echo "Run: cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt"
  exit 1
fi

# Load environment variables from backend/.env so required settings are present.
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Ensure we always launch from backend root.
cd "$ROOT_DIR"

# Keep backend pinned to port 8000 as requested.
exec "$VENV_PY" main.py
