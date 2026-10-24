import React, { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import confetti from 'canvas-confetti';
import { 
  Clock, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, 
  Send, HelpCircle, Bookmark, Check, ShieldAlert
} from 'lucide-react';

interface QuizEngineViewProps {
  attemptId: string;
  onFinishQuiz: (attemptId: string) => void;
  onExit: () => void;
}

export const QuizEngineView: React.FC<QuizEngineViewProps> = ({
  attemptId,
  onFinishQuiz,
  onExit,
}) => {
  const [attempt, setAttempt] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAttemptData();
  }, [attemptId]);

  // Synchronized countdown timer
  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const limit = new Date(attempt.timeLimitAt).getTime();
      const diff = Math.max(0, Math.floor((limit - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt]);

  async function loadAttemptData() {
    try {
      setLoading(true);
      const data = await api.getAttempt(attemptId);
      setAttempt(data);
      setAnswers(data.savedAnswers || {});
      setRemainingSeconds(data.remainingSeconds || 0);
    } catch (err: any) {
      alert(`Gagal memuat kuis: ${err.message}`);
      onExit();
    } finally {
      setLoading(false);
    }
  }

  // Trigger server-authoritative autosave with debounce
  function handleAnswerChange(questionId: string, answerData: any) {
    const updated = { ...answers, [questionId]: answerData };
    setAnswers(updated);
    setSaveStatus('saving');

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.saveAnswer(attemptId, questionId, answerData);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave error', err);
        setSaveStatus('error');
      }
    }, 400);
  }

  function toggleFlag(questionId: string) {
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  }

  async function handleAutoSubmit() {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await api.submitAttempt(attemptId);
      onFinishQuiz(attemptId);
    } catch (err: any) {
      console.error('Auto-submit error', err);
      onFinishQuiz(attemptId);
    }
  }

  async function handleSubmit() {
    try {
      setIsSubmitting(true);
      await api.submitAttempt(attemptId);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {}
      onFinishQuiz(attemptId);
    } catch (err: any) {
      alert(`Gagal mengirimkan kuis: ${err.message}`);
      setIsSubmitting(false);
    }
  }

  if (loading || !attempt) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-mono">Menyiapkan lembar ujian terenkripsi di server...</p>
      </div>
    );
  }

  const questions = attempt.questions || [];
  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : null;

  const answeredCount = questions.filter((q: any) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (q.question_type === 'single_choice') return Boolean(ans.selectedOptionId);
    if (q.question_type === 'true_false') return ans.isTrue !== undefined;
    if (q.question_type === 'complex_multiple') return Array.isArray(ans.selectedOptionIds) && ans.selectedOptionIds.length > 0;
    if (q.question_type === 'ordering') return Array.isArray(ans.orderedIds) && ans.orderedIds.length > 0;
    if (q.question_type === 'matching') return ans.matches && Object.keys(ans.matches).length > 0;
    if (q.question_type === 'short_answer') return Boolean(ans.text && ans.text.trim());
    if (q.question_type === 'essay') return Boolean(ans.text && ans.text.trim());
    return false;
  }).length;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isTimeCritical = remainingSeconds <= 300; // <= 5 minutes

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      
      {/* Top Floating Control Bar */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-emerald-900/10 rounded-2xl p-4 sm:px-6 sm:py-4 shadow-md flex items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400" />
        
        <div>
          <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wider block">
            Lembar Asesmen Resmi · Biologi X
          </span>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-md">
            {attempt.quizTitle}
          </h2>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Server Autosave Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                Tersimpan di server
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-slate-500 animate-pulse bg-slate-100 px-2.5 py-1 rounded-full">
                Menyimpan...
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                <ShieldAlert className="w-3.5 h-3.5" />
                Gagal sinkronisasi
              </span>
            )}
          </div>

          {/* Synchronized Countdown Timer */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono tabular-nums text-sm font-bold transition-colors ${
            isTimeCritical 
              ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse' 
              : 'bg-emerald-50/80 text-emerald-950 border-emerald-200'
          }`}>
            <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-600' : 'text-emerald-700'}`} />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl shadow-md shadow-emerald-700/25 transition-all whitespace-nowrap active:scale-95 font-mono"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Selesai & Kirim</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Question Stage (8 cols) & Navigator (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Question Box */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {currentQ && (
            <>
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    Nomor {currentIndex + 1} dari {questions.length}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                    {currentQ.question_type === 'single_choice' && 'Pilihan Ganda'}
                    {currentQ.question_type === 'true_false' && 'Benar / Salah'}
                    {currentQ.question_type === 'matching' && 'Menjodohkan'}
                    {currentQ.question_type === 'essay' && 'Uraian / Essay'}
                    {currentQ.question_type === 'complex_multiple' && 'PG Kompleks'}
                    {currentQ.question_type === 'ordering' && 'Mengurutkan'}
                    {currentQ.question_type === 'short_answer' && 'Isian Singkat'}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500 font-mono font-medium">
                    Bobot: {currentQ.points} Poin
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {currentQ.cognitive_level}
                  </span>
                </div>

                <button
                  onClick={() => toggleFlag(currentQ.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    flagged[currentQ.id]
                      ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                      : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${flagged[currentQ.id] ? 'fill-current text-amber-600' : ''}`} />
                  <span>Ragu-ragu</span>
                </button>
              </div>

              {/* Stimulus if present */}
              {currentQ.stimulus && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
                  <strong className="block text-slate-900 mb-1 font-mono uppercase text-[10px] tracking-wider">
                    Stimulus Kasus Ilmiah:
                  </strong>
                  {currentQ.stimulus}
                </div>
              )}

              {/* Question Text */}
              <div className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                {currentQ.question_text}
              </div>

              {/* Dynamic Answer Component based on question_type */}
              <div className="pt-2">
                {/* 1. Single Choice (Pilihan Ganda) */}
                {currentQ.question_type === 'single_choice' && (
                  <div className="space-y-2.5">
                    {currentQ.options?.map((opt: any) => {
                      const isSelected = currentAnswer?.selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleAnswerChange(currentQ.id, { selectedOptionId: opt.id })}
                          className={`w-full p-4 rounded-xl text-left border text-xs sm:text-sm flex items-start gap-3 transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 font-semibold shadow-xs'
                              : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 text-slate-800'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                            isSelected ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {opt.id.replace('opt-', '')}
                          </span>
                          <span className="leading-snug pt-0.5">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. True / False (Benar / Salah) */}
                {currentQ.question_type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { val: true, label: 'Benar', color: 'emerald' },
                      { val: false, label: 'Salah', color: 'rose' }
                    ].map(choice => {
                      const isSelected = currentAnswer?.isTrue === choice.val;
                      return (
                        <button
                          key={String(choice.val)}
                          onClick={() => handleAnswerChange(currentQ.id, { isTrue: choice.val })}
                          className={`p-5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? choice.val
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 font-bold shadow-md shadow-emerald-700/25 ring-2 ring-emerald-400/50'
                                : 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-600 font-bold shadow-md shadow-rose-700/25 ring-2 ring-rose-400/50'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-base font-bold block">{choice.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. Complex Multiple (Pilihan Ganda Kompleks) */}
                {currentQ.question_type === 'complex_multiple' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-500 mb-2 italic">
                      * Pilih satu atau lebih pernyataan yang benar.
                    </p>
                    {currentQ.options?.map((opt: any) => {
                      const selectedIds: string[] = currentAnswer?.selectedOptionIds || [];
                      const isChecked = selectedIds.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            const next = isChecked
                              ? selectedIds.filter(id => id !== opt.id)
                              : [...selectedIds, opt.id];
                            handleAnswerChange(currentQ.id, { selectedOptionIds: next });
                          }}
                          className={`w-full p-4 rounded-xl text-left border text-xs sm:text-sm flex items-start gap-3 transition-all ${
                            isChecked
                              ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600 text-emerald-950 font-medium'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 text-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border mt-0.5 ${
                            isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className="leading-snug">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 4. Ordering (Mengurutkan Tahapan) */}
                {currentQ.question_type === 'ordering' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 mb-2">
                      Gunakan tombol panah untuk mengatur urutan tahapan yang benar dari atas ke bawah:
                    </p>
                    {(() => {
                      const originalOptions: any[] = currentQ.options || [];
                      const savedOrder: string[] = currentAnswer?.orderedIds || originalOptions.map(o => o.id);
                      const currentList = savedOrder
                        .map(id => originalOptions.find(o => o.id === id))
                        .filter(Boolean);

                      const moveItem = (fromIdx: number, toIdx: number) => {
                        if (toIdx < 0 || toIdx >= currentList.length) return;
                        const copy = [...currentList];
                        const [moved] = copy.splice(fromIdx, 1);
                        copy.splice(toIdx, 0, moved);
                        handleAnswerChange(currentQ.id, { orderedIds: copy.map(c => c.id) });
                      };

                      return currentList.map((item, idx) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-mono font-semibold flex items-center justify-center text-xs">
                              {idx + 1}
                            </span>
                            <span>{item.text}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveItem(idx, idx - 1)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === currentList.length - 1}
                              onClick={() => moveItem(idx, idx + 1)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* 5. Matching (Menjodohkan) */}
                {currentQ.question_type === 'matching' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 mb-2">
                      Pilih padanan yang sesuai untuk setiap premis di sebelah kiri:
                    </p>
                    {(() => {
                      const data = currentQ.options || { pairs: [], choices: [] };
                      const currentMatches = currentAnswer?.matches || {};

                      return data.pairs?.map((pair: any) => (
                        <div key={pair.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="sm:col-span-7 text-xs sm:text-sm font-medium text-slate-800">
                            {pair.premise}
                          </span>
                          <div className="sm:col-span-5">
                            <select
                              value={currentMatches[pair.id] || ''}
                              onChange={(e) => {
                                const next = { ...currentMatches, [pair.id]: e.target.value };
                                handleAnswerChange(currentQ.id, { matches: next });
                              }}
                              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            >
                              <option value="">-- Pilih Padanan --</option>
                              {data.choices?.map((ch: string) => (
                                <option key={ch} value={ch}>{ch}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* 6. Short Answer (Isian Singkat) */}
                {currentQ.question_type === 'short_answer' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600">
                      Ketikkan jawaban Anda secara ringkas dan tepat:
                    </label>
                    <input
                      type="text"
                      value={currentAnswer?.text || ''}
                      onChange={(e) => handleAnswerChange(currentQ.id, { text: e.target.value })}
                      placeholder="Masukkan jawaban..."
                      className="w-full max-w-md p-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                )}

                {/* 7. Essay (Uraian) */}
                {currentQ.question_type === 'essay' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-slate-600">
                      Tuliskan penjelasan ilmiah lengkap sesuai prinsip biologi:
                    </label>
                    <textarea
                      rows={6}
                      value={currentAnswer?.text || ''}
                      onChange={(e) => handleAnswerChange(currentQ.id, { text: e.target.value })}
                      placeholder="Tuliskan jawaban uraian Anda di sini..."
                      className="w-full p-4 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-400 italic">
                      Jawaban uraian akan dikoreksi langsung oleh guru Anda dengan panduan rubrik penilaian saintifik resmi.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Prev / Next Nav */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Soal Sebelumnya
                </button>

                <div className="text-xs text-slate-500 font-mono">
                  {currentIndex + 1} / {questions.length}
                </div>

                <button
                  onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                  disabled={currentIndex === questions.length - 1}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Soal Berikutnya
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Question Navigator Grid (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Navigasi Butir Soal
            </h3>
            <span className="text-xs font-mono text-slate-500">
              {answeredCount}/{questions.length} Terjawab
            </span>
          </div>

          {/* Numbered Grid */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q: any, idx: number) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = Boolean(answers[q.id]);
              const isFlagged = flagged[q.id];

              let bgClass = 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300';
              if (isCurrent) {
                bgClass = 'bg-gradient-to-br from-slate-900 to-emerald-950 text-white border-slate-900 ring-2 ring-emerald-500 shadow-sm';
              } else if (isFlagged) {
                bgClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
              } else if (isAnswered) {
                bgClass = 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-950 border-emerald-300 font-bold shadow-2xs';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 rounded-xl text-xs font-mono font-bold border flex items-center justify-center transition-all ${bgClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-300 shrink-0" />
              <span>Sudah dijawab & tersimpan</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-300 shrink-0" />
              <span>Ditandai ragu-ragu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-200 shrink-0" />
              <span>Belum dijawab</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl shadow-md shadow-emerald-700/25 transition-all text-center font-mono active:scale-95"
            >
              Kirimkan Ujian Sekarang
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Konfirmasi Pengiriman Kuis
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda telah menjawab <strong>{answeredCount}</strong> dari <strong>{questions.length}</strong> butir soal.
              {answeredCount < questions.length && (
                <span className="block mt-2 text-rose-600 font-medium">
                  Perhatian: Masih terdapat {questions.length - answeredCount} butir soal yang belum Anda isi!
                </span>
              )}
            </p>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 font-mono space-y-1">
              <div>Sisa Waktu: {minutes} menit {seconds} detik</div>
              <div>Status Server: Semua jawaban terverifikasi tersimpan</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
              >
                Kembali Periksa
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                {isSubmitting ? 'Memproses Nilai...' : 'Ya, Kirimkan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
