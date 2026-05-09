# Database Migrations Guide

## Overview

The Amzur AI Chat uses **Alembic** for database schema management. All schema changes are version-controlled as migrations in the `alembic/versions/` directory.

## Required Tables for Attachment Support

The attachment feature requires the following database table:

### `attachments` Table (Migration: `004_add_attachments.py`)

Stores file attachment metadata for chat messages.

**Schema:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `message_id` | UUID | Foreign key to `messages.id` (cascade delete) |
| `filename` | VARCHAR(255) | Original uploaded filename |
| `file_path` | VARCHAR(255) | Path to file on disk |
| `mime_type` | VARCHAR(100) | MIME type (e.g., "image/jpeg") |
| `file_size` | VARCHAR(50) | File size in bytes (stored as string) |
| `file_type` | VARCHAR(50) | Classification: "image", "video", "code", "document", "table" |
| `created_at` | DATETIME | Timestamp with timezone |

**Indexes:**
- `ix_attachments_message_id` on `message_id` column

## All Migrations

| ID | Filename | Description |
|-----|----------|-----------|
| 001 | `001_create_chat_tables.py` | Creates `threads` and `messages` tables |
| 002 | `002_create_users_table.py` | Creates `users` table with email/password auth |
| 003 | `003_add_google_oauth.py` | Adds `google_id` column to `users` |
| 004 | `004_add_attachments.py` | Creates `attachments` table |

## Running Migrations

### Option 1: Using the Migration Script (Recommended)

```bash
cd backend
python run_migrations.py
```

This script will:
- Apply all pending migrations to the database
- Display the migration status
- Show any errors in a user-friendly format

### Option 2: Using Alembic Directly

```bash
cd backend
alembic upgrade head
```

### Option 3: Specific Migration

To upgrade to a specific migration revision:

```bash
cd backend
alembic upgrade 004_add_attachments
```

## Checking Migration Status

### Current Revision

See what migration is currently applied:

```bash
cd backend
alembic current
```

### Migration History

View all applied migrations:

```bash
cd backend
alembic history
```

### Pending Migrations

See what migrations haven't been applied:

```bash
cd backend
alembic heads
```

## Verifying the Setup

Use the verification script to check if migrations are applied:

```bash
cd backend
python verify_setup.py
```

This will check:
- ✅ Python version
- ✅ Dependencies
- ✅ Environment configuration
- ✅ Alembic setup
- ✅ App structure
- ✅ Database migrations status

## Rolling Back Migrations

### Last Migration

To undo the last migration:

```bash
cd backend
alembic downgrade -1
```

### To Specific Revision

To undo migrations back to a specific revision:

```bash
cd backend
alembic downgrade 003_add_google_oauth
```

### All Migrations

To remove all migrations (reset to initial state):

```bash
cd backend
alembic downgrade base
```

## Creating New Migrations

When you modify ORM models in `app/models/chat.py`, create a new migration:

```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
```

This will:
1. Compare the current database schema with the ORM models
2. Generate a new migration file
3. Show you what changed

Then review and apply:

```bash
python run_migrations.py
```

## Troubleshooting

### "Database connection error"

- Check that PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Ensure database exists
- Check network connectivity to database host

### "Alembic command not found"

- Install dependencies: `pip install -r requirements.txt`
- Verify alembic: `pip list | grep alembic`

### "Migration failed"

- Check database permissions
- Verify all required PostgreSQL extensions are installed
- Review the error message for specific SQL issues
- Check that no other processes are modifying the database

### "Migration conflict"

If you see conflicts during migration:

1. Check current state: `alembic current`
2. Check all revisions: `alembic history`
3. Review migration files for conflicts
4. Manually fix or rollback and re-apply

## Initial Setup Steps

For a fresh installation:

1. **Create database:**
   ```bash
   createdb amzur_chatbot
   ```

2. **Configure database URL in `.env`:**
   ```
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/amzur_chatbot
   ```

3. **Verify setup:**
   ```bash
   cd backend
   python verify_setup.py
   ```

4. **Run migrations:**
   ```bash
   python run_migrations.py
   ```

5. **Start server:**
   ```bash
   python main.py
   ```

## Environment-Specific Migrations

Migrations use the `DATABASE_URL` from your environment:

### Development
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/amzur_dev
```

### Staging
```
DATABASE_URL=postgresql+asyncpg://user:password@staging-db:5432/amzur_staging
```

### Production
```
DATABASE_URL=postgresql+asyncpg://user:password@prod-db:5432/amzur_prod
```

Just update `.env` and run migrations against the appropriate database.

## Architecture Notes

- **Async driver for app**: Migrations use synchronous `psycopg2` for schema operations
- **URL conversion**: Alembic env.py automatically converts `asyncpg://` URLs to `psycopg2://`
- **Atomic migrations**: Each migration runs in a transaction and is either fully applied or fully rolled back
- **Model discovery**: Alembic discovers models from `app.models.chat.Base.metadata`

## Best Practices

1. **Always run migrations before starting the server**
2. **Back up your database before running migrations on production**
3. **Test migrations in development first**
4. **Review generated migration files before applying**
5. **Never modify applied migration files**
6. **Use descriptive messages when creating migrations**
7. **Keep migrations small and focused on one change**

## References

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy ORM Models](../backend/app/models/chat.py)
- [Alembic Configuration](../backend/alembic.ini)
- [Migration Runner Script](../backend/run_migrations.py)
- [Setup Verification Script](../backend/verify_setup.py)
