import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Shield, Activity, Database, Bot, Users, CheckCircle2, Clock, UserCog, ArrowRight } from 'lucide-react';

interface AdminObservabilityViewProps {
  onNavigate?: (tab: string) => void;
}

export const AdminObservabilityView: React.FC<AdminObservabilityViewProps> = ({ onNavigate }) => {
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadObservability();
  }, []);

  async function loadObservability() {
    try {
      setLoading(true);
      const [status, classList] = await Promise.all([
        api.getAiStatus(),
        api.getClassrooms(),
      ]);
      setAiStatus(status);
      setClassrooms(classList);
    } catch (err) {
      console.error('Failed to load observability data', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-16">
      
      {/* Title */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Observabilitas & Tata Kelola Sistem</span>
            <span aria-hidden="true">·</span>
            <span>Administrator Akademik</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pemantauan Layanan & Keamanan Sistem
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Pantau latensi integrasi model AI backend, kesehatan basis data relasional SQLite, dan tata kelola akun staf.
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('manajemen-staf')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all shrink-0"
          >
            <UserCog className="w-4 h-4" />
            <span>Kelola Guru, Admin & Reviewer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Integrasi Backend Gemini AI</span>
            <Bot className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {aiStatus?.model || 'gemini-3.8-flash'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Status: <span className="text-emerald-700 font-bold">{aiStatus?.configured ? 'Terkonfigurasi (Server)' : 'Kunci Server Aktif'}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Panggilan AI Tutor</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {aiStatus?.totalCalls || 0} Permintaan
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Rerata Latensi: <span className="text-slate-800 font-bold">{aiStatus?.avgLatencyMs || 0} ms</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Integritas Basis Data</span>
            <Database className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            SQLite (ACID Compliant)
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Penyimpanan: <span className="text-emerald-700 font-bold">Disk Persisten (data/*.sqlite)</span>
          </div>
        </div>
      </div>

      {/* Classrooms List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Daftar Kelas & Tahun Ajaran
        </h3>

        <div className="space-y-3">
          {classrooms.map(c => (
            <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
              <div>
                <strong className="text-sm font-sans font-bold text-slate-900">{c.name}</strong>
                <p className="text-slate-500 font-sans mt-0.5">{c.description}</p>
              </div>
              <div className="text-right">
                <span className="text-emerald-700 font-bold font-mono">Kode: {c.code}</span>
                <span className="text-slate-400 block text-[11px]">{c.academic_year} · {c.student_count || 0} Siswa</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
