import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Search, User, Settings, ShieldCheck } from 'lucide-react'; // Added Settings & ShieldCheck

const Navbar = () => {
    const { user } = useAuth(); 
    const navigate = useNavigate();
    
    // 1. State to store the search text
    const [searchQuery, setSearchQuery] = useState('');

    // 2. Function to handle the search action
    const handleSearch = (e) => {
        // Only trigger on "Enter" key
        if (e.key === 'Enter') {
            e.preventDefault(); 
            
            if (searchQuery.trim()) {
                console.log("Searching for:", searchQuery);
                // Navigate to Market page with query
                navigate(`/market?q=${encodeURIComponent(searchQuery)}`);
                setSearchQuery(''); 
            }
        }
    };

    // 3. Determine Profile Path (Admin -> Admin Panel, User -> Profile)
    const handleProfileClick = () => {
        if (user?.role === 'admin') {
            navigate('/admin');
        } else {
            navigate('/profile');
        }
    };

    return (
        <header className="h-20 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-20">
            
            {/* Search Bar */}
            <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 w-96 text-sm focus-within:border-blue-500/50 focus-within:bg-slate-900 transition-all">
                <Search className="w-4 h-4 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Search markets, assets, or news..." 
                    className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 w-full"
                    // 4. Bind input & Listen for Enter
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearch}
                />
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
                
                {/* Settings Button (New) */}
                <button 
                    onClick={() => navigate('/settings')} 
                    className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>

                {/* Notifications */}
                <button className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-slate-950"></span>
                </button>

                {/* Separator */}
                <div className="h-8 w-px bg-slate-800 mx-2"></div>

                {/* Profile Button */}
                <button 
                    onClick={handleProfileClick} 
                    className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full border border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800 transition-all group"
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg ${user?.role === 'admin' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                        {user?.profilePic ? (
                            <img src={user.profilePic} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            user?.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <span className="text-xs font-bold">{user?.email?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}</span>
                        )}
                    </div>
                    <div className="text-left hidden md:block">
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                            {user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium capitalize">
                            {user?.role === 'admin' ? 'Administrator' : (user?.occupation || 'Member')}
                        </div>
                    </div>
                </button>
            </div>
        </header>
    );
};

export default Navbar;