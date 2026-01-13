import React from 'react';
import { Copy } from 'lucide-react';

export const IntegrationHelp: React.FC = () => {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxD0MNryYITSoi7MxJHHcFsQWk0qeoj9_9azSBtJOuupGKMrDYRiJF9loTTes8jwNn9ng/exec";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Integration Guide</h2>
        <p className="text-slate-500 mt-1">How to connect your Unity Game to this Backend.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">API Endpoint</h3>
        <p className="text-slate-600 mb-2">Use this URL in your Unity C# Scripts:</p>
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
        <h3 className="text-xl font-bold text-slate-800 mb-4">Unity C# Example</h3>
        <p className="text-slate-600 mb-4">Copy this into your Unity Project to communicate with the sheet.</p>
        
        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-blue-300 font-mono">
{`// Unity C# Example Usage
GASConnector connector = GetComponent<GASConnector>();

// The URL is already set in your code or inspector to:
// ${GAS_URL}

// 1. Login Student
connector.Login("X7K9P2", (json) => {
    Debug.Log("User Data: " + json);
});

// 2. Get Questions (Use "YUDA_AR" or "SARCO_AR")
connector.GetQuestions("YUDA_AR", (json) => {
    Debug.Log("Questions: " + json);
});

// 3. Submit Score
connector.SubmitScore("X7K9P2", 1500, "YUDA_AR", (res) => {
    Debug.Log("Result: " + res);
});`}
          </pre>
        </div>
      </div>
    </div>
  );
};