#!/usr/bin/env python
"""
Database migration runner for Amzur AI Chat.
Applies all pending Alembic migrations to the database.
"""

import sys
from pathlib import Path

def main():
    """Run pending migrations."""
    import subprocess
    
    print("🔄 Running database migrations...\n")
    
    # Run alembic upgrade
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=Path(__file__).parent,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Migrations completed successfully!")
            print("\nMigration output:")
            print(result.stdout)
            return 0
        else:
            print("❌ Migration failed!")
            print("\nError output:")
            print(result.stderr)
            print("\nStandard output:")
            print(result.stdout)
            return 1
            
    except FileNotFoundError:
        print("❌ Alembic not found. Install it with:")
        print("   pip install -r requirements.txt")
        return 1
    except Exception as e:
        print(f"❌ Error running migrations: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
