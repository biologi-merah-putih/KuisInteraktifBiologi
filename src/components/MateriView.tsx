import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BookOpen, Sparkles, CheckCircle, AlertTriangle, ArrowRight, Dna, FileCheck, ExternalLink, Leaf, Microscope } from 'lucide-react';
import biologyHeroImage from '../assets/images/biology_aesthetic_green_1792837778015.jpg';

interface MateriViewProps {
  onStartQuizForTopic?: (topicId: string) => void;
  onAskAiTutor?: (topicTitle: string, context: string) => void;
}

export const MateriView: React.FC<MateriViewProps> = ({ onStartQuizForTopic, onAskAiTutor }) => {
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [activeMaterial, setActiveMaterial] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'deep_dive' | 'misconceptions' | 'reflection' | 'objectives'>('deep_dive');

  useEffect(() => {
    loadTopics();
  }, []);

  async function loadTopics() {
    try {
      setLoading(true);
      const data = await api.getTopics();
      setTopics(data);
      if (data.length > 0) {
        setSelectedTopicId(data[2]?.id || data[0].id); // default to Virus (top-03) or first
        loadMaterialForTopic(data[2]?.id || data[0].id, data);
      }
    } catch (err) {
      console.error('Failed to load topics', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMaterialForTopic(topicId: string, topicList: any[] = topics) {
    const topic = topicList.find(t => t.id === topicId);
    if (!topic || !topic.material_id) {
      setActiveMaterial(null);
      return;
    }
    try {
      const mat = await api.getMaterial(topic.material_id);
      setActiveMaterial(mat);
    } catch (err) {
      console.error('Failed to load material', err);
    }
  }

  const currentTopic = topics.find(t => t.id === selectedTopicId);

  return (
    <div className="space-y-8 pb-12">
      {/* Editorial Header with Lush Botanical Gradient */}
      <div className="bg-gradient-to-br from-[#021f14] via-[#053723] to-[#01190f] text-white rounded-3xl p-6 lg:p-8 shadow-2xl border border-emerald-700/50 relative overflow-hidden">
        {/* Ambient bioluminescent glow circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-300">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 text-[10px] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Leaf className="w-3 h-3 text-emerald-400" />
                Kurikulum Merdeka 2026/2027
              </span>
              <span aria-hidden="true" className="text-emerald-500">·</span>
              <span>Fase E (Kelas X SMA/MA)</span>
              <span aria-hidden="true" className="text-emerald-500">·</span>
              <span>Sains Biologi Terstandar</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
              KUIS INTERAKTIF BIOLOGI KELAS X
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed max-w-xl">
              Katalog Materi Pembelajaran & Capaian Sains: Pelajari konsep esensial sel kloroplas, virus & bakteri, genetika, eliminasi miskonsepsi ilmiah, dan kuasai butir asesmen interaktif.
            </p>
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {/* Visual Image Preview */}
            <div className="hidden sm:block relative w-36 h-24 rounded-xl overflow-hidden border border-emerald-500/40 shadow-lg group">
              <img 
                src={biologyHeroImage} 
                alt="Biologi Sel & DNA" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent" />
              <span className="absolute bottom-1 left-2 text-[9px] font-mono font-bold text-emerald-300">
                Kloroplas & DNA
              </span>
            </div>

            {currentTopic && onAskAiTutor && (
              <button
                onClick={() => onAskAiTutor(currentTopic.title, activeMaterial?.summary || '')}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-500/40 rounded-xl transition-all shadow-sm backdrop-blur-xs whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                Tanya AI Tutor Topik Ini
              </button>
            )}
            {onStartQuizForTopic && (
              <button
                onClick={() => onStartQuizForTopic(selectedTopicId)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 hover:from-emerald-200 hover:to-teal-100 rounded-xl transition-all whitespace-nowrap shadow-md shadow-emerald-950/40 font-mono"
              >
                Mulai Kuis Topik Ini
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 6 Topics Segmented Strip */}
        <div className="relative z-10 mt-6 pt-6 border-t border-emerald-800/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {topics.map((t) => {
            const isSelected = t.id === selectedTopicId;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTopicId(t.id);
                  loadMaterialForTopic(t.id);
                }}
                className={`p-3 text-left rounded-xl border transition-all text-xs ${
                  isSelected
                    ? 'bg-gradient-to-b from-emerald-600/30 to-teal-700/40 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400/50'
                    : 'bg-emerald-950/50 border-emerald-800/50 text-emerald-100/70 hover:border-emerald-600/60 hover:text-white hover:bg-emerald-900/40'
                }`}
              >
                <div className="text-[10px] font-mono font-bold text-emerald-300 mb-1">{t.code}</div>
                <div className="font-semibold text-white line-clamp-1 leading-snug">{t.title}</div>
                <div className="text-[11px] text-emerald-300/70 mt-1">
                  {t.objective_count} TP · {t.question_count} Soal
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Material Reader Stage */}
      {currentTopic && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Topic Visual & Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="relative aspect-4/3 bg-slate-100">
                <img
                  src={currentTopic.image_url || '/src/assets/images/hero_biology_exploration_1792650716855.jpg'}
                  alt={currentTopic.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                  <div className="text-[11px] font-mono text-emerald-300 font-semibold uppercase tracking-wider mb-1">
                    {currentTopic.code} · Biologi X
                  </div>
                  <h2 className="text-xl font-bold leading-tight drop-shadow-sm">
                    {currentTopic.title}
                  </h2>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Ringkasan Modul
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {currentTopic.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>Prasyarat Pembelajaran:</span>
                    <span className="font-medium text-slate-700">{currentTopic.prerequisites || 'Tidak ada'}</span>
                  </div>
                </div>

                {activeMaterial && (
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Istilah & Kata Kunci Penting
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {activeMaterial.key_terms.split(',').map((term: string, idx: number) => (
                        <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono text-[11px]">
                          {term.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Deep Dive Tabs & Academic Integrity (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm space-y-6">
            
            {/* Nav Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
              {[
                { id: 'deep_dive', label: 'Eksplorasi Konsep', icon: BookOpen },
                { id: 'misconceptions', label: 'Miskonsepsi Ilmiah', icon: AlertTriangle },
                { id: 'reflection', label: 'Refleksi & Aplikasi', icon: Dna },
                { id: 'objectives', label: 'Tujuan Pembelajaran', icon: CheckCircle },
              ].map((tab) => {
                const Icon = tab.icon;
                const isCurrent = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                      isCurrent
                        ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-md shadow-emerald-700/25 ring-1 ring-emerald-500/40'
                        : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            {activeMaterial ? (
              <div className="space-y-6 text-slate-800">
                {activeTab === 'deep_dive' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      {activeMaterial.title}
                    </h3>
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed font-medium">
                      {activeMaterial.summary}
                    </div>
                    <div className="text-xs text-slate-700 leading-relaxed space-y-3 whitespace-pre-line">
                      {activeMaterial.deep_dive}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <span>Sumber Resmi: <strong className="text-slate-700">{activeMaterial.source_reference}</strong></span>
                      </div>
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        Terverifikasi
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === 'misconceptions' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Miskonsepsi Biologi yang Sering Ditemui Siswa
                    </div>
                    <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-950 leading-relaxed whitespace-pre-line">
                      {activeMaterial.common_misconceptions}
                    </div>
                    <p className="text-xs text-slate-500 italic">
                      Umpan balik formatif dalam kuis akan secara otomatis mendeteksi jika Anda memilih jawaban pengecoh yang bersumber dari miskonsepsi ini.
                    </p>
                  </div>
                )}

                {activeTab === 'reflection' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Contoh Kasus Nyata di Indonesia
                      </h4>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                        {activeMaterial.contextual_example}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Pertanyaan Refleksi Bernalar Kritis
                      </h4>
                      <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                        {activeMaterial.reflection_questions}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'objectives' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 mb-3">
                      Tujuan pembelajaran yang menjadi target asesmen kuis pada bab ini diklasifikasikan berdasarkan Taksonomi Kognitif Bloom (C1-C6):
                    </p>
                    <div className="space-y-2">
                      {activeMaterial.objectives?.map((obj: any) => (
                        <div key={obj.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 shrink-0">
                            {obj.cognitive_level}
                          </span>
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 font-mono mr-2">{obj.code}:</span>
                            <span className="text-slate-700">{obj.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Materi untuk bab ini sedang dalam proses sinkronisasi kurikulum sekolah.
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
};
