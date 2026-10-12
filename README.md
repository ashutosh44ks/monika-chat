# Monika Chat

A DDLC-themed infinite chat with Monika, powered by OpenRouter.

## Setup

### Server
```bash
cd server
cp .env.example .env
# Add your OPENROUTER_API_KEY to .env
npm run dev
```

### Client
```bash
cd client
npm run dev
```

Open http://localhost:5173

## Stack
- **Client**: React + TypeScript + Tailwind v4 (Vite)
- **Server**: Node + Express + TypeScript → OpenRouter (claude-3.5-haiku)
