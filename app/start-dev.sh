#!/bin/sh

# Development startup script for Keiko Personal Assistant
# Starts both backend and frontend in hot-reload mode
#
# Frontend: Vite dev server with HMR (Hot Module Replacement)
# Backend: Quart with --reload flag for automatic restarts on file changes
#
# IMPORTANT: Access the application via http://127.0.0.1:5173 for hot reload to work!

# cd into the parent directory of the script,
# so that the script generates virtual environments always in the same path.
cd "${0%/*}" || exit 1

cd ../

# Enable Vite dev server mode - this tells the backend to:
# 1. Redirect root requests to the Vite dev server
# 2. Enable CORS for the Vite dev server origin
export USE_VITE_DEV_SERVER=true

echo 'Creating python virtual environment ".venv"'
python3 -m venv .venv

echo ""
echo "Restoring backend python packages"
echo ""

./.venv/bin/python -m pip install -r app/backend/requirements.txt
out=$?
if [ $out -ne 0 ]; then
    echo "Failed to restore backend python packages"
    exit $out
fi

echo ""
echo "Restoring frontend yarn packages"
echo ""

cd app/frontend
yarn
out=$?
if [ $out -ne 0 ]; then
    echo "Failed to restore frontend yarn packages"
    exit $out
fi

cd ../..

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down backend and frontend..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Register cleanup function to run on script exit
trap cleanup INT TERM EXIT

echo ""
echo "=========================================="
echo "Starting development servers..."
echo "=========================================="
echo ""

# Start backend in background with hot reload
echo "Starting backend on http://localhost:50505 (with hot reload)"
cd app/backend
../../.venv/bin/python -m quart --app main:app run --port 50505 --host localhost --reload &
BACKEND_PID=$!
cd ../..

# Give backend a moment to start
sleep 2

# Start frontend Vite dev server with HMR
echo "Starting frontend on http://127.0.0.1:5173 (with HMR)"
cd app/frontend
yarn dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "=========================================="
echo "Development servers are running!"
echo "=========================================="
echo ""
echo "  >>> Open http://127.0.0.1:5173 in your browser <<<"
echo ""
echo "  Frontend (Vite + HMR): http://127.0.0.1:5173"
echo "  Backend (Quart + reload): http://localhost:50505"
echo ""
echo "Hot reload is enabled:"
echo "  - Frontend: Changes to .tsx/.ts/.css files will update instantly"
echo "  - Backend: Changes to .py files will restart the server"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
