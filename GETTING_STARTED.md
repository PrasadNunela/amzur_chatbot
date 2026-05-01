# Amzur AI Chat - Getting Started Guide

## 🚀 Quick Start (5 minutes)

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment
cp .env.example .env
# Edit .env and ensure DATABASE_URL is set correctly

# 5. Run migrations
alembic upgrade head

# 6. Start server
python main.py
# ✅ Server running at http://localhost:8000
```

### Frontend Setup

```bash
# 1. In a new terminal, navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# 4. Start dev server
npm run dev
# ✅ App running at http://localhost:5173
```

### Test the Chatbot

1. Open http://localhost:5173 in your browser
2. Click **"+ New Chat"** in the sidebar
3. Type a message and click **"Send"**
4. Watch the AI respond with Gemini

## 📁 Project Structure Overview

```
amzur_chatbot/
├── backend/
│   ├── app/
│   │   ├── api/               # HTTP endpoints
│   │   ├── services/          # Business logic (ChatService)
│   │   ├── models/            # Database models (Thread, Message)
│   │   ├── schemas/           # Request/response schemas
│   │   ├── ai/
│   │   │   ├── llm.py        # LiteLLM clients
│   │   │   └── chains/        # LCEL chains (chat.py)
│   │   ├── db/                # Database session factory
│   │   └── core/              # Config, logging
│   ├── main.py                # FastAPI app
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment template
│   ├── README.md             # Backend docs
│   └── alembic/              # Database migrations
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── chat/         # Chat UI components
│   │   ├── hooks/            # useChat hook
│   │   ├── lib/              # API client
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx           # Root component
│   │   └── main.tsx          # Entry point
│   ├── package.json          # Dependencies
│   ├── vite.config.ts        # Vite config (proxies to backend)
│   ├── tsconfig.json         # TypeScript strict mode
│   ├── .env.example          # Environment template
│   ├── README.md             # Frontend docs
│   └── public/               # Static assets
│
└── PROJECT_SETUP.md          # Initial scaffolding guide
```

## 🔑 Key Architecture Decisions

### Backend

**LCEL Chains (LangChain Expression Language)**
```python
# Chat chain: system prompt → history → user input → LLM → response
chain = system_prompt | llm | parser
response = chain.invoke(messages)
```

**Router → Service → Schema → Model**
- Routers (`api/chat.py`): Parse requests, call services, return responses
- Services (`services/chat.py`): All business logic, fully testable
- Schemas (`schemas/chat.py`): Pydantic validation for I/O
- Models (`models/chat.py`): SQLAlchemy ORM definitions

**LiteLLM Proxy Gateway**
- All LLM calls route through `litellm.amzur.com`
- No direct calls to OpenAI, Google, or Anthropic
- Centralized cost tracking and rate limiting

**Async/Await Throughout**
- FastAPI routes are async
- Database operations are async (SQLAlchemy with asyncpg)
- Perfect for handling many concurrent requests

### Frontend

**React Query for Server State**
- Automatic caching and refetching
- Optimistic updates for snappy UX
- Works seamlessly with async backend

**TypeScript Strict Mode**
- Catches bugs at compile time
- Better IDE autocomplete and refactoring
- No `any` types allowed

**Tailwind CSS + Dark Mode**
- Utility-first styling
- Dark mode via `dark:` classes
- No custom CSS files

## 🔄 Data Flow

```
User Types Message
       ↓
Frontend (React)
       ↓
ChatInput sends to API
       ↓
Backend (FastAPI)
       ↓
ChatService saves user message to DB
       ↓
ChatService retrieves conversation history
       ↓
LangChain chain prepares messages with history
       ↓
LiteLLM proxy calls Gemini model
       ↓
ChatService saves assistant response to DB
       ↓
Backend returns response to frontend
       ↓
Frontend displays message and updates list
```

## 🛠️ API Endpoints

### Threads (Conversations)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat/threads` | POST | Create new thread |
| `/chat/threads` | GET | List all threads |
| `/chat/threads/{id}` | GET | Get thread with messages |
| `/chat/threads/{id}` | DELETE | Delete thread |

### Messages

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat/threads/{id}/messages` | POST | Send message, get response |

## 📊 Database Schema

### threads
- `id` (UUID): Unique identifier
- `user_id` (UUID): Thread owner
- `title` (string): Optional title
- `created_at` (datetime): Creation time
- `updated_at` (datetime): Last update

### messages
- `id` (UUID): Unique identifier
- `thread_id` (UUID): Parent thread
- `role` (string): "user" or "assistant"
- `content` (text): Message text
- `created_at` (datetime): Message time

## 🧪 Testing the API

### Create a thread
```bash
curl -X POST http://localhost:8000/api/chat/threads \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Chat"}'
```

### Send a message
```bash
curl -X POST http://localhost:8000/api/chat/threads/{thread_id}/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, what is 2+2?"}'
```

## ⚙️ Configuration

### Backend Environment Variables
```
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/dbname

# LiteLLM (required)
LITELLM_PROXY_URL=http://litellm.amzur.com:4000
LITELLM_API_KEY=sk-xxxxx
LLM_MODEL=gemini/gemini-2.5-flash

# Security
SECRET_KEY=your-secret-key-here
JWT_EXPIRE_MINUTES=480
```

### Frontend Environment Variables
```
# Backend API
VITE_API_BASE_URL=http://localhost:8000/api
```

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: psycopg2` | `pip install psycopg2-binary` |
| `LiteLLM connection error` | Check VPN connection: `nslookup litellm.amzur.com` |
| `CORS errors` | Ensure backend runs on `localhost:8000` |
| `API calls to wrong URL` | Check `VITE_API_BASE_URL` in frontend `.env` |
| `Database connection refused` | Check `DATABASE_URL` and PostgreSQL is running |

## 📖 Detailed Documentation

- **Backend**: See [backend/README.md](backend/README.md)
- **Frontend**: See [frontend/README.md](frontend/README.md)
- **Copilot Instructions**: See [.github/copilot-instructions.md](.github/copilot-instructions.md)

## 🚀 Next Steps

1. **Add authentication**: Implement JWT auth for users
2. **Implement Google OAuth**: Allow users to sign in with Google
3. **Add file uploads**: Support images, PDFs, etc.
4. **Implement RAG**: Add document retrieval augmented generation
5. **Add streaming responses**: Stream tokens as they arrive from LLM
6. **Implement thread titles**: Auto-generate or user-provided titles
7. **Add search**: Search messages across threads
8. **Implement conversation memory**: Longer context windows

## 📚 Tech Stack Reference

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18.2.0 |
| Frontend Build | Vite | 5.0.0 |
| Frontend Styling | Tailwind CSS | 3.4.0 |
| Backend | FastAPI | 0.109.0 |
| Backend Server | Uvicorn | 0.27.0 |
| Database | PostgreSQL | (your version) |
| ORM | SQLAlchemy | 2.0.23 |
| AI Framework | LangChain | 0.1.9 |
| LLM | Gemini 2.5 Flash | via LiteLLM |
| API Gateway | LiteLLM Proxy | https://litellm.amzur.com |

## 🎯 Development Checklist

- [ ] Backend server running on `http://localhost:8000`
- [ ] Frontend server running on `http://localhost:5173`
- [ ] Database migrations applied (`alembic upgrade head`)
- [ ] Environment variables configured (`.env` files)
- [ ] Can create new chat thread
- [ ] Can send message and receive AI response
- [ ] Messages appear in correct order
- [ ] Thread list updates when creating new thread
- [ ] Dark mode works correctly

## 💡 Tips & Best Practices

1. **Always run migrations**: `alembic upgrade head` before starting
2. **Use the API client**: Never call `fetch()` directly in components
3. **Keep business logic in services**: Never in routers or components
4. **Use TypeScript types**: Catch errors at compile time
5. **Test API with curl**: Before integrating with frontend
6. **Check browser console**: For frontend errors
7. **Check server logs**: For backend errors
8. **Use Postman**: For complex API testing

---

**Happy coding! 🎉**
