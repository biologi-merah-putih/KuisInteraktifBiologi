import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  HelpCircle, Sparkles, Filter, CheckCircle2, AlertCircle, 
  Plus, Check, X, BookOpen, Layers, FileCheck
} from 'lucide-react';

interface TeacherQuestionBankViewProps {
  currentUser: any;
}

export const TeacherQuestionBankView: React.FC<TeacherQuestionBankViewProps> = ({ currentUser }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // AI Modal State
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiTopic, setAiTopic] = useState<string>('Virus & Peranannya dalam Kehidupan');
  const [aiTpCode, setAiTpCode] = useState<string>('TP-3.1');
  const [aiLevel, setAiLevel] = useState<'C1'|'C2'|'C3'|'C4'|'C5'|'C6'>('C4');
  const [aiDifficulty, setAiDifficulty] = useState<'easy'|'medium'|'hard'>('medium');
  const [aiType, setAiType] = useState<string>('single_choice');
  const [generatedDraft, setGeneratedDraft] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [selectedTopic, selectedType, selectedLevel, selectedStatus]);

  async function loadData() {
    try {
      setLoading(true);
      const [qData, tData] = await Promise.all([
        api.getQuestions({
          topic_id: selectedTopic,
          question_type: selectedType,
          cognitive_level: selectedLevel,
          status: selectedStatus,
        }),
        api.getTopics(),
      ]);
      setQuestions(qData);
      setTopics(tData);
    } catch (err) {
      console.error('Failed to load questions', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAiDraft() {
    try {
      setAiGenerating(true);
      const draft = await api.generateQuestionDraft({
        topicTitle: aiTopic,
        objectiveCode: aiTpCode,
        cognitiveLevel: aiLevel,
        difficulty: aiDifficulty,
        questionType: aiType,
      });
      setGeneratedDraft(draft);
    } catch (err: any) {
      alert(`Gagal membuat draf AI: ${err.message}`);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleSaveDraftToBank() {
    if (!generatedDraft) return;
    try {
      const topic = topics.find(t => t.title.toLowerCase().includes(aiTopic.toLowerCase())) || topics[0];
      await api.createQuestion({
        topic_id: topic.id,
        objective_id: 'obj-05',
        question_type: aiType,
        cognitive_level: aiLevel,
        difficulty: aiDifficulty,
        stimulus: generatedDraft.stimulus,
        question_text: generatedDraft.questionText,
        options: generatedDraft.options,
        answer_key: generatedDraft.answerKey,
        explanation: generatedDraft.explanation,
        distractor_rationale: generatedDraft.distractorRationale,
        rubric: generatedDraft.rubric,
        source_ref: generatedDraft.sourceRef || 'Campbell Biology 12th Edition; Kurikulum Merdeka Fase E.',
        status: currentUser.role === 'reviewer' || currentUser.role === 'admin' ? 'approved' : 'draft',
      });
      alert('Draf soal berhasil disimpan ke Bank Soal!');
      setShowAiModal(false);
      setGeneratedDraft(null);
      loadData();
    } catch (err: any) {
      alert(`Gagal menyimpan soal: ${err.message}`);
    }
  }

  async function handleApprove(questionId: string) {
    try {
      await api.approveQuestion(questionId);
      loadData();
    } catch (err: any) {
      alert(`Gagal menyetujui soal: ${err.message}`);
    }
  }

  const isReviewerOrAdmin = currentUser.role === 'reviewer' || currentUser.role === 'admin';

  return (
    <div className="space-y-6 pb-16">
      
      {/* Editorial Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Bank Soal Terstandar</span>
            <span aria-hidden="true">·</span>
            <span>Biologi SMA/MA Kelas X</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Bank Soal & Penjaminan Mutu Asesmen
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Kelola butir soal berstandar taksonomi Bloom (C1-C6) dengan telaah rubrik, stimulus, dan verifikasi akademis.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Hasilkan Draf Soal via AI
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter:</span>
        </div>

        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
        >
          <option value="">Semua Topik Biologi</option>
          {topics.map(t => (
            <option key={t.id} value={t.id}>{t.code} - {t.title}</option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
        >
          <option value="">Semua Tipe Soal</option>
          <option value="single_choice">Pilihan Ganda (PG)</option>
          <option value="true_false">Benar / Salah</option>
          <option value="complex_multiple">PG Kompleks (Multi)</option>
          <option value="matching">Menjodohkan</option>
          <option value="ordering">Mengurutkan</option>
          <option value="short_answer">Isian Singkat</option>
          <option value="essay">Uraian (Rubrik)</option>
        </select>

        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
        >
          <option value="">Semua Kognitif (C1-C6)</option>
          <option value="C1">C1 - Mengingat</option>
          <option value="C2">C2 - Memahami</option>
          <option value="C3">C3 - Menerapkan</option>
          <option value="C4">C4 - Menganalisis</option>
          <option value="C5">C5 - Mengevaluasi</option>
          <option value="C6">C6 - Mencipta</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
        >
          <option value="">Semua Status</option>
          <option value="approved">Disetujui (Approved)</option>
          <option value="draft">Draf (Draft)</option>
          <option value="pending_review">Menunggu Telaah</option>
        </select>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs font-mono">
          Memuat butir soal dari database...
        </div>
      ) : questions.length === 0 ? (
        <div className="py-12 text-center bg-white border border-slate-200 rounded-2xl text-xs text-slate-500">
          Tidak ada butir soal yang cocok dengan filter yang dipilih.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div 
              key={q.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
            >
              {/* Question Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-slate-900">
                    Soal #{idx + 1}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-emerald-800 font-mono">
                    {q.topic_title}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                    {q.cognitive_level}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500 font-mono capitalize">
                    {q.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md ${
                    q.status === 'approved' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : q.status === 'draft'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {q.status === 'approved' ? 'Disetujui' : q.status === 'draft' ? 'Draf' : 'Menunggu Telaah'}
                  </span>

                  {isReviewerOrAdmin && q.status !== 'approved' && (
                    <button
                      onClick={() => handleApprove(q.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Setujui (Approve)
                    </button>
                  )}
                </div>
              </div>

              {/* Stimulus if exists */}
              {q.stimulus && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                  <strong className="block text-slate-800 font-mono text-[10px] uppercase mb-1">Stimulus Kasus:</strong>
                  {q.stimulus}
                </div>
              )}

              {/* Question Text */}
              <div className="text-sm font-semibold text-slate-900 leading-relaxed">
                {q.question_text}
              </div>

              {/* Options Preview for Choice */}
              {q.options && Array.isArray(q.options) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {q.options.map((opt: any) => (
                    <div key={opt.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-slate-700 flex items-start gap-2">
                      <span className="font-mono font-bold text-slate-500 shrink-0">{opt.id.replace('opt-', '')}.</span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Explanation & Source Reference */}
              <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100 text-xs text-slate-700 space-y-1">
                <span className="font-semibold text-emerald-950 block">Pembahasan Ilmiah & Rubrik:</span>
                <p className="leading-relaxed">{q.explanation}</p>
                <div className="pt-2 text-[11px] text-slate-500">
                  Sumber: <em>{q.source_ref}</em>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Question Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  AI Generator Draf Soal Biologi
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowAiModal(false);
                  setGeneratedDraft(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Topik Materi Biologi</label>
                <select
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  {topics.map(t => (
                    <option key={t.id} value={t.title}>{t.code} - {t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Capaian Pembelajaran (TP)</label>
                <input
                  type="text"
                  value={aiTpCode}
                  onChange={(e) => setAiTpCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  placeholder="Contoh: TP-3.1"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tingkat Kognitif Bloom</label>
                <select
                  value={aiLevel}
                  onChange={(e) => setAiLevel(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="C1">C1 - Mengingat</option>
                  <option value="C2">C2 - Memahami</option>
                  <option value="C3">C3 - Menerapkan</option>
                  <option value="C4">C4 - Menganalisis</option>
                  <option value="C5">C5 - Mengevaluasi</option>
                  <option value="C6">C6 - Mencipta</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tingkat Kesulitan</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="easy">Mudah (Easy)</option>
                  <option value="medium">Sedang (Medium)</option>
                  <option value="hard">Sukar (Hard / HOTS)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Tipe Soal Asesmen</label>
                <select
                  value={aiType}
                  onChange={(e) => setAiType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="single_choice">Pilihan Ganda (1 Jawaban Benar)</option>
                  <option value="complex_multiple">Pilihan Ganda Kompleks (Multi Jawaban)</option>
                  <option value="true_false">Benar / Salah</option>
                  <option value="ordering">Mengurutkan Tahapan</option>
                  <option value="short_answer">Isian Singkat</option>
                  <option value="essay">Uraian Ilmiah (Dengan Rubrik)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateAiDraft}
              disabled={aiGenerating}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {aiGenerating ? 'AI Sedang Menyusun Draf & Rubrik...' : 'Hasilkan Draf Soal Baru'}
            </button>

            {/* Generated Preview Card */}
            {generatedDraft && (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900 font-sans">Pratinjau Draf Soal AI:</span>
                  <span className="font-mono text-emerald-700 font-semibold">Tervalidasi Format</span>
                </div>

                {generatedDraft.stimulus && (
                  <p className="text-slate-600 italic">"{generatedDraft.stimulus}"</p>
                )}

                <p className="font-semibold text-slate-900 text-sm leading-snug">
                  {generatedDraft.questionText}
                </p>

                {generatedDraft.options && (
                  <div className="space-y-1.5 pl-2">
                    {generatedDraft.options.map((opt: any) => (
                      <div key={opt.id} className="text-slate-700">
                        <strong className="font-mono mr-1">{opt.id}:</strong> {opt.text}
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950 space-y-1">
                  <strong>Kunci & Pembahasan:</strong>
                  <p>{generatedDraft.explanation}</p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setGeneratedDraft(null)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    Buang Draf
                  </button>
                  <button
                    onClick={handleSaveDraftToBank}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Simpan ke Bank Soal
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
