# 🤖 Amzur AI Chat - Google Gemini Powered Chatbot

A modern, production-ready conversational AI chatbot built with **React**, **FastAPI**, **LangChain**, and **Google's Gemini AI**.

![Python](https://img.shields.io/badge/Python-3.11+-blue) ![React](https://img.shields.io/badge/React-18+-61dafb) ![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- 🤖 **Google Gemini AI** - Powered by free Google Gemini API
- 💬 **Multi-turn Conversations** - Full conversation history and context
- 🧵 **Thread Management** - Create, switch, and organize multiple conversations
- � **File Attachments** - Upload images, videos, code, documents, tables and more
- �💾 **Persistent Storage** - All messages saved to PostgreSQL database
- ⚡ **Real-time Responses** - Instant AI responses with loading states
- 🎨 **Modern UI** - Clean, responsive design with dark mode support
- 📱 **Mobile Friendly** - Works seamlessly on desktop and mobile devices
- 🔄 **Type-safe** - Full TypeScript support on frontend and Python type hints on backend
- 📚 **Well-documented** - Comprehensive guides and API documentation

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Python 3.11+
- Node.js 16+
- PostgreSQL 14+ (or SQLite for testing)

### Option 1: Automated Setup (Recommended)

**On macOS/Linux:**
```bash
chmod +x quick-start.sh
./quick-start.sh
```

**On Windows:**
```bash
quick-start.bat
```

### Option 2: Manual Setup

**1. Get a free Google Gemini API key:**
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- Click "Create API Key"
- Copy your API key

**2. Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # Edit and add your Google API key
alembic upgrade head
python main.py
```

**3. Frontend Setup (new terminal):**
```bash
cd frontend
npm install
npm run dev
```

**4. Open in browser:**
```
http://localhost:5173
```

## 📖 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Comprehensive setup and troubleshooting
- **[ATTACHMENT_IMPLEMENTATION.md](./ATTACHMENT_IMPLEMENTATION.md)** - File upload and attachment feature guide
- **[API Documentation](./backend/README.md)** - Backend API endpoints and setup
- **[Database Migrations Guide](./backend/MIGRATIONS.md)** - Migration management and schema
- **[Quick Migration Setup](./backend/QUICK_MIGRATION_SETUP.md)** - Fast reference for running migrations
- **[Frontend Guide](./frontend/README.md)** - Frontend components and state management

## 📁 Project Structure

```
amzur_chatbot/
├── backend/                    # FastAPI server
│   ├── app/
│   │   ├── ai/                 # LangChain & Gemini integration
│   │   ├── api/                # REST API routes
│   │   ├── services/           # Business logic
│   │   ├── models/             # Database models
│   │   ├── schemas/            # Pydantic validation
│   │   └── core/               # Config & logging
│   ├── alembic/                # Database migrations
│   ├── requirements.txt        # Python dependencies
│   └── main.py                 # App entry point
│
├── frontend/                   # React app
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities & API client
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx             # Main component
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── SETUP_GUIDE.md              # Detailed setup instructions
├── quick-start.sh              # macOS/Linux setup script
├── quick-start.bat             # Windows setup script
└── README.md                   # This file
```

## 🛠️ Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | React + TypeScript | 18+ |
| Styling | Tailwind CSS | 3.4+ |
| State Management | React Query + Zustand | Latest |
| Backend | FastAPI | 0.109+ |
| ORM | SQLAlchemy | 2.0+ |
| Database | PostgreSQL | 14+ |
| AI/LLM | LangChain + Google Gemini | Latest |
| Migrations | Alembic | 1.13+ |

## 📋 API Endpoints

### Threads
```
POST   /api/chat/threads              # Create new conversation
GET    /api/chat/threads              # List all conversations
GET    /api/chat/threads/{id}         # Get conversation details
DELETE /api/chat/threads/{id}         # Delete conversation
```

### Messages
```
POST   /api/chat/threads/{id}/messages  # Send message & get AI response
```

### Health
```
GET    /health                        # Health check
```

## 🔧 Configuration

### Backend (.env)
```env
# Google Gemini API
GOOGLE_API_KEY=your-api-key-here
LLM_MODEL=gemini-pro

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/chatbot

# App
SECRET_KEY=your-secret-key
APP_NAME=amzur-ai-chat
ENVIRONMENT=development
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Linting & Formatting
```bash
# Backend
cd backend
ruff check .
ruff format .

# Frontend
cd frontend
npm run lint
npm run format
```

## 🚢 Deployment

### Deploy to Heroku
```bash
# Backend
cd backend
heroku create your-app-name
git push heroku main
```

### Deploy to Vercel
```bash
# Frontend
cd frontend
vercel deploy --prod
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version         # Should be 3.11+

# Reinstall dependencies
pip install -r requirements.txt --upgrade

# Check database
psql postgresql://user:pass@localhost:5432/chatbot

# Run setup verification
python verify_setup.py
```

### Frontend can't connect to backend
```bash
# Check API endpoint in frontend/.env
VITE_API_BASE_URL=http://localhost:8000/api

# Check CORS in backend/main.py
# Ensure localhost:5173 is in allowed origins

# Check backend is running
curl http://localhost:8000/health
```

### Google API key errors
```bash
# Verify API key is valid
Visit: https://makersuite.google.com/app/apikey

# Check API key in backend/.env
GOOGLE_API_KEY=your-actual-key

# Verify quota/usage
Visit: https://makersuite.google.com/app/usage
```

## 📖 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [React Documentation](https://react.dev/)
- [Google Gemini API](https://ai.google.dev/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💬 Support

If you encounter issues:

1. Check the [SETUP_GUIDE.md](./SETUP_GUIDE.md) troubleshooting section
2. Run `python backend/verify_setup.py` to diagnose issues
3. Check backend logs: `tail -f backend/app.log`
4. Open browser dev tools (F12) for frontend errors

## 🎉 Getting Started

Ready to build your AI chatbot?

```bash
# Clone or download the repository
cd amzur_chatbot

# Run the quick start
./quick-start.sh    # macOS/Linux
# OR
quick-start.bat     # Windows

# Follow the prompts to add your Google API key
# Open http://localhost:5173 when ready
```

**That's it!** Your AI chatbot is now running. Start chatting! 🚀

---

Built with ❤️ using FastAPI, React, and Google Gemini
