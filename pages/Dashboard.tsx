import React, { useState } from 'react';
import { Users, FileQuestion, Trophy, Activity, Medal, Shield, Search, ArrowRight, Star, Wifi, WifiOff, Database, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Student, Question, Score, GameId, User } from '../types';

interface DashboardProps {
  students: Student[];
  questions: Question[];
  scores: Score[];
  currentUser: User;
  networkMetrics?: {
    isConnected: boolean;
    latency: number;
    lastSync: Date;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ students, questions, scores, currentUser, networkMetrics }) => {
  const [lookupToken, setLookupToken] = useState('');
  const [lookupResult, setLookupResult] = useState<Student | null>(null);
  const [lookupMessage, setLookupMessage] = useState('');

  // Calculations
  const highestScore = scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0;
  const uniqueParticipants = new Set(scores.map(s => s.token)).size;

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-100' },
    { label: 'Total Questions', value: questions.length, icon: FileQuestion, color: 'text-purple-500', bg: 'bg-purple-100' },
    { label: 'Students Participated', value: uniqueParticipants, icon: Activity, color: 'text-green-500', bg: 'bg-green-100' },
    { label: 'Score Tertinggi', value: highestScore, icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  ];

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if(!lookupToken) return;
    
    // Case insensitive search
    const found = students.find(s => s.token.trim().toUpperCase() === lookupToken.trim().toUpperCase());
    
    if (found) {
        setLookupResult(found);
        setLookupMessage('');
    } else {
        setLookupResult(null);
        setLookupMessage('Token not found.');
    }
  };

  // Helper to calculate high score for the looked-up student
  const getHighScoreForStudent = (token: string) => {
      // Find all scores for this token
      const studentScores = scores.filter(s => s.token === token);
      
      if (studentScores.length === 0) return 0;
      
      // Return the max value
      return Math.max(...studentScores.map(s => s.score));
  };

  // Prepare chart data
  const yudaScores = scores.filter(s => s.gameId === GameId.YUDA_AR);
  const sarcoScores = scores.filter(s => s.gameId === GameId.SARCO_AR);
  
  let chartData = [
    { name: 'Yuda AR', submissions: yudaScores.length, avg: yudaScores.length ? Math.round(yudaScores.reduce((a,b) => a+b.score, 0)/yudaScores.length) : 0 },
    { name: 'Sarco AR', submissions: sarcoScores.length, avg: sarcoScores.length ? Math.round(sarcoScores.reduce((a,b) => a+b.score, 0)/sarcoScores.length) : 0 },
  ];

  if (currentUser.username === 'YudaAR') {
    chartData = chartData.filter(d => d.name === 'Yuda AR');
  } else if (currentUser.username === 'SarcoAR') {
    chartData = chartData.filter(d => d.name === 'Sarco AR');
  }

  // LEADERBOARD LOGIC
  const leaderboard = scores
    .sort((a, b) => b.score - a.score) 
    .slice(0, 5) 
    .map(score => {
        const student = students.find(s => s.token === score.token);
        return {
            ...score,
            studentName: student ? student.name : 'Unknown Student',
            className: student ? student.class : '-'
        };
    });

  // ADMIN CONTRIBUTION LOGIC (Super Admin Only)
  const adminStats = [
    { name: 'YudaAR', students: students.filter(s => s.owner === 'YudaAR').length, questions: questions.filter(q => q.owner === 'YudaAR').length },
    { name: 'SarcoAR', students: students.filter(s => s.owner === 'SarcoAR').length, questions: questions.filter(q => q.owner === 'SarcoAR').length },
    { name: 'Prama', students: students.filter(s => s.owner === 'Prama').length, questions: questions.filter(q => q.owner === 'Prama').length },
  ];

  return (
    <div className="space-y-8">
      {/* HEADER SECTION WITH STATUS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold text-slate-800">Dashboard Overview</h2>
            <p className="text-slate-500 mt-1">Welcome back, {currentUser.name}.</p>
        </div>

        {/* SYSTEM STATUS CARD */}
        {networkMetrics && (
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center space-x-4">
                <div className="flex items-center space-x-2 border-r border-slate-100 pr-4">
                    <div className="relative">
                        <div className={`w-3 h-3 rounded-full ${networkMetrics.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {networkMetrics.isConnected && (
                            <div className="absolute top-0 left-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75"></div>
                        )}
                    </div>
                    <span className={`text-xs font-bold ${networkMetrics.isConnected ? 'text-green-700' : 'text-red-700'}`}>
                        {networkMetrics.isConnected ? 'LIVE SYNC' : 'OFFLINE'}
                    </span>
                </div>

                <div className="flex items-center space-x-2 border-r border-slate-100 pr-4">
                    <Zap size={14} className={networkMetrics.latency < 1000 ? 'text-green-500' : 'text-orange-500'} />
                    <span className="text-xs font-mono font-medium text-slate-600">
                        {networkMetrics.latency}ms
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    <Database size={14} className="text-blue-500" />
                    <span className="text-xs text-slate-500">
                        DB Refresh: 0.5s
                    </span>
                </div>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4 hover:shadow-md transition-shadow">
              <div className={`p-4 rounded-full ${stat.bg}`}>
                <Icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK TOKEN LOOKUP & SUPER ADMIN STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Token Lookup */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 shadow-lg text-white">
            <div className="flex items-center space-x-2 mb-4">
                <Search className="text-indigo-200" size={24}/>
                <h3 className="text-lg font-bold">Quick Token Check</h3>
            </div>
            <p className="text-indigo-100 text-sm mb-4">Enter a student token to see their Name and Highest Score.</p>
            
            <form onSubmit={handleLookup} className="flex space-x-2 mb-4">
                <input 
                    type="text" 
                    placeholder="Enter Token (e.g. X7K9P2)" 
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-indigo-300 outline-none focus:bg-white/20 transition-all uppercase font-mono"
                    value={lookupToken}
                    onChange={(e) => setLookupToken(e.target.value)}
                />
                <button type="submit" className="bg-white text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-50 transition-colors">
                    Check
                </button>
            </form>

            {lookupMessage && <p className="text-red-300 font-bold bg-red-900/20 p-2 rounded border border-red-500/30">{lookupMessage}</p>}
            
            {lookupResult && (
                <div className="bg-white/10 rounded-lg p-4 border border-white/20 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-indigo-300 uppercase font-bold">Student Name</p>
                            <p className="text-xl font-bold">{lookupResult.name}</p>
                            <p className="text-sm text-indigo-200">{lookupResult.class}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-indigo-300 uppercase font-bold mb-1">Highest Score</p>
                             <div className="flex items-center justify-end space-x-1">
                                <Trophy size={18} className="text-yellow-400" />
                                <span className="text-2xl font-bold text-white">
                                    {getHighScoreForStudent(lookupResult.token)}
                                </span>
                             </div>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                         <span className="text-xs text-indigo-300">
                             Token: <span className="font-mono font-bold text-white bg-white/20 px-2 py-0.5 rounded">{lookupResult.token}</span>
                         </span>
                         {currentUser.role === 'SUPER_ADMIN' && (
                             <span className="text-xs bg-indigo-900/50 px-2 py-1 rounded text-indigo-200 border border-indigo-500/30">
                                 Owner: {lookupResult.owner || 'None'}
                             </span>
                         )}
                    </div>
                </div>
            )}
        </div>

        {/* Super Admin Stats (Conditional) or General Info */}
        {currentUser.role === 'SUPER_ADMIN' ? (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-white border border-slate-700">
                <div className="flex items-center space-x-2 mb-4">
                    <Shield className="text-blue-400" size={24}/>
                    <h3 className="text-lg font-bold">Admin Activity Monitor</h3>
                </div>
                <div className="space-y-3">
                    {adminStats.map((stat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
                            <span className="font-bold text-blue-300">{stat.name}</span>
                            <div className="text-right flex space-x-4 text-sm">
                                <span className="text-slate-300"><b>{stat.students}</b> Students</span>
                                <span className="text-slate-300"><b>{stat.questions}</b> Questions</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Need Help?</h3>
                 <p className="text-slate-600 mb-4">You are viewing data specifically for <b>{currentUser.username}</b>. Data from other admins is hidden for privacy.</p>
                 <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
                     <Star className="text-blue-500 shrink-0 mt-1" size={18} />
                     <div>
                        <p className="text-sm text-blue-800 font-medium">Tip:</p>
                        <p className="text-sm text-blue-700">Use the search box on the left to quickly check if a student has played and what their best score is.</p>
                     </div>
                 </div>
             </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CHART SECTION */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Game Engagement</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  cursor={{fill: '#f1f5f9'}}
                />
                <Bar dataKey="submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} name="Total Attempts" />
                <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} name="Avg Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOP STUDENTS LEADERBOARD */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2 mb-4">
             <Medal className="text-yellow-500" size={24} />
             <h3 className="text-lg font-bold text-slate-800">Top Performing Students</h3>
          </div>
          
          <div className="overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3 text-right">Score</th>
                        <th className="px-4 py-3 text-right">Game</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {leaderboard.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No data available.</td></tr>
                    ) : (
                        leaderboard.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3">
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                        idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                                        idx === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-500'
                                    }`}>
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-slate-800 text-sm">{item.studentName}</p>
                                    <p className="text-xs text-slate-500">{item.className} • {item.token}</p>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-slate-700">{item.score}</td>
                                <td className="px-4 py-3 text-right text-xs text-slate-500">{item.gameId.replace('_', ' ')}</td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};