import React, { useState } from 'react';
import { Student, User } from '../types';
import { googleSheetsService } from '../services/googleSheetsService';
import { Plus, Search, Copy, Check, UserCircle, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface StudentsProps {
  students: Student[];
  refreshData: () => void;
  currentUser: User;
}

export const Students: React.FC<StudentsProps> = ({ students, refreshData, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  
  // CRITICAL FIX: Default owner selection logic
  // If Super Admin, default to YudaAR (valid DB), NEVER 'Prama' because Siswa_Prama doesn't exist.
  const [selectedOwner, setSelectedOwner] = useState(
    currentUser.role === 'SUPER_ADMIN' ? 'YudaAR' : currentUser.username
  );
  
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Delete Modal State
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const { showToast } = useToast();

  const openAddModal = () => {
    setIsEditing(false);
    setStudentName('');
    setStudentClass('');
    // RESET to a valid DB owner for Super Admin
    setSelectedOwner(currentUser.role === 'SUPER_ADMIN' ? 'YudaAR' : currentUser.username);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setIsEditing(true);
    setCurrentStudentId(s.id);
    setStudentName(s.name);
    setStudentClass(s.class);
    setSelectedOwner(s.owner);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      // CRITICAL: Determine correct owner to send to backend
      // Backend uses 'owner' to decide which sheet (Siswa_Yuda or Siswa_Sarco) to write to.
      const ownerToUse = currentUser.role === 'SUPER_ADMIN' ? selectedOwner : currentUser.username;

      if (isEditing) {
        res = await googleSheetsService.updateStudent(currentStudentId, studentName, studentClass, ownerToUse);
      } else {
        res = await googleSheetsService.addStudent(studentName, studentClass, ownerToUse);
      }

      if (res.status === 'success') {
          showToast(isEditing ? 'Student updated successfully' : `Successfully added student: ${studentName}`, 'success');
          setIsModalOpen(false);
          refreshData();
      } else {
          throw new Error(res.message);
      }
    } catch (error: any) {
      showToast(error.message || 'Operation failed. Check internet or API URL.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (s: Student) => {
    setStudentToDelete(s);
  };

  const executeDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleteLoading(true);
    try {
        // Pass owner so backend knows which sheet to delete from
        const res = await googleSheetsService.deleteStudent(studentToDelete.id, studentToDelete.owner);
        if (res.status === 'success') {
            showToast('Student deleted successfully', 'success');
            setStudentToDelete(null);
            refreshData();
        } else {
            throw new Error(res.message);
        }
    } catch (error) {
        showToast('Failed to delete student.', 'error');
    } finally {
        setIsDeleteLoading(false);
    }
  };

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    showToast('Token copied to clipboard!', 'info');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.token.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Students & Tokens</h2>
          <p className="text-slate-500 mt-1">
            {currentUser.role === 'SUPER_ADMIN' 
                ? 'Manage all students and assign them to admins.' 
                : `Manage access tokens for ${currentUser.username}.`}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-md shadow-blue-500/30"
        >
          <Plus size={18} />
          <span>Add Student</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center space-x-3">
            <Search className="text-slate-400" size={20}/>
            <input 
                type="text" 
                placeholder="Search by name, class, or token..." 
                className="bg-transparent border-none focus:ring-0 w-full text-slate-700 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Class</th>
                {currentUser.role === 'SUPER_ADMIN' && <th className="px-6 py-4">Owner</th>}
                <th className="px-6 py-4">Access Token</th>
                <th className="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                    <tr>
                        <td colSpan={currentUser.role === 'SUPER_ADMIN' ? 5 : 4} className="px-6 py-8 text-center text-slate-400">
                            No students found.
                        </td>
                    </tr>
                ) : (
                    filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-800">{student.name}</td>
                        <td className="px-6 py-4 text-slate-600">{student.class}</td>
                        {currentUser.role === 'SUPER_ADMIN' && (
                             <td className="px-6 py-4">
                                <span className="flex items-center space-x-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                                    <UserCircle size={12} />
                                    <span>{student.owner}</span>
                                </span>
                             </td>
                        )}
                        <td className="px-6 py-4">
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded border border-slate-200 tracking-widest">
                            {student.token}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                             <button 
                                onClick={() => copyToClipboard(student.token)}
                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Copy Token"
                            >
                                {copiedToken === student.token ? <Check size={18} className="text-green-500"/> : <Copy size={18} />}
                            </button>
                            <button 
                                onClick={() => openEditModal(student)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Student"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button 
                                onClick={() => confirmDelete(student)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Student"
                            >
                                <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Student' : 'Register New Student'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Ahmad Santoso"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class / Grade</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="e.g. XII IPA 1"
                />
              </div>

              {/* SUPER ADMIN ONLY: Select Owner */}
              {currentUser.role === 'SUPER_ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Assign to Game Env (Owner)</label>
                    <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedOwner}
                        onChange={(e) => setSelectedOwner(e.target.value)}
                    >
                        {/* PRAMA REMOVED - Students must be in Yuda or Sarco DB */}
                        <option value="YudaAR">YudaAR (Siswa_Yuda)</option>
                        <option value="SarcoAR">SarcoAR (Siswa_Sarco)</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Students must be assigned to a specific Game Database.</p>
                  </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (isEditing ? 'Update Student' : 'Generate Token')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                    <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Delete Student?</h3>
                <p className="text-center text-slate-500 mb-6">
                    Are you sure you want to delete <strong>{studentToDelete.name}</strong>? This will prevent them from logging in.
                </p>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setStudentToDelete(null)}
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
    </div>
  );
};