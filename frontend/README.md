# Amzur AI Chat - Frontend Documentation

## Setup & Installation

### Prerequisites
- Node.js 16+ and npm

### Installation Steps

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   - `VITE_API_BASE_URL`: Backend API URL (default: `http://localhost:8000/api`)
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth client ID (optional for now)

3. **Start development server:**
   ```bash
   npm run dev
   ```
   App runs on `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start Vite dev server with hot reload
- `npm run build` - Build for production (`dist/` folder)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality
- `npm run format` - Format code with Prettier

## Architecture

### Folder Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── chat/
│   │       ├── ChatThread.tsx      # Main chat container
│   │       ├── ChatMessage.tsx     # Single message bubble
│   │       ├── ChatInput.tsx       # Message input field
│   │       ├── MessageList.tsx     # Message list container
│   │       └── ThreadSidebar.tsx   # Thread list & create
│   ├── pages/                      # Full-page components
│   ├── hooks/
│   │   └── useChat.ts             # Chat state management hook
│   ├── lib/
│   │   └── api.ts                 # Centralized API client
│   ├── types/
│   │   ├── index.ts               # Main types export
│   │   └── chat.ts                # Chat-specific types
│   ├── App.tsx                    # Root component
│   ├── main.tsx                   # React entry point
│   └── index.css                  # Global Tailwind styles
├── public/                         # Static assets
├── index.html                      # HTML entry point
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript config
├── tailwind.config.js             # Tailwind CSS config
├── .eslintrc.json                 # ESLint rules
└── .prettierrc.json               # Prettier rules
```

### Key Components

#### ChatThread
Main chat container that:
- Fetches thread data with messages
- Sends messages to backend
- Manages loading/error states
- Auto-scrolls to latest message

#### MessageList
Displays all messages in a thread with:
- User messages (blue, right-aligned)
- Assistant messages (gray, left-aligned)
- Timestamps for each message
- Loading indicator while waiting for response

#### ChatInput
Input field for sending messages with:
- Text input with placeholder
- Send button (disabled while loading)
- Enter key support

#### ThreadSidebar
Thread management panel with:
- "New Chat" button
- List of all threads
- Active thread highlighting
- Thread selection

### State Management

**React Query (TanStack Query)**
- Manages server state (threads, messages)
- Automatic refetching and caching
- Optimistic updates for better UX

**useState**
- Local UI state (input value, loading indicator)

**useChat Hook**
- Custom hook wrapping query logic
- Active thread management

### API Integration

All API calls go through `/src/lib/api.ts`:

```typescript
// Get a thread with messages
const thread = await apiClient.get<ThreadDetail>(`/chat/threads/${threadId}`)

// Send a message
const response = await apiClient.post(`/chat/threads/${threadId}/messages`, {
  content: "Your message",
})

// Create a new thread
const newThread = await apiClient.post<Thread>('/chat/threads', {
  title: null,
})

// List threads
const threads = await apiClient.get<Thread[]>('/chat/threads')
```

## Styling

**Tailwind CSS** with:
- Dark mode support via `dark:` variants
- Responsive design (mobile-first)
- No custom CSS files — utilities only
- Utility classes inline in components

### Dark Mode

Tailwind is configured with `selector` strategy. To enable dark mode:
```html
<html class="dark">
```

## TypeScript

Strict mode enabled:
- `noImplicitAny`: No implicit `any` types
- `strictNullChecks`: Null/undefined must be explicit
- `noUnusedLocals`: Unused variables cause errors

## Debugging

### Enable React DevTools
Install the React DevTools browser extension to inspect component state and props.

### API Debugging
```typescript
// Add logging in apiClient
config={"metadata": {"user_email": "debug@example.com"}}
```

### Browser Console
Check the console for any fetch errors:
```javascript
// Example error format
{
  error: "not_found",
  message: "Thread not found"
}
```

## Common Issues

### CORS Errors
**Solution:** Ensure backend is running on `localhost:8000` and the Vite proxy in `vite.config.ts` is correct.

### API Calls to Wrong URL
**Solution:** Check `VITE_API_BASE_URL` in `.env.local`:
```
VITE_API_BASE_URL=http://localhost:8000/api
```

### Components Not Updating
**Solution:** Check React Query devtools. Open with:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Add to App before closing provider
<ReactQueryDevtools initialIsOpen={false} />
```

## Development Workflow

1. **Start both servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend && python main.py

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

2. **Frontend auto-reloads** on file changes (Vite)
3. **Backend auto-reloads** on file changes (Uvicorn)
4. **API requests** from `localhost:5173` → `localhost:8000` (via proxy)

## Production Build

1. **Build frontend:**
   ```bash
   npm run build
   ```
   Creates optimized bundle in `dist/`

2. **Serve with backend:**
   - Copy `dist/` to backend's static folder
   - Or deploy frontend to CDN/static host separately

3. **Environment variables:**
   ```
   VITE_API_BASE_URL=https://api.example.com
   ```

## Performance Optimization

- Code splitting: Components lazy-loaded by Vite
- Message virtualization: Consider if thread has 1000+ messages
- Image optimization: Use next-gen formats if adding image support
- Minification: Vite automatically minifies production builds

## Accessibility

- Semantic HTML (`<button>`, `<input>`, `<form>`)
- ARIA labels for complex components
- Keyboard navigation support
- Focus management for modals
