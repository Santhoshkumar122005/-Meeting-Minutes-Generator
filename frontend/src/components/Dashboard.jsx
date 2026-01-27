import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
import { Search, Calendar, MessageSquare, TrendingUp, Clock, FileText, ChevronRight, BarChart3, Languages, Trash2, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const LANG_COLORS = {
    'English': '#3b82f6',
    'French': '#818cf8',
    'German': '#fbbf24',
    'Hindi': '#f97316',
    'Spanish': '#ef4444',
    'Tamil': '#10b981',
    'Default': '#71717a'
};

const SENTIMENT_COLORS = {
    'Positive': '#10b981',
    'Negative': '#ef4444',
    'Neutral': '#71717a',
    'Mixed/Other': '#f59e0b',
    'Default': '#d4d4d8'
};

const COLORS = ['#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46'];

const Dashboard = ({ onViewMeeting }) => {
    const [meetings, setMeetings] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, languages: 0, words: 0 });
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        fetchMeetings();
        fetchAnalytics();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery) {
                searchMeetings();
            } else {
                fetchMeetings();
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const fetchMeetings = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/meetings`);
            setMeetings(res.data);
            calculateStats(res.data);
            setIsLoading(false);
        } catch (error) {
            console.error("Failed to fetch meetings", error);
            setIsLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/analytics`);
            setAnalytics(res.data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        }
    };

    const searchMeetings = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/meetings/search?q=${searchQuery}`);
            setMeetings(res.data);
        } catch (error) {
            console.error("Failed to search", error);
        }
    };

    const handleDeleteMeeting = async (e, id) => {
        e.stopPropagation(); // Prevent card click
        if (window.confirm("Are you sure you want to delete this meeting? This action cannot be undone.")) {
            try {
                await axios.delete(`${API_BASE_URL}/meetings/${id}`);
                setMeetings(prev => prev.filter(m => m.id !== id));
                // Recalculate stats locally or refetch
                setStats(prev => ({ ...prev, total: prev.total - 1 }));
            } catch (error) {
                console.error("Failed to delete meeting", error);
                alert("Failed to delete meeting");
            }
        }
    };

    const calculateStats = (data) => {
        const uniqueLangs = new Set(data.map(m => m.detected_language));
        setStats({
            total: data.length,
            languages: uniqueLangs.size,
            words: data.reduce((acc, curr) => acc + (curr.transcript ? curr.transcript.split(' ').length : 0), 0) // Rough estimate
        });
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center gap-4"
                >
                    <div className="p-3 bg-zinc-500/20 rounded-xl">
                        <MessageSquare className="w-8 h-8 text-zinc-400" />
                    </div>
                    <div>
                        <p className="text-white/60 text-sm">Total Meetings</p>
                        <h3 className="text-2xl font-bold text-white">{analytics ? analytics.total_meetings : stats.total}</h3>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center gap-4"
                >
                    <div className="p-3 bg-slate-500/20 rounded-xl">
                        <Languages className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                        <p className="text-white/60 text-sm">Languages Supported</p>
                        <h3 className="text-2xl font-bold text-white">{analytics ? Object.keys(analytics.language_distribution).length : stats.languages}</h3>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex items-center gap-4"
                >
                    <div className="p-3 bg-zinc-600/20 rounded-xl">
                        <BarChart3 className="w-8 h-8 text-zinc-300" />
                    </div>
                    <div>
                        <p className="text-white/60 text-sm">Words Analyzed</p>
                        <h3 className="text-2xl font-bold text-white">
                            {analytics ? (analytics.total_words / 1000).toFixed(1) : (stats.words / 1000).toFixed(1)}k+
                        </h3>
                    </div>
                </motion.div>
            </div>

            {/* Analytics Charts */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl"
                    >
                        <h3 className="text-lg font-semibold text-white mb-6">Language Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={Object.entries(analytics.language_distribution).map(([name, value]) => ({ name, value }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {Object.entries(analytics.language_distribution).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={LANG_COLORS[entry[0]] || LANG_COLORS['Default']} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl"
                    >
                        <h3 className="text-lg font-semibold text-white mb-6">Top Conversation Topics</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.top_topics}>
                                    <XAxis dataKey="topic" stroke="rgba(255,255,255,0.3)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.5)' }} hide />
                                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px', maxWidth: '200px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="count" fill="#a1a1aa" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl"
                    >
                        <h3 className="text-lg font-semibold text-white mb-6">Sentiment Analysis</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={Object.entries(analytics.sentiment_distribution || {})
                                            .filter(([key]) => key !== 'Unknown')
                                            .map(([key, value]) => ({ name: key, value }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {Object.entries(analytics.sentiment_distribution || {})
                                            .filter(([key]) => key !== 'Unknown')
                                            .map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry[0]] || SENTIMENT_COLORS['Default']} />
                                            ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                    type="text"
                    placeholder="Search meetings by title, content, or topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-zinc-500 transition-colors"
                />
            </div>

            {/* Meetings List */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <h2 className="text-xl font-semibold text-white/90 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-zinc-400" />
                        Recent Activity
                    </h2>
                    <button
                        onClick={fetchMeetings}
                        className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                        title="Refresh List"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-white/40">Loading your meetings...</div>
                ) : meetings.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                        <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/60">No meetings found. Upload one to get started!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <AnimatePresence>
                            {meetings.map((meeting, idx) => (
                                <motion.div
                                    key={meeting.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => onViewMeeting(meeting.id)}
                                    className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 cursor-pointer transition-all hover:border-zinc-500/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-zinc-300 transition-colors">
                                            {meeting.title || "Untitled Meeting"}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-white/50">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(meeting.date).toLocaleDateString()}
                                            </span>
                                            {meeting.detected_language && (
                                                <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-xs">
                                                    {meeting.detected_language}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => handleDeleteMeeting(e, meeting.id)}
                                            className="p-2 text-white/20 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete Meeting"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div >
    );
};

export default Dashboard;
