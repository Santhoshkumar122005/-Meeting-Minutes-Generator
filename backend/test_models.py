
import os
from pathlib import Path
import whisper
from transformers import pipeline

def test_models():
    print("Testing Whisper model load...")
    try:
        model = whisper.load_model("tiny")
        print("Whisper model loaded successfully.")
    except Exception as e:
        print(f"Whisper load failed: {e}")

    print("Testing Summarization model load...")
    try:
        summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6", model_kwargs={"local_files_only": True})
        print("Summarization model loaded successfully.")
    except Exception as e:
        print(f"Summarization load failed: {e}")

if __name__ == "__main__":
    test_models()
