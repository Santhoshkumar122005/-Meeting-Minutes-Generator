import React, { useState } from 'react';
import { Link, ArrowRight, Video, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const UrlInput = ({ onUrlSubmit, isProcessing, statusMessage, progress = 0 }) => {
    const [url, setUrl] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (url.trim()) {
            onUrlSubmit(url);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
            >
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Link className="h-5 w-5 text-white/40 group-focus-within:text-zinc-400 transition-colors" />
                    </div>

                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isProcessing}
                        placeholder="Paste video URL (YouTube, Vimeo, Drive...)"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-14 focus:outline-none focus:ring-2 focus:ring-zinc-500/50 focus:border-transparent focus:bg-white/10 transition-all placeholder:text-white/20"
                    />

                    <button
                        type="submit"
                        disabled={!url || isProcessing}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-zinc-600 to-zinc-400 rounded-xl text-black shadow-lg hover:shadow-zinc-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <ArrowRight className="w-5 h-5" />
                        )}
                    </button>
                    <div className="mt-4 text-center">
                        {isProcessing && (
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-zinc-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-zinc-300 font-medium animate-pulse"
                                >
                                    {statusMessage} ({Math.round(progress)}%)
                                </motion.p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex gap-4 justify-center text-xs text-white/30">
                    <span className="flex items-center gap-1"><Video className="w-3 h-3" /> YouTube</span>
                    <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Google Drive</span>
                    <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Direct Links</span>
                </div>
            </motion.form>
        </div>
    );
};

export default UrlInput;
