# Amzur AI Chat - Backend Documentation

## Setup & Installation

### Prerequisites
- Python 3.11+
- PostgreSQL database
- Virtual environment manager (venv or conda)

### Installation Steps

1. **Create and activate virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your values:
   - `SECRET_KEY`: Generate a strong secret key
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `LITELLM_PROXY_URL`: Set to `http://litellm.amzur.com:4000`
   - `LITELLM_API_KEY`: Your LiteLLM API key
   - Other settings as needed

4. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

5. **Start the development server:**
   ```bash
   python main.py
   ```
   Server runs on `http://localhost:8000`

## API Endpoints

### Chat Threads

**Create a new thread:**
```http
POST /chat/threads
Content-Type: application/json

{
  "title": "Optional thread title"
}
```

**List all threads:**
```http
GET /chat/threads
```

**Get thread with messages:**
```http
GET /chat/threads/{thread_id}
```

**Delete a thread:**
```http
DELETE /chat/threads/{thread_id}
```

### Chat Messages

**Send a message (get AI response):**
```http
POST /chat/threads/{thread_id}/messages
Content-Type: application/json

{
  "content": "Your message here"
}
```

Response includes the user message and the AI assistant's response.

## Architecture

### Folder Structure

```
backend/
├── app/
│   ├── api/               # HTTP routers
│   │   └── chat.py       # Chat endpoints
│   ├── services/          # Business logic
│   │   └── chat.py       # Chat operations
│   ├── models/            # SQLAlchemy ORM
│   │   └── chat.py       # Thread & Message models
│   ├── schemas/           # Pydantic models
│   │   └── chat.py       # Request/response schemas
│   ├── ai/                # AI orchestration
│   │   ├── llm.py        # LiteLLM clients
│   │   └── chains/        # LangChain LCEL chains
│   │       └── chat.py   # Chat chain
│   ├── db/                # Database
│   │   └── session.py    # AsyncSession factory
│   ├── core/              # Config & logging
│   │   ├── config.py     # Settings from env
│   │   └── logger.py     # Logging setup
│   └── __init__.py
├── main.py                # FastAPI app entry point
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
└── alembic/              # Database migrations
```

### Key Design Principles

1. **Router → Service → Schema → Model**: Business logic never in routers
2. **LiteLLM Gateway**: All LLM calls route through `litellm.amzur.com`
3. **Async Everything**: FastAPI routes and database operations are async
4. **SQLAlchemy 2.0**: Modern async ORM patterns
5. **LCEL Chains**: LangChain chains use Expression Language (LCEL) syntax

## Database

### Tables

**threads**
- `id` (UUID): Primary key
- `user_id` (UUID): User who owns the thread
- `title` (string): Thread title
- `created_at` (datetime): Creation timestamp
- `updated_at` (datetime): Last update timestamp

**messages**
- `id` (UUID): Primary key
- `thread_id` (UUID): Foreign key to thread
- `role` (string): "user" or "assistant"
- `content` (text): Message text
- `created_at` (datetime): Message timestamp

### Migrations

Database migrations are managed by Alembic. To create a new migration:

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Testing

Run tests with pytest:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=app
```

## Debugging

### Enable Debug Logging
Set `ENVIRONMENT=development` in `.env` to see SQL queries:

```python
# In app/core/config.py
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",  # Prints all SQL
)
```

### Check LiteLLM Connection
```bash
curl -H "Authorization: Bearer sk-YOUR_KEY" \
  https://litellm.amzur.com/ui
```

### Database Connection
```bash
psql postgresql://user:pass@host:5432/dbname
```

## Common Issues

### ModuleNotFoundError: No module named 'psycopg2'
**Solution:** Install `psycopg2-binary`:
```bash
pip install psycopg2-binary
```

### LiteLLM Connection Error
**Solution:** Ensure you're connected to the Amzur VPN:
```bash
nslookup litellm.amzur.com
```

### Database Migration Errors
**Solution:** Check the Alembic environment configuration in `alembic/env.py` and ensure your `DATABASE_URL` is correct.

## Development Workflow

1. **Make code changes** in `app/services/`, `app/api/`, etc.
2. **Server hot-reloads** automatically (if using `uvicorn --reload`)
3. **Test with:** `curl`, Postman, or the frontend
4. **Commit changes** with descriptive messages

## Deployment Considerations

- Use a production database (not SQLite)
- Set `ENVIRONMENT=production`
- Generate strong `SECRET_KEY`
- Use environment variables for all sensitive data
- Enable HTTPS (`secure=True` in cookie settings)
- Run migrations before deployment
- Use a production ASGI server (Gunicorn + Uvicorn)
