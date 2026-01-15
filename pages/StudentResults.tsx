import React, { useState } from 'react';
import { Score, Student, User } from '../types';
import { Search, Trash2, Calendar, Gamepad2, UserCircle, AlertTriangle } from 'lucide-react';
import { googleSheetsService } from '../services/googleSheetsService';
import { useToast } from '../context/ToastContext';

interface StudentResultsProps {
  scores: Score[];
  students: Student[];
  refreshData: () => void;
  currentUser: User;
}

export const StudentResults: React.FC<StudentResultsProps> = ({ scores, students, refreshData, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreToDelete, setScoreToDelete] = useState<Score | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  // Combine Scores with Student Data
  const combinedData = scores.map(score => {
    const student = students.find(s => s.token === score.token);
    return {
      ...score,
      studentName: student ? student.name : 'Unknown Student',
      studentClass: student ? student.class : 'Unknown Class',
      // Format timestamp nicely
      formattedDate: new Date(score.timestamp).toLocaleString('id-ID', {
         dateStyle: 'medium', timeStyle: 'short'
      })
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Newest first

  // Filter Logic
  const filteredData = combinedData.filter(item => 
    item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.studentClass.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const confirmDelete = (score: Score) => {
    setScoreToDelete(score);
  };

  const handleDelete = async () => {
    if (!scoreToDelete) return;
    setIsDeleting(true);
    try {
        // Need to pass owner so backend knows which sheet
        const res = await googleSheetsService.deleteScore(scoreToDelete.id, scoreToDelete.owner);
        if (res.status === 'success') {
            showToast('Score record deleted', 'success');
            refreshData();
            setScoreToDelete(null);
        } else {
            throw new Error(res.message);
        }
    } catch (e) {
        showToast('Failed to delete score', 'error');
    } finally {
        setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Score History</h2>
          <p className="text-slate-500 mt-1">
            {currentUser.role === 'SUPER_ADMIN' 
                ? 'View all results from Yuda AR & Sarco AR.' 
                : `View results for ${currentUser.username}.`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center space-x-3">
            <Search className="text-slate-400" size={20}/>
            <input 
                type="text" 
                placeholder="Search by student name, token, or class..." 
                className="bg-transparent border-none focus:ring-0 w-full text-slate-700 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Token</th>
                    {currentUser.role === 'SUPER_ADMIN' && <th className="px-6 py-4">Owner</th>}
                    <th className="px-6 py-4">Game</th>
                    <th className="px-6 py-4 text-right">Score</th>
                    <th className="px-6 py-4 text-center">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                    <tr>
                        <td colSpan={currentUser.role === 'SUPER_ADMIN' ? 8 : 7} className="px-6 py-8 text-center text-slate-400">
                            No results found.
                        </td>
                    </tr>
                ) : (
                    filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-500 flex items-center gap-2">
                            <Calendar size={14} />
                            {row.formattedDate}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">{row.studentName}</td>
                        <td className="px-6 py-4 text-slate-600">{row.studentClass}</td>
                        <td className="px-6 py-4">
                            <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                                {row.token}
                            </span>
                        </td>
                        {currentUser.role === 'SUPER_ADMIN' && (
                             <td className="px-6 py-4">
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                    {row.owner || 'N/A'}
                                </span>
                             </td>
                        )}
                        <td className="px-6 py-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 w-fit ${row.gameId === 'YUDA_AR' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                <Gamepad2 size={12}/>
                                {row.gameId === 'YUDA_AR' ? 'Yuda AR' : 'Sarco AR'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-lg text-slate-700">
                            {row.score}
                        </td>
                        <td className="px-6 py-4 text-center">
                            <button 
                                onClick={() => confirmDelete(row)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Record"
                            >
                                <Trash2 size={18} />
                            </button>
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {scoreToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                    <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Delete Score?</h3>
                <p className="text-center text-slate-500 mb-6">
                    Are you sure you want to delete this score record?
                </p>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setScoreToDelete(null)}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 disabled:opacity-50 flex justify-center items-center"
                    >
                        {isDeleting ? '...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};