import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MicRecorder = ({ onUpload, isProcessing }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isPaused, setIsPaused] = useState(false);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);
                setIsRecording(false);
                setIsPaused(false);
                if (timerRef.current) clearInterval(timerRef.current);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            setAudioBlob(null);
            setAudioUrl(null);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const togglePause = () => {
        if (isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleConfirm = () => {
        if (audioBlob) {
            const file = new File([audioBlob], `recorded_meeting_${Date.now()}.webm`, { type: 'audio/webm' });
            onUpload(file);
        }
    };

    const handleReset = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center space-y-8">
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">Live Recording</h3>
                    <p className="text-white/50">Capture your meeting audio directly from your microphone.</p>
                </div>

                <div className="relative flex items-center justify-center">
                    {/* Visualizer Circle */}
                    <AnimatePresence>
                        {isRecording && !isPaused && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                                exit={{ opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                className="absolute w-40 h-40 bg-zinc-500 rounded-full blur-2xl"
                            />
                        )}
                    </AnimatePresence>

                    <div className="relative z-10 w-32 h-32 rounded-full bg-zinc-900 border-2 border-white/10 flex items-center justify-center shadow-2xl">
                        {isRecording ? (
                            <div className="text-center">
                                <span className="text-xl font-mono font-bold text-white">{formatTime(recordingTime)}</span>
                                <div className="flex items-center justify-center gap-1 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-zinc-500' : 'bg-red-500 animate-pulse'}`} />
                                    <span className="text-[10px] uppercase tracking-widest text-white/40">{isPaused ? 'Paused' : 'Live'}</span>
                                </div>
                            </div>
                        ) : audioBlob ? (
                            <Play className="w-12 h-12 text-zinc-400" />
                        ) : (
                            <Mic className="w-12 h-12 text-white/20" />
                        )}
                    </div>
                </div>

                {!isRecording && !audioBlob ? (
                    <button
                        onClick={startRecording}
                        disabled={isProcessing}
                        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-zinc-600 to-zinc-400 text-black font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-zinc-500/10"
                    >
                        <Mic className="w-6 h-6" />
                        Start Recording
                    </button>
                ) : isRecording ? (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={togglePause}
                            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all active:scale-95"
                        >
                            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={stopRecording}
                            className="flex items-center gap-3 px-8 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-500/20"
                        >
                            <Square className="w-5 h-5 fill-current" />
                            Stop Recording
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center w-full space-y-6">
                        <audio src={audioUrl} controls className="w-full max-w-md h-10 filter invert brightness-100 contrast-100" />

                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleReset}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                                Discard
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-zinc-600 to-zinc-400 text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Check className="w-5 h-5" />
                                )}
                                Process Recording
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MicRecorder;
