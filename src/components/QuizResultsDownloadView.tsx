import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { generateClassSummaryPdf, generateStudentReportCardPdf } from '../lib/pdfGenerator';
import { 
  FileDown, Download, Users, CheckCircle2, AlertTriangle, 
  Printer, Eye, X, Search, Filter, Sparkles, BookOpen, 
  ChevronRight, ArrowUpDown, FileText, Check, Award,
  Clock, ShieldCheck, RefreshCw, BarChart2, Leaf
} from 'lucide-react';
import biologyHeroImage from '../assets/images/biology_aesthetic_green_1792837778015.jpg';

interface QuizResultsDownloadViewProps {
  currentUser?: any;
  onViewDetailResult?: (attemptId: string) => void;
}

export const QuizResultsDownloadView: React.FC<QuizResultsDownloadViewProps> = ({ 
  currentUser, 
  onViewDetailResult 
}) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('quiz-bio-4tipe');
  const [classroomId, setClassroomId] = useState<string>('cls-x-a');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'remedial' | 'not_attempted'>('all');
  const [sortBy, setSortBy] = useState<'nis' | 'name' | 'score'>('nis');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // PDF Preview Modal
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>('');
  const [downloadHandler, setDownloadHandler] = useState<(() => void) | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);
  const [downloadingAttemptId, setDownloadingAttemptId] = useState<string | null>(null);

  // In-app Toast Feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadQuizzesAndData();
  }, []);

  useEffect(() => {
    if (selectedQuizId) {
      loadQuizResults(selectedQuizId, classroomId);
    }
  }, [selectedQuizId, classroomId]);

  async function loadQuizzesAndData() {
    try {
      setLoading(true);
      const quizList = await api.getQuizzes();
      setQuizzes(quizList);
      const defaultQuizId = quizList[0]?.id || 'quiz-bio-4tipe';
      setSelectedQuizId(defaultQuizId);
      await loadQuizResults(defaultQuizId, classroomId);
    } catch (err: any) {
      console.error('Failed to load quizzes', err);
      showToast('error', 'Gagal memuat daftar kuis: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadQuizResults(quizId: string, cId: string) {
    try {
      setLoading(true);
      const res = await api.getClassroomStudents(cId, quizId);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load quiz results', err);
      showToast('error', 'Gagal memuat hasil kuis: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  // =========================================================================
  // DOWNLOAD REKAP KOLEKTIF (PDF KELAS)
  // =========================================================================
  function handleDownloadCollectivePdf(previewOnly: boolean = false) {
    if (!data) return;
    try {
      setGeneratingPdf(true);
      const teacherName = currentUser?.full_name || 'Evi Dwiyanti, S.Pd';
      const teacherNip = currentUser?.nip || '19820815 200801 2 015';
      const schoolName = currentUser?.school_name || 'SMA Negeri 1 Teladan';

      const pdfData = {
        classroom: {
          name: data.classroom?.name || 'Kelas X-A Biologi',
          code: data.classroom?.code || 'BIO-XA-2026',
          academic_year: data.classroom?.academic_year || '2026/2027',
        },
        quiz: {
          title: data.quiz?.title || 'Kuis Standar Biologi: PG, Benar/Salah, Menjodohkan & Uraian',
          passing_score: data.quiz?.passing_score || 75,
          duration_minutes: 30,
        },
        teacherName,
        teacherNip,
        schoolName,
        totalStudents: data.totalStudents,
        attemptedCount: data.attemptedCount,
        passedCount: data.passedCount,
        remedialCount: data.remedialCount,
        passRate: data.passRate,
        averageScore: data.averageScore,
        highestScore: data.highestScore,
        lowestScore: data.lowestScore,
        students: data.students.map((st: any) => ({
          no: st.no,
          nis: st.nis,
          name: st.name,
          gender: st.gender,
          breakdown: st.breakdown || { pg: 0, bs: 0, jd: 0, es: 0 },
          score: st.score,
          isPassed: st.isPassed,
          kkmStatus: st.kkmStatus,
          teacherNote: st.teacherNote,
        })),
      };

      const result = generateClassSummaryPdf(pdfData);

      if (previewOnly) {
        setPdfUrl(result.blobUrl);
        setPdfTitle(`Rekapitulasi Kolektif Nilai - ${data.classroom?.name || 'Kelas X-A'}`);
        setDownloadHandler(() => result.download);
        setShowPdfModal(true);
      } else {
        result.download();
        showToast('success', 'Rekapitulasi Nilai Kolektif PDF berhasil diunduh.');
      }
    } catch (err: any) {
      console.error('PDF error', err);
      showToast('error', 'Gagal memproses PDF: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  }

  // =========================================================================
  // DOWNLOAD REKAP KOLEKTIF (CSV / SPREADSHEET EXCEL)
  // =========================================================================
  function handleDownloadCollectiveCsv() {
    if (!data) return;
    try {
      const quizTitle = data.quiz?.title || 'Kuis Biologi';
      const className = data.classroom?.name || 'Kelas X-A';
      
      const sanitize = (val: any) => {
        let str = String(val ?? '');
        if (/^[=+@-].*/.test(str)) {
          str = "'" + str;
        }
        return `"${str.replace(/"/g, '""')}"`;
      };

      const headerMeta = [
        `REKAPITULASI NILAI KOLEKTIF ASESMEN BIOLOGI KELAS X`,
        `Kuis: ${quizTitle}`,
        `Kelas: ${className} | Tahun Ajaran: 2026/2027 | Standar KKM: ${data.quiz?.passing_score || 75}`,
        `Guru Pengampu: ${currentUser?.full_name || 'Evi Dwiyanti, S.Pd'} (NIP: ${currentUser?.nip || '-'})`,
        `Rata-Rata Kelas: ${data.averageScore} | Nilai Tertinggi: ${data.highestScore} | Nilai Terendah: ${data.lowestScore} | Ketuntasan: ${data.passRate}%`,
        ``
      ].map(line => sanitize(line)).join('\n');

      const tableHeaders = [
        'No',
        'NIS',
        'Nama Lengkap Siswa',
        'L/P',
        'Email Siswa',
        'Nilai PG',
        'Nilai Benar/Salah',
        'Nilai Menjodohkan',
        'Nilai Uraian/Esai',
        'Nilai Akhir (Skor)',
        'Status KKM',
        'Tanggal Pengerjaan',
        'Catatan Guru'
      ].join(',');

      const rows = data.students.map((st: any) => [
        sanitize(st.no),
        sanitize(st.nis),
        sanitize(st.name),
        sanitize(st.gender),
        sanitize(st.email),
        sanitize(st.breakdown?.pg ?? 0),
        sanitize(st.breakdown?.bs ?? 0),
        sanitize(st.breakdown?.jd ?? 0),
        sanitize(st.breakdown?.es ?? 0),
        sanitize(st.score !== null ? st.score : 'Belum Mengerjakan'),
        sanitize(st.kkmStatus),
        sanitize(st.attemptDate || '-'),
        sanitize(st.teacherNote || '-')
      ].join(','));

      const csvContent = `${headerMeta}\n${tableHeaders}\n${rows.join('\n')}`;
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Rekap_Nilai_Kolektif_${className.replace(/\s+/g, '_')}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', 'Rekapitulasi Nilai Kolektif format CSV berhasil diunduh.');
    } catch (err: any) {
      console.error('CSV error', err);
      showToast('error', 'Gagal mengunduh CSV: ' + err.message);
    }
  }

  // =========================================================================
  // DOWNLOAD INDIVIDUAL STUDENT REPORT CARD (PDF RAPOR SISWA)
  // =========================================================================
  async function handleDownloadStudentPdf(attemptId: string, studentName: string, previewOnly: boolean = false) {
    try {
      setDownloadingAttemptId(attemptId);
      const pdfData = await api.getAttemptPdfData(attemptId);
      const result = generateStudentReportCardPdf(pdfData);

      if (previewOnly) {
        setPdfUrl(result.blobUrl);
        setPdfTitle(`Rapor Hasil Kuis - ${studentName}`);
        setDownloadHandler(() => result.download);
        setShowPdfModal(true);
      } else {
        result.download();
        showToast('success', `Rapor hasil kuis atas nama ${studentName} berhasil diunduh.`);
      }
    } catch (err: any) {
      console.error('Failed to generate student PDF', err);
      showToast('error', 'Gagal memproses rapor siswa: ' + err.message);
    } finally {
      setDownloadingAttemptId(null);
    }
  }

  // Filter & Sort Students
  const filteredStudents = (data?.students || [])
    .filter((st: any) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = st.name.toLowerCase().includes(q);
        const matchesNis = st.nis.toLowerCase().includes(q);
        if (!matchesName && !matchesNis) return false;
      }
      if (statusFilter === 'passed') return st.isPassed;
      if (statusFilter === 'remedial') return st.hasAttempted && !st.isPassed;
      if (statusFilter === 'not_attempted') return !st.hasAttempted;
      return true;
    })
    .sort((a: any, b: any) => {
      let comparison = 0;
      if (sortBy === 'nis') {
        comparison = a.nis.localeCompare(b.nis);
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'score') {
        const scoreA = a.score ?? -1;
        const scoreB = b.score ?? -1;
        comparison = scoreA - scoreB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'success' 
            ? 'bg-emerald-950 text-emerald-100 border-emerald-700/80' 
            : 'bg-rose-950 text-rose-100 border-rose-700/80'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* =========================================================================
          HERO BANNER: UNDUH NILAI & REKAP KOLEKTIF (ESTETIK BOTANIKAL)
      ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#021f14] via-[#053723] to-[#01190f] text-white border border-emerald-700/50 shadow-2xl">
        <div className="absolute top-0 right-1/4 -mt-20 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 -mr-20 -mb-20 w-80 h-80 rounded-full bg-teal-400/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Heading and Overview */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-300">
                <span className="px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 text-[11px] font-mono tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                  Pusat Asesmen & Rapor Sains
                </span>
                <span aria-hidden="true" className="text-emerald-500">·</span>
                <span className="text-emerald-200 font-medium">Fase E Kelas X</span>
                <span aria-hidden="true" className="text-emerald-500">·</span>
                <span className="text-teal-300 font-mono text-[11px]">KKM Standar: 75</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  Unduh Nilai & Rekap Kolektif Hasil Kuis
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed font-normal max-w-2xl">
                  Unduh lembar hasil asesmen pengerjaan kuis siswa secara individu (format Rapor PDF komprehensif) maupun rekapitulasi nilai kolektif seluruh kelas (format PDF siap cetak dan berkas CSV spreadsheet).
                </p>
              </div>

              {/* Fast Action Buttons for Collective Export */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleDownloadCollectivePdf(false)}
                  disabled={generatingPdf || !data}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 text-emerald-950 rounded-xl hover:from-emerald-300 hover:to-teal-200 transition-all shadow-md active:scale-95 font-mono cursor-pointer disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4 stroke-[2.5]" />
                  <span>Unduh Rekap Kolektif (PDF)</span>
                </button>

                <button
                  onClick={handleDownloadCollectiveCsv}
                  disabled={!data}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-500/40 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-emerald-300" />
                  <span>Unduh Rekap CSV / Excel</span>
                </button>

                <button
                  onClick={() => handleDownloadCollectivePdf(true)}
                  disabled={generatingPdf || !data}
                  className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Lihat Pratinjau Dokumen Rekap Cetak"
                >
                  <Eye className="w-4 h-4 text-teal-300" />
                  <span>Pratinjau PDF Cetak</span>
                </button>
              </div>
            </div>

            {/* Right Column: Quiz Selector Card */}
            <div className="lg:col-span-4 bg-emerald-950/90 border border-emerald-600/50 rounded-2xl p-5 shadow-xl space-y-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-emerald-300 pb-2 border-b border-emerald-800/80">
                <span className="font-bold flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  Pilih Kuis yang Dianalisis
                </span>
                <span className="text-[10px] bg-emerald-900/80 px-2 py-0.5 rounded text-emerald-200 border border-emerald-500/30">
                  {quizzes.length} Kuis Tersedia
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-emerald-200">
                  Paket Kuis Biologi:
                </label>
                <select
                  value={selectedQuizId}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                  className="w-full bg-slate-900 border border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedQuiz && (
                <div className="space-y-1.5 text-xs text-emerald-100/90 bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/50 font-mono">
                  <div className="flex justify-between">
                    <span className="text-emerald-400">Passing Score:</span>
                    <span className="font-bold text-white">KKM {selectedQuiz.passing_score || 75}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-400">Durasi Ujian:</span>
                    <span>{selectedQuiz.duration_minutes || 30} Menit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-400">Siswa Menyelesaikan:</span>
                    <span className="font-bold text-teal-300">{data?.attemptedCount || 0} dari {data?.totalStudents || 35} Murid</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 1: NILAI KOLEKTIF HASIL PENGERJAAN KUIS (STATISTIK AGREGAT KELAS)
      ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-700" />
              <span>Nilai Kolektif Hasil Pengerjaan Kuis (Rekapitulasi Kelas)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Statistik kumulatif performa sains seluruh siswa kelas untuk kuis "{data?.quiz?.title || 'Kuis Biologi'}".
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg font-bold">
              Kelas X-A (35 Siswa)
            </span>
          </div>
        </div>

        {/* 4 Collective KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Card 1: Rata-Rata Nilai Kolektif */}
          <div className="bg-gradient-to-br from-emerald-900/10 via-emerald-800/5 to-white border border-emerald-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                Rata-Rata Kolektif
              </span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-950 font-mono tabular-nums">
                {data?.averageScore || 0}
              </span>
              <span className="text-xs font-bold text-emerald-700">/ 100</span>
            </div>
            <p className="mt-2 text-[11px] font-medium text-emerald-800">
              {Number(data?.averageScore || 0) >= 75 ? '✓ Memenuhi standar KKM 75' : '⚠ Di bawah batas KKM 75'}
            </p>
          </div>

          {/* Card 2: Tingkat Ketuntasan Kelas */}
          <div className="bg-gradient-to-br from-teal-900/10 via-teal-800/5 to-white border border-teal-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider">
                Tingkat Ketuntasan
              </span>
              <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-teal-950 font-mono tabular-nums">
                {data?.passRate || 0}%
              </span>
              <span className="text-xs font-semibold text-teal-700">tuntas</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-600">
              {data?.passedCount || 0} siswa lulus KKM
            </p>
          </div>

          {/* Card 3: Rentang Skor Tertinggi & Terendah */}
          <div className="bg-gradient-to-br from-emerald-900/10 via-emerald-800/5 to-white border border-emerald-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                Rentang Nilai
              </span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <div>
                <span className="text-xs text-slate-500 font-mono block">Tertinggi</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">{data?.highestScore || 0}</span>
              </div>
              <div className="text-slate-300 font-mono text-xl">/</div>
              <div>
                <span className="text-xs text-slate-500 font-mono block">Terendah</span>
                <span className="text-2xl font-black text-rose-600 font-mono">{data?.lowestScore || 0}</span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Evaluasi penyebaran kemampuan
            </p>
          </div>

          {/* Card 4: Siswa Perlu Remedial */}
          <div className="bg-gradient-to-br from-amber-900/10 via-amber-800/5 to-white border border-amber-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-emerald-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                Perlu Remedial
              </span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono tabular-nums ${
                (data?.remedialCount || 0) > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}>
                {data?.remedialCount || 0}
              </span>
              <span className="text-xs font-semibold text-amber-800">murid</span>
            </div>
            <p className="mt-2 text-[11px] text-amber-900 font-medium">
              {(data?.remedialCount || 0) > 0 ? 'Memerlukan modul penguatan' : 'Semua siswa tuntas KKM!'}
            </p>
          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION 2: TABEL NILAI HASIL PENGERJAAN SETIAP SISWA & UNDUH RAPOR
      ========================================================================= */}
      <section className="bg-white border border-emerald-200/80 rounded-2xl shadow-sm overflow-hidden space-y-0">
        
        {/* Table Filter Toolbar */}
        <div className="p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama atau NIS murid..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-emerald-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filter Pills and Sorter */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-xl p-1 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === 'all' 
                    ? 'bg-emerald-800 text-white shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({data?.students?.length || 0})
              </button>
              <button
                onClick={() => setStatusFilter('passed')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === 'passed' 
                    ? 'bg-emerald-600 text-white shadow-xs font-bold' 
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                Tuntas ({data?.passedCount || 0})
              </button>
              <button
                onClick={() => setStatusFilter('remedial')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === 'remedial' 
                    ? 'bg-amber-600 text-white shadow-xs font-bold' 
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                Remedial ({data?.remedialCount || 0})
              </button>
            </div>

            {/* Sorter */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-') as ['nis' | 'name' | 'score', 'asc' | 'desc'];
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="bg-white border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
            >
              <option value="nis-asc">Urut: NIS (Naik)</option>
              <option value="name-asc">Urut: Nama Siswa (A-Z)</option>
              <option value="score-desc">Urut: Nilai Tertinggi</option>
              <option value="score-asc">Urut: Nilai Terendah</option>
            </select>

            <button
              onClick={() => loadQuizResults(selectedQuizId, classroomId)}
              className="p-2 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
              title="Segarkan data hasil kuis"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

          </div>

        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-950 text-white border-b border-emerald-900 font-mono text-[11px]">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-3 w-28">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-2 text-center w-12">L/P</th>
                <th className="py-3 px-3 text-center w-16">PG</th>
                <th className="py-3 px-3 text-center w-16">B/S</th>
                <th className="py-3 px-3 text-center w-16">Jodoh</th>
                <th className="py-3 px-3 text-center w-16">Uraian</th>
                <th className="py-3 px-3 text-center w-24">Nilai Akhir</th>
                <th className="py-3 px-3 text-center w-28">Status KKM</th>
                <th className="py-3 px-4 text-center w-48">Aksi Unduh Rapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-mono">
                    <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat hasil pengerjaan kuis siswa...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-mono italic">
                    Tidak ditemukan data hasil siswa yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st: any, idx: number) => {
                  const hasAttempt = Boolean(st.attemptId);
                  const isPassed = st.isPassed;
                  const isDownloading = downloadingAttemptId === st.attemptId;

                  return (
                    <tr 
                      key={st.id || idx}
                      className="hover:bg-emerald-50/40 transition-colors"
                    >
                      {/* No */}
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>

                      {/* NIS */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                        {st.nis}
                      </td>

                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={st.avatar || (st.gender === 'P' ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80' : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80')} 
                            alt={st.name} 
                            className="w-7 h-7 rounded-full object-cover border border-emerald-300 shrink-0" 
                          />
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {st.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {st.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="py-3 px-2 text-center font-mono text-slate-600">
                        {st.gender}
                      </td>

                      {/* Breakdown PG */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                        {hasAttempt ? (st.breakdown?.pg ?? 0) : '-'}
                      </td>

                      {/* Breakdown BS */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                        {hasAttempt ? (st.breakdown?.bs ?? 0) : '-'}
                      </td>

                      {/* Breakdown JD */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                        {hasAttempt ? (st.breakdown?.jd ?? 0) : '-'}
                      </td>

                      {/* Breakdown ES */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                        {hasAttempt ? (st.breakdown?.es ?? 0) : '-'}
                      </td>

                      {/* Final Score */}
                      <td className="py-3 px-3 text-center font-mono">
                        {hasAttempt ? (
                          <span className={`text-sm font-black ${isPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {st.score}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum</span>
                        )}
                      </td>

                      {/* KKM Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {hasAttempt ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider inline-block ${
                            isPassed 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {isPassed ? 'TUNTAS' : 'REMEDIAL'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            BELUM
                          </span>
                        )}
                      </td>

                      {/* Action Buttons: Unduh Rapor PDF */}
                      <td className="py-3 px-4 text-center">
                        {hasAttempt && st.attemptId ? (
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* Download PDF Rapor Siswa */}
                            <button
                              onClick={() => handleDownloadStudentPdf(st.attemptId, st.name, false)}
                              disabled={isDownloading}
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs font-mono"
                              title={`Unduh Rapor PDF ${st.name}`}
                            >
                              <FileDown className="w-3.5 h-3.5 text-emerald-800" />
                              <span>{isDownloading ? 'Memproses...' : 'Unduh PDF'}</span>
                            </button>

                            {/* Pratinjau PDF Rapor Siswa */}
                            <button
                              onClick={() => handleDownloadStudentPdf(st.attemptId, st.name, true)}
                              disabled={isDownloading}
                              className="p-1 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              title="Pratinjau Rapor PDF"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* View interactive result */}
                            {onViewDetailResult && (
                              <button
                                onClick={() => onViewDetailResult(st.attemptId)}
                                className="p-1 text-slate-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title="Lihat Lembar Jawaban Interaktif"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Tidak ada percobaan
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-4 bg-slate-50 border-t border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
          <div className="font-mono">
            Menampilkan <strong className="text-slate-900">{filteredStudents.length}</strong> dari <strong className="text-slate-900">{data?.totalStudents || 35}</strong> murid terdaftar di {data?.classroom?.name || 'Kelas X-A'}.
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Tuntas: {data?.passedCount || 0}
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Remedial: {data?.remedialCount || 0}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
              Belum: {(data?.totalStudents || 35) - (data?.attemptedCount || 0)}
            </span>
          </div>
        </div>

      </section>

      {/* =========================================================================
          MODAL: PRATINJAU DOKUMEN PDF (INTERAKTIF IFRAME PREVIEW)
      ========================================================================= */}
      {showPdfModal && pdfUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-emerald-200">
            
            {/* Modal Top Bar */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileDown className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">
                    {pdfTitle}
                  </h3>
                  <p className="text-[11px] text-emerald-300/80 font-mono">
                    Dokumen Resmi Hasil Kuis & Rekapitulasi Nilai Siswa
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {downloadHandler && (
                  <button
                    onClick={downloadHandler}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-lg transition-colors cursor-pointer font-mono"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Sekarang</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowPdfModal(false);
                    setPdfUrl(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal PDF Viewer Body */}
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              <iframe
                src={pdfUrl}
                title="Pratinjau PDF"
                className="w-full h-full rounded-xl border border-slate-300 shadow-inner bg-white"
              />
            </div>

            {/* Modal Bottom Bar */}
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px]">
                Dokumen telah diverifikasi dengan standar kop resmi sekolah dan analisis KKM.
              </span>
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  setPdfUrl(null);
                }}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
