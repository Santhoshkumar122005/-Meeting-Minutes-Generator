# MeetLyze AI - Enterprise Meeting Intelligence
Completed Version (v2.0 Enterprise)

## Overview
MeetLyze is an AI-powered meeting minutes generator that transforms video and audio recordings into comprehensive, professional insights. 

**Key Features:**
- **Multimodal Analysis:** Uploads audio to Gemini 1.5 Flash for true speaker diarization (distinguishing speakers by voice) and sentiment tone analysis.
- **Universal Multilingual Support:** Auto-detects languages (Hindi, Spanish, French, etc.) and generates reports in the *same* language, or translates to English on demand.
- **Advanced Analytics:** Dashboard with Sentiment Analysis, Language Distribution, and Topic Modeling.
- **Enterprise Export:** Download reports as polished **Word (DOCX)**, PDF, or Markdown.
- **Resilient AI:** Automatic fallback strategy (Gemini 1.5 Flash -> 1.5 Pro -> Pro 1.0).

## Running the Application

### Prerequisites
- Python 3.10+
- Node.js 18+
- FFmpeg (System installed or auto-handled)
- **GEMINI_API_KEY** set in `backend/.env`

### Quick Start

1. **Backend**
   ```bash
   cd backend
   # Ensure venv is active
   uvicorn main:app --reload
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access**
   Open `http://localhost:5173` in your browser.

## Deployment

### Frontend (Vercel)
Vercel is the recommended way to host the frontend.
1. **Connect to Vercel**: Import your repository into Vercel.
2. **Configure Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variables**: Add `VITE_API_URL` pointing to your deployed backend (e.g., `https://your-backend.render.com`).

### Backend Deployment Recommendation
The backend requires a Python environment with FFmpeg support.
1. **Render / Railway**: These are great for hosting FastAPI apps with Docker.
2. **Environment Variables**: Ensure `GEMINI_API_KEY` is set in the hosting service's dashboard.

## Project Structure
- `backend/main.py`: Core FastAPI service + AI logic.
- `frontend/src`: React application.
- `frontend/src/components/ResultDisplay.jsx`: Renders insights + Exports.
- `frontend/src/components/Dashboard.jsx`: Analytics charts.

## Troubleshooting
- **Audio Upload Error?**: Ensure your `GEMINI_API_KEY` has permissions for the Generative Language API.
- **Diarization Missing?**: Speaker identification relies on audio quality. If the model cannot distinguish voices, it may revert to generic labels.
