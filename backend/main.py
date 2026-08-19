import sys

# Windows console encoding fix
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

import os
import shutil
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

import asyncio
import uuid
import re
import subprocess
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv
import google.generativeai as genai
try:
    from transformers import pipeline
except ImportError:
    pipeline = None

try:
    import whisper
except ImportError:
    whisper = None

try:
    from moviepy.editor import VideoFileClip
except ImportError:
    VideoFileClip = None

import yt_dlp
import imageio_ffmpeg
from pydantic import BaseModel
import database

# Initialize Database
# Load environment variables (from backend/.env locally or system env on Render)
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

try:
    database.init_db()
    print("DEBUG: Database initialized successfully")
except Exception as e:
    print(f"WARNING: Database initialization failed: {e}")



# Configure ffmpeg for system-wide use (Whisper needs this)
# Whisper expects 'ffmpeg' command to be available, but imageio-ffmpeg binary has a long name.
# We will copy it to temp_processing/ffmpeg.exe and add that folder to PATH.
try:
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_dir = Path("temp_processing")
    ffmpeg_dir.mkdir(exist_ok=True)
    target_ffmpeg = ffmpeg_dir / "ffmpeg.exe"
    
    if not target_ffmpeg.exists():
        print(f"DEBUG: Copying ffmpeg to {target_ffmpeg}...")
        shutil.copy(ffmpeg_exe, target_ffmpeg)
    
    os.environ["PATH"] += os.pathsep + str(ffmpeg_dir.absolute())
    print(f"DEBUG: Added {ffmpeg_dir.absolute()} to PATH for ffmpeg")
except Exception as e:
    print(f"WARNING: Could not set ffmpeg path: {e}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = Path("temp_processing")
TEMP_DIR.mkdir(exist_ok=True)

whisper_model = None

WHISPER_LANG_MAP = {
    "english": "en",
    "tamil": "ta",
    "hindi": "hi",
    "spanish": "es",
    "french": "fr",
    "chinese": "zh",
    "telugu": "te",
    "german": "de"
}

class UrlInput(BaseModel):
    url: str
    target_language: str = "Auto"

# Global progress store
progress_store = {}

@app.get("/progress/{task_id}")
async def get_progress(task_id: str):
    return progress_store.get(task_id, {"status": "not_found", "progress": 0})

class AnalyticsResponse(BaseModel):
    total_meetings: int
    language_distribution: dict
    top_topics: list
    sentiment_distribution: dict = {}
    total_words: int = 0
    
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "MeetLyze AI Backend"}

def cleanup_file(path: Path):
    try:
        path = Path(path)
        if path.exists():
            path.unlink()
    except Exception as e:
        print(f"Error cleaning up {path}: {e}")


def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        try:
            import whisper
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Loading Whisper model (base) on {device}...")
            whisper_model = whisper.load_model("base", device=device)
        except Exception as e:
            print(f"DEBUG: Local Whisper unavailable ({e}). Using Gemini Multimodal Audio.")
            return None
    return whisper_model

# Load Wrapper around Transformers to ensure it only loads once
summarization_pipeline = None

def get_summarizer():
    global summarization_pipeline
    if summarization_pipeline is None:
        try:
            summarization_pipeline = pipeline("text-generation", model="sshleifer/distilbart-cnn-12-6")
        except Exception as e:
            print(f"DEBUG: Summarization pipeline notice: {e}")
    return summarization_pipeline

# Pre-load models asynchronously on startup
@app.on_event("startup")
async def startup_event():
    import threading
    def warm_up():
        print("DEBUG: Starting model warmup background thread...")
        try:
            get_whisper_model()
        except Exception as e:
            print(f"WARNING: Startup model warmup failed: {e}")
        print("DEBUG: Model warmup complete!")

    threading.Thread(target=warm_up, daemon=True).start()



def enrich_with_gemini(transcript_text, detected_language="English", target_language="Auto"):
    """
    Guaranteed enrichment: Topics & Notes.
    Uses Gemini, falls back to basic inference if needed.
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
             # Proceed to fallback if no key
             raise Exception("GEMINI_API_KEY not found")

        genai.configure(api_key=api_key)
        # Using gemini-2.0-flash as it is confirmed available in this environment
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        output_lang_instruction = ""
        if target_language and target_language != "Auto":
            output_lang_instruction = f"Provide all output in {target_language} language."
        else:
            output_lang_instruction = f"Provide all output in the same language as the transcript (detected: {detected_language})."

        prompt = f"""
        You are an expert meeting analysis AI.
        Even if the transcript is noisy or brief:

        Determine the main subject

        Generate meaningful highlights

        Provide detailed notes

        From the transcript below, always produce:

        Key Topics / Highlights (3–7 bullets)

        Detailed Notes (paragraph)

        If information is missing or unclear, intelligently infer likely topics and notes.
        
        {output_lang_instruction}

        Transcript:
        {transcript_text}
        
        IMPORTANT: Format your response EXACTLY in markdown as follows:
        
        ## Key Topics / Highlights
        * [Topic 1]
        * [Topic 2]
        * ...

        ## Detailed Notes
        [Paragraph-style detailed notes]
        """
        
        response = model.generate_content(prompt)
        if response.text:
            return "\n\n" + response.text
    except Exception as e:
        print(f"Enrichment Gemini failed (switching to fallback): {e}")
    


    # New Multilingual Enrichment (No English Fallback)
    try:
         prompt = f"""
         You are a professional AI assistant.
         
         Context: The main analysis failed, so you are providing a backup summary.
         
         Task:
         1. Read the transcript below.
         2. Detect the language.
         3. Generate "Key Topics / Highlights" and "Detailed Notes" in that SAME language.
         
         Transcript:
         {transcript_text[:4000]}...
         
         Output Format (Markdown):
         ## Key Topics / Highlights
         * [Topic 1]
         ...
         
         ## Detailed Notes
         [Paragraph]
         """
         response = model.generate_content(prompt)
         if response.text:
             return "\n\n" + response.text
    except:
         pass # If even this fails, return nothing or very basic text
         
    return "\n\n## Status\nAdvanced analysis unavailable. Please check the transcript directly."

def transcribe_audio_with_gemini(audio_path: Path, target_language: str = "Auto") -> str:
    """
    Transcribes spoken audio word-for-word in its original language using Gemini Multimodal Audio.
    Memory Footprint: < 50MB RAM (Render Free Tier 512MB compatible).
    Returns: Real timestamped spoken transcript string.
    Throws Exception: If audio transcription fails or produces no text.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY is missing. Please set GEMINI_API_KEY in Render Dashboard Environment Settings or in backend/.env.")
    
    api_key = api_key.strip().strip("'").strip('"')
    genai.configure(api_key=api_key)
    
    abs_audio_path = Path(audio_path).resolve()
    print(f"[LOG] Transcription started for audio file: {abs_audio_path}")
    
    gemini_file = None
    try:
        gemini_file = genai.upload_file(path=str(abs_audio_path))
        print(f"[LOG] File uploaded to Gemini AI for STT: {gemini_file.name}")
        
        import time
        start_wait = time.time()
        max_wait = 180  # 3 minutes timeout
        while gemini_file.state.name == "PROCESSING":
            if time.time() - start_wait > max_wait:
                raise Exception("Audio processing timed out on AI service.")
            time.sleep(2)
            gemini_file = genai.get_file(gemini_file.name)
            
        if gemini_file.state.name == "FAILED":
            raise Exception("Audio file processing failed on AI service.")

        lang_instruction = ""
        if target_language and target_language.lower() != "auto":
            lang_instruction = f"If spoken in {target_language}, transcribe directly. If in another language, transcribe spoken words accurately."

        prompt = f"""You are a professional, high-precision Speech-to-Text (STT) transcriber.
Task: Listen to the entire attached audio recording carefully and generate the EXACT, VERBATIM spoken transcript of everything said by the speakers.

Instructions:
1. Transcribe the spoken audio word-for-word in its original spoken language (e.g. Tamil, English, Hindi, Spanish, French, German, Telugu, etc.). {lang_instruction}
2. Include timestamps at regular intervals or line breaks in format: [MM:SS] Speaker Name or Speaker 1/2: <exact spoken words>
3. Do NOT summarize, abbreviate, omit, or paraphrase any spoken content.
4. Do NOT include markdown titles, conversational intros/outros, or disclaimer text. Output ONLY the timestamped verbatim transcript.
"""

        user_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip().strip("'").strip('"')
        model_candidates = [
            user_model,
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-flash-lite-latest",
            "gemini-1.5-pro",
            "gemini-2.0-flash",
            "gemini-pro-latest"
        ]
        
        unique_candidates = []
        for m in model_candidates:
            if m and m not in unique_candidates:
                unique_candidates.append(m)

        transcript_text = None
        last_error = ""

        for model_name in unique_candidates:
            try:
                print(f"[LOG] Attempting STT transcription with model: {model_name}")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content([prompt, gemini_file])
                if response and response.text and len(response.text.strip()) > 5:
                    transcript_text = response.text.strip()
                    print(f"[LOG] Transcription completed: transcript_length={len(transcript_text)} characters")
                    break
            except Exception as ex:
                print(f"[LOG] STT model {model_name} failed: {ex}")
                last_error = str(ex)

        if not transcript_text or len(transcript_text.strip()) < 5:
            raise Exception(f"Audio transcription failed. Please try again or check the audio file. Details: {last_error}")

        return transcript_text

    finally:
        if gemini_file:
            try:
                genai.delete_file(gemini_file.name)
            except Exception as cleanup_err:
                print(f"DEBUG: Error cleaning up Gemini file: {cleanup_err}")


def analyze_with_gemini(transcript_text: str, detected_language: str = "English", target_language: str = "Auto") -> str:
    """
    Generates structured meeting analysis from the REAL transcript_text.
    Does NOT use fake/placeholder content.
    """
    if not transcript_text or not transcript_text.strip() or "[Audio recording provided" in transcript_text:
        raise Exception("Audio transcription failed. Please try again or check the audio file.")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY is missing. Please set GEMINI_API_KEY in Render Dashboard Environment Settings or in backend/.env.")
    
    api_key = api_key.strip().strip("'").strip('"')
    genai.configure(api_key=api_key)

    output_lang_instruction = ""
    if target_language and target_language != "Auto":
        output_lang_instruction = f"Output language: {target_language} (Translate EVERYTHING to {target_language})."
    else:
        output_lang_instruction = f"Output language: Same as spoken language (Detected: {detected_language})."

    prompt = f"""
    You are an expert meeting intelligence AI assistant.
    Analyze the REAL spoken meeting transcript provided below and generate a comprehensive meeting summary report.

    ALWAYS generate the following sections EXACTLY as formatted below:

    # Meeting Title: [Concise descriptive title based on transcript content]
    
    # Detected Language: [Name of language, e.g. English, Tamil, Hindi, Spanish, etc.]

    ## Executive Summary
    [Paragraph summarizing key outcomes and decisions]

    ## Key Topics / Highlights
    * [Topic/Highlight 1]
    * [Topic/Highlight 2]
    * [Topic/Highlight 3]
    ... (3–7 bullets)

    ## Detailed Notes
    [Comprehensive paragraphs detailing discussions, arguments, and context]

    ## Speaker Timeline
    * [MM:SS] [Speaker Name/ID]: [Key point discussed]
    ...

    ## Sentiment Summary
    [A brief description of overall tone, e.g., "Professional and collaborative", "Urgent and task-focused", "Positive"]

    ## Raw Transcript
    {transcript_text}

    {output_lang_instruction}

    Transcript:
    {transcript_text}
    """

    user_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip().strip("'").strip('"')
    model_candidates = [
        user_model,
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-flash-lite-latest",
        "gemini-1.5-pro",
        "gemini-2.0-flash",
        "gemini-pro-latest"
    ]
    
    unique_candidates = []
    for m in model_candidates:
        if m and m not in unique_candidates:
            unique_candidates.append(m)

    word_limit = 10000
    words = transcript_text.split()
    if len(words) > word_limit:
        print(f"[LOG] Trimming transcript from {len(words)} to {word_limit} words to fit token limits.")
        transcript_text = " ".join(words[:word_limit]) + "\n...[Remainder of transcript omitted]..."

    result = None
    last_error = "No models attempted"
    
    import time
    for model_name in unique_candidates:
        try:
            print(f"[LOG] Gemini analysis started with model: {model_name}")
            model = genai.GenerativeModel(model_name)
            safety_settings = [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
            ]
            response = model.generate_content(prompt, safety_settings=safety_settings)
            if response and response.text:
                result = response.text
                print(f"[LOG] Gemini analysis completed successfully with {model_name}")
                break
        except Exception as ex:
            print(f"[LOG] Gemini model {model_name} failed: {ex}")
            last_error = f"{model_name}: {str(ex)}"
            if "429" in str(ex) or "quota" in str(ex).lower():
                time.sleep(2)

    if not result:
        raise Exception(f"AI Analysis Failed: {last_error}")

    return result


async def process_video_file(video_path: Path, target_language: str = "Auto", task_id: str = None):
    print(f"[LOG] File upload succeeded: path={video_path}, size={video_path.stat().st_size if video_path.exists() else 0} bytes")
    
    if task_id:
        progress_store[task_id] = {"status": "validating", "progress": 5, "message": "Validating input..."}

    if not video_path.exists(): raise Exception(f"Video file not found: {video_path}")
    if video_path.stat().st_size == 0: raise Exception("Uploaded file is empty.")
        
    audio_path = video_path.with_name(video_path.stem + "_extracted.wav")
    
    try:
        # 1. Extract audio via FFmpeg
        if task_id:
            progress_store[task_id] = {"status": "extracting", "progress": 20, "message": "Extracting audio..."}
        
        try:
            print(f"[LOG] Extracting audio from {video_path} to {audio_path}")
            command = [
                "ffmpeg", "-y", "-i", str(video_path), 
                "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", str(audio_path)
            ]
            subprocess.run(command, check=True, capture_output=True)
            if not audio_path.exists() or audio_path.stat().st_size == 0:
                 raise Exception("Extracted audio missing or zero bytes.")
            print(f"[LOG] Audio conversion succeeded: path={audio_path}, size={audio_path.stat().st_size} bytes")
        except Exception as e:
            raise Exception(f"Audio extraction failed: {str(e)}")

        # 2. Speech-to-Text Transcription
        if task_id:
             progress_store[task_id] = {"status": "transcribing", "progress": 40, "message": "Transcribing audio..."}

        print(f"[LOG] Transcription started for task_id={task_id}")
        transcript_text = ""
        detected_language = "English"
        
        loop = asyncio.get_event_loop()
        whisper_m = await loop.run_in_executor(None, get_whisper_model)
        
        if whisper_m is not None:
            try:
                print(f"[LOG] Running local Whisper model for task_id={task_id}")
                transcribe_kwargs = {"temperature": 0.0}
                if target_language and target_language.lower() in WHISPER_LANG_MAP:
                    transcribe_kwargs["language"] = WHISPER_LANG_MAP[target_language.lower()]
                
                result = await loop.run_in_executor(None, lambda: whisper_m.transcribe(str(audio_path), **transcribe_kwargs))
                transcript_text = result.get("text", "").strip()
                detected_language = result.get("language", "English")
                
                segments = result.get("segments", [])
                timestamped = ""
                for seg in segments:
                    start_m, start_s = divmod(int(seg['start']), 60)
                    timestamped += f"[{start_m:02d}:{start_s:02d}] {seg['text']}\n"
                if timestamped.strip():
                    transcript_text = timestamped.strip()
            except Exception as whisper_err:
                print(f"[LOG] Local Whisper transcription failed: {whisper_err}. Falling back to Gemini STT.")
                transcript_text = ""

        # If local Whisper was not available (e.g. Render 512MB RAM) or failed, use Gemini STT Engine
        if not transcript_text:
            transcript_text = await loop.run_in_executor(None, lambda: transcribe_audio_with_gemini(audio_path, target_language))

        # Strict validation: MUST be a real non-empty transcript
        if not transcript_text or len(transcript_text.strip()) < 5 or "[Audio recording provided" in transcript_text:
            raise Exception("Audio transcription failed. Please try again or check the audio file.")

        print(f"[LOG] Transcription completed: transcript_length={len(transcript_text)} characters")

        # 3. AI Analysis & Meeting Minutes Generation
        if task_id:
             progress_store[task_id] = {"status": "analyzing", "progress": 65, "message": "Generating insights (AI)..."}

        print(f"[LOG] Gemini analysis started for task_id={task_id}")
        markdown_summary = await loop.run_in_executor(None, lambda: analyze_with_gemini(transcript_text, detected_language, target_language))
        
        if not markdown_summary:
            raise Exception("AI Analysis Service Unavailable. Please try again later.")
            
        print(f"[LOG] Gemini analysis completed for task_id={task_id}")

        # 4. Finalizing
        if task_id:
             progress_store[task_id] = {"status": "finalizing", "progress": 90, "message": "Finalizing report..."}

        # Parse Title
        title = "Untitled Meeting"
        try:
            match = re.search(r'# Title:\s*(.+)', markdown_summary)
            if not match: match = re.search(r'Title:\s*(.+)', markdown_summary)
            if match: title = match.group(1).strip()
        except: pass
            
        # Save to Database
        try:
            meeting_id = str(uuid.uuid4())
            database.save_meeting(
                meeting_id=meeting_id,
                title=title,
                detected_language=detected_language,
                transcript=transcript_text,
                summary_markdown=markdown_summary,
                metadata_dict={"audio_path": str(audio_path)}
            )
        except Exception as db_e:
             print(f"Database Error: {db_e}")

        # Cleanup
        cleanup_file(audio_path)
        cleanup_file(video_path)

        # 95-100% Done
        if task_id:
            progress_store[task_id] = {"status": "completed", "progress": 100, "message": "Analysis Complete!", "result": {
                "summary": markdown_summary,
                "transcript": transcript_text,
                "detected_language": detected_language
            }}

        return {
            "transcript": transcript_text,
            "summary_markdown": markdown_summary,
            "detected_language": detected_language,
            "audio_path": str(audio_path)
        }
    except Exception as e:
        if task_id:
            progress_store[task_id] = {"status": "error", "progress": 0, "message": str(e)}
        cleanup_file(audio_path)
        cleanup_file(video_path)
        raise e

@app.get("/meetings")
async def get_meetings():
    try:
        meetings = database.get_all_meetings()
        return meetings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/meetings/search")
async def search_meetings_endpoint(q: str):
    try:
        results = database.search_meetings(q)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@app.get("/meetings/{id}")
async def get_meeting_detail(id: str):
    meeting = database.get_meeting(id)
    if not meeting:
         raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Map DB keys to Frontend keys
    return {
        "id": meeting["id"],
        "title": meeting["title"],
        "date": meeting["date"],
        "detected_language": meeting["detected_language"],
        "transcript": meeting["transcript"],
        "summary": meeting["summary_markdown"], # Rename for frontend
        "metadata": meeting["metadata"]
    }

@app.delete("/meetings/{id}")
async def delete_meeting(id: str):
    try:
        database.delete_meeting(id)
        return {"status": "deleted", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def extract_topics_from_summary(summary_md):
    """
    Extracts bullet points under 'Key Topics / Highlights' or similar headers.
    """
    if not summary_md:
        return []
    
    topics = []
    # More robust logic for topics - handles both * and - and various header variations
    match = re.search(r"## (?:Key )?Topics.*?\n(.*?)(?:\n##|\Z)", summary_md, re.IGNORECASE | re.DOTALL)
    if match:
        content = match.group(1).strip()
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith(('*', '-')):
                clean_b = re.sub(r"^[\*\-]\s*", "", line).strip()
                if clean_b:
                    topics.append(clean_b)
            # If line doesn't start with bullet but we are in the section and it looks like a topic
            elif line and len(line) > 3 and not line.startswith('#'):
                 topics.append(line)
    
    return topics[:10]

def extract_sentiment_from_summary(summary_md):
    """
    Extracts sentiment description from the markdown.
    """
    if not summary_md:
        return "Unknown"
    
    # Look for header and content following it
    match = re.search(r"## Sentiment Summary\s*\n(.*?)(?:\n##|\Z)", summary_md, re.IGNORECASE | re.DOTALL)
    if not match:
         # Fallback search for just "Sentiment" header
         match = re.search(r"## Sentiment\s*\n(.*?)(?:\n##|\Z)", summary_md, re.IGNORECASE | re.DOTALL)

    if match:
        text = match.group(1).strip()
        text_lower = text.lower()
        # Expanded keywords for better detection in descriptive summaries
        if any(w in text_lower for w in ['optimistic', 'positive', 'productive', 'constructive', 'great', 'success', 'good', 'collaborative', 'celebratory', 'enthusiastic']):
            return "Positive"
        elif any(w in text_lower for w in ['tense', 'negative', 'conflict', 'concern', 'issue', 'problem', 'bad', 'urgent', 'stressed', 'confrontational']):
            return "Negative"
        elif any(w in text_lower for w in ['neutral', 'formal', 'professional', 'balanced', 'stable', 'even', 'serious', 'informational']):
            return "Neutral"
        return "Mixed/Other"
    
    return "Unknown"

@app.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics():
    meetings = database.get_analytics_data() 
    
    total = len(meetings)
    lang_dist = {}
    topic_counts = {}
    sentiment_dist = {}
    
    total_words = 0
    
    # Language mapping for normalization
    lang_map = {
        "en": "English",
        "ta": "Tamil",
        "fr": "French",
        "de": "German",
        "hi": "Hindi",
        "es": "Spanish"
    }
    
    for m in meetings:
        # Normalize Language Name
        raw_lang = m['detected_language'] or "Unknown"
        # Map or Clean
        lang = lang_map.get(raw_lang.lower(), raw_lang).capitalize()
        if lang in ["Ml", "Malayalam", "Te", "Telugu", "Mi"]: continue
        lang_dist[lang] = lang_dist.get(lang, 0) + 1
        
        # Word count
        transcript = m.get('transcript', '') or ""
        total_words += len(str(transcript).split())

        # Topics
        summary = m.get('summary_markdown', '')
        extracted_topics = extract_topics_from_summary(summary)
        for t in extracted_topics:
             t = t.strip()
             topic_counts[t] = topic_counts.get(t, 0) + 1
             
        # Sentiment
        sentiment = extract_sentiment_from_summary(summary)
        sentiment_dist[sentiment] = sentiment_dist.get(sentiment, 0) + 1
        
    # Sort topics
    sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    top_topics = [{"topic": t, "count": c} for t, c in sorted_topics]
    
    return {
        "total_meetings": total,
        "language_distribution": lang_dist,
        "top_topics": top_topics,
        "sentiment_distribution": sentiment_dist,
        "total_words": total_words
    }

@app.post("/analyze/upload")
def analyze_upload(
    file: UploadFile = File(...),
    target_language: str = Form("Auto"),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # Validate file type

    
    allowed_extensions = ('.mp4', '.mov', '.mkv', '.mp3', '.wav', '.m4a', '.aac', '.webm')
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="Invalid file type. Only video (mp4, mov, mkv) and audio (mp3, wav, m4a, aac, webm) are supported.")

    task_id = str(uuid.uuid4())
    video_path = TEMP_DIR / f"{task_id}_{file.filename}"
    
    # Initialize progress
    progress_store[task_id] = {"status": "queued", "progress": 0, "message": "Queued..."}

    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Run processing in background
        background_tasks.add_task(process_video_task, task_id, video_path, target_language)

        return JSONResponse({
            "task_id": task_id,
            "status": "processing"
        })

    except Exception as e:
        print(f"ERROR processing upload: {e}")
        cleanup_file(video_path)
        raise HTTPException(status_code=500, detail=str(e))

async def process_video_task(task_id: str, video_path: Path, target_language: str):
    try:
        progress_store[task_id].update({"status": "extracting", "progress": 5, "message": "Starting analysis..."})
        
        result = await process_video_file(video_path, target_language, task_id=task_id)
        
        # Done
        progress_store[task_id] = {
            "status": "completed", 
            "progress": 100, 
            "message": "Analysis complete!", 
            "result": {
                "transcript": result["transcript"],
                "summary": result["summary_markdown"],
                "detected_language": result["detected_language"]
            }
        }
        
        # Cleanup
        try:
             cleanup_file(video_path)
             cleanup_file(result["audio_path"])
        except:
             pass
             
    except Exception as e:
        print(f"Video Task Error: {e}")
        progress_store[task_id] = {"status": "error", "progress": 0, "message": str(e)}
        try: cleanup_file(video_path)
        except: pass



async def process_url_task(task_id: str, url: str, target_language: str):
    video_path = None
    try:
        progress_store[task_id] = {"status": "validating", "progress": 2, "message": "Validating link..."}
        
        video_path_template = str(TEMP_DIR / f"{task_id}.%(ext)s")
        
        # Determine ffmpeg path (optional safety)
        try:
             import imageio_ffmpeg
             files = [] # dummy
        except:
             pass

        def progress_hook(d):
            if d['status'] == 'downloading':
                try:
                    p = d.get('_percent_str', '0%').replace('%','')
                    # Map 0-100% download to 5-15% total progress
                    current = 5 + (float(p) * 0.1)
                    progress_store[task_id].update({
                        "progress": current, 
                        "message": f"Downloading content... {d.get('_percent_str')}"
                    })
                except:
                    pass

        ydl_opts = {
            'outtmpl': video_path_template,
            'format': 'bestaudio/best',
            'noplaylist': True,
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'ignoreerrors': False, # Changed to False to catch real errors
            'logtostderr': False,
            'default_search': 'auto',
            'source_address': '0.0.0.0', # bind to ipv4 since ipv6 addresses cause issues sometimes
            'socket_timeout': 10,
            'retries': 10,
            'fragment_retries': 10,
            'progress_hooks': [progress_hook],
        }
        
        # Run potentially blocking yt-dlp in a thread to keep event loop responsive
        def download_video():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=True)
                except Exception as e:
                    raise Exception(f"Failed to download video: {str(e)}")
                if not info:
                    raise Exception("Failed to extract video info")
                
                expected_path = Path(ydl.prepare_filename(info))
                if expected_path.exists():
                    return expected_path
                
                # If exact expected path doesn't exist, search by task_id
                matches = list(TEMP_DIR.glob(f"{task_id}.*"))
                if matches:
                    return matches[0]
                
                raise Exception("Downloaded file not found on disk")
        
        loop = asyncio.get_event_loop()
        video_path = await loop.run_in_executor(None, download_video)
        
        progress_store[task_id].update({"status": "processing", "progress": 15, "message": "Download complete. Starting extraction..."})

        # Process the file (Handles everything from extraction to 100% completion)
        result = await process_video_file(video_path, target_language, task_id=task_id)
        
        # Cleanup
        try:
            cleanup_file(video_path)
            cleanup_file(result["audio_path"])
        except:
            pass
            
    except Exception as e:
        print(f"URL Task Error: {e}")
        progress_store[task_id] = {"status": "error", "progress": 0, "message": str(e)}
        if video_path:
             try: cleanup_file(video_path)
             except: pass

@app.post("/analyze/url")
async def analyze_url(
    input_data: UrlInput,
    background_tasks: BackgroundTasks
):
    url = input_data.url
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    task_id = str(uuid.uuid4())
    
    # Initialize progress
    progress_store[task_id] = {"status": "queued", "progress": 0, "message": "Queued..."}
    
    # Add to background tasks
    background_tasks.add_task(process_url_task, task_id, url, input_data.target_language)
    
    return {"task_id": task_id}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8005))
    uvicorn.run(app, host="0.0.0.0", port=port)


