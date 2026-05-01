#!/bin/bash
# Quick Start Script for Amzur AI Chat

set -e

echo "🚀 Amzur AI Chat - Quick Start Setup"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_section() {
    echo -e "\n${GREEN}📋 $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the root directory of the project"
    exit 1
fi

# Backend Setup
print_section "Setting up Backend..."

cd backend

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
print_success "Python $python_version detected"

# Create virtual environment
if [ ! -d "venv" ]; then
    print_section "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_success "Virtual environment already exists"
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
print_section "Installing dependencies..."
pip install -q -r requirements.txt --upgrade
print_success "Dependencies installed"

# Setup .env file
if [ ! -f ".env" ]; then
    print_section "Setting up .env file..."
    cp .env.example .env
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: You need to add your Google API key to backend/.env${NC}"
    echo ""
    echo "Steps:"
    echo "  1. Visit https://makersuite.google.com/app/apikey"
    echo "  2. Click 'Create API Key'"
    echo "  3. Copy your API key"
    echo "  4. Edit backend/.env and replace 'your-google-api-key-here' with your actual key"
    echo ""
    read -p "Press Enter once you've updated backend/.env with your API key..."
else
    print_success ".env file already exists"
fi

# Verify setup
print_section "Verifying setup..."
python3 verify_setup.py

# Run migrations
print_section "Setting up database..."
alembic upgrade head
print_success "Database migrations complete"

cd ..

# Frontend Setup
print_section "Setting up Frontend..."

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_section "Installing npm dependencies..."
    npm install --legacy-peer-deps
    print_success "npm dependencies installed"
else
    print_success "npm dependencies already installed"
fi

# Setup .env file
if [ ! -f ".env" ]; then
    print_section "Setting up .env file..."
    cp .env.example .env
    print_success ".env file created"
else
    print_success ".env file already exists"
fi

cd ..

# Summary
echo ""
echo "======================================"
print_success "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps to start chatting:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend"
echo "    source venv/bin/activate"
echo "    python main.py"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
echo "Documentation: See SETUP_GUIDE.md"
