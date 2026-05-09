# Quick Start: Database Setup for Attachments Feature

## ⚡ 30-Second Setup

```bash
cd backend
python verify_setup.py        # Verify everything is ready
python run_migrations.py      # Create all tables including attachments
python main.py               # Start the server
```

## 📋 What Gets Created

When you run migrations, the following database tables are created:

### 1. **users** (Migration 002)
- Stores user accounts (email/password and Google OAuth)
- Columns: id, email, hashed_password, google_id, full_name, created_at, updated_at

### 2. **threads** (Migration 001)
- Conversation threads per user
- Columns: id, user_id, title, created_at, updated_at

### 3. **messages** (Migration 001)
- Chat messages in threads
- Columns: id, thread_id, role (user/assistant), content, created_at

### 4. **attachments** (Migration 004) ✨ NEW
- File attachments for messages
- Columns: id, message_id, filename, file_path, mime_type, file_size, file_type, created_at

## 🔍 Check Migration Status

```bash
cd backend

# See current migration
alembic current

# See migration history
alembic history

# Check what needs to be done
python verify_setup.py
```

## ✅ Verify All Tables Exist

After running migrations, verify the tables were created:

```bash
# Connect to PostgreSQL
psql -d amzur_chatbot -U postgres

# List all tables
\dt

# You should see:
#  - public | alembic_version
#  - public | attachments
#  - public | messages
#  - public | threads
#  - public | users
```

## 🛠️ Manual Migration Check

If you want to verify the attachments table specifically:

```bash
psql -d amzur_chatbot -U postgres

\d attachments

# Output should show:
# Column     |            Type            | Collation | Nullable | Default
# -----------+----------------------------+-----------+----------+---------
# id         | uuid                       |           | not null |
# message_id | uuid                       |           | not null |
# filename   | character varying(255)     |           | not null |
# file_path  | character varying(255)     |           | not null |
# mime_type  | character varying(100)     |           | not null |
# file_size  | character varying(50)      |           | not null |
# file_type  | character varying(50)      |           | not null |
# created_at | timestamp with time zone   |           | not null |
```

## 📁 Directory Structure

After migrations, your application directories should include:

```
backend/
├── alembic/
│   ├── env.py              # Alembic configuration
│   ├── script.py.mako      # Migration template
│   └── versions/
│       ├── 001_create_chat_tables.py
│       ├── 002_create_users_table.py
│       ├── 003_add_google_oauth.py
│       └── 004_add_attachments.py   ← Attachment table migration
├── app/
│   ├── models/
│   │   └── chat.py          # Includes Attachment model
│   ├── services/
│   │   └── attachments.py   # Attachment processing service
│   └── ...
├── uploads/                 # Created by app for storing files
├── alembic.ini
├── main.py
├── run_migrations.py        # Migration runner script
└── MIGRATIONS.md            # Detailed migration guide
```

## 🚀 Starting Development

Once migrations are complete:

```bash
cd backend

# Start development server
python main.py

# Frontend in another terminal
cd ../frontend
npm run dev

# Visit http://localhost:5173
```

## 🔄 Troubleshooting

### Migrations won't run - "Connection refused"
```bash
# Make sure PostgreSQL is running
# On macOS:
brew services start postgresql

# On Linux:
sudo systemctl start postgresql

# Or verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### "Table already exists" error
```bash
# Check current migration
alembic current

# If it says "004_add_attachments", attachments table is already there - you're good!
# If it says earlier version, run:
python run_migrations.py
```

### "Migration failed" but no clear error
```bash
# Try running with verbose output
cd backend
alembic upgrade head -v

# Or check database directly
psql -d amzur_chatbot -U postgres
SELECT * FROM alembic_version;
```

## 📚 For More Details

- See [MIGRATIONS.md](./MIGRATIONS.md) for comprehensive migration documentation
- See [ATTACHMENT_IMPLEMENTATION.md](../ATTACHMENT_IMPLEMENTATION.md) for attachment feature details
- See [Copilot Instructions](/copilot-instructions.md) for architecture guidelines

## ✨ What's Now Supported

With the attachments table created, users can:

✅ Upload images (JPEG, PNG, GIF, WebP, SVG)  
✅ Upload videos (MP4, WebM, AVI, MOV, WMV)  
✅ Upload code files (Python, JavaScript, TypeScript, Java, C#, JSON, XML)  
✅ Upload documents (PDF, Word, Excel, CSV)  
✅ Share tables and spreadsheets  
✅ Get AI analysis of attachments  
✅ Download files from chat history  

## 🎯 Next Steps

1. ✅ Run migrations: `python run_migrations.py`
2. ✅ Start backend: `python main.py`
3. ✅ Start frontend: `cd ../frontend && npm run dev`
4. ✅ Test file upload in chat interface
5. ✅ Send files to AI for analysis
