import { Question, Student, Score, GameId, ApiResponse } from '../types';

// Initial Mock Data with Owners
let mockQuestions: Question[] = [
  { id: '1', question: 'What is 2+2?', optionA: '3', optionB: '4', optionC: '5', optionD: '6', correctAnswer: 'B', material: 'Math', points: 10, gameId: GameId.YUDA_AR, owner: 'YudaAR' },
  { id: '2', question: 'Capital of Japan?', optionA: 'Seoul', optionB: 'Beijing', optionC: 'Tokyo', optionD: 'Bangkok', correctAnswer: 'C', material: 'Geography', points: 20, gameId: GameId.SARCO_AR, owner: 'SarcoAR' },
  { id: '3', question: 'Unity uses which language?', optionA: 'Java', optionB: 'C#', optionC: 'Python', optionD: 'C++', correctAnswer: 'B', material: 'Programming', points: 15, gameId: GameId.YUDA_AR, owner: 'YudaAR' },
];

let mockStudents: Student[] = [
  { id: '1', name: 'John Doe', token: 'X7K9P2', class: '10-A', owner: 'YudaAR' },
  { id: '2', name: 'Jane Smith', token: 'M2N4B1', class: '10-B', owner: 'SarcoAR' },
  { id: '3', name: 'Budi Santoso', token: 'TOKEN3', class: '10-A', owner: 'YudaAR' },
];

let mockScores: Score[] = [
  { id: '1', token: 'X7K9P2', score: 100, gameId: GameId.YUDA_AR, timestamp: new Date().toISOString(), owner: 'YudaAR' },
  { id: '2', token: 'M2N4B1', score: 85, gameId: GameId.YUDA_AR, timestamp: new Date().toISOString(), owner: 'YudaAR' },
  { id: '3', token: 'M2N4B1', score: 90, gameId: GameId.SARCO_AR, timestamp: new Date().toISOString(), owner: 'SarcoAR' },
  { id: '4', token: 'TOKEN3', score: 150, gameId: GameId.YUDA_AR, timestamp: new Date().toISOString(), owner: 'YudaAR' },
];

export const mockService = {
  getQuestions: async (): Promise<ApiResponse<Question[]>> => {
    return new Promise((resolve) => setTimeout(() => resolve({ status: 'success', data: [...mockQuestions] }), 500));
  },

  saveQuestion: async (q: Question): Promise<ApiResponse<null>> => {
    return new Promise((resolve) => {
      const index = mockQuestions.findIndex(x => x.id === q.id);
      if (index >= 0) {
        mockQuestions[index] = q;
      } else {
        mockQuestions.push(q);
      }
      setTimeout(() => resolve({ status: 'success' }), 500);
    });
  },

  deleteQuestion: async (id: string): Promise<ApiResponse<null>> => {
    return new Promise((resolve) => {
      mockQuestions = mockQuestions.filter(q => q.id !== id);
      setTimeout(() => resolve({ status: 'success' }), 500);
    });
  },

  getStudents: async (): Promise<ApiResponse<Student[]>> => {
    return new Promise((resolve) => setTimeout(() => resolve({ status: 'success', data: [...mockStudents] }), 500));
  },

  addStudent: async (name: string, className: string, owner: string): Promise<ApiResponse<Student>> => {
    return new Promise((resolve) => {
      const token = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newStudent: Student = {
        id: Date.now().toString(),
        name,
        class: className,
        token,
        owner
      };
      mockStudents.push(newStudent);
      setTimeout(() => resolve({ status: 'success', data: newStudent }), 500);
    });
  },

  getScores: async (): Promise<ApiResponse<Score[]>> => {
    return new Promise((resolve) => setTimeout(() => resolve({ status: 'success', data: [...mockScores] }), 500));
  }
};