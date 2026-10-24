import React, { useEffect, useState } from 'react';
import { api } from './lib/api';
import { Header } from './components/Header';
import { MateriView } from './components/MateriView';
import { QuizListView } from './components/QuizListView';
import { QuizEngineView } from './components/QuizEngineView';
import { QuizResultView } from './components/QuizResultView';
import { AiTutorView } from './components/AiTutorView';
import { StudentAnalyticsView } from './components/StudentAnalyticsView';
import { TeacherDashboardView } from './components/TeacherDashboardView';
import { TeacherQuestionBankView } from './components/TeacherQuestionBankView';
import { TeacherEssayGradingView } from './components/TeacherEssayGradingView';
import { TeacherQuizManagerView } from './components/TeacherQuizManagerView';
import { AdminObservabilityView } from './components/AdminObservabilityView';
import { ClassRosterView } from './components/ClassRosterView';
import { EditTeacherProfileModal } from './components/EditTeacherProfileModal';
import { StaffManagementView } from './components/StaffManagementView';
import { QuizResultsDownloadView } from './components/QuizResultsDownloadView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<string>('guru-dashboard');
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [tutorContext, setTutorContext] = useState<{ topic?: string; context?: string }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [showEditTeacherModal, setShowEditTeacherModal] = useState<boolean>(false);

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      setLoading(true);
      const user = await api.getMe();
      setCurrentUser(user);
      // Selalu pastikan awal membuka aplikasi menampilkan menu Dashboard
      setCurrentTab('guru-dashboard');
    } catch (err) {
      console.error('Initialization error, fallback to demo teacher', err);
      // Fallback ke guru agar Dashboard langsung tampil
      handleSwitchRole('teacher');
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchRole(role: 'teacher' | 'student' | 'admin' | 'reviewer', studentIndex?: number) {
    try {
      setLoading(true);
      const user = await api.switchDemo(role, studentIndex);
      setCurrentUser(user);
      setActiveAttemptId(null);
      setActiveResultId(null);

      // Selalu arahkan ke menu Dashboard saat berpindah peran
      setCurrentTab('guru-dashboard');
    } catch (err: any) {
      alert(`Gagal berganti peran demo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchUser(userId: string) {
    try {
      setLoading(true);
      const user = await api.switchUser(userId);
      setCurrentUser(user);
      setActiveAttemptId(null);
      setActiveResultId(null);
      // Selalu arahkan ke menu Dashboard saat beralih akun
      setCurrentTab('guru-dashboard');
    } catch (err: any) {
      alert(`Gagal beralih akun: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartQuiz(quizId: string) {
    try {
      const res = await api.startAttempt(quizId);
      setActiveAttemptId(res.attemptId);
      setCurrentTab('active-quiz');
    } catch (err: any) {
      alert(`Gagal memulai kuis: ${err.message}`);
    }
  }

  function handleFinishQuiz(attemptId: string) {
    setActiveAttemptId(null);
    setActiveResultId(attemptId);
    setCurrentTab('quiz-result');
  }

  function handleViewResult(attemptId: string) {
    setActiveResultId(attemptId);
    setCurrentTab('quiz-result');
  }

  function handleAskAiTutor(topicTitle: string, context: string) {
    setTutorContext({ topic: topicTitle, context });
    setCurrentTab('aitutor');
  }

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-red-600 border-t-emerald-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-600">
            Menginisialisasi Platform Kuis Interaktif Biologi Kelas X...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 3-Zone Header */}
      <Header
        currentUser={currentUser}
        currentTab={currentTab}
        onTabChange={(tab) => {
          setActiveAttemptId(null);
          setActiveResultId(null);
          setCurrentTab(tab);
        }}
        onSwitchRole={handleSwitchRole}
        onSwitchUser={handleSwitchUser}
        onOpenEditTeacherProfile={() => setShowEditTeacherModal(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Active Quiz Taking Engine (Full Screen Focus) */}
        {currentTab === 'active-quiz' && activeAttemptId && (
          <QuizEngineView
            attemptId={activeAttemptId}
            onFinishQuiz={handleFinishQuiz}
            onExit={() => {
              setActiveAttemptId(null);
              setCurrentTab('kuis');
            }}
          />
        )}

        {/* Quiz Result View */}
        {currentTab === 'quiz-result' && activeResultId && (
          <QuizResultView
            attemptId={activeResultId}
            onBackToList={() => {
              setActiveResultId(null);
              setCurrentTab('kuis');
            }}
            onAskAiTutor={handleAskAiTutor}
          />
        )}

        {/* Student Views */}
        {currentTab === 'materi' && (
          <MateriView
            onStartQuizForTopic={(topicId) => {
              setCurrentTab('kuis');
            }}
            onAskAiTutor={handleAskAiTutor}
          />
        )}

        {currentTab === 'kuis' && (
          <QuizListView
            onStartQuiz={handleStartQuiz}
            onViewResult={handleViewResult}
          />
        )}

        {currentTab === 'analitik' && (
          <StudentAnalyticsView />
        )}

        {currentTab === 'pencapaian' && (
          <StudentAnalyticsView />
        )}

        {currentTab === 'aitutor' && (
          <AiTutorView
            initialTopicTitle={tutorContext.topic}
            initialContext={tutorContext.context}
          />
        )}

        {/* Class Roster & 35 Students PDF Report View */}
        {(currentTab === 'roster-kelas' || currentTab === 'guru-kelas') && (
          <ClassRosterView
            currentUser={currentUser}
            onViewStudentReport={(attemptId) => {
              setActiveResultId(attemptId);
              setCurrentTab('quiz-result');
            }}
          />
        )}

        {/* Teacher Views */}
        {currentTab === 'guru-dashboard' && (
          <TeacherDashboardView
            currentUser={currentUser}
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenEditProfile={() => setShowEditTeacherModal(true)}
          />
        )}

        {currentTab === 'guru-bank-soal' && (
          <TeacherQuestionBankView
            currentUser={currentUser}
          />
        )}

        {currentTab === 'guru-koreksi-esai' && (
          <TeacherEssayGradingView />
        )}

        {(currentTab === 'guru-manajemen-kuis' || currentTab === 'guru-buat-kuis') && (
          <TeacherQuizManagerView
            initialMode={currentTab === 'guru-buat-kuis' ? 'batch' : 'list'}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {/* Unduh Nilai Hasil Kuis Siswa & Nilai Kolektif */}
        {(currentTab === 'guru-unduh-nilai' || currentTab === 'unduh-nilai') && (
          <QuizResultsDownloadView
            currentUser={currentUser}
            onViewDetailResult={(attemptId) => {
              setActiveResultId(attemptId);
              setCurrentTab('quiz-result');
            }}
          />
        )}

        {/* Staff Management (Guru, Admin, Reviewer) */}
        {currentTab === 'manajemen-staf' && (
          <StaffManagementView
            currentUser={currentUser}
            onSwitchUser={handleSwitchUser}
            onStaffUpdated={async (updatedCurrentUser) => {
              if (updatedCurrentUser) {
                setCurrentUser(updatedCurrentUser);
              } else {
                try {
                  const me = await api.getMe();
                  setCurrentUser(me);
                } catch {}
              }
            }}
          />
        )}

        {currentTab === 'guru-kelas' && (
          <AdminObservabilityView onNavigate={(tab) => setCurrentTab(tab)} />
        )}

        {/* Admin / Reviewer Views */}
        {currentTab === 'admin-observability' && (
          <AdminObservabilityView onNavigate={(tab) => setCurrentTab(tab)} />
        )}
      </main>

      {/* Edit Teacher Account Profile Modal */}
      <EditTeacherProfileModal
        isOpen={showEditTeacherModal}
        onClose={() => setShowEditTeacherModal(false)}
        currentUser={currentUser}
        onUpdateSuccess={(updatedUser) => {
          setCurrentUser(updatedUser);
          window.dispatchEvent(new CustomEvent('bio-accounts-changed'));
        }}
      />

      {/* Clean Footer with Emerald Accent Line */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600 opacity-60" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-950">BioX Lab · Kuis Interaktif Biologi Kelas X</span>
            <span>·</span>
            <span>Kurikulum Merdeka 2026/2027</span>
          </div>
          <div className="text-[11px] text-emerald-800/80 font-mono">
            SQLite ACID Engine · Gemini 3.8 Flash · Campbell Biology 12th Ed
          </div>
        </div>
      </footer>
    </div>
  );
}
