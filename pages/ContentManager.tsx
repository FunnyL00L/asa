import React, { useState, useEffect, useRef } from 'react';
import { User, ContentItem } from '../types';
import { Save, FileText, Plus, Trash2, Edit, Loader2, Info, MapPin, Upload, File, FileDown, ExternalLink } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { googleSheetsService } from '../services/googleSheetsService';

interface ContentManagerProps {
  currentUser: User;
}

export const ContentManager: React.FC<ContentManagerProps> = ({ currentUser }) => {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentId, setCurrentId] = useState<string>('');
  
  // Fields
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [body, setBody] = useState('');
  
  // File State
  const [fileUrl, setFileUrl] = useState(''); // Stores the Drive Link
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileBase64, setFileBase64] = useState<string | undefined>(undefined); // Temporary for upload
  
  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedOwner, setSelectedOwner] = useState(
    currentUser.role === 'SUPER_ADMIN' ? 'YudaAR' : currentUser.username
  );

  const { showToast } = useToast();

  useEffect(() => {
    loadContent();
  }, [currentUser]);

  const loadContent = async () => {
    setIsLoading(true);
    try {
        const res = await googleSheetsService.getContents(currentUser.username);
        if (res.status === 'success' && res.data) {
            setContents(res.data);
        } else {
            showToast('Failed to load contents', 'error');
        }
    } catch (e) {
        showToast('Network error loading contents', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  // --- LOGIC BATASAN KONTEN (MAX 1 PER OWNER) ---
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const hasYudaContent = contents.some(c => c.owner === 'YudaAR');
  const hasSarcoContent = contents.some(c => c.owner === 'SarcoAR');

  // Tombol Add hanya muncul jika:
  // 1. Super Admin: Salah satu dari Yuda atau Sarco belum punya konten.
  // 2. Admin Biasa: Belum punya konten sama sekali (length 0).
  const canAdd = isSuperAdmin 
    ? (!hasYudaContent || !hasSarcoContent)
    : contents.length === 0;

  const handleAddNew = () => {
      setCurrentId('');
      setTitle('');
      setLocation('');
      setBody('');
      setFileUrl('');
      setFileName('');
      setFileType('');
      setFileBase64(undefined);
      
      // Smart Default for Super Admin:
      // If Yuda exists but Sarco is missing, default to Sarco.
      if (isSuperAdmin) {
        if (hasYudaContent && !hasSarcoContent) {
            setSelectedOwner('SarcoAR');
        } else {
            setSelectedOwner('YudaAR');
        }
      } else {
        setSelectedOwner(currentUser.username);
      }
      
      setIsFormVisible(true);
  };

  const handleEdit = (item: ContentItem) => {
      setCurrentId(item.id);
      setTitle(item.title);
      setLocation(item.location || '');
      setBody(item.body);
      setFileUrl(item.fileUrl || '');
      setFileName(item.fileName || '');
      setFileType(item.fileType || '');
      setFileBase64(undefined); // Reset new file
      setSelectedOwner(item.owner);
      setIsFormVisible(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB Limit
          showToast('File too large. Max size is 5MB.', 'error');
          return;
      }

      setFileName(file.name);
      setFileType(file.type);

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFileBase64(base64);
        showToast('File ready for upload.', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const ownerToUse = currentUser.role === 'SUPER_ADMIN' ? selectedOwner : currentUser.username;

    const contentPayload: ContentItem = {
      id: currentId || Date.now().toString(),
      title,
      location,
      body,
      fileUrl: fileUrl, // Will be updated by backend if fileBase64 is present
      fileName: fileName,
      fileType: fileType,
      date: new Date().toISOString(),
      owner: ownerToUse
    };

    try {
        // Pass fileBase64 separately so service can handle payload construction
        const res = await googleSheetsService.saveContent(contentPayload, fileBase64);
        if (res.status === 'success') {
            showToast(currentId ? 'Updated successfully' : 'Created & Uploaded successfully', 'success');
            setIsFormVisible(false);
            loadContent();
        } else {
            throw new Error(res.message);
        }
    } catch (error: any) {
        showToast(error.message || 'Failed to save', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, owner: string) => {
    if (!confirm("Are you sure you want to delete this content item?")) return;

    try {
        const res = await googleSheetsService.deleteContent(id, owner);
        if (res.status === 'success') {
            showToast('Content deleted', 'info');
            loadContent();
        } else {
            throw new Error(res.message);
        }
    } catch (error) {
        showToast('Failed to delete', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Content List Manager</h2>
          <p className="text-slate-500 mt-1">
            Manage information, locations, and downloadable files (PDF/PPT).
          </p>
        </div>
        {/* HANYA TAMPILKAN TOMBOL JIKA MEMENUHI SYARAT (MAX 1 PER OWNER) */}
        {!isFormVisible && canAdd && (
            <button
            onClick={handleAddNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-md shadow-indigo-500/30"
            >
            <Plus size={18} />
            <span>Add New Entry</span>
            </button>
        )}
      </div>

      {/* INPUT FORM */}
      {isFormVisible && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="text-indigo-600" />
                {currentId ? 'Edit Content' : 'New Content Entry'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
                
                {currentUser.role === 'SUPER_ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Database (Game)</label>
                    <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                        value={selectedOwner}
                        onChange={(e) => setSelectedOwner(e.target.value)}
                    >
                        {/* 
                            Logic Dropdown Super Admin:
                            Saat 'Edit', tampilkan semua opsi.
                            Saat 'New', sembunyikan opsi yang sudah ada datanya.
                        */}
                        {currentId ? (
                            <>
                                <option value="YudaAR">Yuda AR</option>
                                <option value="SarcoAR">Sarco AR</option>
                            </>
                        ) : (
                            <>
                                {!hasYudaContent && <option value="YudaAR">Yuda AR</option>}
                                {!hasSarcoContent && <option value="SarcoAR">Sarco AR</option>}
                            </>
                        )}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Judul (Title)</label>
                        <input 
                            type="text" 
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Modul Pembelajaran 1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi (Alamat)</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                required
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. Jl. Merdeka No. 10"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                    <textarea 
                        required
                        rows={4}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-sans text-sm"
                        placeholder="Deskripsi file atau informasi..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Upload File (PDF / PPT / Image)</label>
                    <div className="flex items-center space-x-4 border border-slate-300 rounded-lg p-4 bg-slate-50">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-16 h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors shadow-sm"
                        >
                           <Upload className="text-indigo-500" size={24} />
                        </div>
                        <div className="flex-1">
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden"
                                accept=".pdf, .ppt, .pptx, .doc, .docx, .png, .jpg, .jpeg"
                                onChange={handleFileChange}
                            />
                            {fileName ? (
                                <div className="flex items-center space-x-2">
                                     <File className="text-slate-500" size={16} />
                                     <span className="font-medium text-slate-800 break-all">{fileName}</span>
                                     {fileBase64 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Ready to Upload</span>}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">No file selected. Click the upload icon.</p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">Accepted: PDF, PPT, Word, Images (Max 5MB)</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-2">
                    <button 
                        type="button"
                        onClick={() => setIsFormVisible(false)}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 font-medium disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                        <span>{fileBase64 ? 'Upload & Save' : 'Save Changes'}</span>
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* CONTENT LIST */}
      {isLoading ? (
          <div className="flex justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin" size={32} />
          </div>
      ) : (
        <div className="space-y-4">
            {contents.length === 0 && !isFormVisible && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <Info className="mx-auto text-slate-300 mb-2" size={48} />
                    <p className="text-slate-500">No content found. Add one to get started.</p>
                </div>
            )}

            {contents.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group overflow-hidden">
                    <div className="p-5 flex flex-col md:flex-row gap-5">
                        {/* File Icon / Type Indicator */}
                        <div className="shrink-0 flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-xl border border-slate-200">
                             {item.fileType?.includes('pdf') ? (
                                 <FileText className="text-red-500" size={32} />
                             ) : item.fileType?.includes('presentation') || item.fileName?.endsWith('ppt') || item.fileName?.endsWith('pptx') ? (
                                 <File className="text-orange-500" size={32} />
                             ) : item.fileType?.includes('image') ? (
                                 <div className="w-full h-full relative">
                                    <img src={item.fileUrl} alt="Thumbnail" className="w-full h-full object-cover rounded-xl" onError={(e) => e.currentTarget.style.display = 'none'} />
                                 </div>
                             ) : (
                                 <File className="text-slate-400" size={32} />
                             )}
                        </div>

                        {/* Content Info */}
                        <div className="flex-1 space-y-1">
                             <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                        {item.location && (
                                            <span className="flex items-center gap-1">
                                                <MapPin size={14} className="text-indigo-500" />
                                                {item.location}
                                            </span>
                                        )}
                                        {currentUser.role === 'SUPER_ADMIN' && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                                item.owner === 'YudaAR' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                            }`}>
                                                {item.owner}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex space-x-1">
                                    <button 
                                        onClick={() => handleEdit(item)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(item.id, item.owner)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                             </div>

                             <p className="text-slate-600 text-sm py-2">
                                {item.body}
                             </p>

                             {/* Download / File Link */}
                             {item.fileUrl && (
                                 <div className="pt-2 flex items-center">
                                     <a 
                                        href={item.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center space-x-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                     >
                                         <FileDown size={16} />
                                         <span>Download {item.fileName ? item.fileName : 'File'}</span>
                                         <ExternalLink size={12} className="ml-1 opacity-50" />
                                     </a>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};