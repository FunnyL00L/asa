import { Question, Student, Score, ApiResponse } from '../types';

// The Google Apps Script Web App URL provided by the user
const API_URL = 'https://script.google.com/macros/s/AKfycbw0Nb3b4_u7ZWhwiWMSLNWz0Gux5GnvEQ76xoVYyyl6ra2nYF3aFdSOvU7Qi6Vx_TOwFw/exec';

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

  // Using POST with text/plain (default fetch behavior for strings) prevents CORS Preflight issues on GAS
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
  }
};