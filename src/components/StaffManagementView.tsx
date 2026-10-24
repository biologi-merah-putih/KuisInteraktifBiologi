import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserPlus, Search, Edit3, Trash2, Shield, GraduationCap, CheckCircle2,
  AlertTriangle, RefreshCw, X, Check, Eye, Lock, Mail, Building2, Hash,
  Sparkles, ExternalLink, ArrowRight, UserCheck, Key
} from 'lucide-react';
import { api, StaffUser } from '../lib/api';

interface StaffManagementViewProps {
  currentUser: any;
  onSwitchUser?: (userId: string) => void;
  onStaffUpdated?: (updatedCurrentUser?: any) => void;
}

type RoleFilter = 'all' | 'teacher' | 'admin' | 'reviewer';

const PRESET_AVATARS = [
  { label: 'Wanita 1 (Berhijab/Formal)', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
  { label: 'Wanita 2 (Kacamata/Akademik)', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
  { label: 'Wanita 3 (Pendidik Ramah)', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
  { label: 'Pria 1 (Formal/Admin)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { label: 'Pria 2 (Guru Muda)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { label: 'Pria 3 (Dosen/Senior)', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
];

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  currentUser,
  onSwitchUser,
  onStaffUpdated,
}) => {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleFilter>('all');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffUser | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'teacher' as 'teacher' | 'admin' | 'reviewer',
    nip: '',
    school_name: 'SMA Negeri 1 Teladan',
    avatar: PRESET_AVATARS[0].url,
    password: '',
  });

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await api.getStaffList();
      setStaffList(data);
    } catch (err: any) {
      showToast('error', `Gagal memuat data staf: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchRole = selectedRole === 'all' || staff.role === selectedRole;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        staff.full_name.toLowerCase().includes(q) ||
        staff.email.toLowerCase().includes(q) ||
        (staff.nip && staff.nip.toLowerCase().includes(q)) ||
        (staff.school_name && staff.school_name.toLowerCase().includes(q));
      return matchRole && matchQuery;
    });
  }, [staffList, selectedRole, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const total = staffList.length;
    const teachers = staffList.filter((s) => s.role === 'teacher').length;
    const admins = staffList.filter((s) => s.role === 'admin').length;
    const reviewers = staffList.filter((s) => s.role === 'reviewer').length;
    return { total, teachers, admins, reviewers };
  }, [staffList]);

  // Handle open add modal
  const handleOpenAdd = (defaultRole: 'teacher' | 'admin' | 'reviewer' = 'teacher') => {
    setFormData({
      full_name: '',
      email: '',
      role: defaultRole,
      nip: '',
      school_name: defaultRole === 'teacher' ? 'SMA Negeri 1 Teladan' : 'Dinas Pendidikan & Kurikulum',
      avatar: defaultRole === 'admin' ? PRESET_AVATARS[3].url : defaultRole === 'reviewer' ? PRESET_AVATARS[0].url : PRESET_AVATARS[1].url,
      password: '',
    });
    setIsAddModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    setFormData({
      full_name: staff.full_name,
      email: staff.email,
      role: staff.role,
      nip: staff.nip || '',
      school_name: staff.school_name || '',
      avatar: staff.avatar || PRESET_AVATARS[0].url,
      password: '',
    });
  };

  // Save new staff
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      showToast('error', 'Nama lengkap wajib diisi.');
      return;
    }
    if (!formData.email.trim()) {
      showToast('error', 'Email wajib diisi.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.createStaff({
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        nip: formData.nip,
        school_name: formData.school_name,
        avatar: formData.avatar,
        password: formData.password || undefined,
      });

      showToast('success', res.message || 'Akun staf berhasil dibuat!');
      setIsAddModalOpen(false);
      await fetchStaff();
      window.dispatchEvent(new CustomEvent('bio-accounts-changed'));
      if (onStaffUpdated) onStaffUpdated();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal membuat akun staf.');
    } finally {
      setActionLoading(false);
    }
  };

  // Save edit staff
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!formData.full_name.trim()) {
      showToast('error', 'Nama lengkap tidak boleh kosong.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.updateStaff(editingStaff.id, {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        nip: formData.nip,
        school_name: formData.school_name,
        avatar: formData.avatar,
        password: formData.password || undefined,
      });

      showToast('success', res.message || 'Data staf berhasil diperbarui!');
      setEditingStaff(null);
      await fetchStaff();
      window.dispatchEvent(new CustomEvent('bio-accounts-changed'));

      // If updated the currently logged in user, notify App
      if (currentUser?.id === editingStaff.id && onStaffUpdated) {
        onStaffUpdated(res.user);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal memperbarui data staf.');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm delete staff
  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    if (deletingStaff.id === currentUser?.id) {
      showToast('error', 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.');
      setDeletingStaff(null);
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.deleteStaff(deletingStaff.id);
      showToast('success', res.message || 'Data staf berhasil dihapus.');
      setDeletingStaff(null);
      await fetchStaff();
      window.dispatchEvent(new CustomEvent('bio-accounts-changed'));
      if (onStaffUpdated) onStaffUpdated();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghapus akun staf.');
    } finally {
      setActionLoading(false);
    }
  };

  // Switch to staff user
  const handleDirectSwitch = async (staff: StaffUser) => {
    try {
      await api.switchUser(staff.id);
      if (onSwitchUser) {
        onSwitchUser(staff.id);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      showToast('error', `Gagal beralih ke akun ${staff.full_name}: ${err.message}`);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
            Guru Pendidik
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Shield className="w-3.5 h-3.5 text-blue-700" />
            Administrator
          </span>
        );
      case 'reviewer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
            Reviewer Kurikulum
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/70 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero / Page Header with Botanical Lush Theme */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-8 shadow-md border border-emerald-800/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold uppercase tracking-wider border border-emerald-500/30">
                Otoritas & Manajemen Pengguna
              </span>
              <span className="text-emerald-400 text-xs">·</span>
              <span className="text-emerald-200 text-xs font-mono">Fase E SMA / MA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-400" />
              Manajemen Data Staf: Guru, Admin & Reviewer
            </h1>
            <p className="text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              Kelola, edit, dan perbarui data akun pengampu: <strong>Guru Mata Pelajaran</strong>,{' '}
              <strong>Administrator Sistem</strong>, serta <strong>Reviewer Kurikulum</strong> dengan kontrol hak akses yang aman.
            </p>
          </div>

          {/* Quick Add Button */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => fetchStaff()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all shadow-sm"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => handleOpenAdd('teacher')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/40 transition-all active:scale-95 border border-emerald-400/30"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Staf Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staff */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-900/10 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staf</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums">{counts.total}</p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Seluruh Akun Terdaftar</p>
          </div>
        </div>

        {/* Teachers */}
        <div 
          onClick={() => setSelectedRole('teacher')}
          className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs flex items-center gap-4 hover:border-emerald-500/50 ${
            selectedRole === 'teacher' ? 'ring-2 ring-emerald-500/40 border-emerald-500 bg-emerald-50/20' : 'border-emerald-900/10'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Guru (Pendidik)</p>
            <p className="text-2xl font-black text-emerald-900 tabular-nums">{counts.teachers}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Pembuat Kuis & Penilai</p>
          </div>
        </div>

        {/* Admins */}
        <div 
          onClick={() => setSelectedRole('admin')}
          className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs flex items-center gap-4 hover:border-blue-500/50 ${
            selectedRole === 'admin' ? 'ring-2 ring-blue-500/40 border-blue-500 bg-blue-50/20' : 'border-emerald-900/10'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0 border border-blue-200">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Administrator</p>
            <p className="text-2xl font-black text-blue-900 tabular-nums">{counts.admins}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Pengelola Sistem & Audit</p>
          </div>
        </div>

        {/* Reviewers */}
        <div 
          onClick={() => setSelectedRole('reviewer')}
          className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs flex items-center gap-4 hover:border-purple-500/50 ${
            selectedRole === 'reviewer' ? 'ring-2 ring-purple-500/40 border-purple-500 bg-purple-50/20' : 'border-emerald-900/10'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center shrink-0 border border-purple-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reviewer</p>
            <p className="text-2xl font-black text-purple-900 tabular-nums">{counts.reviewers}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Moderasi Soal & Mutu</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-emerald-900/10 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl overflow-x-auto">
            <button
              onClick={() => setSelectedRole('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedRole === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Staf ({counts.total})
            </button>
            <button
              onClick={() => setSelectedRole('teacher')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedRole === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              Guru Pendidik ({counts.teachers})
            </button>
            <button
              onClick={() => setSelectedRole('admin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedRole === 'admin'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-800'
              }`}
            >
              Administrator ({counts.admins})
            </button>
            <button
              onClick={() => setSelectedRole('reviewer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedRole === 'reviewer'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-purple-800'
              }`}
            >
              Reviewer Kurikulum ({counts.reviewers})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIP, email staf..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Staff Table / Cards */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-slate-500">Memuat data staf...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Tidak ada data staf yang cocok</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `Tidak ditemukan staf dengan kata kunci "${searchQuery}". Coba periksa ejaan atau ubah filter peran.`
                : 'Belum ada staf terdaftar pada kategori peran ini.'}
            </p>
            <button
              onClick={() => handleOpenAdd(selectedRole !== 'all' ? selectedRole : 'teacher')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              Tambah Staf Sekarang
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3 px-4 rounded-l-xl">Identitas Staf</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">NIP / NUPTK & Sekolah</th>
                  <th className="py-3 px-4">Statistik Kontribusi</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Aksi (Edit / Hapus / Tes)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStaff.map((staff) => {
                  const isCurrent = currentUser?.id === staff.id;
                  return (
                    <tr
                      key={staff.id}
                      className={`hover:bg-emerald-50/30 transition-colors ${
                        isCurrent ? 'bg-emerald-50/40 font-medium' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={staff.avatar || PRESET_AVATARS[0].url}
                              alt={staff.full_name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/20 shrink-0"
                            />
                            {isCurrent && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-600 border-2 border-white rounded-full"
                                title="Akun yang sedang Anda gunakan saat ini"
                              />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                {staff.full_name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-600 text-white font-mono font-bold px-1.5 py-0.2 rounded">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="font-mono">{staff.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {getRoleBadge(staff.role)}
                      </td>

                      {/* NIP & School */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                            <Hash className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{staff.nip || <span className="text-slate-400 italic">Belum diisi</span>}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{staff.school_name || 'SMA Negeri 1 Teladan'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Stats */}
                      <td className="py-3.5 px-4">
                        {staff.role === 'teacher' ? (
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <p className="font-semibold text-emerald-900">
                              {staff.quiz_count || 0} Kuis Terpublikasi
                            </p>
                            <p className="text-slate-500">
                              {staff.classroom_count || 1} Kelas Terdaftar
                            </p>
                          </div>
                        ) : staff.role === 'admin' ? (
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <p className="font-semibold text-blue-900">
                              Level Hak Akses: Root
                            </p>
                            <p className="text-slate-500 font-mono">
                              {staff.audit_count || 0} Log Audit Sistem
                            </p>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <p className="font-semibold text-purple-900">
                              Penilai Kurikulum Fase E
                            </p>
                            <p className="text-slate-500">
                              Validasi & Moderasi C1-C6
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Action Buttons: Edit, Hapus, Quick Switch */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Quick Switch / Login button */}
                          <button
                            onClick={() => handleDirectSwitch(staff)}
                            disabled={isCurrent}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                              isCurrent
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900'
                            }`}
                            title={isCurrent ? 'Akun aktif saat ini' : `Login sebagai ${staff.full_name}`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Uji Login</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition-all shadow-2xs"
                            title="Edit Data Staf"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingStaff(staff)}
                            disabled={isCurrent}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                              isCurrent
                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border-rose-200'
                            }`}
                            title={
                              isCurrent
                                ? 'Tidak dapat menghapus akun Anda sendiri'
                                : `Hapus data ${staff.full_name}`
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Hapus</span>
                          </button>
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

      {/* MODAL 1: Tambah Staf Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Tambah Data Staf Baru</h3>
                  <p className="text-xs text-emerald-200">
                    Daftarkan Guru Biologi, Admin Sistem, atau Reviewer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitCreate} className="p-6 space-y-4">
              {/* Role Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Peran / Hak Akses Akun <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'teacher' })}
                    className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${
                      formData.role === 'teacher'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <GraduationCap className={`w-5 h-5 ${formData.role === 'teacher' ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Guru Biologi</span>
                    <span className="text-[10px] text-slate-500">Pendidik & Kuis</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                    className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${
                      formData.role === 'admin'
                        ? 'border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Shield className={`w-5 h-5 ${formData.role === 'admin' ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Admin Sistem</span>
                    <span className="text-[10px] text-slate-500">Audit & Observasi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'reviewer' })}
                    className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${
                      formData.role === 'reviewer'
                        ? 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <CheckCircle2 className={`w-5 h-5 ${formData.role === 'reviewer' ? 'text-purple-700' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Reviewer</span>
                    <span className="text-[10px] text-slate-500">Moderasi Kurikulum</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Lengkap beserta Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Contoh: Dra. Sri Wahyuni, M.Si."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alamat Email Akun <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama.pengguna@sekolah.id"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              {/* Grid: NIP and School */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    NIP / NUPTK
                  </label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="Contoh: 19850412 201001 2 021"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Dicetak pada laporan PDF siswa.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Asal Sekolah / Instansi
                  </label>
                  <input
                    type="text"
                    value={formData.school_name}
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                    placeholder="SMA Negeri 1 Teladan"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kata Sandi (Opsional, Default: Biologi2026!)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Biologi2026!"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pilih Foto Profil Staf
                </label>
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: av.url })}
                      className={`relative rounded-full p-0.5 border-2 transition-transform shrink-0 ${
                        formData.avatar === av.url ? 'border-emerald-600 scale-105' : 'border-transparent hover:scale-105'
                      }`}
                      title={av.label}
                    >
                      <img src={av.url} alt={av.label} className="w-9 h-9 rounded-full object-cover" />
                      {formData.avatar === av.url && (
                        <div className="absolute inset-0 bg-emerald-600/30 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Simpan Akun Staf</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Data Staf */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Data Akun Staf</h3>
                  <p className="text-xs text-emerald-200">
                    ID: {editingStaff.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
              {/* Role Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Peran / Hak Akses Akun <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'teacher' })}
                    className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${
                      formData.role === 'teacher'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <GraduationCap className={`w-5 h-5 ${formData.role === 'teacher' ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Guru Biologi</span>
                    <span className="text-[10px] text-slate-500">Pendidik & Kuis</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                    className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${
                      formData.role === 'admin'
                        ? 'border-blue-600 bg-blue-50 text-blue-950 ring-2 ring-blue-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Shield className={`w-5 h-5 ${formData.role === 'admin' ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Admin Sistem</span>
                    <span className="text-[10px] text-slate-500">Audit & Observasi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'reviewer' })}
                    className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${
                      formData.role === 'reviewer'
                        ? 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <CheckCircle2 className={`w-5 h-5 ${formData.role === 'reviewer' ? 'text-purple-700' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">Reviewer</span>
                    <span className="text-[10px] text-slate-500">Moderasi Kurikulum</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Lengkap beserta Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alamat Email Akun <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              {/* Grid: NIP and School */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    NIP / NUPTK
                  </label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="19820815 200801 2 015"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Asal Sekolah / Instansi
                  </label>
                  <input
                    type="text"
                    value={formData.school_name}
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* New Password (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ubah Kata Sandi (Kosongkan jika tidak ingin mengubah)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Masukkan sandi baru jika ingin diubah"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Foto Profil Staf
                </label>
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: av.url })}
                      className={`relative rounded-full p-0.5 border-2 transition-transform shrink-0 ${
                        formData.avatar === av.url ? 'border-emerald-600 scale-105' : 'border-transparent hover:scale-105'
                      }`}
                      title={av.label}
                    >
                      <img src={av.url} alt={av.label} className="w-9 h-9 rounded-full object-cover" />
                      {formData.avatar === av.url && (
                        <div className="absolute inset-0 bg-emerald-600/30 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Konfirmasi Hapus Data Staf */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                Hapus Akun Staf?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data akun{' '}
                <strong className="text-slate-900 font-bold">{deletingStaff.full_name}</strong>{' '}
                ({deletingStaff.role === 'teacher' ? 'Guru' : deletingStaff.role === 'admin' ? 'Administrator' : 'Reviewer Kurikulum'})?
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                Catatan Keamanan Sistem:
              </p>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-800">
                <li>Tindakan ini tidak dapat dibatalkan.</li>
                {deletingStaff.role === 'teacher' && (
                  <li>Seluruh kuis dan kelas pengampu akan dialihkan secara aman ke guru aktif lainnya.</li>
                )}
                <li>Semua sesi login aktif untuk akun ini akan segera dinonaktifkan.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-700/20 transition-all disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Ya, Hapus Staf</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
