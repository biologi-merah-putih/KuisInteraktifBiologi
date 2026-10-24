import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Trophy, Award, Flame, Target, CheckCircle2, TrendingUp, Sparkles, Microscope, Brain, FileText } from 'lucide-react';

export const StudentAnalyticsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const [analyticsData, leaders] = await Promise.all([
        api.getStudentAnalytics(),
        api.getLeaderboard(),
      ]);
      setData(analyticsData);
      setLeaderboard(leaders);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-mono">Menghitung matriks capaian kompetensi siswa...</p>
      </div>
    );
  }

  const user = data.user;
  const currentXp = user?.xp || 0;
  const nextLevelXp = (user?.level || 1) * 500;
  const progressPct = Math.min(100, Math.round(((currentXp % 500) / 500) * 100));

  const badgeIcons: Record<string, any> = {
    Microscope,
    Award,
    Flame,
    Brain,
    FileText,
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner: Profile & Gamification Stats (Red, White & Light Green) */}
      <div className="bg-gradient-to-br from-red-950 via-rose-900 to-[#4a0d0d] text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-red-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={user?.full_name}
              className="w-16 h-16 rounded-full border-2 border-white object-cover shadow-md"
            />
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 mb-1">
                <span>Rapor Kemajuan Belajar</span>
                <span aria-hidden="true" className="text-red-300">·</span>
                <span className="text-white/90">Fase E (Kelas X SMA/MA)</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {user?.full_name}
              </h1>
              <p className="text-xs text-red-200/80 mt-0.5">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:gap-8 bg-red-950/70 p-4 rounded-xl border border-red-700/50 backdrop-blur-xs">
            <div>
              <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider block">
                Tingkat Belajar
              </span>
              <span className="text-2xl font-black text-white font-mono">
                Level {user?.level || 1}
              </span>
            </div>
            <div className="h-10 w-px bg-red-700/60" />
            <div>
              <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider block">
                Total Poin (XP)
              </span>
              <span className="text-2xl font-black text-emerald-300 font-mono">
                {currentXp}
              </span>
            </div>
          </div>
        </div>

        {/* Level XP Progress Bar with Shimmer */}
        <div className="relative z-10 mt-6 pt-6 border-t border-red-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-red-200 font-mono">
            <span>Progress Menuju Level {(user?.level || 1) + 1}</span>
            <span className="font-bold text-white">{currentXp % 500} / 500 XP ({progressPct}%)</span>
          </div>
          <div className="w-full h-3 bg-red-950/80 rounded-full overflow-hidden p-0.5 border border-red-800/60">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 rounded-full transition-all duration-500 shadow-sm shadow-emerald-400/50"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Topic Mastery Bars (8 cols) & Leaderboard (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Topic Mastery Based on Real Attempts */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Penguasaan Konsep per Bab Biologi
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Dihitung dari persentase jawaban benar pada kuis terverifikasi di server.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {data.topicMastery?.map((topic: any) => {
              const pct = topic.masteryPercentage || 0;
              const hasData = topic.total_answered > 0;
              return (
                <div key={topic.topic_id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-emerald-800 mr-2">{topic.topic_code}</span>
                      <strong className="text-slate-800">{topic.topic_title}</strong>
                    </div>
                    <span className="font-mono font-semibold text-slate-700">
                      {hasData ? `${pct}% Kuasai` : 'Belum Ada Data Kuis'}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 75 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                          : pct >= 50 
                          ? 'bg-gradient-to-r from-amber-500 to-emerald-500' 
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                    <span>{topic.total_answered} Butir Dikerjakan</span>
                    <span className="font-semibold text-emerald-800">{topic.correct_count || 0} Benar</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quiz Score Progression History */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Riwayat Skor Asesmen Resmi
            </h3>
            {data.quizHistory?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Belum ada riwayat kuis yang telah selesai dinilai.
              </p>
            ) : (
              <div className="space-y-2">
                {data.quizHistory?.map((hist: any) => (
                  <div key={hist.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl text-xs font-mono hover:border-emerald-300 transition-colors">
                    <div>
                      <span className="font-bold text-slate-800">{hist.quiz_title}</span>
                      <span className="text-slate-400 ml-2 text-[11px]">{new Date(hist.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-emerald-700 text-sm bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        {Math.round(hist.percentage)}%
                      </span>
                      <span className="text-slate-400 text-xs font-medium">({hist.score}/{hist.max_score} Pts)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Badges & Leaderboard (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Unlocked Badges */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Lencana Pencapaian Belajar
            </h3>
            
            <div className="space-y-3">
              {data.userAchievements?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Belum ada lencana yang terbuka. Selesaikan kuis pertama Anda untuk membuka lencana Penyelidik Pertama!
                </p>
              ) : (
                data.userAchievements?.map((ach: any) => {
                  const Icon = badgeIcons[ach.badge_icon] || Award;
                  return (
                    <div key={ach.id} className="flex items-start gap-3 p-3.5 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-emerald-50/80 border border-emerald-200 rounded-xl shadow-2xs">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-emerald-950 font-bold">{ach.title}</strong>
                          <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">+{ach.xp_reward} XP</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug mt-1">
                          {ach.description}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Privacy-Preserving Leaderboard */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Peringkat XP Siswa
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Kelas X-A</span>
            </div>

            <div className="space-y-2">
              {leaderboard.map((leader, idx) => (
                <div 
                  key={leader.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono ${
                    leader.id === user?.id 
                      ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950' 
                      : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="font-sans font-medium truncate max-w-[140px]">
                      {leader.full_name} {leader.id === user?.id && '(Anda)'}
                    </span>
                  </div>
                  <span className="font-semibold text-emerald-700">{leader.xp} XP</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
