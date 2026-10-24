import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { generateClassSummaryPdf, generateStudentReportCardPdf } from '../lib/pdfGenerator';
import { 
  Users, FileDown, Plus, RotateCcw, Search, Filter, 
  CheckCircle2, AlertTriangle, Printer, Eye, X, Sparkles, BookOpen, UserPlus, Check, Trash2, Edit3, UserCheck, HelpCircle
} from 'lucide-react';

interface ClassRosterViewProps {
  currentUser?: any;
  onViewStudentReport?: (attemptId: string) => void;
}

export const ClassRosterView: React.FC<ClassRosterViewProps> = ({ currentUser, onViewStudentReport }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kkmFilter, setKkmFilter] = useState<'all' | 'passed' | 'remedial'>('all');

  // Modals
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);

  // In-app confirmation modals (no window.alert or window.confirm)
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // In-app toast feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // PDF Preview state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>('');
  const [downloadHandler, setDownloadHandler] = useState<(() => void) | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  // Batch import form state
  const [batchCount, setBatchCount] = useState<number>(35);
  const [batchNamesText, setBatchNamesText] = useState<string>('');
  const [batchSubmitting, setBatchSubmitting] = useState<boolean>(false);

  // Single add form state
  const [singleName, setSingleName] = useState<string>('');
  const [singleNis, setSingleNis] = useState<string>('');
  const [singleGender, setSingleGender] = useState<'L' | 'P'>('L');
  const [singleSubmitting, setSingleSubmitting] = useState<boolean>(false);

  // Edit student form state
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    nis: '',
    gender: 'L' as 'L' | 'P',
    email: '',
    pg: 25,
    bs: 25,
    jd: 25,
    es: 20,
    teacher_feedback: '',
  });
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);

  function handleOpenEdit(st: any) {
    setEditingStudent(st);
    setEditFormData({
      name: st.name || '',
      nis: st.nis || '',
      gender: (st.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
      email: st.email || '',
      pg: st.breakdown?.pg ?? 25,
      bs: st.breakdown?.bs ?? 25,
      jd: st.breakdown?.jd ?? 25,
      es: st.breakdown?.es ?? 20,
      teacher_feedback: st.teacherNote || '',
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editFormData.name.trim()) {
      showToast('error', 'Nama murid tidak boleh kosong.');
      return;
    }

    try {
      setEditSubmitting(true);
      const res = await api.updateStudent(editingStudent.id, {
        name: editFormData.name,
        nis: editFormData.nis,
        gender: editFormData.gender,
        email: editFormData.email,
        pg: Number(editFormData.pg),
        bs: Number(editFormData.bs),
        jd: Number(editFormData.jd),
        es: Number(editFormData.es),
        teacher_feedback: editFormData.teacher_feedback,
      });

      await loadRoster();
      setEditingStudent(null);
      window.dispatchEvent(new CustomEvent('bio-accounts-changed'));
      showToast('success', res.message || `Data murid "${editFormData.name}" berhasil diperbarui!`);
    } catch (err: any) {
      showToast('error', `Gagal memperbarui data murid: ${err.message}`);
    } finally {
      setEditSubmitting(false);
    }
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }

  useEffect(() => {
    loadRoster();
  }, []);

  async function loadRoster() {
    try {
      setLoading(true);
      const res = await api.getClassroomStudents('cls-x-a', 'quiz-bio-4tipe');
      setData(res);
    } catch (err: any) {
      console.error('Failed to load classroom roster', err);
      showToast('error', `Gagal memuat data kelas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Preset sample 35 Indonesian names for fast loading
  const SAMPLE_35_NAMES = [
    'Aditia Pratama', 'Aisyah Nur Rahmah', 'Alifian Raka Putra', 'Amanda Putri Maharani', 'Andi Pratama',
    'Annisa Dwi Lestari', 'Bagas Setiawan', 'Bima Arya Sena', 'Bunga Citra Lestari', 'Cantika Dewi Anggraini',
    'Daffa Rizky Ramadhan', 'Denis Pratama', 'Devi Anggraini', 'Dimas Wahyu Utomo', 'Eka Putri Salsabila',
    'Fadhil Muhammad', 'Fajar Nur Hidayat', 'Gita Savitri Dewi', 'Hafidz Zaidan', 'Hana Farida',
    'Ilham Fauzan', 'Indah Permatasari', 'Kevin Maulana', 'Lutfi Hakim', 'Maya Indah Sari',
    'Muhammad Farhan', 'Nabila Zahra', 'Nurul Azizah', 'Raditya Nugraha', 'Rahmat Hidayat',
    'Rina Kartika', 'Rizki Firmansyah', 'Siti Nur Haliza', 'Tegar Wicaksono', 'Zahra Amelia Putri'
  ];

  function handleFillSample35() {
    setBatchCount(35);
    setBatchNamesText(SAMPLE_35_NAMES.join('\n'));
  }

  async function handleBatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lines = batchNamesText
      .split(/\r?\n/)
      .map(line => line.replace(/^(\d+[\.\)]\s*|\-\s*)/, '').trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      showToast('error', 'Silakan masukkan minimal 1 nama murid.');
      return;
    }

    try {
      setBatchSubmitting(true);
      const studentsToImport = lines.map((name, idx) => ({
        name,
        nis: `2401${String(idx + 1).padStart(2, '0')}`,
        gender: idx % 2 === 0 ? 'L' : 'P',
      }));

      const res = await api.batchImportStudents(studentsToImport, 'cls-x-a', true);
      await loadRoster();
      window.dispatchEvent(new CustomEvent('bio-accounts-changed'));
      setShowBatchModal(false);
      setBatchNamesText('');
      showToast('success', res.message || `Berhasil menerapkan ${lines.length} nama murid ke dalam kelas!`);
    } catch (err: any) {
      showToast('error', `Gagal menerapkan murid: ${err.message}`);
    } finally {
      setBatchSubmitting(false);
    }
  }

  async function handleAddSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!singleName.trim()) {
      showToast('error', 'Nama murid wajib diisi.');
      return;
    }

    try {
      setSingleSubmitting(true);
      const res = await api.addStudent({
        name: singleName,
        nis: singleNis,
        gender: singleGender,
        classroomId: 'cls-x-a',
      });
      await loadRoster();
      window.dispatchEvent(new CustomEvent('bio-accounts-changed'));
      setShowAddModal(false);
      setSingleName('');
      setSingleNis('');
      showToast('success', res.message || 'Murid baru berhasil ditambahkan!');
    } catch (err: any) {
      showToast('error', `Gagal menambahkan murid: ${err.message}`);
    } finally {
      setSingleSubmitting(false);
    }
  }

  function handleDeleteStudent(id: string, name: string) {
    setConfirmDeleteTarget({ id, name });
  }

  async function executeDeleteStudent() {
    if (!confirmDeleteTarget) return;
    try {
      const res = await api.deleteStudent(confirmDeleteTarget.id);
      await loadRoster();
      window.dispatchEvent(new CustomEvent('bio-accounts-changed'));
      showToast('success', res.message || `Murid "${confirmDeleteTarget.name}" berhasil dihapus.`);
    } catch (err: any) {
      showToast('error', `Gagal menghapus murid: ${err.message}`);
    } finally {
      setConfirmDeleteTarget(null);
    }
  }

  function handleReset35() {
    setConfirmResetOpen(true);
  }

  async function executeReset35() {
    try {
      setLoading(true);
      setConfirmResetOpen(false);
      const res = await api.reset35Students();
      await loadRoster();
      window.dispatchEvent(new CustomEvent('bio-accounts-changed'));
      showToast('success', res.message || 'Daftar 35 murid dan data asesmen berhasil disinkronkan!');
    } catch (err: any) {
      showToast('error', `Gagal mereset: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Open and preview Class Summary PDF
  function handlePreviewClassPdf() {
    if (!data) return;
    try {
      setGeneratingPdf(true);
      const pdf = generateClassSummaryPdf({
        classroom: data.classroom,
        quiz: data.quiz,
        teacherName: currentUser?.full_name || 'Dr. Ratna Dewi, M.Pd.',
        teacherNip: currentUser?.nip || '19820815 200801 2 015',
        schoolName: currentUser?.school_name || 'SMA Negeri 1 Teladan',
        totalStudents: data.totalStudents,
        attemptedCount: data.attemptedCount,
        passedCount: data.passedCount,
        remedialCount: data.remedialCount,
        passRate: data.passRate,
        averageScore: data.averageScore,
        highestScore: data.highestScore,
        lowestScore: data.lowestScore,
        students: data.students,
      });

      setPdfUrl(pdf.blobUrl);
      setPdfTitle(`Rekap_Nilai_Kelas_X_${data.totalStudents}_Siswa.pdf`);
      setDownloadHandler(() => pdf.download);
      setShowPdfModal(true);
    } catch (err) {
      console.error('Failed to generate class PDF', err);
      alert('Gagal membuat dokumen PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  }

  // Open and preview Individual Student Report Card PDF
  async function handlePreviewStudentPdf(attemptId: string) {
    try {
      setGeneratingPdf(true);
      const pdfData = await api.getAttemptPdfData(attemptId);
      const pdf = generateStudentReportCardPdf(pdfData);

      setPdfUrl(pdf.blobUrl);
      setPdfTitle(`Rapor_Kuis_${pdfData.student.name.replace(/\s+/g, '_')}.pdf`);
      setDownloadHandler(() => pdf.download);
      setShowPdfModal(true);
    } catch (err: any) {
      alert(`Gagal memuat rapor siswa: ${err.message}`);
    } finally {
      setGeneratingPdf(false);
    }
  }

  // Filter students
  const filteredStudents = data?.students?.filter((st: any) => {
    const matchesSearch = 
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.nis.includes(searchQuery);

    if (!matchesSearch) return false;
    if (kkmFilter === 'passed') return st.isPassed;
    if (kkmFilter === 'remedial') return st.hasAttempted && !st.isPassed;
    return true;
  }) || [];

  return (
    <div className="space-y-8 pb-16">
      
      {/* 1. Header Banner with Lush Botanical Emerald Gradient */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-300 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-800/80 border border-emerald-500/30 text-emerald-200 text-[10px] uppercase tracking-wider font-mono">
                Manajemen Rombel & Asesmen
              </span>
              <span aria-hidden="true" className="text-emerald-500">·</span>
              <span>Kelas X-A Biologi</span>
              <span aria-hidden="true" className="text-emerald-500">·</span>
              <span>Standar KKM 75</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Daftar Murid (35 Siswa) & Rekap Nilai PDF
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-2 leading-relaxed">
              Kelola daftar nama murid rombel kelas, pantau capaian 4 format soal (PG, Benar/Salah, Menjodohkan, Uraian), serta unduh laporan rekapitulasi kelas dan rapor siswa dalam format PDF resmi.
            </p>
          </div>

          {/* Action CTAs in Header */}
          <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-emerald-800/70 text-white border border-emerald-500/40 rounded-xl hover:bg-emerald-700/80 transition-all shadow-sm"
            >
              <Users className="w-3.5 h-3.5 text-emerald-300" />
              <span>Input / Impor 35 Siswa</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold bg-emerald-900/80 text-white border border-emerald-700/60 rounded-xl hover:bg-emerald-800 transition-all shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
              <span>Tambah Siswa</span>
            </button>

            <button
              onClick={handlePreviewClassPdf}
              disabled={generatingPdf || !data}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 hover:from-emerald-200 hover:to-teal-100 rounded-xl transition-all shadow-lg shadow-emerald-950/40 font-mono active:scale-95"
            >
              <FileDown className="w-4 h-4 text-emerald-950 stroke-[2.5]" />
              <span>{generatingPdf ? 'Membuat PDF...' : 'Tampilkan & Unduh PDF Kelas (35 Murid)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards: Total Murid, Tuntas KKM, Remedial, Rata-rata */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-500" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Jumlah Murid Rombel
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums">
                {data.totalStudents}
              </span>
              <span className="text-xs text-slate-400 font-medium">orang murid</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Mencapai KKM (Tuntas)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tabular-nums">
                {data.passedCount}
              </span>
              <span className="text-xs text-emerald-700 font-mono font-bold">
                ({data.passRate}%)
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
              Belum Capai KKM (Remedial)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono tabular-nums">
                {data.remedialCount}
              </span>
              <span className="text-xs text-rose-700 font-mono font-bold">
                ({100 - data.passRate}%)
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-600" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Rata-rata Nilai Kelas
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums">
                {data.averageScore}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 100</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border animate-in slide-in-from-top-2 duration-200 text-xs sm:text-sm font-semibold text-white ${
            toast.type === 'success'
              ? 'bg-emerald-900 border-emerald-700 shadow-emerald-950/30'
              : 'bg-rose-900 border-rose-700 shadow-rose-950/30'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-white/70 hover:text-white p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2.5 Dedicated Student Management Operations Toolbar */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-100/40 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 text-[10px] font-bold font-mono uppercase tracking-wider">
                Operasi Data Murid
              </span>
              <span className="text-emerald-800 text-xs font-semibold">
                Menu Spesifik Kelola Murid
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              Input, Tambah, Edit & Hapus Murid
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Gunakan menu di bawah untuk mengimpor daftar nama sekaligus (35 murid), menambah murid baru, atau klik <strong>Edit/Hapus</strong> pada setiap baris siswa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* 1. Input Massal */}
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition-all active:scale-95 border border-emerald-600 font-mono"
              title="Input atau impor daftar nama murid sekaligus (35 murid)"
            >
              <Users className="w-4 h-4 text-emerald-200" />
              <span>Input Massal (35 Murid)</span>
            </button>

            {/* 2. Tambah Murid */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-xs transition-all active:scale-95 border border-teal-600 font-mono"
              title="Tambah satu murid baru secara manual"
            >
              <UserPlus className="w-4 h-4 text-teal-200" />
              <span>Tambah 1 Murid</span>
            </button>

            {/* 3. Reset 35 Siswa */}
            <button
              onClick={handleReset35}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-300 transition-all shadow-2xs"
              title="Kembalikan ke daftar 35 murid bawaan"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset 35 Siswa</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Filter, Search & Fast Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama murid atau NIS..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* KKM Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setKkmFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                kkmFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({data?.students?.length || 0})
            </button>
            <button
              onClick={() => setKkmFilter('passed')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                kkmFilter === 'passed' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Tuntas ({data?.passedCount || 0})
            </button>
            <button
              onClick={() => setKkmFilter('remedial')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                kkmFilter === 'remedial' ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Remedial ({data?.remedialCount || 0})
            </button>
          </div>
        </div>
      </div>

      {/* 4. Student Roster Table (35 Students) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Daftar Nilai Kuis & Aksi Murid (Edit / Hapus / Rapor PDF)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kuis: <strong className="text-slate-700">{data?.quiz?.title || 'Kuis Biologi'}</strong> · Standar Kelulusan: <span className="font-mono font-bold text-emerald-700">KKM 75</span>
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
            Menampilkan {filteredStudents.length} dari {data?.totalStudents || 0} Murid
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs font-mono text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Memuat daftar murid dan rekap nilai...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Tidak ada murid yang cocok dengan filter pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-mono text-[11px] border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3 w-20">NIS</th>
                  <th className="py-3 px-4 min-w-[180px]">Nama Lengkap Murid</th>
                  <th className="py-3 px-2 text-center w-12">L/P</th>
                  <th className="py-3 px-3 text-center w-16">PG (25)</th>
                  <th className="py-3 px-3 text-center w-16">B/S (25)</th>
                  <th className="py-3 px-3 text-center w-16">Jodoh (25)</th>
                  <th className="py-3 px-3 text-center w-16">Uraian (25)</th>
                  <th className="py-3 px-3 text-center w-20">Nilai Total</th>
                  <th className="py-3 px-3 text-center w-28">Status KKM</th>
                  <th className="py-3 px-4 text-center min-w-[200px]">Aksi (Edit / Hapus / Rapor)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-sans">
                {filteredStudents.map((st: any, idx: number) => {
                  const isPassed = st.isPassed;
                  return (
                    <tr key={`${st.id}-${st.attemptId || 'noatt'}-${st.no || idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-400 font-semibold">
                        {st.no || idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-600">
                        {st.nis}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={st.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt={st.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
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
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-600">
                        {st.gender}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span className={st.breakdown?.pg === 25 ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {st.breakdown?.pg ?? 0}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span className={st.breakdown?.bs === 25 ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {st.breakdown?.bs ?? 0}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span className={st.breakdown?.jd === 25 ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {st.breakdown?.jd ?? 0}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span className={(st.breakdown?.es ?? 0) >= 20 ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {st.breakdown?.es ?? 0}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-sm">
                        <span className={isPassed ? 'text-emerald-700' : 'text-rose-600'}>
                          {st.score !== null ? st.score : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {st.hasAttempted ? (
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider ${
                            isPassed
                              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border border-rose-300'
                          }`}>
                            {isPassed ? 'TUNTAS' : 'REMEDIAL'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Belum Ujian</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(st)}
                            title={`Edit data & nilai murid ${st.name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold transition-all shadow-2xs active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.name)}
                            title={`Hapus murid ${st.name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-bold transition-all shadow-2xs active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Hapus</span>
                          </button>

                          {/* Rapor PDF Button */}
                          {st.attemptId && (
                            <button
                              onClick={() => handlePreviewStudentPdf(st.attemptId)}
                              title="Unduh Rapor Siswa PDF"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition-all shadow-2xs active:scale-95"
                            >
                              <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="hidden sm:inline">Rapor</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modal: Batch Import / Input Nama Murid (35 Murid) */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Input / Impor Daftar Nama Murid (35 Murid)
                </h3>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ketikkan atau tempelkan daftar nama murid (satu nama per baris). Sistem secara cerdas dapat menerima nomor baris (seperti <em>1. Budi</em> atau <em>- Budi</em>) dan akan membersihkannya otomatis.
            </p>

            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Daftar Nama Siswa ({batchNamesText.split(/\r?\n/).map(l => l.replace(/^(\d+[\.\)]\s*|\-\s*)/, '').trim()).filter(l => l.length > 0).length} Nama Terdeteksi)
                </label>
                <button
                  type="button"
                  onClick={handleFillSample35}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Muat 35 Nama Contoh Siswa</span>
                </button>
              </div>

              <textarea
                rows={10}
                value={batchNamesText}
                onChange={(e) => setBatchNamesText(e.target.value)}
                placeholder="1. Aditia Pratama&#10;2. Aisyah Nur Rahmah&#10;3. Alifian Raka Putra&#10;4. Amanda Putri Maharani&#10;..."
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={batchSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-700/25 transition-all font-mono disabled:opacity-50"
                >
                  {batchSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menerapkan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan & Terapkan Murid</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Tambah Siswa Baru Satuan */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Tambah Murid Baru ke Kelas
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSingle} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="Contoh: Muhammad Farhan"
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  NIS / NISN (Opsional)
                </label>
                <input
                  type="text"
                  value={singleNis}
                  onChange={(e) => setSingleNis(e.target.value)}
                  placeholder="Contoh: 240136"
                  className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jenis Kelamin
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSingleGender('L')}
                    className={`py-2 text-xs font-semibold rounded-lg border text-center ${
                      singleGender === 'L' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Laki-laki (L)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSingleGender('P')}
                    className={`py-2 text-xs font-semibold rounded-lg border text-center ${
                      singleGender === 'P' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Perempuan (P)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={singleSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-sm"
                >
                  {singleSubmitting ? 'Menyimpan...' : 'Tambah Murid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6.5. Modal: Edit Data & Nilai Murid */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit Data & Nilai Murid
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ID: {editingStudent.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Murid *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    NIS / NISN
                  </label>
                  <input
                    type="text"
                    value={editFormData.nis}
                    onChange={(e) => setEditFormData({ ...editFormData, nis: e.target.value })}
                    className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, gender: 'L' })}
                      className={`py-2 text-xs font-semibold rounded-lg border text-center ${
                        editFormData.gender === 'L' ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Laki-laki (L)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, gender: 'P' })}
                      className={`py-2 text-xs font-semibold rounded-lg border text-center ${
                        editFormData.gender === 'P' ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Perempuan (P)
                    </button>
                  </div>
                </div>
              </div>

              {/* Score Breakdown Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Nilai Asesmen 4 Format Soal (Maks 100)
                  </span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    (Number(editFormData.pg) + Number(editFormData.bs) + Number(editFormData.jd) + Number(editFormData.es)) >= 75
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    Total: {Number(editFormData.pg) + Number(editFormData.bs) + Number(editFormData.jd) + Number(editFormData.es)} / 100 ({(Number(editFormData.pg) + Number(editFormData.bs) + Number(editFormData.jd) + Number(editFormData.es)) >= 75 ? 'Tuntas' : 'Remedial'})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">
                      PG (25)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={editFormData.pg}
                      onChange={(e) => setEditFormData({ ...editFormData, pg: Number(e.target.value) })}
                      className="w-full p-2 text-xs font-mono text-center border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">
                      B/S (25)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={editFormData.bs}
                      onChange={(e) => setEditFormData({ ...editFormData, bs: Number(e.target.value) })}
                      className="w-full p-2 text-xs font-mono text-center border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">
                      Jodoh (25)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={editFormData.jd}
                      onChange={(e) => setEditFormData({ ...editFormData, jd: Number(e.target.value) })}
                      className="w-full p-2 text-xs font-mono text-center border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">
                      Uraian (25)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={editFormData.es}
                      onChange={(e) => setEditFormData({ ...editFormData, es: Number(e.target.value) })}
                      className="w-full p-2 text-xs font-mono text-center border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">
                    Catatan Guru / Evaluasi
                  </label>
                  <input
                    type="text"
                    value={editFormData.teacher_feedback}
                    onChange={(e) => setEditFormData({ ...editFormData, teacher_feedback: e.target.value })}
                    placeholder="Contoh: Sangat baik pada analisis struktur virus."
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6.6. Modal Konfirmasi Hapus Murid */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Hapus Murid dari Kelas?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data murid <strong className="text-slate-900">{confirmDeleteTarget.name}</strong>? Seluruh data nilai dan riwayat ujian murid ini akan dihapus.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteStudent}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-colors"
              >
                Ya, Hapus Murid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6.7. Modal Konfirmasi Reset 35 Murid */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Sinkronkan Ulang 35 Siswa Standar?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tindakan ini akan memulihkan data rombel ke 35 siswa standar kelas X-A lengkap dengan rincian nilai 4 tipe soal asesmen.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeReset35}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors"
              >
                Ya, Sinkronkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Pratinjau Dokumen PDF Interaktif (Interactive PDF Preview & Download) */}
      {showPdfModal && pdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Topbar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <FileDown className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-bold font-mono truncate max-w-md">
                  {pdfTitle}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {downloadHandler && (
                  <button
                    onClick={downloadHandler}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-lg hover:from-emerald-400 hover:to-teal-400 transition-all font-mono shadow-sm active:scale-95"
                  >
                    <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Unduh File PDF</span>
                  </button>
                )}

                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Embedded PDF Viewer */}
            <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden">
              <iframe
                src={pdfUrl}
                title="Pratinjau Dokumen PDF"
                className="w-full h-full rounded-xl bg-white shadow-inner border border-slate-300"
              />
            </div>

            {/* Footer Bar */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Dokumen PDF terverifikasi resmi siap cetak dan arsip akreditasi sekolah.</span>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-slate-600 hover:text-slate-900 font-semibold"
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
