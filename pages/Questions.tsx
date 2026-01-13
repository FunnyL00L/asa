import React, { useState } from 'react';
import { Question, GameId, User } from '../types';
import { googleSheetsService } from '../services/googleSheetsService';
import { Plus, Edit2, Trash2, UserCircle, Star, AlertTriangle, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface QuestionsProps {
  questions: Question[];
  refreshData: () => void;
  currentUser: User;
}

const emptyQuestion = (owner: string): Question => ({
  id: '',
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: 'A',
  material: '',
  points: 10, // Default Points
  gameId: GameId.YUDA_AR,
  owner: owner
});

export const Questions: React.FC<QuestionsProps> = ({ questions, refreshData, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question>(emptyQuestion(currentUser.username));
  const [loading, setLoading] = useState(false);
  const [filterGame, setFilterGame] = useState<string>('ALL');
  
  // State for Delete Modal
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  
  const { showToast } = useToast();

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const handleEdit = (q: Question) => {
    setEditingQuestion(q);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    // Determine default game based on user login
    let defaultGame = GameId.YUDA_AR;
    if (currentUser.username === 'SarcoAR') {
        defaultGame = GameId.SARCO_AR;
    }

    setEditingQuestion({ 
        ...emptyQuestion(currentUser.username), 
        id: Date.now().toString(),
        gameId: defaultGame
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (q: Question) => {
    setQuestionToDelete(q);
  };

  const cancelDelete = () => {
    setQuestionToDelete(null);
  }

  const executeDelete = async () => {
    if (!questionToDelete) return;

    setIsDeleteLoading(true);
    showToast('Processing deletion...', 'info');

    try {
        const res = await googleSheetsService.deleteQuestion(questionToDelete.id);
        if (res.status === 'success') {
            showToast('Question deleted successfully.', 'success');
            refreshData(); // Refresh list
            setQuestionToDelete(null); // Close modal
        } else {
            throw new Error(res.message || "Unknown error");
        }
    } catch (error) {
        console.error(error);
        showToast('Failed to delete question. Try checking the Sheet connection.', 'error');
    } finally {
        setIsDeleteLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure owner is set correctly even if edited
      const qToSave = { ...editingQuestion, owner: editingQuestion.owner || currentUser.username };
      const res = await googleSheetsService.saveQuestion(qToSave);
      
      if (res.status === 'success') {
          showToast('Question saved successfully!', 'success');
          setIsModalOpen(false);
          refreshData();
      } else {
          throw new Error(res.message);
      }
    } catch (error) {
      showToast('Error saving question. Please check connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = filterGame === 'ALL' 
    ? questions 
    : questions.filter(q => q.gameId === filterGame);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Question Bank</h2>
          <p className="text-slate-500 mt-1">
             {isSuperAdmin 
                ? 'Manage all questions across games.' 
                : `Manage questions for ${currentUser.username === 'SarcoAR' ? 'Sarco AR' : 'Yuda AR'}.`
             }
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-md shadow-purple-500/30"
        >
          <Plus size={18} />
          <span>Add Question</span>
        </button>
      </div>

      {/* Filter Tabs - Only Visible for Super Admin */}
      {isSuperAdmin && (
        <div className="flex space-x-2 border-b border-slate-200">
            {[
                { id: 'ALL', label: 'All Games' },
                { id: GameId.YUDA_AR, label: 'Yuda AR' },
                { id: GameId.SARCO_AR, label: 'Sarco AR' }
            ].map((g) => (
                <button
                    key={g.id}
                    onClick={() => setFilterGame(g.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        filterGame === g.id
                        ? 'border-purple-600 text-purple-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {g.label}
                </button>
            ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredQuestions.map((q) => (
          <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                
                {/* Only Show Game Badge for Super Admin (Clean View for Regulars) */}
                {isSuperAdmin && (
                  <span className={`text-xs font-bold px-2 py-1 rounded ${q.gameId === GameId.YUDA_AR ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {q.gameId === GameId.YUDA_AR ? 'Yuda AR' : 'Sarco AR'}
                  </span>
                )}

                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">
                    {q.material}
                </span>
                <span className="flex items-center space-x-1 text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                    <Star size={10} fill="currentColor" />
                    <span>{q.points || 10} Pts</span>
                </span>
                {currentUser.role === 'SUPER_ADMIN' && (
                    <span className="flex items-center space-x-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        <UserCircle size={10} />
                        <span>{q.owner}</span>
                    </span>
                )}
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handleEdit(q)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => confirmDelete(q)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-medium text-slate-800 mb-4">{q.question}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['A', 'B', 'C', 'D'].map((opt) => (
                <div 
                    key={opt} 
                    className={`p-3 rounded-lg border text-sm flex items-center space-x-2 ${
                        q.correctAnswer === opt 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-slate-50 border-slate-100 text-slate-600'
                    }`}
                >
                    <span className={`font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                         q.correctAnswer === opt ? 'bg-green-200' : 'bg-slate-200'
                    }`}>
                        {opt}
                    </span>
                    <span>
                        {opt === 'A' ? q.optionA : opt === 'B' ? q.optionB : opt === 'C' ? q.optionC : q.optionD}
                    </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {questionToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                    <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Delete Question?</h3>
                <p className="text-center text-slate-500 mb-6">
                    Are you sure you want to delete this question? This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                    <button 
                        onClick={cancelDelete}
                        disabled={isDeleteLoading}
                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={executeDelete}
                        disabled={isDeleteLoading}
                        className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 disabled:opacity-50 flex justify-center items-center"
                    >
                        {isDeleteLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">
                    {editingQuestion.id ? 'Edit Question' : 'New Question'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Game Version</label>
                    {isSuperAdmin ? (
                      <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                          value={editingQuestion.gameId}
                          onChange={(e) => setEditingQuestion({...editingQuestion, gameId: e.target.value as GameId})}
                      >
                          <option value={GameId.YUDA_AR}>Yuda AR</option>
                          <option value={GameId.SARCO_AR}>Sarco AR</option>
                      </select>
                    ) : (
                      <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-medium">
                        {editingQuestion.gameId === GameId.YUDA_AR ? 'Yuda AR' : 'Sarco AR'}
                      </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Material / Subject</label>
                    <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                        value={editingQuestion.material}
                        onChange={(e) => setEditingQuestion({...editingQuestion, material: e.target.value})}
                        placeholder="e.g. Algebra"
                    />
                </div>
              </div>

              {/* Added Points Input */}
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Score if Correct (Points)</label>
                  <input
                      type="number"
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                      value={editingQuestion.points}
                      onChange={(e) => setEditingQuestion({...editingQuestion, points: parseInt(e.target.value) || 0})}
                      placeholder="e.g. 10"
                  />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question Text</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <div key={opt}>
                         <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Option {opt}</label>
                         <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            value={opt === 'A' ? editingQuestion.optionA : opt === 'B' ? editingQuestion.optionB : opt === 'C' ? editingQuestion.optionC : editingQuestion.optionD}
                            onChange={(e) => {
                                const val = e.target.value;
                                if(opt === 'A') setEditingQuestion({...editingQuestion, optionA: val});
                                if(opt === 'B') setEditingQuestion({...editingQuestion, optionB: val});
                                if(opt === 'C') setEditingQuestion({...editingQuestion, optionC: val});
                                if(opt === 'D') setEditingQuestion({...editingQuestion, optionD: val});
                            }}
                        />
                    </div>
                 ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correct Answer</label>
                <div className="flex space-x-4">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                        <label key={opt} className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="correct"
                                value={opt}
                                checked={editingQuestion.correctAnswer === opt}
                                onChange={() => setEditingQuestion({...editingQuestion, correctAnswer: opt})}
                                className="text-purple-600 focus:ring-purple-500"
                            />
                            <span className="font-medium text-slate-700">{opt}</span>
                        </label>
                    ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};