import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Award, Building, Sparkles, Check, 
  FileCheck, Shield, AlertCircle, Camera, CheckCircle2
} from 'lucide-react';
import { api } from '../lib/api';

interface EditTeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onUpdateSuccess: (updatedUser: any) => void;
}

export const EditTeacherProfileModal: React.FC<EditTeacherProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nip, setNip] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  // Avatar presets
  const avatarPresets = [
    {
      label: 'Foto Resmi 1',
      url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    },
    {
      label: 'Foto Resmi 2',
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
    {
      label: 'Foto Resmi 3',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    {
      label: 'Foto Resmi 4 (Pria)',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      label: 'Foto Resmi 5 (Pria)',
      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  ];

  // Quick name templates for easy testing
  const namePresets = [
    'Dr. Ratna Dewi, M.Pd.',
    'Dra. Hj. Nurul Aini, M.Biotech.',
    'Budi Santoso, S.Pd., M.Si.',
    'Prof. Ir. Hendra Gunawan, Ph.D.',
  ];

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
      setEmail(currentUser.email || '');
      setNip(currentUser.nip || '19820815 200801 2 015');
      setSchoolName(currentUser.school_name || 'SMA Negeri 1 Teladan');
      setAvatar(currentUser.avatar || avatarPresets[0].url);
      setErrorMessage(null);
      setSuccessToast(false);
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Nama lengkap guru / gelar wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await api.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        nip: nip.trim(),
        school_name: schoolName.trim(),
        avatar: avatar.trim(),
      });

      setSuccessToast(true);
      onUpdateSuccess(res.user);

      // Auto close after brief celebration toast
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan perubahan profil.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-emerald-100 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Lush Botanical Gradient */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-5 sm:p-6 relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-md shrink-0 flex items-center justify-center text-white">
                <Award className="w-5 h-5 text-emerald-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    Edit Akun Guru & Identitas Pendidik
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Resmi
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Ubah nama akun, gelar akademik, NIP, dan email pengampu untuk dokumen & rapor PDF.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-800">
          
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successToast && (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Nama akun guru dan identitas resmi berhasil disimpan ke basis data!</span>
            </div>
          )}

          {/* Section 1: Nama Lengkap & Gelar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="full_name" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Nama Lengkap & Gelar Akademik <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">Tampil di Header & PDF</span>
            </div>
            
            <input
              id="full_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Dr. Ratna Dewi, M.Pd."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 shadow-2xs"
              required
            />

            {/* Quick Name Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 font-medium">Contoh Cepat:</span>
              {namePresets.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setFullName(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors font-medium active:scale-95"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Email & NIP Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                Email Akun Guru
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Contoh: epibiologi24@gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 shadow-2xs"
              />
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setEmail('epibiologi24@gmail.com')}
                  className="text-[10px] text-emerald-700 hover:text-emerald-900 font-mono underline"
                >
                  + Gunakan epibiologi24@gmail.com
                </button>
              </div>
            </div>

            {/* NIP Field */}
            <div className="space-y-2">
              <label htmlFor="nip" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                NIP (Nomor Induk Pegawai)
              </label>
              <input
                id="nip"
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 19820815 200801 2 015"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 shadow-2xs"
              />
              <p className="text-[10px] text-slate-500">
                Dicetak pada lembar tanda tangan dokumen resmi.
              </p>
            </div>
          </div>

          {/* Section 3: Nama Sekolah */}
          <div className="space-y-2">
            <label htmlFor="school_name" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              Nama Sekolah / Satuan Pendidikan
            </label>
            <input
              id="school_name"
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Contoh: SMA Negeri 1 Teladan Jakarta"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 shadow-2xs"
            />
          </div>

          {/* Section 4: Foto Profil / Avatar */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              Pilihan Foto Profil Pendidik
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {avatarPresets.map((item, idx) => {
                const isSelected = avatar === item.url;
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setAvatar(item.url)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 ${
                      isSelected 
                        ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/20 scale-105' 
                        : 'border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <img 
                      src={item.url} 
                      alt={item.label} 
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Live PDF & School Document Signature Preview */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 rounded-xl p-4 border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Pratinjau Tanda Tangan Dokumen & PDF Resmi</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono font-medium">
                Live Preview
              </span>
            </div>

            <p className="text-[11px] text-slate-600">
              Berikut adalah bentuk cetak tanda tangan pendidik pada dokumen <strong>Rekap Nilai Kelas (35 Murid)</strong> dan <strong>Rapor Kuis Individu</strong>:
            </p>

            <div className="bg-white rounded-lg p-3.5 border border-slate-200/90 shadow-2xs text-xs space-y-1 font-sans">
              <p className="text-[11px] text-slate-500">
                Jakarta Selatan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[11px] text-slate-700 font-medium">
                Guru Mata Pelajaran Biologi,
              </p>
              <div className="h-8 flex items-end">
                <div className="h-0.5 w-32 bg-slate-300" />
              </div>
              <p className="font-bold text-slate-900 text-xs">
                {fullName || 'Nama Guru Belum Diisi'}
              </p>
              <p className="text-[11px] text-slate-600 font-mono">
                {nip ? `NIP. ${nip}` : 'NIP. -'}
              </p>
              <p className="text-[10px] text-slate-400">
                {schoolName || 'SMA Negeri 1 Teladan'}
              </p>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fullName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md shadow-emerald-700/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Simpan Perubahan Nama Guru</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
