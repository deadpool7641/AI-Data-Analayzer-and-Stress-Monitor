import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, UserPlus, Shield, ShieldAlert, UserCog, Save, X } from 'lucide-react';

const AdminPanel = () => {
    const { mockDatabase, registerUser, deleteUser, user, updateUserProfile } = useAuth();
    
    // --- STATE: ADMIN SELF-EDIT ---
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [isEditingAdmin, setIsEditingAdmin] = useState(false);

    // --- STATE: ADD NEW USER ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('user');

    useEffect(() => {
        if (user) {
            setAdminName(user.name || '');
            setAdminEmail(user.email || '');
        }
    }, [user]);

    const handleUpdateAdmin = async (e) => {
        e.preventDefault();
        await updateUserProfile({ name: adminName, email: adminEmail });
        setIsEditingAdmin(false);
        alert("Admin profile updated successfully!");
    };

    const handleCancelEdit = () => {
        setAdminName(user.name || '');
        setAdminEmail(user.email || '');
        setIsEditingAdmin(false);
    };

    const handleAddUser = (e) => {
        e.preventDefault();
        registerUser(email, password, name, role);
        setEmail(''); setPassword(''); setName('');
        alert('New user added');
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
                <ShieldAlert className="w-16 h-16 mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
            </div>
        );
    }

    return (
        // THEME WRAPPER: Handles text color for both modes
        <div className="space-y-6 text-slate-800 dark:text-slate-200 transition-colors duration-300">
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
                    <Shield className="w-8 h-8 text-red-600 dark:text-red-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Console</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage system access and credentials.</p>
                </div>
            </div>

            {/* --- 1. MY ADMIN PROFILE --- */}
            {/* THEME: bg-white (light) vs bg-slate-900/50 (dark) */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-sm transition-colors">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <UserCog className="w-5 h-5 text-purple-500 dark:text-purple-400" /> My Admin Profile
                    </h2>
                    {!isEditingAdmin && (
                        <button 
                            onClick={() => setIsEditingAdmin(true)}
                            className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 px-3 py-1 rounded-lg transition-colors"
                        >
                            Edit Details
                        </button>
                    )}
                </div>

                <form onSubmit={handleUpdateAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase mb-2">Display Name</label>
                        <input 
                            type="text" 
                            disabled={!isEditingAdmin}
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            // THEME: Inputs switch between slate-50 (light) and slate-950 (dark)
                            className={`w-full rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none border
                                ${isEditingAdmin 
                                    ? 'bg-white dark:bg-slate-950 border-purple-500 text-slate-900 dark:text-white shadow-sm' 
                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                }`}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Access</label>
                        <input 
                            type="email" 
                            disabled={!isEditingAdmin}
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            className={`w-full rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none border
                                ${isEditingAdmin 
                                    ? 'bg-white dark:bg-slate-950 border-purple-500 text-slate-900 dark:text-white shadow-sm' 
                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                }`}
                        />
                    </div>
                    <div className="flex items-end">
                        {isEditingAdmin ? (
                            <div className="flex gap-3 w-full animate-in fade-in slide-in-from-right-4 duration-300">
                                <button type="button" onClick={handleCancelEdit} className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                                    <X size={16} /> Cancel
                                </button>
                                <button type="submit" className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-lg">
                                    <Save size={16} /> Save
                                </button>
                            </div>
                        ) : (
                            <div className="w-full h-10 flex items-center text-xs text-slate-400 italic">
                                Click "Edit Details" to change info.
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* --- 2. ADD USER FORM --- */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm transition-colors">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                    <UserPlus className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Add New User
                </h2>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="text" placeholder="Name" required value={name} onChange={e => setName(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:border-blue-500 text-slate-900 dark:text-white outline-none"
                    />
                    <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:border-blue-500 text-slate-900 dark:text-white outline-none"
                    />
                    <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:border-blue-500 text-slate-900 dark:text-white outline-none"
                    />
                    <select value={role} onChange={e => setRole(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:border-blue-500 text-slate-900 dark:text-white outline-none"
                    >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button type="submit" className="md:col-span-4 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors">
                        Create User
                    </button>
                </form>
            </div>

            {/* --- 3. USER LIST TABLE --- */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="font-semibold text-slate-900 dark:text-white">Active Users</h2>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {mockDatabase.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{u.name}</td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{u.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                        u.role === 'admin' 
                                        ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20' 
                                        : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                                    }`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {u.email !== user.email && (
                                        <button onClick={() => deleteUser(u.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete User">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminPanel;