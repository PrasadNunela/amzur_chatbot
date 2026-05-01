# 🚀 Amzur AI Chat - Quick Reference

## 5-Minute Setup

### Prerequisites
- Python 3.11+
- Node.js 16+
- PostgreSQL running
- .env files configured

### Start Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python main.py
# ✅ http://localhost:8000
```

### Start Frontend
```bash
cd frontend
npm install && npm run dev
# ✅ http://localhost:5173
```

### Test
1. Open http://localhost:5173
2. Click "+ New Chat"
3. Send a message
4. See Gemini response!

---

## 📋 Checklist

### Backend
- [ ] Python 3.11+ installed
- [ ] Virtual environment created and activated
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] `.env` file configured with:
  - `DATABASE_URL` (PostgreSQL)
  - `LITELLM_PROXY_URL` (http://litellm.amzur.com:4000)
  - `LITELLM_API_KEY` (your API key)
  - `SECRET_KEY` (generated secret)
- [ ] Database migrated: `alembic upgrade head`
- [ ] Server running: `python main.py`

### Frontend
- [ ] Node.js 16+ installed
- [ ] Dependencies installed: `npm install`
- [ ] `.env` file configured (defaults work locally)
- [ ] Dev server running: `npm run dev`

### Testing
- [ ] Can create new chat thread
- [ ] Can send message
- [ ] Receive AI response
- [ ] Messages appear in correct order
- [ ] Can create multiple threads
- [ ] Dark mode works

---

## 🔑 Key Commands

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migrations
alembic downgrade -1

# Verify setup
python verify_setup.py

# Start server
python main.py
```

### Frontend
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

---

## 🎯 Architecture Snapshot

### Backend Flow
```
Request → FastAPI Router → ChatService → Database
                                      ↓
                              LangChain LCEL Chain
                                      ↓
                              LiteLLM → Gemini
```

### Frontend Flow
```
User Input → React Component → API Client → Backend
                                           ↓
                                  React Query updates
                                           ↓
                                   UI re-renders
```

---

## 🔗 File Locations

| What | Where |
|------|-------|
| Chat API | `backend/app/api/chat.py` |
| Business Logic | `backend/app/services/chat.py` |
| Database Models | `backend/app/models/chat.py` |
| LLM Setup | `backend/app/ai/llm.py` |
| Chat Chain | `backend/app/ai/chains/chat.py` |
| Chat Components | `frontend/src/components/chat/` |
| API Client | `frontend/src/lib/api.ts` |
| Types | `frontend/src/types/chat.ts` |

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: psycopg2` | `pip install psycopg2-binary` |
| Database connection error | Check PostgreSQL running + DATABASE_URL |
| LiteLLM connection error | Check VPN: `nslookup litellm.amzur.com` |
| CORS errors | Ensure backend on localhost:8000 |
| TypeScript errors | Check tsconfig.json strict mode |
| No messages updating | Check React Query devtools |

---

## 📞 Quick Diagnostics

```bash
# Check Python
python --version  # Should be 3.11+

# Check Node
node --version   # Should be 16+

# Check PostgreSQL
psql -U user -d database -h localhost

# Check LiteLLM connection
nslookup litellm.amzur.com

# Test API
curl http://localhost:8000/api/health

# View React Query cache
# Open DevTools → React Query tab (after installing extension)
```

---

## 🌙 Toggle Dark Mode

Dark mode is automatic based on system preference, or add to `index.html`:
```html
<html class="dark">
```

---

## 📚 Documentation

- **Quick Start**: [GETTING_STARTED.md](GETTING_STARTED.md)
- **Backend Docs**: [backend/README.md](backend/README.md)
- **Frontend Docs**: [frontend/README.md](frontend/README.md)
- **Full Summary**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **Project Copilot Instructions**: [.github/copilot-instructions.md](.github/copilot-instructions.md)

---

## 💡 Pro Tips

1. **Always run migrations** before starting backend
2. **Use React Query DevTools** to debug state
3. **Check browser console** for frontend errors
4. **Check server logs** for backend errors
5. **Use curl** to test API before UI
6. **TypeScript strict mode** catches errors early
7. **Tailwind utility classes** solve most styling needs
8. **LCEL chains** are simpler than traditional LangChain

---

## 🎓 What You Learned

✅ Building async FastAPI endpoints  
✅ Using SQLAlchemy 2.0 with asyncpg  
✅ Creating React components with TypeScript  
✅ Managing server state with React Query  
✅ Integrating LangChain LCEL chains  
✅ Calling LLMs through LiteLLM proxy  
✅ Database migrations with Alembic  
✅ Building modern UIs with Tailwind CSS  
✅ Clean architecture patterns  

---

## 🚀 Next Feature Ideas

1. **Authentication** - Add JWT + Google OAuth
2. **Streaming** - Stream tokens in real-time
3. **Files** - Upload and process documents
4. **RAG** - Retrieve information from uploads
5. **Search** - Find messages across threads
6. **Export** - Save chats as PDF
7. **Settings** - User preferences
8. **Analytics** - Track usage metrics

---

## 📞 Need Help?

1. Run `python backend/verify_setup.py` - Checks all configuration
2. Read the docs - Links above
3. Check terminal logs - Both frontend and backend
4. Inspect network tab - See API requests/responses
5. Use React DevTools - Check component state

---

**You're all set! Enjoy building with AI! 🤖✨**
