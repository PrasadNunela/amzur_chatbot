# Project structure and setup instructions

## Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy .env.example to .env and fill in values
cp .env.example .env

# Start development server
python main.py
# Server runs on http://localhost:8000
```

## Frontend Setup

```bash
cd frontend
npm install

# Copy .env.example to .env and fill in values
cp .env.example .env

# Start development server
npm run dev
# App runs on http://localhost:5173
```

## Folder Structure

### Backend (`/backend`)
- `app/` - Main application package
  - `api/` - HTTP routers (endpoints only)
  - `services/` - Business logic (all domain logic here)
  - `models/` - SQLAlchemy ORM definitions
  - `schemas/` - Pydantic request/response models
  - `ai/` - AI orchestration layer
    - `llm.py` - LiteLLM client singletons
    - `chains/` - LCEL chains for AI features
    - `memory/` - Conversation memory utilities
    - `rag/` - RAG and vector storage
    - `prompts/` - Prompt templates
  - `db/` - Database session factory
  - `core/` - Config, logging, settings
- `main.py` - FastAPI application entry point

### Frontend (`/frontend`)
- `src/` - Source code
  - `components/` - React components
    - `chat/` - Chat UI components
    - `attachments/` - File upload components
    - `auth/` - Authentication components
  - `pages/` - Page-level components
  - `hooks/` - Custom React hooks
  - `lib/` - API client, utilities
  - `types/` - Shared TypeScript types
  - `main.tsx` - React entry point
- `vite.config.ts` - Vite configuration
- `tailwind.config.js` - Tailwind CSS config
- `tsconfig.json` - TypeScript configuration

## Environment Variables

See `.env.example` files in both `backend/` and `frontend/` directories.

## Development Workflow

1. **Backend changes**: Hot-reload via Uvicorn
2. **Frontend changes**: Hot-reload via Vite dev server
3. Both communicate via `http://localhost:8000/api` (backend) ← `http://localhost:5173` (frontend)

## Key Principles

- **Router → Service → Schema → Model**: No business logic in routers
- **LiteLLM only**: All AI calls route through `litellm.amzur.com`
- **JWT in httpOnly cookies**: Auth tokens never in localStorage
- **API client centralized**: All frontend API calls through `/src/lib/api.ts`
- **Types first**: TypeScript strict mode enabled
