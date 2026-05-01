# ✨ Amzur AI Chat - Simple Chatbot with Google Gemini

A modern, interactive chatbot built with **React**, **FastAPI**, and **LangChain**, powered by **Google's Gemini AI**.

## 🚀 Quick Start (10 minutes)

### Prerequisites
- Python 3.11+
- Node.js 16+
- PostgreSQL 14+ (or Docker)
- Free Google Gemini API key

### Step 1: Get a Google Gemini API Key (1 minute)

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy your API key (you'll need this in Step 4)

### Step 2: Set Up Database (2 minutes)

**Option A: Using PostgreSQL locally**
```bash
# Create database
createdb chatbot

# Or if using docker:
docker run --name postgres-chatbot \
  -e POSTGRES_DB=chatbot \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Skip (use SQLite for testing)**
Update `backend/.env`: `DATABASE_URL=sqlite+aiosqlite:///./chatbot.db`

### Step 3: Backend Setup (3 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env and paste your Google API key

# Run database migrations
alembic upgrade head

# Start the server
python main.py
```

✅ Server running at `http://localhost:8000`  
✅ API docs at `http://localhost:8000/docs`

### Step 4: Frontend Setup (3 minutes)

```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

✅ App running at `http://localhost:5173`

### Step 5: Start Chatting! 🎉

1. Open http://localhost:5173 in your browser
2. Click **"+ New Chat"** to create a conversation
3. Type your message and hit **Send**
4. Watch the AI respond with Gemini! 🤖

## 📋 Project Structure

```
amzur_chatbot/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   ├── llm.py           # Google Gemini LLM client
│   │   │   └── chains/chat.py   # LangChain chat chain
│   │   ├── api/chat.py          # FastAPI routes
│   │   ├── services/chat.py     # Business logic
│   │   ├── models/chat.py       # Database models
│   │   ├── schemas/chat.py      # Request/response validation
│   │   └── core/config.py       # Configuration
│   ├── alembic/                 # Database migrations
│   └── main.py                  # FastAPI app entry
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── chat/            # Chat UI components
│   │   ├── hooks/useChat.ts     # Chat state management
│   │   ├── lib/api.ts           # API client
│   │   ├── types/chat.ts        # TypeScript types
│   │   └── App.tsx              # Main app component
│   └── index.html
```

## 🔧 Configuration

### Backend (.env)

```env
# App
SECRET_KEY=your-secret-key-here
APP_NAME=amzur-ai-chat
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/chatbot

# Google Gemini API
GOOGLE_API_KEY=your-api-key-here
LLM_MODEL=gemini-pro
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## 🎯 Features

- ✅ **Real-time chat** with Google Gemini AI
- ✅ **Multiple conversations** (create new threads)
- ✅ **Persistent memory** (all messages saved to database)
- ✅ **Conversation history** (context-aware responses)
- ✅ **Clean UI** with Tailwind CSS
- ✅ **Dark mode** support
- ✅ **Responsive design** (works on mobile)
- ✅ **Auto-scroll** to latest messages
- ✅ **Loading indicators** during API calls
- ✅ **Error handling** with user-friendly messages

## 📚 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/threads` | Create a new conversation |
| GET | `/api/chat/threads` | List all conversations |
| GET | `/api/chat/threads/{id}` | Get conversation details |
| POST | `/api/chat/threads/{id}/messages` | Send message & get AI response |
| DELETE | `/api/chat/threads/{id}` | Delete a conversation |
| GET | `/health` | Health check |

## 🛠️ Development

### Run Backend Tests
```bash
cd backend
pytest -v
```

### Run Frontend Linting
```bash
cd frontend
npm run lint
npm run format
```

### Database Migrations
```bash
cd backend

# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1
```

## 🚢 Deployment

### Deploy Backend (Heroku / Railway / DigitalOcean)

```bash
cd backend

# Set environment variables
# DATABASE_URL, GOOGLE_API_KEY, SECRET_KEY

# Deploy
git push heroku main
```

### Deploy Frontend (Vercel / Netlify)

```bash
cd frontend

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'langchain_google_genai'"
```bash
cd backend
pip install -U langchain-google-genai google-generativeai
```

### "Database connection error"
- Ensure PostgreSQL is running: `psql postgres`
- Update `DATABASE_URL` in `.env`
- Run migrations: `alembic upgrade head`

### "API returns 401 Unauthorized"
- Check `GOOGLE_API_KEY` in `.env`
- Verify API key is active at [Google AI Studio](https://makersuite.google.com/app/apikey)

### "Frontend can't connect to backend"
- Ensure backend is running on `http://localhost:8000`
- Check `VITE_API_BASE_URL` in frontend `.env`
- Check CORS settings in `backend/main.py`

### "No response from AI"
- Check network tab in browser (F12 → Network)
- Check backend logs for errors
- Verify API key quota at [Usage Dashboard](https://makersuite.google.com/app/usage)

## 📖 Learn More

- [LangChain Docs](https://python.langchain.com/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Google Gemini API](https://ai.google.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## 📄 License

MIT

## 💬 Support

For issues or questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review backend logs: `tail -f backend/app.log`
3. Open browser dev tools (F12) to check frontend errors
4. Check Google AI Studio dashboard for API status

---

**Happy chatting!** 🚀
