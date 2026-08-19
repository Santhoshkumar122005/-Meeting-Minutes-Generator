from huggingface_hub import snapshot_download
import traceback
import whisper

def download():
    print("Downloading sshleifer/distilbart-cnn-12-6 (PyTorch only)...")
    try:
        path = snapshot_download(
            repo_id="sshleifer/distilbart-cnn-12-6", 
            allow_patterns=["*.json", "*.txt", "pytorch_model.bin"],
            resume_download=True
        )
        print(f"Model downloaded to {path}")
    except Exception as e:
        print(f"Download failed: {e}")
        traceback.print_exc()

    print("Downloading Whisper base model...")
    try:
        whisper.load_model("base")
        print("Whisper base model downloaded successfully.")
    except Exception as e:
        print(f"Whisper download failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    download()

