import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminView from "./AdminView";
import TechnicianView from "./TechnicianView";
import UserView from "./UserView";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: '', role: '' });
  const [isDarkMode, setIsDarkMode] = useState(true);

  // 1. Check User Session from LocalStorage
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');

    if (!role) {
      navigate('/login');
    } else {
      setUser({ name, role });
    }
  }, [navigate]);

  // 2. Logout Handler
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // 3. Normalizing User Role (Solves Capital/Simple letter mismatches)
  const normalizedRole = user.role ? user.role.toLowerCase().trim() : '';

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${
      isDarkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-[#f0f5fa] text-slate-800'
    }`}>
      
      {/* 🟢 TOP HEADER BAR */}
      <header className={`border-b sticky top-0 z-30 px-6 md:px-8 py-4 flex justify-between items-center backdrop-blur-md ${
        isDarkMode 
          ? 'bg-[#111827]/80 border-slate-800 shadow-xl' 
          : 'bg-[#e2eaf4]/90 border-blue-200 shadow-sm'
      }`}>
        
        {/* Brand & Welcome Info */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-xl text-white font-bold shadow-md">
            💎
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">AssetCore Pro</h1>
            <p className="text-xs text-slate-400">
              Welcome back, <span className="text-blue-500 font-semibold">{user.name || 'User'}</span>
            </p>
          </div>
        </div>

        {/* Right Controls (Theme Toggle, Role Badge & Logout) */}
        <div className="flex items-center gap-3">
          
          {/* Theme Switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          {/* User Role Badge */}
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
            isDarkMode 
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
              : 'bg-blue-500/10 text-blue-700 border-blue-300'
          }`}>
            {user.role}
          </span>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isDarkMode
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-600 hover:text-white'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300'
            }`}
          >
            Logout
          </button>
        </div>
      </header>

      {/* 🔵 DYNAMIC VIEW RENDERER BASED ON USER ROLE */}
      <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
        {normalizedRole === 'admin' && (
          <AdminView isDarkMode={isDarkMode} />
        )}
        
        {normalizedRole === 'technician' && (
          <TechnicianView isDarkMode={isDarkMode} />
        )}
        
        {normalizedRole === 'user' && (
          <UserView isDarkMode={isDarkMode} username={user.name} />
        )}

        {/* Fallback Screen for Unknown Roles */}
        {!['admin', 'technician', 'user'].includes(normalizedRole) && (
          <div className="text-center py-20">
            <h2 className="text-xl font-bold text-slate-400">Loading User Privileges...</h2>
            <p className="text-xs text-slate-500 mt-2">If this screen persists, please log in again.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;