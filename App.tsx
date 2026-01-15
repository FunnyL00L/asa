import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Questions } from './pages/Questions';
import { Login } from './pages/Login';
import { IntegrationHelp } from './pages/IntegrationHelp';
import { StudentResults } from './pages/StudentResults';
import { googleSheetsService } from './services/googleSheetsService';
import { Student, Question, Score, User } from './types';
import { ToastContainer } from './components/ToastContainer';
import { MobileBlocker } from './components/MobileBlocker';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  
  // Loading State
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Application Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scores, setScores] = useState<Score[]>([]);

  // Ref to track active fetch requests to prevent overlapping/stacking
  const isFetchingRef = useRef(false);

  // 1. Mobile Detection Logic
  useEffect(() => {
    const checkScreenSize = () => {
      // Check if width is less than 1024px (Tablets Portrait & Mobile)
      setIsMobile(window.innerWidth < 1024);
    };

    // Run on mount
    checkScreenSize();

    // Run on resize
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    loadData(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStudents([]);
    setQuestions([]);
    setScores([]);
    setProgress(0);
  };

  const loadData = async (user: User, isBackgroundRefresh = false) => {
    let timer: ReturnType<typeof setInterval> | undefined;

    if (!isBackgroundRefresh) {
      setLoading(true);
      setProgress(10); 
      timer = setInterval(() => {
        setProgress((old) => {
          if (old >= 90) return old;
          return old + Math.random() * 5; 
        });
      }, 200);
    }

    try {
      const [sData, qData, scData] = await Promise.all([
        googleSheetsService.getStudents(user.username),
        googleSheetsService.getQuestions(user.username),
        googleSheetsService.getScores(user.username)
      ]);
      
      const fetchedStudents = sData.data || [];
      const fetchedQuestions = qData.data || [];
      const fetchedScores = scData.data || [];

      // Note: React will re-render here. 
      // For high-frequency polling, strict equality checks on data might be needed 
      // if performance degrades, but for now this ensures real-time updates.
      setStudents(fetchedStudents);
      setQuestions(fetchedQuestions);
      setScores(fetchedScores);
      
    } catch (e) {
      console.error("Failed to load data", e);
      if (!isBackgroundRefresh) {
        alert("Could not connect to Google Sheets. Check your internet or API URL.");
      }
    } finally {
      if (!isBackgroundRefresh) {
        if (timer) clearInterval(timer);
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    }
  };

  // 2. Auto-Refresh Logic (0.5s Interval)
  // We use a ref to ensure we don't start a new request if the previous one is still pending.
  // This prevents "Extreme Load" and browser hanging if the API is slow.
  useEffect(() => {
    if (!currentUser) return;

    const intervalId = setInterval(async () => {
      // Guard: If fetch is in progress, skip this tick
      if (isFetchingRef.current) return;
      
      // Guard: If tab is hidden, skip to save resources
      if (document.hidden) return;

      isFetchingRef.current = true;
      try {
        await loadData(currentUser, true);
      } catch (error) {
        // Silent catch for background refresh
        console.warn("Background refresh skipped");
      } finally {
        isFetchingRef.current = false;
      }
    }, 500); // 0.5 Seconds

    return () => clearInterval(intervalId);
  }, [currentUser]); // Re-initialize when user logs in

  // 3. Immediate Block if Mobile
  if (isMobile) {
    return <MobileBlocker />;
  }

  if (!currentUser) {
    return (
      <>
        <ToastContainer />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <ToastContainer />
      
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white">
          <div className="w-64 space-y-4 text-center">
            <h2 className="text-xl font-bold tracking-wider animate-pulse">CONNECTING TO DATABASE</h2>
            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Fetching isolated data for {currentUser.username}...
            </p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          <Sidebar 
            currentPage={currentPage} 
            setPage={setCurrentPage} 
            onLogout={handleLogout}
            currentUser={currentUser}
          />
          
          <main className="flex-1 ml-64 p-8">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {currentPage === 'dashboard' && (
                <Dashboard 
                  students={students} 
                  questions={questions} 
                  scores={scores} 
                  currentUser={currentUser} 
                />
              )}
              {currentPage === 'students' && (
                <Students 
                  students={students} 
                  refreshData={() => currentUser && loadData(currentUser, true)} 
                  currentUser={currentUser} 
                />
              )}
              {currentPage === 'questions' && (
                <Questions 
                  questions={questions} 
                  refreshData={() => currentUser && loadData(currentUser, true)} 
                  currentUser={currentUser} 
                />
              )}
              {currentPage === 'results' && (
                <StudentResults 
                  scores={scores} 
                  students={students}
                  refreshData={() => currentUser && loadData(currentUser, true)} 
                  currentUser={currentUser} 
                />
              )}
              {currentPage === 'integration' && <IntegrationHelp />}
            </div>
          </main>
        </>
      )}
    </div>
  );
}

export default App;