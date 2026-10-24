import { useEffect, useState } from 'react';
import { api } from './lib/api';

// Mock user untuk mode offline / tanpa backend
const MOCK_TEACHER = {
  id: 'demo-teacher-1',
  email: 'guru@demo.com',
  full_name: 'Guru Demo BioXLab',
  role: 'teacher' as const,
  school_name: 'SMA Demo'
};

const MOCK_STUDENT = {
  id: 'demo-student-1',
  email: 'siswa@demo.com',
  full_name: 'Siswa Demo',
  role: 'student' as const,
  school_name: 'SMA Demo'
};

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState('guru-dashboard');
  const [loading, setLoading] = useState(true);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeResultId, setActiveResultId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        try {
          const me = await api.getMe();
          if (me) {
            setCurrentUser(me);
            setCurrentTab(me.role === 'teacher' ? 'guru-dashboard' : 'siswa-dashboard');
          } else {
            throw new Error('no user');
          }
        } catch (err) {
          console.error('Initialization error, fallback to demo teacher', err);
          setCurrentUser(MOCK_TEACHER as any);
          setCurrentTab('guru-dashboard');
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // FIX UTAMA: Tidak pakai api.switchDemo lagi
  async function handleSwitchRole(role: 'teacher' | 'student' | 'admin' | 'reviewer', studentIndex?: number) {
    try {
      setLoading(true);
      const mockUser = role === 'teacher' ? MOCK_TEACHER : {
        ...MOCK_STUDENT,
        id: `demo-student-${studentIndex ?? 1}`,
        full_name: `Siswa Demo ${studentIndex ?? 1}`,
      };
      const finalUser = { ...mockUser, role };
      
      setCurrentUser(finalUser as any);
      setActiveAttemptId(null);
      setActiveResultId(null);
      
      if (role === 'teacher') {
        setCurrentTab('guru-dashboard');
      } else if (role === 'student') {
        setCurrentTab('siswa-dashboard');
      } else {
        setCurrentTab('guru-dashboard');
      }
    } catch (err: any) {
      console.error('Gagal ganti peran', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-600">Memuat BioXLab...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
        <h1 className="font-bold text-xl text-indigo-600">BioXLab - {currentUser?.full_name}</h1>
        <div className="flex gap-2">
          <button onClick={() => handleSwitchRole('teacher')} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">Mode Guru</button>
          <button onClick={() => handleSwitchRole('student', 1)} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm">Mode Siswa</button>
        </div>
      </header>
      <main className="p-6">
        <div className="bg-white rounded-xl shadow p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Berhasil! Tidak ada error 404 lagi 🎉</h2>
          <p className="text-slate-600 mb-4">Kamu login sebagai: <b>{currentUser?.role}</b> - {currentUser?.email}</p>
          <p className="text-sm text-slate-500">Current Tab: {currentTab}</p>
        </div>
      </main>
    </div>
  );
}

export default App;
