import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, User, Bell, ChevronRight, Phone, Save, CheckCircle } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Initialize Settings
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('stressAlerts') === 'true';
  });
  
  // New State for Phone Number
  const [hrPhone, setHrPhone] = useState(() => {
    return localStorage.getItem('hrPhoneNumber') || '';
  });

  const [savedMsg, setSavedMsg] = useState('');

  // 2. Save Changes
  const handleSave = () => {
    localStorage.setItem('stressAlerts', notifications);
    localStorage.setItem('hrPhoneNumber', hrPhone);
    
    setSavedMsg('Settings Saved Successfully!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleProfileAccess = () => {
    if (user?.role === 'admin') navigate('/admin');
    else navigate('/profile');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="w-full max-w-lg mx-auto space-y-8">
        
        {/* Header */}
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow-sm text-center">
          Settings
        </h1>

        {/* Success Message */}
        {savedMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <CheckCircle size={20} /> {savedMsg}
            </div>
        )}

        {/* --- SETTINGS CARD --- */}
        <div className="backdrop-blur-xl border rounded-3xl p-8 shadow-2xl transition-all duration-300 bg-slate-900/60 border-slate-800 shadow-black/50">
          <div className="space-y-6">
            
            {/* 1. STRESS ALERTS TOGGLE */}
            <label className="flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Bell size={20} />
                </div>
                <div>
                    <span className="text-lg font-semibold text-slate-200 block">Stress Alerts</span>
                    <span className="text-xs text-slate-500">Browser & SMS Notifications</span>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={() => setNotifications(!notifications)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </div>
            </label>

            {/* 2. HR PHONE NUMBER (Twilio Target) */}
            <div className={`p-4 rounded-2xl border transition-all bg-slate-800/50 border-slate-700 ${notifications ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <Phone size={20} />
                    </div>
                    <span className="text-lg font-semibold text-slate-200">HR Alert Number</span>
                </div>
                <input 
                    type="tel" 
                    value={hrPhone}
                    onChange={(e) => setHrPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600 font-mono"
                />
            </div>

            <div className="h-px w-full bg-slate-800"></div>

            {/* 3. PROFILE ACCESS BUTTON */}
            <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-slate-500">
                    Account Access
                </h3>
                
                <button onClick={handleProfileAccess} className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all group bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/30">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${user?.role === 'admin' ? 'bg-gradient-to-br from-red-600 to-orange-700 text-white' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'}`}>
                            {user?.role === 'admin' ? <ShieldCheck size={24} /> : <User size={24} />}
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-lg text-slate-200">{user?.role === 'admin' ? 'Admin Portal' : 'My Profile'}</p>
                            <p className="text-sm text-slate-500">{user?.role === 'admin' ? 'Manage system & users' : 'Edit personal details'}</p>
                        </div>
                    </div>
                    <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1 text-slate-500" />
                </button>
            </div>

            {/* SAVE BUTTON */}
            <button onClick={handleSave} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2">
                <Save size={20} /> Save Settings
            </button>

          </div>
        </div>
        
        <div className="text-center">
            <p className="text-sm text-slate-500">Logged in as <span className="font-semibold text-slate-400">{user?.email}</span></p>
        </div>
      </div>
    </div>
  );
}