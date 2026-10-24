import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CheckCircle2, Clock, Award, Play, RotateCcw, FileText, ChevronRight, Leaf, Microscope, Sparkles } from 'lucide-react';
import biologyHeroImage from '../assets/images/biology_aesthetic_green_1792837778015.jpg';

interface QuizListViewProps {
  onStartQuiz: (quizId: string) => void;
  onViewResult: (attemptId: string) => void;
  filterTopicId?: string;
}

export const QuizListView: React.FC<QuizListViewProps> = ({ onStartQuiz, onViewResult, filterTopicId }) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    try {
      setLoading(true);
      const data = await api.getQuizzes();
      setQuizzes(data);
    } catch (err) {
      console.error('Failed to load quizzes', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartQuiz(quizId: string) {
    try {
      setStartingQuizId(quizId);
      onStartQuiz(quizId);
    } catch (err: any) {
      alert(err.message || 'Gagal memulai kuis');
    } finally {
      setStartingQuizId(null);
    }
  }

  const filteredQuizzes = filterTopicId 
    ? quizzes.filter(q => q.topic_id === filterTopicId)
    : quizzes;

  return (
    <div className="space-y-6">
      {/* Title & Info Banner with Emerald Gradient and Biology Image */}
      <div className="bg-gradient-to-br from-[#021f14] via-[#053723] to-[#01190f] text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-300">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 text-[10px] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Leaf className="w-3 h-3 text-emerald-400" />
                Kurikulum Merdeka · Fase E
              </span>
              <span aria-hidden="true" className="text-emerald-500">·</span>
              <span>Kelas X SMA/MA</span>
              <span aria-hidden="true" className="text-emerald-500">·</span>
              <span className="font-mono text-emerald-300">KKM 75</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              KUIS INTERAKTIF BIOLOGI KELAS X
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed max-w-xl">
              Uji pemahaman biologimu mulai dari kloroplas, virus & bakteri, genetika DNA hingga ekosistem melalui kuis interaktif 4 ragam tipe soal dengan koreksi otomatis dan AI tutor saintifik.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-4 shrink-0">
            {/* Visual Image Preview */}
            <div className="hidden sm:block relative w-36 h-24 rounded-xl overflow-hidden border border-emerald-500/40 shadow-lg group">
              <img 
                src={biologyHeroImage} 
                alt="Biologi Kelas X" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent" />
              <span className="absolute bottom-1 left-2 text-[9px] font-mono font-bold text-emerald-300">
                Mikroskop & Sel
              </span>
            </div>

            <div className="flex items-center gap-4 bg-emerald-950/70 border border-emerald-700/60 p-4 rounded-2xl backdrop-blur-xs shadow-inner">
              <div className="text-center">
                <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider block">Standar Kelulusan</span>
                <span className="text-2xl font-black text-white font-mono">KKM 75</span>
              </div>
              <div className="h-8 w-px bg-emerald-700/50" />
              <div className="text-center">
                <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider block">Format Soal</span>
                <span className="text-xs font-bold text-emerald-200 font-mono">4 Ragam Tipe</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-mono">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Memuat daftar kuis dari server...
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Belum Ada Kuis Terjadwal</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Guru Anda belum mempublikasikan kuis baru untuk topik ini. Silakan pelajari modul di menu Materi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredQuizzes.map((quiz) => {
            const hasAttempted = (quiz.user_attempt_count || 0) > 0;
            const bestScore = quiz.best_score;
            const isPassed = bestScore !== null && bestScore !== undefined && bestScore >= quiz.passing_score;

            return (
              <div 
                key={quiz.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all overflow-hidden group"
              >
                {/* Emerald Gradient Top Border Strip */}
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 group-hover:from-emerald-500 group-hover:via-teal-400 group-hover:to-emerald-300 transition-all" />

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span className="font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {quiz.classroom_name || 'Biologi Reguler'}
                    </span>
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                      Batas KKM: {quiz.passing_score}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug group-hover:text-emerald-950 transition-colors">
                    {quiz.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {quiz.description || 'Asesmen pemahaman biologi standar kurikulum merdeka.'}
                  </p>

                  {/* 4 Types pill strip */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                    <span className="bg-emerald-50 text-emerald-900 border border-emerald-200/90 px-2 py-0.5 rounded-md">
                      Pilihan Ganda
                    </span>
                    <span className="bg-teal-50 text-teal-900 border border-teal-200/90 px-2 py-0.5 rounded-md">
                      Benar / Salah
                    </span>
                    <span className="bg-emerald-50 text-emerald-900 border border-emerald-200/90 px-2 py-0.5 rounded-md">
                      Menjodohkan
                    </span>
                    <span className="bg-teal-50 text-teal-900 border border-teal-200/90 px-2 py-0.5 rounded-md">
                      Uraian / Essay
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{quiz.duration_minutes} Menit</span>
                    </div>
                    <span className="text-slate-300">·</span>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{quiz.question_count} Soal</span>
                    </div>
                    <span className="text-slate-300">·</span>
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Maks {quiz.max_attempts}x Coba</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer with Status & Gradient CTA */}
                <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    {hasAttempted ? (
                      <div className="text-xs space-y-1 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isPassed 
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs' 
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {isPassed ? 'Mencapai KKM (Tuntas)' : 'Belum Capai KKM (Remedial)'}
                          </span>
                        </div>
                        <div className="text-slate-700 text-xs font-semibold">
                          Nilai: <strong className={isPassed ? 'text-emerald-700 font-black text-sm' : 'text-rose-700 font-black text-sm'}>{bestScore ?? '-'}</strong> / 100
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Belum dikerjakan</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hasAttempted && (
                      <button
                        onClick={() => onViewResult(quiz.last_attempt_id || '')}
                        className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors whitespace-nowrap"
                      >
                        Lihat Rapor
                      </button>
                    )}

                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      disabled={startingQuizId === quiz.id || (quiz.user_attempt_count >= quiz.max_attempts)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shadow-sm font-mono ${
                        quiz.user_attempt_count >= quiz.max_attempts
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md shadow-emerald-700/25 active:scale-95'
                      }`}
                    >
                      {startingQuizId === quiz.id ? (
                        <span>Menyiapkan Soal...</span>
                      ) : quiz.user_attempt_count >= quiz.max_attempts ? (
                        <span>Batas Habis</span>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{hasAttempted ? 'Kerjakan Ulang' : 'Mulai Kuis'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
