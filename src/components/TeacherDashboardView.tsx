import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  BarChart3, CheckCircle2, Clock, AlertTriangle, Users, 
  FileText, Sparkles, PlusCircle, ArrowRight, Download,
  UserCog, Award, Mail, Building, Check, Dna, Microscope,
  Leaf, FlaskConical, ZoomIn, Eye, X, BookOpen, Layers,
  ChevronRight, Compass, ShieldCheck, FileDown
} from 'lucide-react';
import biologyHeroImage from '../assets/images/biology_red_white_lightgreen_hero_1792846884782.jpg';

interface TeacherDashboardViewProps {
  onNavigate: (tab: string) => void;
  currentUser?: any;
  onOpenEditProfile?: () => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({ 
  onNavigate,
  currentUser,
  onOpenEditProfile,
}) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [pendingEssays, setPendingEssays] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [analyticsData, quizList, essays] = await Promise.all([
        api.getTeacherAnalytics(),
        api.getQuizzes(),
        api.getPendingEssays(),
      ]);
      setAnalytics(analyticsData);
      setQuizzes(quizList);
      setPendingEssays(essays);
    } catch (err) {
      console.error('Failed to load teacher dashboard', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !analytics) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-mono">Memuat analitik kelas dan dashboard Biologi Kelas X...</p>
      </div>
    );
  }

  const { summary, missedQuestions } = analytics;
  const teacherDisplayName = currentUser?.full_name || 'Evi Dwiyanti, S.Pd';

  return (
    <div className="space-y-8 pb-16">
      
      {/* =========================================================================
          HERO BANNER: KUIS INTERAKTIF BIOLOGI KELAS X (MERAH, PUTIH & HIJAU MUDA)
      ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7f1d1d] via-[#991b1b] to-[#591010] text-white border border-red-500/50 shadow-2xl shadow-red-950/30">
        {/* Bioluminescent light green & white ambient glow spots */}
        <div className="absolute top-0 right-1/4 -mt-20 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 -mr-20 -mb-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 -ml-20 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Column: Prominent Typography & Direct Quick Actions */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Category Kicker with Aesthetic Red, White & Light Green Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-400/50 text-emerald-200 text-[11px] font-mono tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                  Kurikulum Merdeka · Fase E
                </span>
                <span aria-hidden="true" className="text-red-300">·</span>
                <span className="text-white/95 font-medium">SMA / MA Kelas X</span>
                <span aria-hidden="true" className="text-red-300">·</span>
                <span className="text-emerald-300 font-mono text-[11px] font-semibold bg-white/10 px-2 py-0.5 rounded">Biologi Terpadu</span>
              </div>

              {/* Main Prominent Heading: KUIS INTERAKTIF BIOLOGI KELAS X */}
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.12] drop-shadow-sm">
                  KUIS INTERAKTIF <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-white to-lime-200">
                    BIOLOGI KELAS X
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-red-100/90 leading-relaxed font-normal max-w-xl">
                  Platform asesmen sains interaktif berbasis taksonomi Bloom (C1–C6). Eksplorasi konsep seluler mikroskopis, kromosom DNA, virus, serta ekosistem melalui evaluasi objektif dan uraian terverifikasi.
                </p>
              </div>

              {/* Quick Actions Bar with Red, White & Light Green accents */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onNavigate('guru-unduh-nilai')}
                  className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold bg-white text-red-900 rounded-xl hover:bg-emerald-50 hover:text-emerald-950 transition-all shadow-lg shadow-red-950/30 active:scale-95 font-mono cursor-pointer border border-white/80"
                >
                  <FileDown className="w-4 h-4 text-red-700 stroke-[2.5]" />
                  <span>Unduh Nilai & Rekap Kolektif</span>
                </button>

                {currentUser?.role === 'student' ? (
                  <button
                    onClick={() => onNavigate('kuis')}
                    className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 rounded-xl transition-all shadow-sm active:scale-95 font-mono cursor-pointer border border-emerald-300/60"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    <span>Mulai Kerjakan Kuis</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('guru-buat-kuis')}
                    className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 rounded-xl transition-all shadow-sm active:scale-95 font-mono cursor-pointer border border-emerald-300/60"
                  >
                    <PlusCircle className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    <span>Buat Kuis Baru</span>
                  </button>
                )}

                {currentUser?.role === 'student' ? (
                  <button
                    onClick={() => onNavigate('materi')}
                    className="flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold text-white bg-red-950/70 hover:bg-red-900/80 border border-white/20 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer backdrop-blur-xs"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-300" />
                    <span>Materi Belajar</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('guru-bank-soal')}
                    className="flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold text-white bg-red-950/70 hover:bg-red-900/80 border border-white/20 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer backdrop-blur-xs"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    <span>Bank Soal (90)</span>
                  </button>
                )}

                <button
                  onClick={() => onNavigate('roster-kelas')}
                  className="flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-emerald-300" />
                  <span>Daftar Siswa (35)</span>
                </button>
              </div>

              {/* Status Meta Indicator */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-red-200/90 font-mono">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  Pendidik: <strong className="text-white">{teacherDisplayName}</strong>
                </span>
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-300" />
                  Tahun Ajaran 2026/2027
                </span>
              </div>

            </div>

            {/* Right Column: Aesthetic Biology Imagery Card Showcase (Red, White, Light-Green) */}
            <div className="lg:col-span-5">
              <div className="relative group rounded-2xl overflow-hidden border-2 border-white/30 bg-red-950/90 shadow-2xl transition-all duration-300 hover:border-emerald-300/60">
                {/* Image */}
                <div className="relative aspect-video sm:aspect-[16/10] overflow-hidden bg-white">
                  <img 
                    src={biologyHeroImage} 
                    alt="Kuis Interaktif Biologi Kelas X - Sel Tumbuhan, Kloroplas Hijau Muda, Kromosom Merah dan Slide Putih" 
                    className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-transparent to-transparent opacity-60" />
                  
                  {/* Floating Action Button: Zoom Visual */}
                  <button
                    onClick={() => setShowImageModal(true)}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-950/80 hover:bg-slate-900 text-white rounded-lg border border-emerald-400/50 backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer"
                    title="Perbesar gambar preparat biologi"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Lihat Detail</span>
                  </button>
                </div>

                {/* Aesthetic Caption Under Image */}
                <div className="p-4 sm:p-5 space-y-2 bg-gradient-to-b from-red-950 to-[#4a0d0d]">
                  <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Microscope className="w-3.5 h-3.5 text-emerald-400" />
                      Visualisasi Preparat Seluler
                    </span>
                    <span className="text-[11px] text-white font-semibold bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-400/30">
                      Hijau Muda · Merah · Putih
                    </span>
                  </div>
                  <p className="text-xs text-red-100/90 leading-relaxed font-sans">
                    Pengamatan sel tumbuhan (Allium cepa 400x): kloroplas hijau muda (light green), kromosom dan inti sel terwarnai merah, serta kaca preparat laboratorium putih bersih.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          4 METRIC KPI CARDS (KOMBINASI MERAH, PUTIH & HIJAU MUDA)
      ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* KPI 1 - Merah & Putih */}
        <div className="bg-white border border-red-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-900 uppercase tracking-wider">
              Total Kuis Aktif
            </span>
            <div className="p-2 rounded-xl bg-red-50 text-red-700 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-950 font-mono tabular-nums">
              {summary.totalQuizzes}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {summary.totalQuizzes} paket terbit
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Tersedia untuk asesmen siswa Kelas X
          </p>
        </div>

        {/* KPI 2 - Hijau Muda & Putih */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
              Pengerjaan Selesai
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono tabular-nums">
              {summary.totalAttempts}
            </span>
            <span className="text-xs font-medium text-emerald-700">percobaan</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Telah terekam dalam log asesmen kelas
          </p>
        </div>

        {/* KPI 3 - Kombinasi Merah, Putih & Hijau Muda */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-white to-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
              Rata-rata Nilai Kelas
            </span>
            <div className="p-2 rounded-xl bg-gradient-to-tr from-red-600 to-emerald-500 text-white group-hover:scale-110 transition-transform shadow-xs">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 font-mono tabular-nums">
              {summary.avgClassScore}%
            </span>
            <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-mono">
              KKM 75
            </span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700 font-medium">
            Kompetensi sains tercapai optimal
          </p>
        </div>

        {/* KPI 4 - Peringatan Merah & Putih */}
        <div className="bg-white border border-red-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-900 uppercase tracking-wider">
              Menunggu Koreksi Esai
            </span>
            <div className={`p-2 rounded-xl ${pendingEssays.length > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono tabular-nums ${
              pendingEssays.length > 0 ? 'text-red-600' : 'text-slate-900'
            }`}>
              {pendingEssays.length}
            </span>
            <span className="text-xs font-medium text-red-800">jawaban siswa</span>
          </div>
          {pendingEssays.length > 0 ? (
            <button
              onClick={() => onNavigate('guru-koreksi-esai')}
              className="mt-2 text-xs font-bold text-red-700 hover:text-red-800 flex items-center gap-1 font-mono cursor-pointer"
            >
              Periksa Sekarang <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500">
              Semua jawaban esai sudah dinilai
            </p>
          )}
        </div>

      </div>

      {/* =========================================================================
          4 MODUL EKSPLORASI BIOLOGI KELAS X (KOMBINASI MERAH, PUTIH & HIJAU MUDA)
      ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-red-600" />
              <span>Modul Kompetensi & Ruang Lingkup Biologi Kelas X</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi materi capaian pembelajaran Fase E dan integrasi bank soal interaktif.
            </p>
          </div>
          <button
            onClick={() => onNavigate('materi')}
            className="text-xs font-bold text-red-700 hover:text-red-800 flex items-center gap-1 font-mono cursor-pointer"
          >
            Buka Katalog Materi <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1 - Merah */}
          <div className="p-4 rounded-xl border border-red-200/90 bg-white hover:border-red-400 hover:shadow-md transition-all space-y-3 group border-t-4 border-t-red-600">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-red-50 text-red-700 font-mono text-xs font-bold flex items-center gap-1.5">
                <Microscope className="w-4 h-4 text-red-600" />
                Bab 01
              </span>
              <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                Sel & Jaringan
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                Kloroplas & Fotosintesis
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Struktur membran ganda, grana, tilakoid klorofil hijau muda, dan konversi foton menjadi energi kimia.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Tersedia 18 Soal</span>
              <span className="text-red-700 font-bold">C1 – C5</span>
            </div>
          </div>

          {/* Card 2 - Hijau Muda */}
          <div className="p-4 rounded-xl border border-emerald-200/90 bg-white hover:border-emerald-400 hover:shadow-md transition-all space-y-3 group border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-xs font-bold flex items-center gap-1.5">
                <Dna className="w-4 h-4 text-emerald-600" />
                Bab 02
              </span>
              <span className="text-[10px] font-mono text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Genetika
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                DNA & Dogma Sentral
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Struktur heliks ganda, basa nitrogen purin-pirimidin, replikasi kromosom merah, dan sintesis protein.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Tersedia 16 Soal</span>
              <span className="text-emerald-700 font-bold">C2 – C6</span>
            </div>
          </div>

          {/* Card 3 - Merah */}
          <div className="p-4 rounded-xl border border-red-200/90 bg-white hover:border-red-400 hover:shadow-md transition-all space-y-3 group border-t-4 border-t-red-600">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-red-50 text-red-700 font-mono text-xs font-bold flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-red-600" />
                Bab 03
              </span>
              <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                Mikrobiologi
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                Virus & Bakteri
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Struktur kapsid virion, reproduksi litik & lisogenik, serta peran ekologis bakteri pada lingkungan.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Tersedia 22 Soal</span>
              <span className="text-red-700 font-bold">C1 – C5</span>
            </div>
          </div>

          {/* Card 4 - Hijau Muda */}
          <div className="p-4 rounded-xl border border-emerald-200/90 bg-white hover:border-emerald-400 hover:shadow-md transition-all space-y-3 group border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-xs font-bold flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-emerald-600" />
                Bab 04
              </span>
              <span className="text-[10px] font-mono text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Ekologi
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Biodiversitas & Ekosistem
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Keanekaragaman hayati Indonesia (garis Wallace-Weber), piramida biomassa, dan daur materi biogeokimia.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Tersedia 34 Soal</span>
              <span className="text-emerald-700 font-bold">C1 – C6</span>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          TEACHER PROFILE & SIGNATURE STATUS STRIP (MERAH, PUTIH & HIJAU MUDA)
      ========================================================================= */}
      <div className="bg-gradient-to-r from-red-50/70 via-white to-emerald-50/70 border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'} 
              alt={teacherDisplayName}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-red-600 shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {teacherDisplayName}
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                Pendidik Terverifikasi
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
                <span className="font-semibold text-red-700">NIP:</span> {currentUser?.nip || '19820815 200801 2 015'}
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Mail className="w-3 h-3 text-red-600" />
                <span>{currentUser?.email || 'guru.biologi@sekolah.id'}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <Building className="w-3 h-3 text-emerald-600" />
                <span>{currentUser?.school_name || 'SMA Negeri 1 Teladan'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenEditProfile && (
            <button
              onClick={onOpenEditProfile}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-red-900 bg-white hover:bg-red-50 border border-red-300 rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-95 shrink-0 font-mono cursor-pointer"
            >
              <UserCog className="w-4 h-4 text-red-600" />
              <span>Ubah Profil Guru</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('manajemen-staf')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-all shadow-2xs active:scale-95 shrink-0 font-mono cursor-pointer"
          >
            <Users className="w-4 h-4 text-emerald-200" />
            <span>Data Pengguna (Guru/Admin/Reviewer)</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          GRID: TOP MISSED CONCEPTS (7 COLS) & ACTIVE QUIZZES + CSV (5 COLS)
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Top Missed Concepts */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Soal & Konsep dengan Kesalahan Tertinggi</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Identifikasi butir soal yang paling sering dijawab keliru oleh siswa Kelas X untuk penguatan remedial.
              </p>
            </div>
          </div>

          {missedQuestions.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              Belum ada data pengerjaan yang signifikan untuk dianalisis.
            </p>
          ) : (
            <div className="space-y-3">
              {missedQuestions.map((mq: any) => {
                const failPct = Math.round((mq.wrong_count / mq.total_attempts) * 100);
                return (
                  <div key={mq.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:bg-red-50/30 transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {mq.topic_title}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">
                          {mq.cognitive_level}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-red-600 text-xs bg-red-100/80 px-2 py-0.5 rounded border border-red-200">
                        {failPct}% Salah ({mq.wrong_count}/{mq.total_attempts})
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-800 line-clamp-2">
                      {mq.question_text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Quizzes with Direct CSV Export */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Kuis yang Sedang Berjalan</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Unduh rekap nilai terverifikasi langsung ke format CSV.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {quizzes.map((q) => (
              <div key={q.id} className="p-4 border border-slate-200 rounded-xl hover:bg-emerald-50/40 transition-colors space-y-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                      {q.title}
                    </h3>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {q.classroom_name} · <span className="text-emerald-700 font-semibold">{q.completed_attempts || 0} Siswa Selesai</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => onNavigate('guru-unduh-nilai')}
                    className="flex items-center gap-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-700 transition-colors text-xs font-mono cursor-pointer shadow-2xs"
                  >
                    <FileDown className="w-3.5 h-3.5 text-white" />
                    Unduh Nilai & Kolektif
                  </button>

                  <a
                    href={api.getExportUrl(q.id)}
                    download
                    className="flex items-center gap-1 font-semibold text-slate-700 hover:text-red-700 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-mono"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    CSV
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* =========================================================================
          MODAL: INSPEKSI VISUAL BIOLOGIS DETAIL (FULL RESOLUTION)
      ========================================================================= */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-0 text-white">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-red-950 via-red-900 to-slate-900 border-b border-red-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-800/80 text-emerald-300">
                  <Microscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Inspeksi Visual Mikroskopis Biologi Kelas X
                  </h3>
                  <p className="text-xs text-emerald-300/90 font-mono">
                    Preparat Sel Tumbuhan (Allium cepa 400x) · Merah, Putih & Hijau Muda
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Body */}
            <div className="relative bg-white flex items-center justify-center max-h-[65vh] overflow-hidden p-2">
              <img 
                src={biologyHeroImage} 
                alt="Detail Mikroskopis Biologi Kelas X" 
                className="w-full h-auto max-h-[65vh] object-contain rounded-lg"
              />
            </div>

            {/* Modal Explanatory Footer */}
            <div className="p-5 bg-slate-900 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 space-y-1">
                <span className="font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5" /> 1. Kloroplas (Hijau Muda)
                </span>
                <p className="text-emerald-100/80 text-[11px] leading-relaxed">
                  Organel berwarna hijau muda pembawa pigmen klorofil pada sel tumbuhan, pusat reaksi fotolisis air dan fotosintesis.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-red-950/60 border border-red-700/40 space-y-1">
                <span className="font-mono font-bold text-red-300 flex items-center gap-1.5">
                  <Dna className="w-3.5 h-3.5" /> 2. Kromosom Sel (Merah)
                </span>
                <p className="text-red-100/80 text-[11px] leading-relaxed">
                  Inti sel dan benang kromosom terwarnai merah tua pada fase mitosis sel, menyimpan kode untaian DNA.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-600/50 space-y-1">
                <span className="font-mono font-bold text-white flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-400" /> 3. Slide Laboratorium (Putih)
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Kaca preparat putih transparan bersih dengan pembesaran 400x standar laboratorium Biologi SMA Kelas X.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
