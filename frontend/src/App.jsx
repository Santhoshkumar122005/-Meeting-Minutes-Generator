import React, { useState } from 'react';
import VideoUpload from './components/VideoUpload';
import UrlInput from './components/UrlInput';
import MicRecorder from './components/MicRecorder';
import ResultDisplay from './components/ResultDisplay';
import Dashboard from './components/Dashboard';
import { UploadCloud, Link as LinkIcon, AlertCircle, FileAudio, LayoutDashboard, Home, ArrowLeft, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home', 'dashboard', 'result'
  const [activeTab, setActiveTab] = useState('video'); // 'video' | 'audio' | 'url'
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  /* New states for progress tracking */
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Auto"); // Default to Auto

  const handleFileUpload = async (file) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setUploadProgress(0);
    setStatusMessage("Uploading file...");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_language', targetLanguage);
    let pollInterval;

    try {
      const response = await axios.post('http://localhost:8000/analyze/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);

          if (percentCompleted < 100) {
            setUploadProgress(percentCompleted);
            setStatusMessage(`Uploading file... ${percentCompleted}%`);
          } else {
            setUploadProgress(100);
            setStatusMessage("Upload complete. Queuing analysis...");
          }
        }
      });

      const { task_id } = response.data;

      // Start polling
      pollInterval = setInterval(async () => {
        try {
          const progressRes = await axios.get(`http://localhost:8000/progress/${task_id}`);
          const { status, progress, message, result } = progressRes.data;

          setStatusMessage(message || "Processing...");
          setUploadProgress(progress || 0);

          if (status === "completed") {
            clearInterval(pollInterval);
            setResult(result);
            setCurrentView('result');
            setIsProcessing(false);
            setUploadProgress(0);
          } else if (status === "error") {
            clearInterval(pollInterval);
            setError(message || "An error occurred during processing.");
            setIsProcessing(false);
            setUploadProgress(0);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 1000);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred during upload.");
      setIsProcessing(false);
      setUploadProgress(0);
      if (pollInterval) clearInterval(pollInterval);
    }
  };

  const handleUrlSubmit = async (url) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setUploadProgress(0);
    setStatusMessage("Initializing...");

    let pollInterval;

    try {
      // 1. Initiate Task
      const response = await axios.post('http://localhost:8000/analyze/url', {
        url,
        target_language: targetLanguage
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      const { task_id } = response.data;

      // 2. Poll for Progress
      pollInterval = setInterval(async () => {
        try {
          const progressRes = await axios.get(`http://localhost:8000/progress/${task_id}`);
          const { status, progress, message, result } = progressRes.data;

          setStatusMessage(message || "Processing...");
          setUploadProgress(progress || 0);

          if (status === "completed") {
            clearInterval(pollInterval);
            setResult(result);
            setCurrentView('result');
            setIsProcessing(false);
            setUploadProgress(0);
          } else if (status === "error") {
            clearInterval(pollInterval);
            setError(message || "An error occurred.");
            setIsProcessing(false);
            setUploadProgress(0);
          }
        } catch (e) {
          console.error("Polling error", e);
          // Don't stop polling on transient network errors, but maybe count them
        }
      }, 1000);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred during processing. Check the URL validity.");
      setIsProcessing(false);
      setUploadProgress(0);
      if (pollInterval) clearInterval(pollInterval);
    }
  };

  const handleViewMeeting = async (id) => {
    try {
      setIsProcessing(true);
      const res = await axios.get(`http://localhost:8000/meetings/${id}`);
      setResult(res.data);
      setCurrentView('result');
    } catch (e) {
      console.error(e);
      setError("Failed to load meeting details.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-zinc-500/30 font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-slate-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-zinc-300 to-zinc-600 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-500/25">
              <span className="text-xl font-bold text-black">M</span>
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              MeetLyze
            </h1>
          </div>

          <nav className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setCurrentView('home')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${currentView === 'home' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${currentView === 'dashboard' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
          </nav>
        </header>

        <main>
          {currentView === 'dashboard' && (
            <Dashboard onViewMeeting={handleViewMeeting} />
          )}

          {currentView === 'result' && result && (
            <div className="space-y-6">
              <button
                onClick={() => setCurrentView('home')}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Upload
              </button>
              <ResultDisplay
                result={result.summary}
                transcript={result.transcript}
                detectedLanguage={result.detected_language}
              />
            </div>
          )}

          {currentView === 'home' && (
            <>
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                  Turn Conversations into <br />
                  <span className="text-zinc-300">Accurate, Actionable Insights</span>
                </h2>
                <p className="text-lg text-white/50 max-w-2xl mx-auto">
                  Upload a video, audio file, or paste a link — we’ll analyze it in any language.
                </p>
              </div>

              <div className="max-w-2xl mx-auto mb-6 flex justify-end">
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                  <span className="text-white/60 text-sm font-medium">Output Language:</span>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    disabled={isProcessing}
                    className="bg-transparent text-zinc-300 font-bold outline-none cursor-pointer"
                  >
                    <option value="Auto" className="bg-black">Auto (Same as Audio)</option>
                    <option value="English" className="bg-black">English</option>
                    <option value="Hindi" className="bg-black">Hindi</option>
                    <option value="Tamil" className="bg-black">Tamil</option>
                    <option value="Telugu" className="bg-black">Telugu</option>
                    <option value="Spanish" className="bg-black">Spanish</option>
                    <option value="French" className="bg-black">French</option>
                    <option value="Chinese" className="bg-black">Chinese</option>
                  </select>
                </div>
              </div>

              <div className="max-w-2xl mx-auto mb-12">
                <div className="flex p-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl mb-8">
                  <button
                    onClick={() => setActiveTab('video')}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all
                  ${activeTab === 'video'
                        ? 'bg-gradient-to-r from-zinc-600 to-zinc-400 text-black shadow-lg shadow-white/10'
                        : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    Upload Video
                  </button>
                  <button
                    onClick={() => setActiveTab('audio')}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all
                  ${activeTab === 'audio'
                        ? 'bg-gradient-to-r from-zinc-600 to-zinc-400 text-black shadow-lg shadow-white/10'
                        : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  >
                    <FileAudio className="w-4 h-4" />
                    Upload Audio
                  </button>
                  <button
                    onClick={() => setActiveTab('mic')}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all
                  ${activeTab === 'mic'
                        ? 'bg-gradient-to-r from-zinc-600 to-zinc-400 text-black shadow-lg shadow-white/10'
                        : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  >
                    <Mic className="w-4 h-4" />
                    Record Meeting
                  </button>
                  <button
                    onClick={() => setActiveTab('url')}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all
                  ${activeTab === 'url'
                        ? 'bg-gradient-to-r from-zinc-600 to-zinc-400 text-black shadow-lg shadow-white/10'
                        : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  >
                    <LinkIcon className="w-4 h-4" />
                    Paste Link
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'video' && (
                    <motion.div
                      key="video"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <VideoUpload
                        onUpload={handleFileUpload}
                        isProcessing={isProcessing}
                        type="video"
                        uploadProgress={uploadProgress}
                        statusMessage={statusMessage}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'audio' && (
                    <motion.div
                      key="audio"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Reusing VideoUpload but conceptually it's a file uploader */}
                      <VideoUpload
                        onUpload={handleFileUpload}
                        isProcessing={isProcessing}
                        type="audio"
                        uploadProgress={uploadProgress}
                        statusMessage={statusMessage}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'mic' && (
                    <motion.div
                      key="mic"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MicRecorder
                        onUpload={handleFileUpload}
                        isProcessing={isProcessing}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'url' && (
                    <motion.div
                      key="url"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <UrlInput
                        onUrlSubmit={handleUrlSubmit}
                        isProcessing={isProcessing}
                        progress={uploadProgress}
                        statusMessage={statusMessage}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {result && currentView === 'home' && (
                <ResultDisplay
                  result={result.summary}
                  transcript={result.transcript}
                  detectedLanguage={result.detected_language}
                />
              )}

            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
