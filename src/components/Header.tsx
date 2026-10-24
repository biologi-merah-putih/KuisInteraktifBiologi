import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Dna, BookOpen, CheckCircle2, BarChart2, Bot, Trophy, 
  Users, HelpCircle, Shield, UserCheck, ChevronDown, Check, UserCog, ChevronRight,
  Search, X, RefreshCw, GraduationCap, PlusCircle, FileDown
} from 'lucide-react';
import { api, RoleAccount, RoleAccountsResponse } from '../lib/api';

interface HeaderProps {
  currentUser: any;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onSwitchRole: (role: 'teacher' | 'student' | 'admin' | 'reviewer', studentIndex?: number) => void;
  onSwitchUser?: (userId: string) => void;
  onOpenEditTeacherProfile?: () => void;
}

type RoleFilterTab = 'all' | 'teacher' | 'student' | 'admin' | 'reviewer';

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentTab,
  onTabChange,
  onSwitchRole,
  onSwitchUser,
  onOpenEditTeacherProfile,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [roleAccounts, setRoleAccounts] = useState<RoleAccountsResponse | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<RoleFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Student nav links
  const studentNav = [
    { id: 'guru-dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'materi', label: 'Materi Belajar', icon: BookOpen },
    { id: 'kuis', label: 'Daftar Kuis', icon: CheckCircle2 },
    { id: 'guru-unduh-nilai', label: 'Unduh Hasil Kuis', icon: FileDown },
    { id: 'roster-kelas', label: 'Daftar Siswa & Rekap PDF (35)', icon: Users },
    { id: 'analitik', label: 'Capaian & Rapor', icon: BarChart2 },
    { id: 'aitutor', label: 'AI Tutor Biologi', icon: Bot },
    { id: 'pencapaian', label: 'Pencapaian XP', icon: Trophy },
  ];

  // Teacher nav links
  const teacherNav = [
    { id: 'guru-dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'guru-unduh-nilai', label: 'Unduh Nilai & Kolektif', icon: FileDown },
    { id: 'guru-buat-kuis', label: 'Pilih Jumlah & Buat Kuis', icon: PlusCircle },
    { id: 'guru-manajemen-kuis', label: 'Manajemen Kuis', icon: CheckCircle2 },
    { id: 'roster-kelas', label: 'Daftar Siswa & Rekap PDF (35)', icon: Users },
    { id: 'manajemen-staf', label: 'Data Guru, Admin & Reviewer', icon: UserCog },
    { id: 'guru-bank-soal', label: 'Bank Soal (C1-C6)', icon: HelpCircle },
    { id: 'guru-koreksi-esai', label: 'Koreksi Uraian', icon: BookOpen },
  ];

  // Admin / Reviewer nav links
  const adminNav = [
    { id: 'guru-dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'admin-observability', label: 'Audit & AI Observability', icon: Shield },
    { id: 'guru-unduh-nilai', label: 'Unduh Nilai & Rekap Kolektif', icon: FileDown },
    { id: 'manajemen-staf', label: 'Manajemen Guru, Admin & Reviewer', icon: UserCog },
    { id: 'roster-kelas', label: 'Daftar Siswa & Rekap PDF (35)', icon: Users },
    { id: 'guru-bank-soal', label: 'Moderasi Soal', icon: HelpCircle },
    { id: 'materi', label: 'Katalog Materi', icon: BookOpen },
  ];

  const navItems = currentUser?.role === 'teacher' 
    ? teacherNav 
    : (currentUser?.role === 'admin' || currentUser?.role === 'reviewer')
    ? adminNav
    : studentNav;

  // Load verified accounts from backend
  const fetchRoleAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const data = await api.getRoleAccounts();
      setRoleAccounts(data);
    } catch (err) {
      console.error('Gagal memuat akun peran dari server:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchRoleAccounts();

    const handleAccountsChanged = () => {
      fetchRoleAccounts();
    };

    window.addEventListener('bio-accounts-changed', handleAccountsChanged);
    return () => {
      window.removeEventListener('bio-accounts-changed', handleAccountsChanged);
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
    }
    if (showRoleMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleMenu]);

  // Combine accounts based on role filter and search
  const allAccountsList = useMemo(() => {
    if (!roleAccounts) return [];
    const list: RoleAccount[] = [];

    if (selectedRoleFilter === 'all' || selectedRoleFilter === 'teacher') {
      list.push(...roleAccounts.teachers);
    }
    if (selectedRoleFilter === 'all' || selectedRoleFilter === 'admin') {
      list.push(...roleAccounts.admins);
    }
    if (selectedRoleFilter === 'all' || selectedRoleFilter === 'reviewer') {
      list.push(...roleAccounts.reviewers);
    }
    if (selectedRoleFilter === 'all' || selectedRoleFilter === 'student') {
      list.push(...roleAccounts.students);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(acc => 
      acc.full_name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      (acc.nis && acc.nis.toLowerCase().includes(q)) ||
      (acc.nip && acc.nip.toLowerCase().includes(q)) ||
      (acc.school_name && acc.school_name.toLowerCase().includes(q))
    );
  }, [roleAccounts, selectedRoleFilter, searchQuery]);

  const handleSelectAccount = (account: RoleAccount) => {
    setShowRoleMenu(false);
    if (onSwitchUser) {
      onSwitchUser(account.id);
    } else {
      onSwitchRole(account.role as any);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'teacher':
        return {
          bg: 'bg-emerald-100/90 text-emerald-800 border-emerald-300',
          label: 'Guru Pendidik',
          dot: 'bg-emerald-600',
          icon: GraduationCap,
        };
      case 'admin':
        return {
          bg: 'bg-blue-100/90 text-blue-800 border-blue-300',
          label: 'Administrator',
          dot: 'bg-blue-600',
          icon: Shield,
        };
      case 'reviewer':
        return {
          bg: 'bg-purple-100/90 text-purple-800 border-purple-300',
          label: 'Reviewer Kurikulum',
          dot: 'bg-purple-600',
          icon: CheckCircle2,
        };
      default:
        return {
          bg: 'bg-teal-100/90 text-teal-800 border-teal-300',
          label: 'Siswa Kelas X',
          dot: 'bg-teal-600',
          icon: Trophy,
        };
    }
  };

  const currentRoleStyle = getRoleBadgeStyle(currentUser?.role || 'student');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top micro gradient line in Red, White, and Light Green */}
      <div className="h-1 w-full bg-gradient-to-r from-red-600 via-white to-emerald-400" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          
          {/* Zone 1: Wordmark Brand with Red, White & Light Green Biological Icon */}
          <button 
            type="button"
            onClick={() => onTabChange('guru-dashboard')}
            className="flex items-center gap-3 shrink-0 cursor-pointer text-left group"
            title="Buka Menu Dashboard Kuis Biologi"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-red-600/20 ring-2 ring-red-500/20 group-hover:scale-105 transition-transform">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap block leading-tight group-hover:text-red-700 transition-colors">
                  BioX Lab
                </span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-2xs">
                  SMA X
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Aktif" />
              </div>
              <span className="text-[11px] text-emerald-800 font-medium block leading-none mt-0.5">
                Kuis Biologi Interaktif
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links (Clean Single Line with Red, White, Light-Green Accents) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-red-50/80 via-white to-emerald-50/80 text-red-950 border border-red-300/80 shadow-2xs font-bold' 
                      : 'text-slate-600 hover:text-red-700 hover:bg-red-50/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-600 stroke-[2.5]' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action / Optimized User Switcher */}
          <div className="flex items-center gap-3 shrink-0 relative" ref={menuRef}>
            {currentUser?.role === 'student' && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border border-emerald-300/80 rounded-xl text-xs text-emerald-950 font-mono tabular-nums shadow-2xs">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-bold text-emerald-800">{currentUser?.xp || 0} XP</span>
                <span className="text-emerald-400">·</span>
                <span className="font-semibold text-slate-700">Lvl {currentUser?.level || 1}</span>
              </div>
            )}

            {currentUser?.role === 'teacher' && onOpenEditTeacherProfile && (
              <button
                onClick={onOpenEditTeacherProfile}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-900 bg-gradient-to-r from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200 border border-emerald-300 rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-95"
                title="Edit Profil & Identitas Guru Pengampu"
              >
                <UserCog className="w-4 h-4 text-emerald-700" />
                <span className="hidden sm:inline">Edit Profil Guru</span>
              </button>
            )}

            {/* Quick Optimized Role Switcher Button */}
            <div className="relative">
              <button
                onClick={() => {
                  const nextState = !showRoleMenu;
                  setShowRoleMenu(nextState);
                  if (nextState) {
                    fetchRoleAccounts();
                  }
                }}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-xl hover:from-slate-800 hover:to-emerald-900 transition-all whitespace-nowrap shadow-sm hover:shadow-md border border-slate-700/50"
                title="Buka Menu Peran & Daftar Akun Terdaftar"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div className="text-left flex flex-col items-start leading-none">
                  <span className="max-w-[120px] sm:max-w-[150px] truncate text-xs font-bold">
                    {currentUser?.full_name || 'Menu Peran'}
                  </span>
                  <span className="text-[10px] text-emerald-300/90 font-mono mt-0.5">
                    {currentRoleStyle.label}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${showRoleMenu ? 'rotate-180 text-emerald-400' : ''}`} />
              </button>

              {/* Enhanced Dropdown Menu with Real Database Users */}
              {showRoleMenu && (
                <div 
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-emerald-200/80 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[82vh]"
                >
                  {/* Dropdown Header */}
                  <div className="p-3.5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-b border-emerald-800/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold tracking-tight text-white uppercase">
                          Menu Peran & Beralih Akun
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {roleAccounts?.counts.total || 0} Akun Terdaftar
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100/80 mt-1 leading-snug">
                      Daftar resmi nama siswa, guru, reviewer, dan admin sesuai database.
                    </p>
                  </div>

                  {/* Active User Card Banner */}
                  <div className="p-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                        alt={currentUser?.full_name} 
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 truncate">
                          {currentUser?.full_name}
                        </p>
                        <p className="text-[10px] text-emerald-800 font-medium">
                          Sedang Aktif sebagai <span className="font-bold underline">{currentRoleStyle.label}</span>
                        </p>
                      </div>
                    </div>
                    {currentUser?.role === 'teacher' && onOpenEditTeacherProfile && (
                      <button
                        onClick={() => {
                          setShowRoleMenu(false);
                          onOpenEditTeacherProfile();
                        }}
                        className="px-2 py-1 text-[10px] font-bold text-emerald-800 bg-white hover:bg-emerald-100 rounded-lg border border-emerald-300 shrink-0 transition-colors shadow-2xs"
                      >
                        Ubah Profil
                      </button>
                    )}
                  </div>

                  {/* Search Bar inside Role Menu */}
                  <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama, NIS, NIP..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Role Filter Tabs */}
                  <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center gap-1 overflow-x-auto bg-white shrink-0 scrollbar-none">
                    <button
                      onClick={() => setSelectedRoleFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                        selectedRoleFilter === 'all'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Semua ({roleAccounts?.counts.total || 0})
                    </button>
                    <button
                      onClick={() => setSelectedRoleFilter('teacher')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                        selectedRoleFilter === 'teacher'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      Guru ({roleAccounts?.counts.teachers || 0})
                    </button>
                    <button
                      onClick={() => setSelectedRoleFilter('student')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                        selectedRoleFilter === 'student'
                          ? 'bg-teal-700 text-white shadow-2xs'
                          : 'text-teal-800 hover:bg-teal-50'
                      }`}
                    >
                      Siswa ({roleAccounts?.counts.students || 0})
                    </button>
                    <button
                      onClick={() => setSelectedRoleFilter('admin')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                        selectedRoleFilter === 'admin'
                          ? 'bg-blue-700 text-white shadow-2xs'
                          : 'text-blue-800 hover:bg-blue-50'
                      }`}
                    >
                      Admin ({roleAccounts?.counts.admins || 0})
                    </button>
                    <button
                      onClick={() => setSelectedRoleFilter('reviewer')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                        selectedRoleFilter === 'reviewer'
                          ? 'bg-purple-700 text-white shadow-2xs'
                          : 'text-purple-800 hover:bg-purple-50'
                      }`}
                    >
                      Reviewer ({roleAccounts?.counts.reviewers || 0})
                    </button>
                  </div>

                  {/* Scrollable Accounts List */}
                  <div className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-72">
                    {loadingAccounts ? (
                      <div className="py-10 text-center space-y-2">
                        <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin mx-auto" />
                        <p className="text-[11px] text-slate-500 font-mono">Memuat daftar akun peran...</p>
                      </div>
                    ) : allAccountsList.length === 0 ? (
                      <div className="py-8 text-center px-4">
                        <Users className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-slate-700">Tidak ada nama yang cocok</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {searchQuery ? `Tidak ditemukan akun dengan kata kunci "${searchQuery}".` : 'Belum ada akun di kategori ini.'}
                        </p>
                      </div>
                    ) : (
                      allAccountsList.map((acc) => {
                        const isCurrent = currentUser?.id === acc.id;
                        const badgeInfo = getRoleBadgeStyle(acc.role);

                        return (
                          <button
                            key={acc.id}
                            onClick={() => handleSelectAccount(acc)}
                            className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2.5 transition-colors group ${
                              isCurrent 
                                ? 'bg-emerald-50/90 font-bold text-emerald-950' 
                                : 'hover:bg-slate-50/90 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  src={acc.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                                  alt={acc.full_name}
                                  className={`w-8 h-8 rounded-full object-cover border ${
                                    isCurrent ? 'ring-2 ring-emerald-500 border-white' : 'border-slate-200'
                                  }`}
                                />
                                {isCurrent && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-600 border-2 border-white rounded-full" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900 truncate max-w-[170px] sm:max-w-[210px] group-hover:text-emerald-900 transition-colors">
                                    {acc.full_name}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-600 text-white font-bold leading-none">
                                      Aktif
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                                  {acc.role === 'student' ? (
                                    <span>NIS: {acc.nis || '-'} {acc.best_score !== null && acc.best_score !== undefined ? `· Nilai: ${acc.best_score}` : ''}</span>
                                  ) : acc.role === 'teacher' ? (
                                    <span className="truncate max-w-[180px]">{acc.nip ? `NIP: ${acc.nip}` : 'Pendidik Biologi'}</span>
                                  ) : acc.role === 'admin' ? (
                                    <span>Administrator Sistem</span>
                                  ) : (
                                    <span>Reviewer Kurikulum Biologi</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeInfo.bg}`}>
                                {acc.role === 'teacher' ? 'Guru' : acc.role === 'admin' ? 'Admin' : acc.role === 'reviewer' ? 'Reviewer' : 'Siswa'}
                              </span>
                              {isCurrent ? (
                                <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Quick Navigation Footers */}
                  <div className="p-2 border-t border-slate-100 bg-slate-50/90 space-y-1.5">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onTabChange('manajemen-staf');
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200 transition-all text-xs font-bold shadow-2xs group"
                    >
                      <div className="flex items-center gap-2">
                        <UserCog className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px]">Kelola Guru, Admin & Reviewer</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onTabChange('roster-kelas');
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-white hover:bg-teal-50 text-slate-800 border border-slate-200 transition-all text-xs font-bold shadow-2xs group"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px]">Daftar 35 Siswa & Rapor PDF</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
      
      {/* Mobile nav drawer */}
      <div className="md:hidden border-t border-emerald-900/10 px-4 py-2 flex items-center gap-1.5 overflow-x-auto bg-emerald-50/40">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
              currentTab === item.id 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-emerald-900 bg-white/60'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
