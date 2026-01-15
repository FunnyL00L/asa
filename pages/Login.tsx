import React, { useState } from 'react';
import { Lock, ExternalLink } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Credentials Logic
    if (username === 'YudaAR' && password === 'ARyuda12') {
      onLogin({ username: 'YudaAR', name: 'YudaAR Portal', role: 'ADMIN' });
    } 
    else if (username === 'SarcoAR' && password === 'ARsarco12') {
      onLogin({ username: 'SarcoAR', name: 'SarcoAR Portal', role: 'ADMIN' });
    } 
    else if (username === 'Prama' && password === 'sistem12') {
      onLogin({ username: 'Prama', name: 'Prama Dashboard', role: 'SUPER_ADMIN' });
    } 
    else {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 relative z-10">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">System Login</h1>
          <p className="text-slate-500">Authorized Access Only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-500/30"
          >
            Access Dashboard
          </button>
        </form>
      </div>

      {/* FOOTER POWERED BY */}
      <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Powered By</p>
        <a 
          href="https://www.instagram.com/trigantalpatistudio/?utm_source=ig_web_button_share_sheet" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group flex items-center justify-center space-x-2 bg-white/50 backdrop-blur-sm px-6 py-2 rounded-full border border-slate-200 hover:border-pink-300 hover:bg-white hover:shadow-lg hover:shadow-pink-500/10 transition-all duration-300"
        >
          <span className="font-bold text-slate-700 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent transition-all">
            Trigantalpati Studio
          </span>
          <ExternalLink size={14} className="text-slate-400 group-hover:text-pink-500" />
        </a>
      </div>
    </div>
  );
};