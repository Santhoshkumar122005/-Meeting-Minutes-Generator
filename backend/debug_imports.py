
try:
    print("Importing fastapi...")
    import fastapi
    print("Importing uvicorn...")
    import uvicorn
    print("Importing whisper...")
    import whisper
    print("Importing moviepy.editor...")
    import moviepy.editor
    print("Importing yt_dlp...")
    import yt_dlp
    print("Importing imageio_ffmpeg...")
    import imageio_ffmpeg
    print("Importing transformers...")
    from transformers import pipeline
    print("Imports success")
except Exception as e:
    print(f"Import failed: {e}")
