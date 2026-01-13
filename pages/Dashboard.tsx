import React from 'react';
import { Users, FileQuestion, Trophy, Activity, Medal, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Student, Question, Score, GameId, User } from '../types';

interface DashboardProps {
  students: Student[];
  questions: Question[];
  scores: Score[];
  currentUser: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ students, questions, scores, currentUser }) => {
  // Calculations
  const highestScore = scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0;
  
  // Unique students who played
  const uniqueParticipants = new Set(scores.map(s => s.token)).size;

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-100' },
    { label: 'Total Questions', value: questions.length, icon: FileQuestion, color: 'text-purple-500', bg: 'bg-purple-100' },
    { label: 'Students Participated', value: uniqueParticipants, icon: Activity, color: 'text-green-500', bg: 'bg-green-100' },
    { label: 'Score Tertinggi', value: highestScore, icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  ];

  // Prepare chart data
  const yudaScores = scores.filter(s => s.gameId === GameId.YUDA_AR);
  const sarcoScores = scores.filter(s => s.gameId === GameId.SARCO_AR);
  
  let chartData = [
    { name: 'Yuda AR', submissions: yudaScores.length, avg: yudaScores.length ? Math.round(yudaScores.reduce((a,b) => a+b.score, 0)/yudaScores.length) : 0 },
    { name: 'Sarco AR', submissions: sarcoScores.length, avg: sarcoScores.length ? Math.round(sarcoScores.reduce((a,b) => a+b.score, 0)/sarcoScores.length) : 0 },
  ];

  // PRIVACY FILTER for Charts
  if (currentUser.username === 'YudaAR') {
    chartData = chartData.filter(d => d.name === 'Yuda AR');
  } else if (currentUser.username === 'SarcoAR') {
    chartData = chartData.filter(d => d.name === 'Sarco AR');
  }

  // LEADERBOARD LOGIC
  const leaderboard = scores
    .sort((a, b) => b.score - a.score) // Sort descending
    .slice(0, 5) // Take top 5
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
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Dashboard Overview</h2>
        <p className="text-slate-500 mt-1">Real-time data from your Google Sheets Database.</p>
      </div>

      {/* STATS CARDS */}
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

      {/* SUPER ADMIN: ADMIN CONTRIBUTION STATS */}
      {currentUser.role === 'SUPER_ADMIN' && (
        <div className="bg-slate-900 rounded-xl p-6 shadow-lg text-white">
            <div className="flex items-center space-x-2 mb-4">
                <Shield className="text-blue-400" size={24}/>
                <h3 className="text-lg font-bold">Admin Contributions (Super Admin View)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {adminStats.map((stat, idx) => (
                    <div key={idx} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <h4 className="font-bold text-lg text-blue-300 mb-2">{stat.name}</h4>
                        <div className="flex justify-between text-sm text-slate-300">
                            <span>Students Created:</span>
                            <span className="font-bold text-white">{stat.students}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-300 mt-1">
                            <span>Questions Created:</span>
                            <span className="font-bold text-white">{stat.questions}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

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