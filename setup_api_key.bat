@echo off
echo ==================================================
echo      MeetLyze AI - API Key Setup
echo ==================================================
echo.
echo To employ the AI features, you need a Google Gemini API Key.
echo Get one for free here: https://aistudio.google.com/app/apikey
echo.
set /p API_KEY="Paste/Enter your Gemini API Key: "

if "%API_KEY%"=="" (
    echo No key entered. Exiting.
    pause
    exit /b
)

echo GEMINI_API_KEY=%API_KEY%> backend\.env
echo.
echo [SUCCESS] API Key saved to backend\.env
echo.
echo You can now return to the application and try uploading again.
pause
