import React from 'react';
import { LayoutDashboard, Users, FileQuestion, Code, LogOut, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentPage: string;
  setPage: (page: string) => void;
  onLogout: () => void;
  currentUser: User;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage, onLogout, currentUser }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students & Tokens', icon: Users },
    { id: 'questions', label: 'Manage Questions', icon: FileQuestion },
    // Integration help is conditionally rendered below
  ];

  if (currentUser.role === 'SUPER_ADMIN') {
    navItems.push({ id: 'integration', label: 'Integration Help', icon: Code });
  }

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col shadow-xl fixed left-0 top-0">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          {currentUser.name}
        </h1>
        {currentUser.role === 'SUPER_ADMIN' && (
          <div className="flex items-center space-x-1 mt-2 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full w-fit">
             <ShieldCheck size={12} />
             <span className="text-[10px] font-bold uppercase tracking-wider">Super Admin</span>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};