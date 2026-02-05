
export enum GameId {
  YUDA_AR = 'YUDA_AR',
  SARCO_AR = 'SARCO_AR'
}

export type UserRole = 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  username: string;
  role: UserRole;
  name: string;
}

export interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // 'A', 'B', 'C', 'D'
  material: string;
  points: number; // Added Points
  gameId: GameId;
  owner: string; // The username of the admin who created this
}

export interface Student {
  id: string;
  name: string;
  token: string;
  class: string;
  owner: string; // The username of the admin who created this
}

export interface Score {
  id: string;
  token: string;
  score: number;
  gameId: string;
  timestamp: string;
  owner: string; // Derived from the student's owner
}

export interface ContentItem {
  id: string;
  title: string;
  location: string;
  body: string;
  fileUrl: string; // Stores the Google Drive Download Link
  fileName: string; // Stores "document.pdf" etc.
  fileType: string; // 'application/pdf', 'image/png', etc.
  date: string;
  owner: string;
}

export interface AdminUser {
  username: string;
}

// Response structure from GAS
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}
