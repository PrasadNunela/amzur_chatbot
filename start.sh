#!/bin/bash

# ============================================
# Amzur Chatbot - Start Backend & Frontend
# ============================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

printf "\n"
printf "==========================================\n"
printf "🚀 Amzur Chatbot - Full Stack Setup\n"
printf "==========================================\n"
printf "\n"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

print_success() {
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$1"
}

print_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1"
}

print_warning() {
    printf "${YELLOW}[WARNING]${NC} %s\n" "$1"
}

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 >/dev/null 2>&1; then
    print_error "Python 3 is not installed. Please install Python 3.11+"
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "Python version: $(python3 --version)"
printf "\n"

# ============================================
# Backend Setup
# ============================================
print_status "Setting up backend..."

if [ ! -d "$BACKEND_DIR/venv" ]; then
    print_warning "Virtual environment not found. Creating venv..."
    cd "$BACKEND_DIR"
    python3 -m venv venv
    . venv/bin/activate
    pip install -q -r requirements.txt --upgrade
    print_success "Virtual environment created"
else
    print_status "Virtual environment already exists"
fi

# Verify database migration
cd "$BACKEND_DIR"
. venv/bin/activate
print_status "Checking database migration status..."

# ============================================
# Frontend Setup
# ============================================
print_status "Setting up frontend..."

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    print_warning "Node modules not found. Installing dependencies..."
    cd "$FRONTEND_DIR"
    npm install --legacy-peer-deps -q
    print_success "Dependencies installed"
else
    print_status "Node modules already installed"
fi

# No need to build - dev server will run directly
print_status "Frontend ready (dev mode)"

printf "\n"
printf "==========================================\n"
printf "🔄 Starting Servers...\n"
printf "==========================================\n"
printf "\n"

# Clean up any hung processes on ports 8000 and 5173
print_status "Cleaning up hung processes..."
pkill -f "python main.py" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2
print_success "Cleanup complete"
printf "\n"

# Function to handle cleanup on exit
cleanup() {
    printf "\n"
    printf "\n"
    print_warning "Shutting down servers..."
    
    # Kill all child processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    print_success "Servers stopped"
    exit 0
}

# Set trap to catch Ctrl+C
trap cleanup INT TERM

# Start backend in background
print_status "Starting backend server..."
cd "$BACKEND_DIR"
. venv/bin/activate
python main.py &
BACKEND_PID=$!
print_success "Backend starting on http://localhost:8000 (PID: $BACKEND_PID)"

# Wait a bit for backend to start
sleep 3

# Start frontend in background
print_status "Starting frontend server..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
print_success "Frontend starting on http://localhost:5173 (PID: $FRONTEND_PID)"

printf "\n"
printf "==========================================\n"
printf "✅ Servers Started!\n"
printf "==========================================\n"
printf "\n"
printf "${GREEN}📱 Frontend:${NC} http://localhost:5173\n"
printf "${GREEN}🔧 Backend:${NC}  http://localhost:8000/api\n"
printf "${GREEN}📊 Docs:${NC}     http://localhost:8000/docs\n"
printf "\n"
printf "${YELLOW}Press Ctrl+C to stop both servers${NC}\n"
printf "\n"
printf "==========================================\n"
printf "\n"

# Wait for all background processes
wait


