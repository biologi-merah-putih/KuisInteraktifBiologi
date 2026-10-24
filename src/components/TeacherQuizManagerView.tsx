import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import { 
  PlusCircle, Download, CheckCircle2, Clock, FileText, Check, X, 
  Trash2, Layers, Sliders, Sparkles, BookOpen, AlertCircle, HelpCircle,
  Eye, RefreshCw, ChevronRight, Hash, Award, CheckSquare, Settings2, BarChart2,
  Edit3, ListFilter, Filter, ListChecks, CheckCheck, SlidersHorizontal, ArrowRight
} from 'lucide-react';

interface TeacherQuizManagerViewProps {
  initialMode?: 'batch' | 'list' | 'single';
  onNavigate?: (tab: string) => void;
}

type TabMode = 'batch' | 'list' | 'single';
type GenerationStrategy = 'by_topic' | 'parallel_variants' | 'cognitive_levels' | 'serial_drills';

interface QuestionTypeConfig {
  id: string;
  label: string;
  shortLabel: string;
  badgeColor: string;
}

const ALL_QUESTION_TYPES: QuestionTypeConfig[] = [
  { id: 'single_choice', label: 'Pilihan Ganda', shortLabel: 'PG', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'true_false', label: 'Benar / Salah', shortLabel: 'B/S', badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'complex_multiple', label: 'Pilihan Ganda Kompleks', shortLabel: 'PG Kompleks', badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { id: 'matching', label: 'Menjodohkan', shortLabel: 'Menjodohkan', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'ordering', label: 'Mengurutkan Tahapan', shortLabel: 'Urutan', badgeColor: 'bg-teal-100 text-teal-800 border-teal-300' },
  { id: 'short_answer', label: 'Isian Singkat', shortLabel: 'Isian', badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { id: 'essay', label: 'Uraian Ilmiah (Esai)', shortLabel: 'Uraian', badgeColor: 'bg-purple-100 text-purple-800 border-purple-300' },
];

export const TeacherQuizManagerView: React.FC<TeacherQuizManagerViewProps> = ({
  initialMode = 'batch',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>(initialMode);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ==========================================
  // MULTI-QUIZ GENERATOR STATE
  // ==========================================
  const [quizCount, setQuizCount] = useState<number>(3); // Berapa jumlah kuis yang akan dibuat
  const [questionsPerQuiz, setQuestionsPerQuiz] = useState<number>(4); // Menentukan jumlah soal
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([
    'single_choice', 'true_false', 'matching', 'essay'
  ]); // Menentukan jenis soal
  const [strategy, setStrategy] = useState<GenerationStrategy>('by_topic');
  const [classroomId, setClassroomId] = useState<string>('cls-x-a');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [passingScore, setPassingScore] = useState<number>(75);
  const [maxAttempts, setMaxAttempts] = useState<number>(1);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Custom overrides for individual quiz titles & questions
  const [customTitles, setCustomTitles] = useState<Record<number, string>>({});
  const [customQuizQuestions, setCustomQuizQuestions] = useState<Record<number, string[]>>({});

  // Question Picker Modal for a specific preview quiz index
  const [pickingQuizIndex, setPickingQuizIndex] = useState<number | null>(null);

  // ==========================================
  // EDIT EXISTING QUIZ MODAL STATE
  // ==========================================
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [editQuizTitle, setEditQuizTitle] = useState<string>('');
  const [editQuizDescription, setEditQuizDescription] = useState<string>('');
  const [editQuizDuration, setEditQuizDuration] = useState<number>(30);
  const [editQuizPassingScore, setEditQuizPassingScore] = useState<number>(75);
  const [editQuizClassroomId, setEditQuizClassroomId] = useState<string>('cls-x-a');
  const [editQuizSelectedQuestions, setEditQuizSelectedQuestions] = useState<string[]>([]);
  const [editQuizTypeFilter, setEditQuizTypeFilter] = useState<string>('all');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // ==========================================
  // SINGLE MANUAL QUIZ FORM STATE
  // ==========================================
  const [singleTitle, setSingleTitle] = useState<string>('');
  const [singleDescription, setSingleDescription] = useState<string>('');
  const [singleTopicId, setSingleTopicId] = useState<string>('');
  const [singleClassroomId, setSingleClassroomId] = useState<string>('cls-x-a');
  const [singleDuration, setSingleDuration] = useState<number>(30);
  const [singlePassingScore, setSinglePassingScore] = useState<number>(75);
  const [singleMaxAttempts, setSingleMaxAttempts] = useState<number>(1);
  const [singleSelectedQuestions, setSingleSelectedQuestions] = useState<string[]>([]);
  const [singleTypeFilter, setSingleTypeFilter] = useState<string>('all');
  const [isSingleSaving, setIsSingleSaving] = useState<boolean>(false);

  // Delete modal state
  const [quizToDelete, setQuizToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Preview Quiz Questions Modal
  const [inspectQuiz, setInspectQuiz] = useState<any | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    if (initialMode) {
      setActiveTab(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [qList, questionsList, classList, topicList] = await Promise.all([
        api.getQuizzes(),
        api.getQuestions({ status: 'approved' }),
        api.getClassrooms(),
        api.getTopics(),
      ]);
      setQuizzes(qList);
      setQuestions(questionsList);
      setClassrooms(classList);
      setTopics(topicList);

      if (classList.length > 0) {
        setClassroomId(classList[0].id);
        setSingleClassroomId(classList[0].id);
      }
      if (topicList.length > 0) {
        setSingleTopicId(topicList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load quiz manager data', err);
      showToast('error', `Gagal memuat data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Toggle question type selection
  const toggleQuestionType = (typeId: string) => {
    setSelectedQuestionTypes(prev => {
      if (prev.includes(typeId)) {
        if (prev.length <= 1) return prev; // Keep at least one type
        return prev.filter(t => t !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  // Preset question types
  const applyQuestionTypePreset = (preset: '4types' | 'mcq_only' | 'objective' | 'hots' | 'all') => {
    switch (preset) {
      case '4types':
        setSelectedQuestionTypes(['single_choice', 'true_false', 'matching', 'essay']);
        break;
      case 'mcq_only':
        setSelectedQuestionTypes(['single_choice']);
        break;
      case 'objective':
        setSelectedQuestionTypes(['single_choice', 'true_false', 'matching', 'ordering', 'short_answer']);
        break;
      case 'hots':
        setSelectedQuestionTypes(['complex_multiple', 'essay', 'ordering']);
        break;
      case 'all':
        setSelectedQuestionTypes(ALL_QUESTION_TYPES.map(t => t.id));
        break;
    }
  };

  // Filtered pool of questions matching the selected question types
  const questionsInPool = useMemo(() => {
    return questions.filter(q => selectedQuestionTypes.includes(q.question_type));
  }, [questions, selectedQuestionTypes]);

  // ==========================================
  // COMPUTED PREVIEW FOR MULTI-QUIZ GENERATION
  // ==========================================
  const generatedQuizzesPreview = useMemo(() => {
    const list: Array<{
      index: number;
      defaultTitle: string;
      title: string;
      description: string;
      topicId: string | null;
      topicName: string;
      questionIds: string[];
      typesBreakdown: Record<string, number>;
      duration: number;
      kkm: number;
    }> = [];

    const availablePool = questionsInPool.length > 0 ? questionsInPool : questions;

    for (let i = 0; i < quizCount; i++) {
      let allocatedQuestions: string[] = [];
      let topicId: string | null = null;
      let topicName = 'Semua Bab Biologi';
      let defaultTitle = `Kuis Biologi Paket ${String.fromCharCode(65 + i)}`;
      let description = `Kuis asesmen terstruktur Kurikulum Merdeka Fase E (Paket ${String.fromCharCode(65 + i)})`;

      if (customQuizQuestions[i] && customQuizQuestions[i].length > 0) {
        allocatedQuestions = customQuizQuestions[i];
      } else {
        if (strategy === 'by_topic') {
          const topic = topics[i % (topics.length || 1)];
          if (topic) {
            topicId = topic.id;
            topicName = topic.title;
            defaultTitle = `Kuis Asesmen Bab ${i + 1}: ${topic.title}`;
            description = `Uji pemahaman materi ${topic.title} untuk Fase E SMA Kelas X.`;
            
            // Filter questions for this topic that match selected question types
            const topicQs = availablePool.filter(q => q.topic_id === topic.id);
            if (topicQs.length >= questionsPerQuiz) {
              allocatedQuestions = topicQs.slice(0, questionsPerQuiz).map(q => q.id);
            } else {
              allocatedQuestions = topicQs.map(q => q.id);
              const otherQs = availablePool.filter(q => !allocatedQuestions.includes(q.id));
              const needed = questionsPerQuiz - allocatedQuestions.length;
              allocatedQuestions.push(...otherQs.slice(0, needed).map(q => q.id));
            }
          }
        } else if (strategy === 'parallel_variants') {
          defaultTitle = `Asesmen Sumatif Biologi - Paket ${String.fromCharCode(65 + i)}`;
          description = `Paket variasi ${String.fromCharCode(65 + i)} untuk mencegah kecurangan saat asesmen serentak di kelas.`;
          const offset = (i * 3) % (availablePool.length || 1);
          const rotated = [...availablePool.slice(offset), ...availablePool.slice(0, offset)];
          allocatedQuestions = rotated.slice(0, questionsPerQuiz).map(q => q.id);
        } else if (strategy === 'cognitive_levels') {
          const levels = [
            { name: 'Dasar / Remedial (C1-C2)', filter: ['C1', 'C2'] },
            { name: 'Reguler Aplikasi (C3-C4)', filter: ['C3', 'C4'] },
            { name: 'Pengayaan HOTS (C5-C6)', filter: ['C5', 'C6'] },
          ];
          const lvl = levels[i % levels.length];
          defaultTitle = `Kuis Berdiferensiasi (${lvl.name}) - Paket ${i + 1}`;
          description = `Asesmen berdiferensiasi dengan fokus level kognitif ${lvl.name}.`;
          const matched = availablePool.filter(q => lvl.filter.includes(q.cognitive_level));
          if (matched.length >= questionsPerQuiz) {
            allocatedQuestions = matched.slice(0, questionsPerQuiz).map(q => q.id);
          } else {
            allocatedQuestions = matched.map(q => q.id);
            const others = availablePool.filter(q => !allocatedQuestions.includes(q.id));
            allocatedQuestions.push(...others.slice(0, questionsPerQuiz - allocatedQuestions.length).map(q => q.id));
          }
        } else {
          defaultTitle = `Latihan Pemantapan Biologi Seri #${i + 1}`;
          description = `Paket latihan harian seri #${i + 1} untuk penguasaan konsep esensial Biologi Fase E.`;
          const start = (i * questionsPerQuiz) % (availablePool.length || 1);
          allocatedQuestions = availablePool.slice(start, start + questionsPerQuiz).map(q => q.id);
          if (allocatedQuestions.length < questionsPerQuiz) {
            allocatedQuestions.push(...availablePool.slice(0, questionsPerQuiz - allocatedQuestions.length).map(q => q.id));
          }
        }

        // If allocated count is still less than requested, fill from all questions
        if (allocatedQuestions.length < questionsPerQuiz && questions.length > 0) {
          const remainingNeeded = questionsPerQuiz - allocatedQuestions.length;
          const remainingPool = questions.filter(q => !allocatedQuestions.includes(q.id));
          allocatedQuestions.push(...remainingPool.slice(0, remainingNeeded).map(q => q.id));
        }
      }

      // Compute question types breakdown for this quiz
      const typesBreakdown: Record<string, number> = {};
      allocatedQuestions.forEach(qid => {
        const qObj = questions.find(q => q.id === qid);
        if (qObj) {
          typesBreakdown[qObj.question_type] = (typesBreakdown[qObj.question_type] || 0) + 1;
        }
      });

      list.push({
        index: i,
        defaultTitle,
        title: customTitles[i] !== undefined ? customTitles[i] : defaultTitle,
        description,
        topicId,
        topicName,
        questionIds: allocatedQuestions,
        typesBreakdown,
        duration: durationMinutes,
        kkm: passingScore,
      });
    }

    return list;
  }, [
    quizCount, strategy, topics, questions, questionsInPool,
    questionsPerQuiz, durationMinutes, passingScore, customTitles, customQuizQuestions
  ]);

  // Execute Batch Creation of Quizzes
  async function handleExecuteBatchCreate() {
    if (generatedQuizzesPreview.length === 0) {
      showToast('error', 'Tidak ada paket kuis untuk dibuat.');
      return;
    }

    const payload = generatedQuizzesPreview.map(qz => ({
      classroom_id: classroomId,
      topic_id: qz.topicId,
      title: qz.title.trim() || qz.defaultTitle,
      description: qz.description,
      duration_minutes: Number(qz.duration),
      passing_score: Number(qz.kkm),
      max_attempts: Number(maxAttempts),
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      question_ids: qz.questionIds,
    }));

    try {
      setIsGenerating(true);
      const res = await api.batchCreateQuizzes({
        classroom_id: classroomId,
        quizzes: payload,
      });

      showToast('success', res.message || `Berhasil menerbitkan ${payload.length} paket kuis baru!`);
      await loadData();
      setActiveTab('list');
      setCustomTitles({});
      setCustomQuizQuestions({});
    } catch (err: any) {
      console.error('Batch create error:', err);
      showToast('error', `Gagal membuat kuis masal: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  // Open Edit Modal for an existing Quiz
  async function handleOpenEditQuiz(quiz: any) {
    try {
      setLoading(true);
      const fullQuiz = await api.getQuiz(quiz.id);
      setEditingQuiz(fullQuiz);
      setEditQuizTitle(fullQuiz.title);
      setEditQuizDescription(fullQuiz.description || '');
      setEditQuizDuration(fullQuiz.duration_minutes || 30);
      setEditQuizPassingScore(fullQuiz.passing_score || 75);
      setEditQuizClassroomId(fullQuiz.classroom_id || 'cls-x-a');
      setEditQuizSelectedQuestions(fullQuiz.questions ? fullQuiz.questions.map((q: any) => q.id) : []);
      setEditQuizTypeFilter('all');
    } catch (err: any) {
      showToast('error', `Gagal memuat detail kuis: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Save Edit Quiz Submit
  async function handleSaveEditQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!editingQuiz) return;
    if (!editQuizTitle.trim()) {
      showToast('error', 'Nama kuis tidak boleh kosong.');
      return;
    }
    if (editQuizSelectedQuestions.length === 0) {
      showToast('error', 'Kuis harus memiliki minimal 1 butir soal.');
      return;
    }

    try {
      setIsSavingEdit(true);
      const res = await api.updateQuiz(editingQuiz.id, {
        title: editQuizTitle.trim(),
        description: editQuizDescription.trim(),
        duration_minutes: Number(editQuizDuration),
        passing_score: Number(editQuizPassingScore),
        classroom_id: editQuizClassroomId,
        question_ids: editQuizSelectedQuestions,
      });

      showToast('success', res.message || `Kuis "${editQuizTitle}" berhasil diperbarui!`);
      setEditingQuiz(null);
      await loadData();
    } catch (err: any) {
      showToast('error', `Gagal menyimpan pembaruan kuis: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  }

  // Execute Single Manual Quiz Creation
  async function handleCreateSingleQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!singleTitle.trim()) {
      showToast('error', 'Judul kuis wajib diisi.');
      return;
    }
    if (singleSelectedQuestions.length === 0) {
      showToast('error', 'Pilih minimal 1 butir soal dari bank soal.');
      return;
    }

    try {
      setIsSingleSaving(true);
      await api.createQuiz({
        classroom_id: singleClassroomId,
        topic_id: singleTopicId,
        title: singleTitle.trim(),
        description: singleDescription.trim(),
        duration_minutes: Number(singleDuration),
        passing_score: Number(singlePassingScore),
        max_attempts: Number(singleMaxAttempts),
        shuffle_questions: true,
        shuffle_options: true,
        question_ids: singleSelectedQuestions,
      });

      showToast('success', `Kuis "${singleTitle}" berhasil dibuat dan diterbitkan!`);
      setSingleTitle('');
      setSingleDescription('');
      setSingleSelectedQuestions([]);
      await loadData();
      setActiveTab('list');
    } catch (err: any) {
      showToast('error', `Gagal membuat kuis: ${err.message}`);
    } finally {
      setIsSingleSaving(false);
    }
  }

  // Delete Quiz
  async function handleConfirmDelete() {
    if (!quizToDelete) return;
    try {
      setIsDeleting(true);
      const res = await api.deleteQuiz(quizToDelete.id);
      showToast('success', res.message || `Kuis "${quizToDelete.title}" berhasil dihapus.`);
      setQuizToDelete(null);
      await loadData();
    } catch (err: any) {
      showToast('error', `Gagal menghapus kuis: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  }

  // Render question type badge
  const renderQuestionTypeBadge = (type: string) => {
    const cfg = ALL_QUESTION_TYPES.find(t => t.id === type);
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${cfg?.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
        {cfg?.shortLabel || type}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border animate-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-white/70 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 sm:p-8 shadow-md border border-emerald-800/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold uppercase tracking-wider border border-emerald-500/30">
                Menu Spesifik Peran Guru
              </span>
              <span className="text-emerald-400 text-xs">·</span>
              <span className="text-emerald-200 text-xs font-mono">Biologi SMA Fase E</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <SlidersHorizontal className="w-8 h-8 text-emerald-400" />
              Pengaturan & Pembuatan Kuis Spesifik
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              Atur dan sesuaikan secara presisi: <strong>Nama Kuis</strong>, <strong>Jumlah Soal</strong> (@25 poin, @20 poin, dll.), serta <strong>Kombinasi Jenis Soal</strong> (Pilihan Ganda, Benar/Salah, Menjodohkan, Uraian).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => loadData()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all shadow-sm"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 ${
                activeTab === 'batch'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-300 text-emerald-950 font-mono'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Multi-Kuis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('batch')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'batch'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Generator Kuis ({quizCount} Kuis · {questionsPerQuiz} Soal)</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'list'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Daftar Kuis Terbit ({quizzes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === 'single'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Susun 1 Kuis Manual</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: GENERATOR KUIS SPESIFIK (JUMLAH KUIS, SOAL, JENIS) */}
      {/* ========================================================= */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-emerald-900/10 shadow-xs p-6 sm:p-8 space-y-8">
            
            {/* FITUR 1: JUMLAH KUIS */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Berapa Jumlah Kuis yang Ingin Dibuat?
                    </h2>
                    <p className="text-xs text-slate-500">
                      Tentukan banyaknya paket kuis yang ingin diterbitkan secara serentak (1 s.d. 10 kuis).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">Jumlah Kuis:</span>
                  <span className="text-lg font-black font-mono px-3 py-1 bg-emerald-100 text-emerald-950 rounded-xl border border-emerald-300">
                    {quizCount} Kuis
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Stepper */}
                <div className="md:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setQuizCount(prev => Math.max(1, prev - 1))}
                    disabled={quizCount <= 1}
                    className="w-10 h-10 rounded-xl bg-white text-slate-700 hover:bg-slate-200 disabled:opacity-40 font-black text-lg border border-slate-200 shadow-2xs flex items-center justify-center transition-all"
                  >
                    -
                  </button>
                  <div className="text-center">
                    <span className="text-3xl font-black font-mono text-emerald-950 block">
                      {quizCount}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Paket Kuis
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuizCount(prev => Math.min(10, prev + 1))}
                    disabled={quizCount >= 10}
                    className="w-10 h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 font-black text-lg shadow-2xs flex items-center justify-center transition-all"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="md:col-span-7 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuizCount(num)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                        quizCount === num
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {num === 6 ? '6 Kuis (6 Bab Biologi)' : `${num} Kuis`}
                    </button>
                  ))}
                  {[8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuizCount(num)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                        quizCount === num
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {num} Kuis
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FITUR 2: MENENTUKAN JUMLAH SOAL PER KUIS */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Menentukan Jumlah Butir Soal per Kuis
                    </h2>
                    <p className="text-xs text-slate-500">
                      Tentukan berapa jumlah butir soal yang dimuat di setiap paket kuis.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">Skor per Soal:</span>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
                    @{Math.round(100 / questionsPerQuiz)} Poin (Total 100)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { count: 3, label: '3 Soal', desc: '@33 poin' },
                  { count: 4, label: '4 Soal Standar', desc: '@25 poin (KKM 75)' },
                  { count: 5, label: '5 Soal', desc: '@20 poin' },
                  { count: 6, label: '6 Soal', desc: '@17 poin' },
                  { count: 8, label: '8 Soal', desc: '@12.5 poin' },
                  { count: 10, label: '10 Soal Ujian', desc: '@10 poin' },
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setQuestionsPerQuiz(item.count)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all ${
                      questionsPerQuiz === item.count
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-sm font-black font-mono block">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* FITUR 3: MENENTUKAN JENIS SOAL (QUESTION TYPES) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Menentukan Jenis Soal yang Disertakan
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pilih format soal apa saja yang boleh diambil dari bank soal untuk paket kuis ini.
                    </p>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => applyQuestionTypePreset('4types')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300 transition-colors whitespace-nowrap"
                  >
                    ⭐ 4 Format Pokok
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuestionTypePreset('mcq_only')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors whitespace-nowrap"
                  >
                    🔘 Hanya PG
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuestionTypePreset('hots')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300 transition-colors whitespace-nowrap"
                  >
                    🧠 HOTS & Esai
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuestionTypePreset('all')}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors whitespace-nowrap"
                  >
                    Semua Jenis
                  </button>
                </div>
              </div>

              {/* Question Types Checkboxes / Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {ALL_QUESTION_TYPES.map((type) => {
                  const isChecked = selectedQuestionTypes.includes(type.id);
                  const matchingCount = questions.filter(q => q.question_type === type.id).length;

                  return (
                    <div
                      key={type.id}
                      onClick={() => toggleQuestionType(type.id)}
                      className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {type.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {matchingCount} butir di bank
                          </span>
                        </div>
                      </div>

                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${type.badgeColor}`}>
                        {type.shortLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-mono bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {selectedQuestionTypes.length} jenis soal dipilih · Total {questionsInPool.length} butir soal yang cocok tersedia di bank soal.
                </span>
              </div>
            </div>

            {/* FITUR 4: PRATINJAU & EDIT NAMA SETIAP KUIS */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Pratinjau & Edit Nama Tiap Kuis ({generatedQuizzesPreview.length} Paket)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Ketik langsung pada kolom di bawah untuk mengganti nama kuis, atau sesuaikan butir soalnya.
                    </p>
                  </div>
                </div>

                {/* Quick Rename Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">Format Nama:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: Record<number, string> = {};
                      generatedQuizzesPreview.forEach((q, idx) => {
                        const top = topics[idx % (topics.length || 1)];
                        updated[idx] = `Penilaian Harian Bab ${idx + 1}: ${top ? top.title : `Biologi ${idx + 1}`}`;
                      });
                      setCustomTitles(updated);
                    }}
                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-200"
                  >
                    Nama Bab
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: Record<number, string> = {};
                      generatedQuizzesPreview.forEach((q, idx) => {
                        updated[idx] = `Asesmen Sumatif Biologi - Paket ${String.fromCharCode(65 + idx)}`;
                      });
                      setCustomTitles(updated);
                    }}
                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-200"
                  >
                    Paket A, B, C
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: Record<number, string> = {};
                      generatedQuizzesPreview.forEach((q, idx) => {
                        updated[idx] = `Latihan Soal Biologi Harian #${idx + 1}`;
                      });
                      setCustomTitles(updated);
                    }}
                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-200"
                  >
                    Latihan Seri
                  </button>
                </div>
              </div>

              {/* Cards Grid with Edit Name and Question Types Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedQuizzesPreview.map((item) => (
                  <div
                    key={item.index}
                    className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-emerald-500/50 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                          Kuis #{item.index + 1}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {item.questionIds.length} Butir Soal
                        </span>
                      </div>

                      {/* Explicit Edit Name Input */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Nama / Judul Kuis
                          </label>
                          <Edit3 className="w-3 h-3 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            setCustomTitles(prev => ({
                              ...prev,
                              [item.index]: e.target.value
                            }));
                          }}
                          placeholder={`Kuis Biologi Paket ${item.index + 1}`}
                          className="w-full p-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 shadow-2xs"
                        />
                      </div>

                      {/* Question types breakdown */}
                      <div className="p-2 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Komposisi Jenis Soal Terpilih:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.typesBreakdown).map(([t, count]) => {
                            const cfg = ALL_QUESTION_TYPES.find(x => x.id === t);
                            return (
                              <span key={t} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                {count}x {cfg?.shortLabel || t}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
                      <span>{item.duration} Menit · KKM {item.kkm}</span>
                      <button
                        type="button"
                        onClick={() => setPickingQuizIndex(item.index)}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                      >
                        Sesuaikan Soal
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Big Action Submit */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-600">
                  <p className="font-bold text-slate-900">
                    Menerbitkan {generatedQuizzesPreview.length} Kuis Baru ({questionsPerQuiz} Soal per Kuis)
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Kuis langsung aktif di akun siswa kelas terpilih untuk dikerjakan.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isGenerating || generatedQuizzesPreview.length === 0}
                  onClick={handleExecuteBatchCreate}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-700/25 transition-all active:scale-95 disabled:opacity-50 shrink-0 font-mono"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menerbitkan {generatedQuizzesPreview.length} Kuis...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Terbitkan {generatedQuizzesPreview.length} Kuis Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DAFTAR KUIS TERBIT & KELOLA KUIS                   */}
      {/* ========================================================= */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Daftar Seluruh Kuis Terbit ({quizzes.length})
              </h2>
              <p className="text-xs text-slate-500">
                Klik tombol <strong>Edit Kuis</strong> untuk mengubah nama kuis, durasi, dan menambah/mengurangi butir soal.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('batch')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 font-mono"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Multi-Kuis Baru</span>
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-mono">Memuat daftar kuis...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Belum ada kuis yang terbit</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Mulai buat kuis dengan memilih berapa jumlah kuis yang ingin dibuat melalui tab Generator Kuis.
              </p>
              <button
                onClick={() => setActiveTab('batch')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Pilih Jumlah & Buat Kuis Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {quiz.classroom_name || 'Biologi Kelas X'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        KKM: <strong className="text-emerald-700 font-bold">{quiz.passing_score}</strong>
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {quiz.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {quiz.description || 'Kuis asesmen terstruktur Biologi SMA Kelas X.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {quiz.duration_minutes} Menit
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {quiz.question_count} Soal
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-emerald-800">
                        {quiz.completed_attempts || 0} Siswa Selesai
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Edit Quiz Button */}
                      <button
                        onClick={() => handleOpenEditQuiz(quiz)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors shadow-2xs"
                        title="Edit Nama Kuis & Butir Soal"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit Kuis</span>
                      </button>

                      {/* Export CSV Button */}
                      <a
                        href={api.getExportUrl(quiz.id)}
                        download
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                        title="Unduh Rekap Nilai CSV"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="hidden sm:inline">CSV</span>
                      </a>
                    </div>

                    <button
                      onClick={() => setQuizToDelete({ id: quiz.id, title: quiz.title })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                      title="Hapus Kuis Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SUSUN 1 KUIS MANUAL TERINCI                        */}
      {/* ========================================================= */}
      {activeTab === 'single' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
          <div className="pb-4 mb-6 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Penyusunan Kuis Tunggal Terinci
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tentukan nama kuis, pilih jumlah soal, dan saring jenis soal sesuai kebutuhan.
            </p>
          </div>

          <form onSubmit={handleCreateSingleQuiz} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Nama / Judul Kuis <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={singleTitle}
                onChange={(e) => setSingleTitle(e.target.value)}
                placeholder="Contoh: Asesmen Sumatif Bab 3: Virus & Replikasi"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Deskripsi & Petunjuk Pengerjaan</label>
              <textarea
                rows={2}
                value={singleDescription}
                onChange={(e) => setSingleDescription(e.target.value)}
                placeholder="Petunjuk pengerjaan asesmen bagi siswa..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Kelas</label>
                <select
                  value={singleClassroomId}
                  onChange={(e) => setSingleClassroomId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Topik Utama</label>
                <select
                  value={singleTopicId}
                  onChange={(e) => setSingleTopicId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.code} - {t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Durasi Pengerjaan (Menit)</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={singleDuration}
                  onChange={(e) => setSingleDuration(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nilai KKM (Passing Score)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={singlePassingScore}
                  onChange={(e) => setSinglePassingScore(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold text-emerald-800"
                />
              </div>
            </div>

            {/* Questions Picker with Type Filter */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="block text-slate-700 font-bold">
                  Pilih Butir Soal dari Bank ({singleSelectedQuestions.length} Dipilih)
                </label>

                {/* Filter Type Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSingleTypeFilter('all')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${singleTypeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Semua
                  </button>
                  {ALL_QUESTION_TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSingleTypeFilter(t.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${singleTypeFilter === t.id ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {t.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 p-2.5 rounded-2xl bg-slate-50">
                {questions
                  .filter(q => singleTypeFilter === 'all' || q.question_type === singleTypeFilter)
                  .map((q) => {
                    const isSelected = singleSelectedQuestions.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          setSingleSelectedQuestions(prev =>
                            prev.includes(q.id) ? prev.filter(x => x !== q.id) : [...prev, q.id]
                          );
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-800 rounded font-bold">{q.cognitive_level}</span>
                            {renderQuestionTypeBadge(q.question_type)}
                            <span>·</span>
                            <span className="text-emerald-800 font-semibold">{q.topic_title}</span>
                          </div>
                          <p className="line-clamp-2 leading-relaxed">{q.question_text}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSingleSaving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-700/20 disabled:opacity-50"
              >
                {isSingleSaving ? 'Menyimpan Kuis...' : 'Publikasikan Kuis'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: EDIT KUIS TERBIT (NAMA KUIS, JUMLAH SOAL, JENIS) */}
      {/* ========================================================= */}
      {editingQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Detail Kuis & Butir Soal
                  </h3>
                  <p className="text-xs text-slate-500">
                    ID: {editingQuiz.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingQuiz(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditQuiz} className="space-y-4 text-xs">
              {/* Edit Nama Kuis */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nama / Judul Kuis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editQuizTitle}
                  onChange={(e) => setEditQuizTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/30 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Deskripsi / Petunjuk
                </label>
                <textarea
                  rows={2}
                  value={editQuizDescription}
                  onChange={(e) => setEditQuizDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={editQuizDuration}
                    onChange={(e) => setEditQuizDuration(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">KKM (Passing Score)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editQuizPassingScore}
                    onChange={(e) => setEditQuizPassingScore(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-800"
                  />
                </div>
              </div>

              {/* Edit Questions Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-slate-700 font-bold">
                      Tentukan Butir Soal ({editQuizSelectedQuestions.length} Soal Terpilih)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Bobot: @{Math.round(100 / (editQuizSelectedQuestions.length || 1))} Poin per soal
                    </span>
                  </div>

                  {/* Filter by Type */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditQuizTypeFilter('all')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${editQuizTypeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Semua
                    </button>
                    {ALL_QUESTION_TYPES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEditQuizTypeFilter(t.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${editQuizTypeFilter === t.id ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {t.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 p-2.5 rounded-2xl bg-slate-50">
                  {questions
                    .filter(q => editQuizTypeFilter === 'all' || q.question_type === editQuizTypeFilter)
                    .map((q) => {
                      const isSelected = editQuizSelectedQuestions.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => {
                            setEditQuizSelectedQuestions(prev =>
                              prev.includes(q.id) ? prev.filter(x => x !== q.id) : [...prev, q.id]
                            );
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-600 text-blue-950 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-mono text-[10px]">
                              {renderQuestionTypeBadge(q.question_type)}
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-600 font-semibold">{q.topic_title}</span>
                            </div>
                            <p className="line-clamp-2">{q.question_text}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingQuiz(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Pembaruan Kuis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: SESUAIKAN BUTIR SOAL UNTUK PREVIEW MULTI-KUIS    */}
      {/* ========================================================= */}
      {pickingQuizIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pilih Butir Soal untuk Kuis #{pickingQuizIndex + 1}
                </h3>
                <p className="text-xs text-slate-500">
                  {generatedQuizzesPreview[pickingQuizIndex]?.title}
                </p>
              </div>
              <button
                onClick={() => setPickingQuizIndex(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {questionsInPool.map((q) => {
                const currentAllocated = generatedQuizzesPreview[pickingQuizIndex]?.questionIds || [];
                const isSelected = currentAllocated.includes(q.id);

                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      setCustomQuizQuestions(prev => {
                        const existing = prev[pickingQuizIndex] || currentAllocated;
                        const next = existing.includes(q.id)
                          ? existing.filter(x => x !== q.id)
                          : [...existing, q.id];
                        return { ...prev, [pickingQuizIndex]: next };
                      });
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        {renderQuestionTypeBadge(q.question_type)}
                        <span className="text-slate-500 font-semibold">{q.topic_title}</span>
                      </div>
                      <p className="line-clamp-2">{q.question_text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPickingQuizIndex(null)}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Selesai Memilih Soal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CONFIRM DELETE                                   */}
      {/* ========================================================= */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Hapus Paket Kuis?
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Anda akan menghapus kuis <strong>"{quizToDelete.title}"</strong>. Data pengerjaan yang terkait juga akan dibersihkan. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setQuizToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Kuis'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
