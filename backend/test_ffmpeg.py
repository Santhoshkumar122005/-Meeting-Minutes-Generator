
import os
import subprocess
import imageio_ffmpeg

def test_ffmpeg_path():
    print("Configuring ffmpeg path...")
    try:
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        os.environ["PATH"] += os.pathsep + os.path.dirname(ffmpeg_exe)
        print(f"Added {os.path.dirname(ffmpeg_exe)} to PATH")
    except Exception as e:
        print(f"Setup failed: {e}")
        return

    print("Testing 'where ffmpeg' in subprocess...")
    try:
        # Use 'where' on Windows to find the executable
        result = subprocess.run(["where", "ffmpeg"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"SUCCESS: ffmpeg found at:\n{result.stdout}")
        else:
            print(f"FAILURE: ffmpeg not found. stderr:\n{result.stderr}")
    except Exception as e:
        print(f"Subprocess call failed: {e}")

if __name__ == "__main__":
    test_ffmpeg_path()
