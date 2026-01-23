import React from 'react';
import { Copy, Code2 } from 'lucide-react';

export const IntegrationHelp: React.FC = () => {
  // URL Updated to the one provided by user
  const GAS_URL = "https://script.google.com/macros/s/AKfycbz2_t1jUYLHEZXC1fJaOowYgTXS-idwwqU2Xt2h85WcVT9A7INkfFjcxjZv8sVnfDbw1A/exec";

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Integration Guide</h2>
        <p className="text-slate-500 mt-1">Panduan menghubungkan Aplikasi Client (Unity/Web) dengan Backend.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">API Endpoint</h3>
        <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between border border-slate-300">
            <code className="text-blue-600 font-mono text-sm break-all">{GAS_URL}</code>
            <button 
                onClick={() => navigator.clipboard.writeText(GAS_URL)} 
                className="ml-4 p-2 text-slate-400 hover:text-blue-600"
                title="Copy URL"
            >
                <Copy size={20} />
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Implementation Code (TypeScript / JS)</h3>
        <p className="text-slate-600 mb-4">
            Salin kode berikut ke file <code>api.ts</code> di project Anda. Kode ini menangani Login, Pengambilan Soal, dan Upload Nilai.
        </p>

        <div className="bg-slate-900 text-slate-300 p-4 rounded-lg overflow-x-auto border border-slate-700">
            <pre className="text-xs font-mono leading-relaxed">
{`// api.ts
import { QuizQuestion, StudentData } from "../types"; // Sesuaikan path types Anda

const API_URL = "${GAS_URL}";
const DEFAULT_GAME_ID = "YUDA_AR";

// 1. LOGIN & VALIDASI TOKEN
export const validateTokenAPI = async (token: string): Promise<StudentData> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "login", token: token })
        });
        
        if (!response.ok) throw new Error(\`HTTP Error: \${response.status}\`);

        const data = await response.json();
        
        if (data.status === 'error' || data.result === 'error') {
             throw new Error(data.message || "Token tidak valid");
        }

        const name = data.name || data.nama || data.studentName;
        if (!name) throw new Error("Data siswa tidak ditemukan");

        // Logic determinasi Game ID berdasarkan 'owner'
        let gameId = DEFAULT_GAME_ID;
        if (data.owner) {
            if (data.owner.toLowerCase().includes('sarco')) {
                gameId = "SARCO_AR";
            } else if (data.owner.toLowerCase().includes('yuda')) {
                gameId = "YUDA_AR";
            }
        }

        return {
            name: name,
            token: token,
            className: data.className || data.class || data.kelas || "-",
            gameId: gameId
        };
    } catch (error: any) {
        console.error("Login Error:", error);
        throw new Error(error.message || "Gagal menghubungkan ke server");
    }
};

// 2. AMBIL SOAL (GET QUESTIONS)
export const getQuestionsAPI = async (gameId: string = DEFAULT_GAME_ID): Promise<QuizQuestion[]> => {
    try {
        const response = await fetch(\`\${API_URL}?action=getQuestions&game_id=\${gameId}\`);
        if (!response.ok) throw new Error("Gagal mengambil soal");
        
        const data = await response.json();
        
        // API mengembalikan array di 'questions' atau 'data'
        const rawQuestions = Array.isArray(data) ? data : (data.questions || data.items || []);

        if (rawQuestions.length === 0) throw new Error("Tidak ada soal tersedia");

        return rawQuestions.map((q: any, index: number) => ({
            id: q.id || index + 1,
            question: q.question || q.text || "Pertanyaan error",
            options: (Array.isArray(q.options) ? q.options : []).map((opt: any, idx: number) => {
                const isObject = typeof opt === 'object' && opt !== null;
                return {
                    id: ["A", "B", "C", "D"][idx] || String(idx),
                    text: isObject ? (opt.text || opt.label || opt.answer) : String(opt),
                    isCorrect: isObject ? (opt.isCorrect === true || opt.isCorrect === "true") : false
                };
            })
        }));
    } catch (error: any) {
        console.error("Get Questions Error:", error);
        throw new Error(error.message || "Gagal memuat soal");
    }
};

// 3. KIRIM NILAI (SUBMIT SCORE)
export const submitScoreAPI = async (token: string, score: number, gameId: string = DEFAULT_GAME_ID): Promise<any> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: "submitScore",
                token: token,
                score: score,
                game_id: gameId
            })
        });

        try {
            return await response.json();
        } catch {
            return { status: "success", message: "Score submitted (No JSON response)" };
        }
    } catch (error) {
        console.error("Submit Score Error:", error);
        return { status: "error", message: "Failed to submit" };
    }
};`}
            </pre>
        </div>
      </div>
    </div>
  );
};