import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileVideo, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const VideoUpload = ({ onUpload, isProcessing, type, uploadProgress, statusMessage }) => {
    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length > 0) {
            onUpload(acceptedFiles[0]);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: type === 'audio'
            ? { 'audio/*': ['.mp3', '.wav', '.m4a'] }
            : { 'video/*': ['.mp4', '.mov', '.mkv', '.avi'] },
        maxFiles: 1,
        disabled: isProcessing
    });

    return (
        <div className="w-full max-w-2xl mx-auto">
            <motion.div
                {...getRootProps()}
                whileHover={{ scale: isProcessing ? 1 : 1.01 }}
                whileTap={{ scale: isProcessing ? 1 : 0.98 }}
                className={`
          flex flex-col items-center justify-center p-12 
          border-2 border-dashed rounded-3xl 
          transition-all duration-300 cursor-pointer
          ${isDragActive
                        ? 'border-zinc-400 bg-zinc-500/10'
                        : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                <input {...getInputProps()} />

                {isProcessing ? (
                    <div className="text-center w-full max-w-md">
                        <Loader2 className="w-16 h-16 text-zinc-400 animate-spin mx-auto mb-6" />

                        <div className="space-y-3">
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-zinc-300 to-zinc-600"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(5, uploadProgress)}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-lg text-white font-medium animate-pulse"
                            >
                                {statusMessage || (uploadProgress < 100 ? "Uploading..." : "Processing...")}
                            </motion.p>

                            <p className="text-sm text-zinc-400/80 font-mono">
                                {Math.round(uploadProgress)}% Completed
                            </p>
                        </div>

                        {uploadProgress === 100 && (
                            <p className="text-xs text-white/30 mt-4">
                                This might take 1-2 minutes depending on file size.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-zinc-500/20 to-slate-500/20 flex items-center justify-center mx-auto mb-6">
                            {isDragActive ? (
                                <FileVideo className="w-10 h-10 text-zinc-400" />
                            ) : (
                                <Upload className="w-10 h-10 text-white/60" />
                            )}
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                            {isDragActive ? 'Drop file here' : 'Upload Video or Audio'}
                        </h3>
                        <p className="text-white/50 max-w-xs mx-auto">
                            Drag & drop your meeting recording, or click to browse.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2 justify-center">
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">MP4</span>
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">MOV</span>
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">MP3</span>
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">WAV</span>
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">M4A</span>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default VideoUpload;
