import React, { useState } from 'react';
import { loginUser } from './api';

export default function Login({ onLoginSuccess }) {
  const [inputName, setInputName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '', isError: false });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });
    setIsLoading(true);

    const userInput = inputName.trim();
    const userPassword = password.trim();

    try {
      // Login is checked by the MySQL backend (email OR name OR username).
      const data = await loginUser(userInput, userPassword);
      if (data.token) localStorage.setItem('token', data.token);
      const foundUser = data.user || {};

      setMessage({
        text: `✅ Welcome ${foundUser.name || userInput}! Logging in...`,
        isError: false
      });

      setTimeout(() => {
        onLoginSuccess({
          id: foundUser.id,
          name: foundUser.name || userInput,
          email: foundUser.email || '',
          role: foundUser.role || 'Technician',
          category: foundUser.category || ''
        });
      }, 500);
    } catch (err) {
      setMessage({
        text: err.status === 404
          ? '❌ Invalid Username or Email! Please try again.'
          : err.status === 400
          ? '❌ Incorrect Password! Please try again.'
          : '❌ Cannot connect to the server. Is the backend running?',
        isError: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#0a101d] border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-blue-500 mb-2">AssetCore Pro</h1>
          <p className="text-xs text-slate-400">Sign in to access your account</p>
        </div>

        {message.text && (
          <div className={`mb-4 p-3 border text-xs font-semibold rounded-lg text-center ${
            message.isError 
              ? 'bg-red-950/80 border-red-800 text-red-400' 
              : 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-bold uppercase mb-2 tracking-wider">
              USERNAME / EMAIL
            </label>
            <input
              type="text"
              required
              placeholder="Enter Email or Name"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              className="w-full bg-[#060913] border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold uppercase mb-2 tracking-wider">
              PASSWORD
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#060913] border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 text-sm mt-4 cursor-pointer"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}