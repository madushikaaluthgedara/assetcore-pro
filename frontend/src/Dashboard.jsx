import React from 'react';
import { useNavigate } from 'react-router-dom';

// ඔයාගේ Views Import කරගන්න
import AdminView from './AdminView';
import TechnicianView from './TechnicianView';
import UserView from './UserView';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // LocalStorage එකෙන් Login වුණු User ගේ Role සහ Info ගන්න
  const userRole = localStorage.getItem('userRole') || 'User';
  const userName = localStorage.getItem('userName') || 'User';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 🔹 Role-based Header View */}
      <header className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 px-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg">
            💎
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">AssetCore Pro</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Welcome back, <span className="text-blue-400 font-semibold">{userName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User Role Badge */}
          <span className={`px-3 py-1 text-xs font-bold rounded-lg uppercase ${
            userRole === 'Admin' 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
              : userRole === 'Technician' 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            {userRole}
          </span>

          <button 
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 cursor-pointer transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* 🔹 Role අනුව අදාළ Page එක Render කිරීම */}
      <main className="p-2">
        {userRole === 'Admin' && <AdminView />}
        {userRole === 'Technician' && <TechnicianView />}
        {userRole === 'User' && <UserView />}
      </main>
    </div>
  );
}