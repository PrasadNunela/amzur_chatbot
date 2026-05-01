#!/usr/bin/env python
"""
Setup verification script for Amzur AI Chat backend.
Checks that all dependencies and configurations are in place for Google Gemini.
"""

import sys
from pathlib import Path

def check_python_version():
    """Check Python version is 3.11+"""
    print("📍 Checking Python version...")
    if sys.version_info < (3, 11):
        print(f"  ❌ Python 3.11+ required, found {sys.version_info.major}.{sys.version_info.minor}")
        return False
    print(f"  ✅ Python {sys.version_info.major}.{sys.version_info.minor}")
    return True


def check_dependencies():
    """Check required packages are installed"""
    print("\n📍 Checking dependencies...")
    required_packages = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("sqlalchemy", "SQLAlchemy"),
        ("alembic", "Alembic"),
        ("langchain", "LangChain"),
        ("langchain_openai", "LangChain OpenAI"),
        ("openai", "OpenAI SDK"),
        ("pydantic", "Pydantic"),
        ("asyncpg", "AsyncPG"),
    ]
    
    missing = []
    for package, name in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"  ✅ {name}")
        except ImportError:
            print(f"  ❌ {name} - missing")
            missing.append(name)
    
    if missing:
        print(f"\n  Install missing packages with:")
        print(f"  pip install -r requirements.txt")
        return False
    return True


def check_env_file():
    """Check .env file exists and has required variables"""
    print("\n📍 Checking environment configuration...")
    env_file = Path(".env")
    if not env_file.exists():
        print("  ❌ .env file not found")
        print("  Run: cp .env.example .env")
        return False
    
    print("  ✅ .env file exists")
    
    # Check required variables
    with open(env_file) as f:
        env_content = f.read()
    
    required_vars = [
        "DATABASE_URL",
        "SECRET_KEY",
        "LITELLM_PROXY_URL",
        "LITELLM_API_KEY",
        "LLM_MODEL",
    ]
    
    missing_vars = []
    for var in required_vars:
        if var not in env_content:
            print(f"  ❌ Missing variable: {var}")
            missing_vars.append(var)
        else:
            print(f"  ✅ {var} configured")
    
    if missing_vars:
        print("\n  ❌ Please configure the above environment variables in .env")
        return False
    
    return True


def check_alembic():
    """Check Alembic migrations setup"""
    print("\n📍 Checking Alembic migrations...")
    alembic_dir = Path("alembic")
    if not alembic_dir.exists():
        print("  ❌ alembic/ directory not found")
        return False
    
    versions_dir = alembic_dir / "versions"
    if not versions_dir.exists():
        print("  ❌ alembic/versions/ directory not found")
        return False
    
    migrations = list(versions_dir.glob("*.py"))
    if not migrations:
        print("  ⚠️  No migrations found")
        return False
    
    print(f"  ✅ Found {len(migrations)} migration(s)")
    return True


def check_app_structure():
    """Check app folder structure"""
    print("\n📍 Checking app structure...")
    required_dirs = [
        "app/api",
        "app/services",
        "app/models",
        "app/schemas",
        "app/ai",
        "app/ai/chains",
        "app/db",
        "app/core",
    ]
    
    all_present = True
    for dir_path in required_dirs:
        if not Path(dir_path).exists():
            print(f"  ❌ {dir_path}/ missing")
            all_present = False
        else:
            print(f"  ✅ {dir_path}/")
    
    return all_present


def check_main_files():
    """Check main.py and other entry files"""
    print("\n📍 Checking main files...")
    required_files = [
        "main.py",
        "requirements.txt",
        ".env.example",
        "alembic.ini",
    ]
    
    all_present = True
    for file_path in required_files:
        if not Path(file_path).exists():
            print(f"  ❌ {file_path} missing")
            all_present = False
        else:
            print(f"  ✅ {file_path}")
    
    return all_present


def check_googleLiteLLM API key is configured and valid"""
    print("\n📍 Checking LiteLLM API...")
    try:
        from app.core.config import settings
        
        if not settings.LITELLM_API_KEY or settings.LITELLM_API_KEY == "sk-your-litellm-api-key-here":
            print("  ❌ LITELLM_API_KEY not configured in .env")
            return False
        
        if not settings.LITELLM_PROXY_URL:
            print("  ❌ LITELLM_PROXY_URL not configured in .env")
            return False
        
        print(f"  ✅ LiteLLM API key configured")
        print(f"  ✅ Proxy URL: {settings.LITELLM_PROXY_URL}")
        print(f"  ✅ Model: {settings.LLM_MODEL}")
        return True
            
    except Exception as e:
        print(f"  ❌ Error checking LiteLLM
        print(f"  ❌ Error checking Google API: {str(e)}")
        return False


def main():
    """Run all checks"""
    print("\n" + "=" * 60)
    print("Amzur AI Chat - Backend Setup Verification")
    print("=" * 60)
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Environment File", check_env_file),
        ("Alembic Setup", check_alembic),
        ("App Structure", check_app_structure),
        ("Main Files", check_main_files),
        ("Google Gemini API", check_google_api),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        exLiteLLMn as e:
            print(f"  ❌ Error during check: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🎉 Setup verification complete! You're ready to go.")
        print("\nNext steps:")
        print("  1. Run migrations: alembic upgrade head")
        print("  2. Start server: python main.py")
        return 0
    else:
        print("\n⚠️  Please fix the above issues before starting the server.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
