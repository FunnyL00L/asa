import { Question, Student, Score, ApiResponse } from '../types';

// The Google Apps Script Web App URL provided by the user
const API_URL = 'https://script.google.com/macros/s/AKfycbxD0MNryYITSoi7MxJHHcFsQWk0qeoj9_9azSBtJOuupGKMrDYRiJF9loTTes8jwNn9ng/exec';

export const googleSheetsService = {
  getQuestions: async (): Promise<ApiResponse<Question[]>> => {
    try {
      const res = await fetch(`${API_URL}?action=getQuestions`);
      return await res.json();
    } catch (e) {
      console.error("API Error", e);
      return { status: 'error', message: 'Failed to fetch questions' };
    }
  },

  getStudents: async (): Promise<ApiResponse<Student[]>> => {
    try {
      const res = await fetch(`${API_URL}?action=getStudents`);
      return await res.json();
    } catch (e) {
      console.error("API Error", e);
      return { status: 'error', message: 'Failed to fetch students' };
    }
  },

  getScores: async (): Promise<ApiResponse<Score[]>> => {
    try {
      const res = await fetch(`${API_URL}?action=getScores`);
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

  deleteQuestion: async (id: string): Promise<ApiResponse<null>> => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'adminDeleteQuestion', id })
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

  deleteStudent: async (id: string): Promise<ApiResponse<null>> => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'adminDeleteStudent', id })
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Failed to delete student' };
    }
  }
};