#!/bin/sh

# Development startup script for Keiko Personal Assistant
# Starts both backend and frontend in hot-reload mode

# cd into the parent directory of the script, 
# so that the script generates virtual environments always in the same path.
cd "${0%/*}" || exit 1

cd ../
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

# Start backend in background
echo "Starting backend on http://localhost:50505"
cd app/backend
../../.venv/bin/python -m quart --app main:app run --port 50505 --host localhost --reload &
BACKEND_PID=$!
cd ../..

# Give backend a moment to start
sleep 2

# Start frontend in background
echo "Starting frontend on http://127.0.0.1:5173"
cd app/frontend
yarn dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "=========================================="
echo "Development servers are running:"
echo "  Frontend: http://127.0.0.1:5173"
echo "  Backend:  http://localhost:50505"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

