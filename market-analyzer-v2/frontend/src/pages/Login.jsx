import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, ShieldCheck, Loader2, AlertCircle, BrainCircuit } from 'lucide-react';

const Login = () => {
    const [step, setStep] = useState(1); // 1: Email, 2: Password, 3: 2FA
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { checkEmail, login } = useAuth();
    const navigate = useNavigate();

    // Step 1: Validate Email exists
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const exists = await checkEmail(email);
            if (exists) {
                setStep(2); // Go to Password
            } else {
                setError("Couldn’t find your Account. Please create one.");
            }
        } catch (err) {
            setError('Connection failed. Is the backend running?');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2 & 3: Handle Login
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const result = await login(email, password, step === 3 ? code : null);
            
            if (result.status === '2FA_REQUIRED') {
                setStep(3); // Move to 2FA screen
            } else {
                // --- ADMIN REDIRECT LOGIC ---
                if (result.user?.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard'); // Normal User Dashboard
                }
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Wrong password or invalid credentials.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // THEME WRAPPER: bg-slate-50 (Light) vs bg-slate-950 (Dark)
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 relative overflow-hidden transition-colors duration-300">
            
            {/* Background Effects (Consistent across themes) */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-[100px]" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[100px]" />

            {/* Card Container: bg-white (Light) vs bg-slate-900 (Dark) */}
            <div className="w-full max-w-[450px] bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-10 rounded-[28px] shadow-2xl relative z-10 transition-colors duration-300">
                
                {/* Logo Area */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 rotate-3 hover:rotate-0 transition-transform duration-300">
                        <BrainCircuit size={32} />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {step === 1 ? 'Sign in' : step === 3 ? '2-Step Verification' : `Welcome Back`}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {step === 1 ? 'to continue to AI-DM' : step === 2 ? email : 'This extra step shows it’s really you'}
                    </p>
                    {step === 2 && (
                        <button onClick={() => setStep(1)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 mt-2 py-1 px-3 rounded-full bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all">
                            Switch account
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-6 flex items-start gap-3 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-500/20 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {/* --- STEP 1: EMAIL --- */}
                {step === 1 && (
                    <form onSubmit={handleEmailSubmit} className="space-y-6">
                        <div className="relative group">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                // THEME: Input Background & Text
                                className="peer w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-transparent"
                                placeholder="Email"
                                required
                                autoFocus
                            />
                            <label className="absolute left-3.5 -top-2.5 bg-white dark:bg-slate-900 px-1 text-xs text-slate-500 dark:text-slate-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-600 dark:peer-focus:text-blue-400 peer-focus:bg-white dark:peer-focus:bg-slate-900 rounded">
                                Email or phone
                            </label>
                        </div>

                        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:text-blue-500 dark:hover:text-blue-300">
                            Forgot email?
                        </div>
                        
                        <div className="text-sm text-slate-600 dark:text-slate-500 leading-relaxed">
                            Not your computer? Use Guest mode to sign in privately. <span className="text-blue-600 dark:text-blue-400 font-medium cursor-pointer">Learn more</span>
                        </div>

                        <div className="flex justify-between items-center pt-4">
                            <button 
                                type="button" 
                                onClick={() => navigate('/register')}
                                className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-500 dark:hover:text-blue-300 px-2 transition-colors"
                            >
                                Create account
                            </button>
                            
                            <button 
                                type="submit" 
                                disabled={!email || isLoading}
                                className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-medium hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                            >
                                {isLoading && <Loader2 size={16} className="animate-spin" />}
                                Next
                            </button>
                        </div>
                    </form>
                )}

                {/* --- STEP 2: PASSWORD --- */}
                {step === 2 && (
                    <form onSubmit={handleLoginSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="relative group">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="peer w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-transparent"
                                placeholder="Enter your password"
                                autoFocus
                                required
                            />
                            <label className="absolute left-3.5 -top-2.5 bg-white dark:bg-slate-900 px-1 text-xs text-slate-500 dark:text-slate-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-600 dark:peer-focus:text-blue-400 peer-focus:bg-white dark:peer-focus:bg-slate-900 rounded">
                                Enter your password
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="showPass" className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                            <label htmlFor="showPass" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">Show password</label>
                        </div>

                        <div className="flex justify-between items-center pt-8">
                            <button type="button" className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-500 dark:hover:text-blue-300 px-2 transition-colors">Forgot password?</button>
                            <button 
                                type="submit" 
                                disabled={!password || isLoading}
                                className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-medium hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                            >
                                {isLoading && <Loader2 size={16} className="animate-spin" />}
                                Next
                            </button>
                        </div>
                    </form>
                )}

                {/* --- STEP 3: 2FA CODE --- */}
                {step === 3 && (
                    <form onSubmit={handleLoginSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl flex items-start gap-3 border border-blue-200 dark:border-blue-500/20">
                            <div className="mt-1"><ShieldCheck className="text-blue-600 dark:text-blue-400" size={20} /></div>
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-slate-900 dark:text-white block mb-1">Check your phone</span>
                                We sent a notification to your phone. Tap <strong>Yes</strong> to verify it's you.
                            </div>
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="peer w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-transparent"
                                placeholder="Enter code"
                                autoFocus
                            />
                            <label className="absolute left-3.5 -top-2.5 bg-white dark:bg-slate-900 px-1 text-xs text-slate-500 dark:text-slate-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-600 dark:peer-focus:text-blue-400 peer-focus:bg-white dark:peer-focus:bg-slate-900 rounded">
                                Enter 2FA Code
                            </label>
                        </div>

                        <div className="flex justify-between items-center pt-8">
                            <button type="button" className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-500 dark:hover:text-blue-300 px-2 transition-colors">Try another way</button>
                            <button 
                                type="submit" 
                                disabled={!code || isLoading}
                                className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-medium hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                            >
                                {isLoading && <Loader2 size={16} className="animate-spin" />}
                                Verify
                            </button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
};

export default Login;