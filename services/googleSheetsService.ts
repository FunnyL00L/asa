
import { Question, Student, Score, ContentItem, ApiResponse } from '../types';

// The Google Apps Script Web App URL provided by the user
const API_URL = 'https://script.google.com/macros/s/AKfycbxAk2pn4B-LuAXW2PXQoXgwR-Oxmd07j9pl8xDEghr7snij20AFqUDgXQ3GWHvK__Mpww/exec';

export const googleSheetsService = {
  getQuestions: async (requester: string, gameId?: string): Promise<ApiResponse<Question[]>> => {
    try {
      let url = `${API_URL}?action=getQuestions&requester=${requester}`;
      if (gameId) url += `&game_id=${gameId}`;
      const res = await fetch(url);
      return await res.json();
    } catch (e) {
      console.error("API Error", e);
      return { status: 'error', message: 'Failed to fetch questions' };
    }
  },

  getStudents: async (requester: string): Promise<ApiResponse<Student[]>> => {
    try {
      const res = await fetch(`${API_URL}?action=getStudents&requester=${requester}`);
      return await res.json();
    } catch (e) {
      console.error("API Error", e);
      return { status: 'error', message: 'Failed to fetch students' };
    }
  },

  getScores: async (requester: string): Promise<ApiResponse<Score[]>> => {
    try {
      const res = await fetch(`${API_URL}?action=getScores&requester=${requester}`);
      return await res.json();
    } catch (e) {
      console.error("API Error", e);
      return { status: 'error', message: 'Failed to fetch scores' };
    }
  },

  getContents: async (requester: string): Promise<ApiResponse<ContentItem[]>> => {
    try {
      const res = await fetch(`${API_URL}?action=getContents&requester=${requester}`);
      return await res.json();
    } catch (e) {
      console.error("API Error", e);
      return { status: 'error', message: 'Failed to fetch content' };
    }
  },

  saveQuestion: async (q: Question): Promise<ApiResponse<null>> => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'adminSaveQuestion', ...q })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to save question' };
    }
  },

  deleteQuestion: async (id: string, owner: string): Promise<ApiResponse<null>> => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'adminDeleteQuestion', id, owner })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to delete question' };
    }
  },

  addStudent: async (name: string, className: string, owner: string): Promise<ApiResponse<Student>> => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'adminAddStudent', name, class_name: className, owner })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to add student' };
    }
  },

  updateStudent: async (id: string, name: string, className: string, owner: string): Promise<ApiResponse<null>> => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'adminUpdateStudent', id, name, class_name: className, owner })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to update student' };
    }
  },

  deleteStudent: async (id: string, owner: string): Promise<ApiResponse<null>> => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'adminDeleteStudent', id, owner })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to delete student' };
    }
  },

  deleteScore: async (id: string, owner: string): Promise<ApiResponse<null>> => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'adminDeleteScore', id, owner })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to delete score' };
    }
  },

  // NEW: Save Content with File Support
  // We extend the payload to include fileData (base64)
  saveContent: async (content: ContentItem, fileData?: string): Promise<ApiResponse<null>> => {
    try {
      const payload = { 
        action: 'adminSaveContent', 
        ...content,
        fileData: fileData // Pass base64 data to backend if a new file is uploaded
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to save content' };
    }
  },

  deleteContent: async (id: string, owner: string): Promise<ApiResponse<null>> => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'adminDeleteContent', id, owner })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to delete content' };
    }
  },

  getDescription: async (requester: string): Promise<ApiResponse<{ yuda: string; sarco: string }>> => {
    try {
      const res = await fetch(`${API_URL}?action=getDescription&requester=${requester}`);
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to fetch description' };
    }
  },

  saveDescription: async (owner: string, text: string): Promise<ApiResponse<null>> => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'adminSaveDescription', owner, description: text })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to save description' };
    }
  }
};
