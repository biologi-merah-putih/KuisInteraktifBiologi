import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  FileCheck, Sparkles, CheckCircle2, AlertCircle, Send, 
  BookOpen, Award, Check, User 
} from 'lucide-react';

export const TeacherEssayGradingView: React.FC = () => {
  const [pendingEssays, setPendingEssays] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeEssayId, setActiveEssayId] = useState<string | null>(null);

  // Grading form state
  const [pointsInput, setPointsInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [aiEvalState, setAiEvalState] = useState<Record<string, any>>({});
  const [isAiEvaluating, setIsAiEvaluating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadPendingEssays();
  }, []);

  async function loadPendingEssays() {
    try {
      setLoading(true);
      const data = await api.getPendingEssays();
      setPendingEssays(data);
      if (data.length > 0) {
        setActiveEssayId(data[0].answer_id);
        setPointsInput(data[0].points_earned || 0);
        setFeedbackInput(data[0].teacher_feedback || '');
      }
    } catch (err) {
      console.error('Failed to load essays', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestAiRecommendation(essay: any) {
    try {
      setIsAiEvaluating(true);
      const res = await api.evaluateEssayWithAi({
        questionText: essay.question_text,
        rubricJson: essay.rubric || { maxScore: essay.max_points },
        studentAnswer: essay.studentAnswer?.text || '',
      });
      setAiEvalState(prev => ({ ...prev, [essay.answer_id]: res }));
      if (res.suggestedScore !== undefined) {
        setPointsInput(res.suggestedScore);
        if (res.rationale && !feedbackInput) {
          setFeedbackInput(res.rationale);
        }
      }
    } catch (err: any) {
      alert(`Gagal memanggil rekomendasi AI: ${err.message}`);
    } finally {
      setIsAiEvaluating(false);
    }
  }

  async function handleSubmitGrade(answerId: string) {
    try {
      setIsSubmitting(true);
      await api.gradeEssay(answerId, Number(pointsInput), feedbackInput);
      alert('Nilai dan umpan balik esai berhasil disimpan secara permanen di database!');
      loadPendingEssays();
    } catch (err: any) {
      alert(`Gagal menyimpan nilai: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentEssay = pendingEssays.find(e => e.answer_id === activeEssayId);
  const aiRecommendation = currentEssay ? aiEvalState[currentEssay.answer_id] : null;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Title */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
          <span>Koreksi Asesmen Subjektif</span>
          <span aria-hidden="true">·</span>
          <span>Rubrik & Asistensi AI Guru</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Penilaian & Ulasan Jawaban Uraian
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Koreksi jawaban uraian siswa dengan bantuan rubrik resmi dan rekomendasi AI backend. Otoritas penentuan nilai akhir tetap berada sepenuhnya pada guru.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-slate-500">
          Memuat daftar pengiriman jawaban uraian siswa...
        </div>
      ) : pendingEssays.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">Semua Jawaban Uraian Telah Dinilai</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tidak ada jawaban esai yang sedang menunggu pemeriksaan saat ini. Semua nilai kuis telah difinalisasi di server.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Pending Submissions List (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Daftar Siswa ({pendingEssays.length})
            </h3>
            <div className="space-y-2">
              {pendingEssays.map(essay => {
                const isSelected = essay.answer_id === activeEssayId;
                return (
                  <button
                    key={essay.answer_id}
                    onClick={() => {
                      setActiveEssayId(essay.answer_id);
                      setPointsInput(essay.points_earned || 0);
                      setFeedbackInput(essay.teacher_feedback || '');
                    }}
                    className={`w-full p-3.5 text-left rounded-xl border text-xs transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600 font-semibold text-emerald-950'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{essay.student_name}</span>
                      <span className="font-mono text-[10px] text-slate-400">Maks {essay.max_points} Poin</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {essay.quiz_title}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Essay Grading Workspace (8 cols) */}
          {currentEssay && (
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              
              {/* Question & Rubric Reference */}
              <div className="space-y-3 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-700">
                    Siswa: {currentEssay.student_name}
                  </span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    Bobot: {currentEssay.max_points} Poin
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium leading-relaxed">
                  <strong className="block text-slate-600 uppercase text-[10px] font-mono mb-1">Butir Pertanyaan:</strong>
                  {currentEssay.question_text}
                </div>

                {currentEssay.rubric && (
                  <div className="p-3 bg-emerald-50/40 rounded-lg border border-emerald-100 text-[11px] text-emerald-950 space-y-1">
                    <strong className="block font-bold">Kriteria Rubrik Penilaian:</strong>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {currentEssay.rubric.criteria?.map((c: any, i: number) => (
                        <li key={i}>{c.description} (+{c.point} poin)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Student's Submitted Answer */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Jawaban Siswa:
                </h4>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line">
                  {currentEssay.studentAnswer?.text || '(Jawaban kosong)'}
                </div>
              </div>

              {/* AI Recommendation Box */}
              <div className="pt-2">
                {aiRecommendation ? (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Rekomendasi Analisis AI (Gemini 3.8 Flash):
                      </div>
                      <span className="font-mono font-bold text-emerald-800">
                        Saran Skor: {aiRecommendation.suggestedScore} / {aiRecommendation.maxScore}
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed">
                      {aiRecommendation.rationale}
                    </p>

                    {aiRecommendation.strengths?.length > 0 && (
                      <div className="text-[11px] text-slate-600">
                        <strong>Kekuatan Konsep: </strong>
                        {aiRecommendation.strengths.join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleRequestAiRecommendation(currentEssay)}
                    disabled={isAiEvaluating}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    {isAiEvaluating ? 'Menganalisis Jawaban terhadap Rubrik...' : 'Minta Rekomendasi Penilaian AI'}
                  </button>
                )}
              </div>

              {/* Teacher Decision Form */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Keputusan Nilai & Ulasan Guru
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nilai Diberikan (0 - {currentEssay.max_points})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={currentEssay.max_points}
                      value={pointsInput}
                      onChange={(e) => setPointsInput(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Umpan Balik Guru untuk Siswa
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Tuliskan catatan apresiasi atau penguatan konsep untuk siswa..."
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleSubmitGrade(currentEssay.answer_id)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Menyimpan Nilai...' : 'Simpan Nilai Uraian'}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
