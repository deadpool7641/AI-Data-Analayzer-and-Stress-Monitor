import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Updated import
import { User, Mail, Lock, Loader2 } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Use the central register function from context
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // This now calls the AuthContext register, which handles the API/Mock logic
            await register(name, email, password);
            navigate('/dashboard'); 
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Registration failed. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        Create Account
                    </h1>
                    <p className="mt-2 text-gray-400">Join us and start analyzing the market</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                         <div className="p-3 text-center text-red-400 bg-red-900/30 rounded-lg border border-red-500/50 text-sm">
                            {error}
                        </div>
                    )}
                     <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-white placeholder-gray-500"
                        />
                    </div>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-white placeholder-gray-500"
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-white placeholder-gray-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 font-semibold text-white transition-all duration-200 transform rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Register'}
                    </button>
                </form>

                <p className="text-sm text-center text-gray-400">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300 transition-colors hover:underline">
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;