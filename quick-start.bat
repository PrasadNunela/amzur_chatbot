@echo off
REM Quick Start Script for Amzur AI Chat (Windows)

setlocal enabledelayedexpansion

echo.
echo 🚀 Amzur AI Chat - Quick Start Setup
echo ======================================

REM Check if we're in the right directory
if not exist "backend" (
    echo ❌ backend folder not found. Please run this script from the root directory.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ frontend folder not found. Please run this script from the root directory.
    pause
    exit /b 1
)

REM Backend Setup
echo.
echo 📋 Setting up Backend...
cd backend

REM Check Python version
echo ✅ Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.11+ from https://www.python.org/
    pause
    exit /b 1
)

REM Create virtual environment
if not exist "venv" (
    echo ✅ Creating Python virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install requirements
echo ✅ Installing dependencies...
pip install -q -r requirements.txt --upgrade
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed

REM Setup .env file
if not exist ".env" (
    echo ✅ Setting up .env file...
    copy .env.example .env >nul
    echo.
    echo ⚠️  IMPORTANT: You need to add your Google API key to backend\.env
    echo.
    echo Steps:
    echo   1. Visit https://makersuite.google.com/app/apikey
    echo   2. Click 'Create API Key'
    echo   3. Copy your API key
    echo   4. Edit backend\.env and replace 'your-google-api-key-here' with your actual key
    echo.
    pause
) else (
    echo ✅ .env file already exists
)

REM Verify setup
echo ✅ Verifying setup...
python verify_setup.py
if errorlevel 1 (
    echo ❌ Setup verification failed. Please fix the issues above.
    pause
    exit /b 1
)

REM Run migrations
echo ✅ Setting up database...
alembic upgrade head
if errorlevel 1 (
    echo ❌ Database migration failed
    pause
    exit /b 1
)
echo ✅ Database migrations complete

cd ..

REM Frontend Setup
echo.
echo 📋 Setting up Frontend...
cd frontend

REM Check if node_modules exists
if not exist "node_modules" (
    echo ✅ Installing npm dependencies...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo ❌ Failed to install npm dependencies
        pause
        exit /b 1
    )
    echo ✅ npm dependencies installed
) else (
    echo ✅ npm dependencies already installed
)

REM Setup .env file
if not exist ".env" (
    echo ✅ Setting up .env file...
    copy .env.example .env >nul
    echo ✅ .env file created
) else (
    echo ✅ .env file already exists
)

cd ..

REM Summary
echo.
echo ======================================
echo ✅ Setup Complete!
echo ======================================
echo.
echo Next steps to start chatting:
echo.
echo   Terminal 1 (Backend):
echo     cd backend
echo     venv\Scripts\activate.bat
echo     python main.py
echo.
echo   Terminal 2 (Frontend):
echo     cd frontend
echo     npm run dev
echo.
echo   Then open: http://localhost:5173
echo.
echo Documentation: See SETUP_GUIDE.md
echo.
pause
