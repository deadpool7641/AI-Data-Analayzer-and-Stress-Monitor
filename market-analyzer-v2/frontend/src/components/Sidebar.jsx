import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; 
import { 
  LayoutDashboard, 
  BarChart2, 
  Eye, 
  Activity, 
  Zap,
  User,
  Shield, 
  Grid,
  LogOut,
  Settings,
  TrendingUp,
  TrendingDown,
  MoreHorizontal
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth(); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Helper to check role safely (Handles 'admin', 'Admin', 'ADMIN')
  const isAdmin = user?.role && user.role.toLowerCase() === 'admin';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/market', label: 'Market', icon: BarChart2 },
    { path: '/watchlist', label: 'Watchlist', icon: Eye },
    { path: '/stress', label: 'Stress', icon: Activity },
  ];

  const favorites = [
    { symbol: 'NVDA', price: '874.06', change: '-0.11%', isUp: false },
    { symbol: 'BTC', price: '42,002', change: '+1.20%', isUp: true },
    { symbol: 'ETH', price: '2,340', change: '+0.85%', isUp: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full px-4 md:px-8 pt-4 pb-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900/95">
      <div className="max-w-7xl mx-auto">
        <div className="h-16 w-full rounded-2xl bg-[#020617]/95 border border-slate-800 shadow-[0_20px_60px_rgba(15,23,42,0.9)] flex items-center justify-between px-4 md:px-6">
          
          {/* LEFT: Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/30 shadow-[0_0_18px_rgba(59,130,246,0.4)]">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div className="leading-tight">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                AI • DATA • MARKET
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-white">
                AI-DM <span className="text-slate-400 font-normal">Command</span>
              </h1>
            </div>
          </div>

          {/* CENTER: Nav */}
          <nav className="flex items-center justify-center flex-1 mx-2 md:mx-6">
            <div className="flex flex-wrap items-center justify-center gap-1 bg-slate-900/80 rounded-full px-1 py-1 border border-slate-700/70 backdrop-blur">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full text-[11px] md:text-xs font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'}
                  `}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          {/* RIGHT: User Menu */}
          <div className="flex items-center gap-3 relative" ref={menuRef}>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/70">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-600 to-slate-400 flex items-center justify-center text-[10px] font-semibold text-slate-100">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="leading-none">
                <div className="text-[11px] text-slate-300 font-medium">
                  {user?.name || 'Guest'}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                  {user?.role || 'User'}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-full transition-all border ${
                isMenuOpen 
                  ? 'bg-slate-800 text-white border-slate-600' 
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 border-slate-800'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 md:right-0 top-[4.25rem] mt-2 w-72 bg-[#0b0f19] border border-gray-700 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 border-b border-gray-800 mb-2">
                  <p className="text-sm font-bold text-white truncate">{user?.name || 'Guest'}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{user?.role || 'User'}</p>
                </div>

                <div className="space-y-1">
                  
                  {/* IF USER IS ADMIN: Show Admin Panel Link */}
                  {isAdmin ? (
                    <NavLink to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                      <Shield className="w-4 h-4 text-purple-400" /> Admin Panel
                    </NavLink>
                  ) : (
                    /* IF USER IS NOT ADMIN: Show Profile Link */
                    <NavLink to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                      <User className="w-4 h-4 text-blue-400" /> My Profile
                    </NavLink>
                  )}

                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <Settings className="w-4 h-4 text-slate-400" /> Settings
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="px-3 mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Favorites</span>
                    <MoreHorizontal className="w-3 h-3 text-slate-600" />
                  </div>
                  <div className="space-y-1">
                    {favorites.map((stock) => (
                      <div key={stock.symbol} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <span className="text-xs font-bold text-slate-300">{stock.symbol}</span>
                        <div className={`flex items-center gap-1 text-xs ${stock.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {stock.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {stock.change}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-800">
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Sidebar;