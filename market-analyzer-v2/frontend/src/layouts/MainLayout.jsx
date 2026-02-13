import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext'; 

import Sidebar from '../components/Sidebar'; // This is now your Top Navigation Bar
// import Navbar from '../components/Navbar'; // Removed: Sidebar now handles the header functionality
import BackgroundStressWorker from '../components/BackgroundStressWorker';

const MainLayout = () => {
    
    const { theme } = useTheme();
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // PROFILE ACCESS CHECK
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-blue-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
            </div>
        );
    }

    return (
        // UPDATE: Added 'flex-col' to stack elements vertically (Header on top, Content below)
        <div className={`flex h-screen flex-col overflow-hidden font-sans selection:bg-blue-500/30 ${
            theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900'
        }`}>
            {/* 2. BACKGROUND WORKER */}
            <BackgroundStressWorker />

            {/* 3. Top Navigation (Formerly Sidebar) */}
            {/* Since the parent is flex-col, this stays at the top */}
            <Sidebar />

            {/* 4. Main Content Wrapper */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/50 relative">
                <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-500 slide-in-from-bottom-2">
                    <Outlet />
                </div>

                <div className="mt-10 pt-6 border-t border-slate-800/50 text-center text-xs text-slate-600">
                    &copy; 2025 AI Analyzer Pro. All systems operational.
                </div>
            </main>
        </div>
    );
};

export default MainLayout;