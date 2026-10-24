import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Bot, Send, Sparkles, Clock, BookOpen, ShieldCheck, User } from 'lucide-react';

interface AiTutorViewProps {
  initialTopicTitle?: string;
  initialContext?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  latencyMs?: number;
  model?: string;
}

export const AiTutorView: React.FC<AiTutorViewProps> = ({
  initialTopicTitle,
  initialContext,
}) => {
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopicTitle || 'Virus & Peranannya dalam Kehidupan');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Halo! Saya AI Tutor Biologi Kelas X. Saya siap membantu kamu memahami konsep-konsep esensial Kurikulum Merdeka (Fase E), mengurai miskonsepsi biologi, atau memberi petunjuk bernalar dalam menyelesaikan latihan. Ada materi yang ingin kamu diskusikan hari ini?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadTopicsAndStatus();
    if (initialContext && initialTopicTitle) {
      handleSend(`Saya sedang mempelajari materi "${initialTopicTitle}". Bisakah kamu jelaskan intisari konsep ini dan miskonsepsi yang sering terjadi?`);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadTopicsAndStatus() {
    try {
      const topicData = await api.getTopics();
      setTopics(topicData);
      const statusData = await api.getAiStatus();
      setAiStatus(statusData);
    } catch (err) {
      console.error('Failed to load tutor status', err);
    }
  }

  async function handleSend(customMessage?: string) {
    const textToSend = customMessage || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customMessage) setInput('');
    setIsLoading(true);

    try {
      const response = await api.askAiTutor(
        textToSend,
        selectedTopic,
        'Kurikulum Merdeka 2024/2025 Biologi Fase E SMA/MA'
      );

      const assistantMsg: Message = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latencyMs: response.latencyMs,
        model: response.model,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Kendala Layanan: ${err.message || 'Tidak dapat terhubung ke AI server saat ini.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const quickPrompts = [
    'Jelaskan perbedaan mendasar daur litik dan lisogenik pada virus!',
    'Mengapa antibiotik tidak bisa mengobati influenza atau COVID-19?',
    'Jelaskan mengapa piramida energi SELALU tegak dan tidak pernah terbalik!',
    'Bagaimana cara kerja vaksin mRNA tanpa merusak DNA manusia?',
    'Apa perbedaan konservasi in-situ dan ex-situ disertai contohnya di Indonesia?'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Editorial Header with Lush Botanical Gradient */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-2xl p-6 shadow-xl border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-300 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-emerald-800/80 border border-emerald-500/30 text-emerald-200 text-[10px] uppercase tracking-wider font-mono">
              Asistensi Belajar Terverifikasi
            </span>
            <span aria-hidden="true" className="text-emerald-500">·</span>
            <span>Gemini 3.8 Flash (Server-Side)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            AI Tutor Biologi Kelas X
          </h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
            Berdiskusi interaktif dengan penjagaan materi resmi Kurikulum Merdeka Fase E tanpa membocorkan kunci kuis secara langsung.
          </p>
        </div>

        {/* Topic Context Dropdown */}
        <div className="relative z-10 flex items-center gap-2 bg-emerald-900/60 p-2 rounded-xl border border-emerald-700/60 backdrop-blur-xs">
          <span className="text-xs text-emerald-200 font-semibold whitespace-nowrap pl-2">Topik:</span>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="text-xs p-2 bg-emerald-950/90 border border-emerald-600/60 rounded-lg font-medium text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {topics.map(t => (
              <option key={t.id} value={t.title}>{t.code} - {t.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Window */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[520px]">
        
        {/* Messages List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={idx}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isUser 
                    ? 'bg-gradient-to-tr from-emerald-950 to-teal-900 text-white shadow-xs' 
                    : 'bg-gradient-to-tr from-emerald-700 to-teal-500 text-white shadow-xs'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-1">
                  <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser 
                      ? 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-tr-xs shadow-md shadow-emerald-950/20' 
                      : 'bg-gradient-to-br from-emerald-50/60 via-teal-50/30 to-emerald-50/60 border border-emerald-200 text-slate-800 rounded-tl-xs whitespace-pre-line shadow-2xs'
                  }`}>
                    {msg.content}
                  </div>

                  <div className={`flex items-center gap-2 text-[10px] text-slate-400 font-mono ${isUser ? 'justify-end' : ''}`}>
                    <span>{msg.timestamp}</span>
                    {msg.latencyMs && (
                      <>
                        <span>·</span>
                        <span>{msg.latencyMs}ms</span>
                        <span>·</span>
                        <span>{msg.model}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs text-xs text-slate-500 font-mono">
                AI Tutor sedang menyusun penjelasan ilmiah...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt strip */}
        <div className="px-6 py-3 bg-emerald-50/40 border-t border-emerald-100 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-emerald-800 font-bold shrink-0">Pertanyaan Cepat:</span>
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-3 py-1.5 bg-white border border-emerald-200/80 rounded-lg text-emerald-950 hover:bg-emerald-50 hover:border-emerald-400 transition-all whitespace-nowrap shrink-0 shadow-2xs font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 border-t border-slate-200 bg-white flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan konsep biologi atau minta petunjuk bernalar..."
            disabled={isLoading}
            className="flex-1 p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl disabled:opacity-40 transition-all shrink-0 shadow-md shadow-emerald-700/25 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

    </div>
  );
};
