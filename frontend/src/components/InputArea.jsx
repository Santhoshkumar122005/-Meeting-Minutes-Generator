import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Sparkles } from 'lucide-react';

const InputArea = ({ transcript, setTranscript, onGenerate, isLoading }) => {
    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl">
                <label className="flex items-center gap-2 text-white font-medium mb-3">
                    <FileText className="w-5 h-5 text-zinc-400" />
                    <span>Meeting Transcript</span>
                </label>
                <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste your meeting transcript here... (e.g. John: Let's discuss the project timeline...)"
                    className="w-full h-64 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-zinc-500/50 resize-none transition-all"
                />
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={onGenerate}
                        disabled={isLoading || !transcript.trim()}
                        className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all
              ${isLoading || !transcript.trim()
                                ? 'bg-zinc-800 cursor-not-allowed opacity-50'
                                : 'bg-gradient-to-r from-zinc-600 to-zinc-800 hover:from-zinc-500 hover:to-zinc-700 hover:shadow-zinc-500/25 active:scale-95'}
            `}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                <span>Generate Minutes</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InputArea;
