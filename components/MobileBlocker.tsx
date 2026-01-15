import React from 'react';
import { MonitorX, Terminal } from 'lucide-react';

export const MobileBlocker: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black text-green-500 font-mono z-[9999] flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="max-w-lg w-full space-y-8 border border-green-900/50 p-8 rounded bg-slate-900/50 backdrop-blur-sm shadow-2xl">
        
        <div className="flex items-center space-x-3 border-b border-green-800 pb-4 mb-6">
          <Terminal size={24} className="text-red-500 animate-pulse" />
          <h1 className="text-2xl font-bold tracking-widest text-red-500">SYSTEM HALTED</h1>
        </div>

        <div className="space-y-4">
          <div className="text-6xl font-black text-white mb-2">404</div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
             ERROR: DEVICE NOT SUPPORTED
          </h2>
          
          <div className="bg-red-950/30 border border-red-900/50 p-4 rounded text-red-200 text-sm mt-4">
            <p>CRITICAL_PROCESS_DIED: MOBILE_VIEWPORT_DETECTED</p>
            <p className="mt-1 opacity-70">Access to this admin terminal is restricted to desktop environments only.</p>
          </div>

          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <MonitorX size={64} className="text-slate-600" />
            <p className="text-center text-slate-400 text-sm">
              Please switch to a <span className="text-white font-bold">Desktop Computer</span> or <span className="text-white font-bold">Laptop</span> to access the mainframe.
            </p>
          </div>
        </div>

        <div className="text-xs text-green-800 pt-4 border-t border-green-900/30 font-mono">
          > System.exit(1)<br/>
          > _
        </div>
      </div>
    </div>
  );
};