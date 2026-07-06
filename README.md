# Argos - AI Investment Research Agent

Argos is a full-stack investment research assistant. The React frontend opens a Server-Sent Events (SSE) connection to the Express backend, and the backend runs a Groq-powered sequential research pipeline.

## Deployment Architecture

```text
Frontend (Vercel) -> Backend API (Render) -> Groq
```

The Groq API key is used only by the backend. The frontend only needs the deployed backend URL.

## Project Structure

```text
investment-agent/
├── backend/   # Express API, Groq SDK, SSE endpoint
└── frontend/  # React Create React App client
```

## How To Run Locally

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Set `GROQ_API_KEY` in `backend/.env` before running real analyses.

Backend local URL:

```text
http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The local frontend uses `frontend/.env.development`:

```env
REACT_APP_API_URL=http://localhost:4000
```

Frontend local URL:

```text
http://localhost:3000
```

## Environment Variables

### Backend

Use these in `backend/.env` locally and in Render environment variables:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=4000
FRONTEND_URL=http://localhost:3000
```

For production, set `FRONTEND_URL` to your Vercel app URL, for example:

```env
FRONTEND_URL=https://your-argos-app.vercel.app
```

### Frontend

Use this in Vercel environment variables:

```env
REACT_APP_API_URL=https://your-render-service.onrender.com
```

Do not put `GROQ_API_KEY` in the frontend.

## Backend Deployment (Render)

Create a new Render Web Service from this repository.

Render settings:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Render environment variables:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
FRONTEND_URL=https://your-argos-app.vercel.app
```

Render provides `PORT` automatically. You can omit it in production unless you need to override the default locally.

Health checks:

```text
GET /
GET /api/health
```

## Frontend Deployment (Vercel)

Create a new Vercel project from this repository.

Vercel settings:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: build
```

Vercel environment variables:

```env
REACT_APP_API_URL=https://your-render-service.onrender.com
```

After deploying the frontend, copy the Vercel URL into Render as `FRONTEND_URL` so CORS allows browser requests.

## API Endpoints

### `GET /`

Returns service metadata:

```json
{
  "status": "running",
  "service": "Argos Investment Research Agent API",
  "version": "1.0.0"
}
```

### `GET /api/health`

Returns:

```json
{ "ok": true }
```

### `GET /api/analyze?company=Tesla`

Streams the investment research pipeline using SSE.

Example stream event:

```text
data: {"step":"research","status":"running","message":"Researching Tesla..."}
```

## Security Notes

- Keep `backend/.env` and all real `.env` files out of git.
- Store `GROQ_API_KEY` only in backend environment variables.
- Set `FRONTEND_URL` in Render to the exact Vercel origin.
- Set `REACT_APP_API_URL` in Vercel to the exact Render backend origin.
