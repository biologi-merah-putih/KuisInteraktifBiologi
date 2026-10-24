import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  CheckCircle2, XCircle, Award, BookOpen, ArrowLeft, Bot, 
  FileText, Check, HelpCircle, AlertTriangle, ShieldCheck, ShieldAlert, FileDown, Printer, X
} from 'lucide-react';
import { generateStudentReportCardPdf } from '../lib/pdfGenerator';

interface QuizResultViewProps {
  attemptId: string;
  onBackToList: () => void;
  onAskAiTutor?: (topicTitle: string, context: string) => void;
}

export const QuizResultView: React.FC<QuizResultViewProps> = ({
  attemptId,
  onBackToList,
  onAskAiTutor,
}) => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);
  const [downloadHandler, setDownloadHandler] = useState<(() => void) | null>(null);

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  async function loadResult() {
    try {
      setLoading(true);
      const data = await api.getAttemptResult(attemptId);
      setResult(data);
    } catch (err: any) {
      console.error('Failed to load result', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    try {
      setGeneratingPdf(true);
      const pdfData = await api.getAttemptPdfData(attemptId);
      const pdf = generateStudentReportCardPdf(pdfData);
      setPdfUrl(pdf.blobUrl);
      setDownloadHandler(() => pdf.download);
      setShowPdfModal(true);
    } catch (err: any) {
      alert(`Gagal membuat PDF: ${err.message}`);
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (loading || !result) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-mono">Mengambil data evaluasi asesmen...</p>
      </div>
    );
  }

  const passingScore = result.passingScore || 75;
  const percentage = Math.round(result.percentage || 0);
  const isPassed = percentage >= passingScore;
  const scoreDiff = percentage - passingScore;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Top Banner: Score Card & Status KKM */}
      <div className={`p-6 sm:p-8 rounded-2xl border ${
        isPassed 
          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-sm' 
          : 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold tracking-wide ${
                isPassed 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-rose-600 text-white'
              }`}>
                {isPassed ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                {isPassed ? 'STATUS: MENCAPAI KKM (TUNTAS)' : 'STATUS: TIDAK MENCAPAI KKM (REMEDIAL)'}
              </span>
              <span className="text-xs font-mono text-slate-500">· {result.studentName}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {result.quizTitle}
            </h1>

            <p className="text-xs text-slate-700 leading-relaxed max-w-xl">
              {isPassed ? (
                <span>
                  Selamat! Perolehan nilai Anda sebesar <strong>{percentage}%</strong> telah melampaui Kriteria Ketuntasan Minimal (KKM {passingScore}%). Anda dinyatakan <strong>TUNTAS</strong> pada kompetensi materi ini.
                </span>
              ) : (
                <span>
                  Perolehan nilai Anda sebesar <strong>{percentage}%</strong> berada di bawah batas Kriteria Ketuntasan Minimal (KKM {passingScore}%). Anda dinyatakan <strong>BELUM TUNTAS</strong> dan disarankan mempelajari pembahasan kunci jawaban di bawah sebelum remedial.
                </span>
              )}
            </p>
          </div>

          {/* Metric Box */}
          <div className="flex items-center gap-5 shrink-0 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="text-center font-mono">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-sans">
                Jumlah Nilai
              </span>
              <span className={`text-4xl font-extrabold ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                {percentage}
              </span>
              <span className="text-xs text-slate-400 block font-sans">/ 100</span>
            </div>

            <div className="h-12 w-px bg-slate-200" />

            <div className="text-xs font-mono space-y-1">
              <div>
                <span className="text-slate-400 font-sans">Batas KKM: </span>
                <strong className="text-slate-800">{passingScore} Poin</strong>
              </div>
              <div>
                <span className="text-slate-400 font-sans">Skor Mentah: </span>
                <strong className="text-slate-800">{result.score} / {result.maxScore}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-sans">Keterangan: </span>
                <span className={`font-bold ${isPassed ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isPassed ? `+${scoreDiff} (Lulus)` : `${scoreDiff} (Remedial)`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToList}
              className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Daftar Kuis
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="flex items-center gap-1.5 font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 px-3.5 py-1.5 rounded-lg shadow-sm transition-all font-mono"
            >
              <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{generatingPdf ? 'Menyiapkan...' : 'Unduh Rapor Siswa (PDF)'}</span>
            </button>
          </div>

          {onAskAiTutor && (
            <button
              onClick={() => onAskAiTutor(result.quizTitle, `Nilai siswa: ${percentage}% (KKM: ${passingScore}%). Mohon bantu jelaskan butir soal yang keliru.`)}
              className="flex items-center gap-1.5 font-semibold text-emerald-800 bg-white px-3.5 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-50 transition-colors shadow-xs"
            >
              <Bot className="w-4 h-4 text-emerald-600" />
              Konsultasi AI Tutor tentang Hasil Ini
            </button>
          )}
        </div>
      </div>

      {/* Item-by-item Detailed Review */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Kunci Jawaban yang Benar & Pembahasan Setiap Soal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Periksa perbandingan antara jawaban Anda dengan kunci jawaban resmi dan bobot skor tiap butir soal.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 px-3 py-1 bg-white border border-slate-200 rounded-lg">
            {result.items?.filter((i: any) => i.isCorrect).length} dari {result.items?.length} Benar
          </span>
        </div>

        <div className="space-y-6">
          {result.items?.map((item: any, idx: number) => {
            const isCorrect = item.isCorrect;
            const qType = item.questionType;

            return (
              <div
                key={item.questionId}
                className={`bg-white border rounded-2xl p-6 sm:p-7 shadow-xs space-y-5 transition-colors ${
                  isCorrect 
                    ? 'border-emerald-200' 
                    : item.pointsEarned > 0 
                    ? 'border-amber-200' 
                    : 'border-rose-200'
                }`}
              >
                {/* Item Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      Soal #{idx + 1}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                      {qType === 'single_choice' && 'Pilihan Ganda'}
                      {qType === 'true_false' && 'Benar / Salah'}
                      {qType === 'matching' && 'Menjodohkan'}
                      {qType === 'essay' && 'Uraian / Essay'}
                      {qType === 'complex_multiple' && 'PG Kompleks'}
                      {qType === 'ordering' && 'Mengurutkan'}
                      {qType === 'short_answer' && 'Isian Singkat'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {item.cognitiveLevel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold px-3 py-1 rounded-md flex items-center gap-1.5 ${
                      isCorrect 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : item.pointsEarned > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                      <span>{item.pointsEarned} / {item.maxPoints} Poin</span>
                    </span>
                  </div>
                </div>

                {/* Stimulus if exists */}
                {item.stimulus && (
                  <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-700 font-sans border border-slate-100">
                    <strong className="block text-slate-800 uppercase text-[10px] font-mono mb-1">
                      Stimulus Kasus Ilmiah:
                    </strong>
                    {item.stimulus}
                  </div>
                )}

                {/* Question Text */}
                <div className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                  {item.questionText}
                </div>

                {/* Side-by-side or Stacked: Jawaban Siswa VS Kunci Jawaban Benar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  
                  {/* Left: Jawaban Siswa */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                    <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                      Jawaban Siswa:
                    </span>

                    <div className="text-slate-800 font-medium">
                      {qType === 'single_choice' && (
                        <div>
                          {item.studentAnswer?.selectedOptionId ? (
                            <span>
                              <strong className="font-mono">{item.studentAnswer.selectedOptionId.replace('opt-', '')}: </strong>
                              {item.options?.find((o: any) => o.id === item.studentAnswer.selectedOptionId)?.text}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">(Tidak dijawab)</span>
                          )}
                        </div>
                      )}

                      {qType === 'true_false' && (
                        <div>
                          {item.studentAnswer?.isTrue !== undefined ? (
                            <strong className="font-mono text-sm">
                              {item.studentAnswer.isTrue ? 'BENAR' : 'SALAH'}
                            </strong>
                          ) : (
                            <span className="text-slate-400 italic">(Tidak dijawab)</span>
                          )}
                        </div>
                      )}

                      {qType === 'matching' && (
                        <div className="space-y-1 font-mono text-[11px]">
                          {(() => {
                            const matches = item.studentAnswer?.matches || {};
                            const pairs = item.options?.pairs || [];
                            if (Object.keys(matches).length === 0) {
                              return <span className="text-slate-400 italic font-sans">(Tidak dijawab)</span>;
                            }
                            return pairs.map((p: any) => (
                              <div key={p.id} className="flex items-center justify-between border-b border-slate-200/50 pb-1">
                                <span className="font-sans text-slate-700">{p.premise}:</span>
                                <span className="font-bold text-slate-900">{matches[p.id] || '(Kosong)'}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      )}

                      {qType === 'essay' && (
                        <div className="space-y-2">
                          <p className="whitespace-pre-line text-slate-700 font-sans italic bg-white p-3 rounded-lg border border-slate-200/70">
                            "{item.studentAnswer?.text || '(Tidak dijawab)'}"
                          </p>
                          {item.teacherFeedback && (
                            <div className="text-[11px] text-emerald-900 font-sans bg-emerald-50 p-2 rounded border border-emerald-200">
                              <strong>Umpan Balik Guru: </strong> {item.teacherFeedback}
                            </div>
                          )}
                        </div>
                      )}

                      {qType === 'complex_multiple' && (
                        <div>
                          {item.studentAnswer?.selectedOptionIds?.length > 0 ? (
                            item.studentAnswer.selectedOptionIds.map((id: string) => id.replace('opt-', '')).join(', ')
                          ) : (
                            <span className="text-slate-400 italic">(Tidak dijawab)</span>
                          )}
                        </div>
                      )}

                      {qType === 'short_answer' && (
                        <div>{item.studentAnswer?.text || <span className="text-slate-400 italic">(Tidak dijawab)</span>}</div>
                      )}

                      {qType === 'ordering' && (
                        <div>{item.studentAnswer?.orderedIds?.join(' -> ') || <span className="text-slate-400 italic">(Tidak dijawab)</span>}</div>
                      )}
                    </div>
                  </div>

                  {/* Right: Kunci Jawaban yang Benar (Highlighted Green) */}
                  <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 space-y-2 text-xs">
                    <span className="text-[11px] font-mono font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Kunci Jawaban yang Benar:
                    </span>

                    <div className="text-emerald-950 font-medium">
                      {qType === 'single_choice' && item.answerKey && (
                        <div>
                          <strong className="font-mono text-emerald-900 font-bold text-sm">
                            {item.answerKey.correctOptionId?.replace('opt-', '')}:{' '}
                          </strong>
                          <span>
                            {item.options?.find((o: any) => o.id === item.answerKey.correctOptionId)?.text}
                          </span>
                        </div>
                      )}

                      {qType === 'true_false' && item.answerKey && (
                        <div>
                          <strong className="font-mono text-sm font-bold text-emerald-900">
                            {item.answerKey.isTrue ? 'BENAR' : 'SALAH'}
                          </strong>
                        </div>
                      )}

                      {qType === 'matching' && item.answerKey && (
                        <div className="space-y-1 font-mono text-[11px]">
                          {(() => {
                            const expected = item.answerKey.matches || {};
                            const pairs = item.options?.pairs || [];
                            return pairs.map((p: any) => (
                              <div key={p.id} className="flex items-center justify-between border-b border-emerald-200/60 pb-1">
                                <span className="font-sans text-emerald-900">{p.premise}:</span>
                                <span className="font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                  {expected[p.id]}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      )}

                      {qType === 'essay' && item.answerKey && (
                        <div className="space-y-2">
                          <strong className="block text-[11px] text-emerald-900 font-sans">
                            Poin Esensial Jawaban yang Diharapkan:
                          </strong>
                          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700 font-sans">
                            {item.answerKey.keyPoints?.map((kp: string, i: number) => (
                              <li key={i}>{kp}</li>
                            ))}
                          </ul>

                          {item.rubric && (
                            <div className="pt-2 border-t border-emerald-200 text-[10px] text-slate-600 font-sans">
                              <strong>Panduan Rubrik: </strong>
                              {item.rubric.criteria?.map((c: any) => `${c.description} (${c.point}p)`).join(' · ')}
                            </div>
                          )}
                        </div>
                      )}

                      {qType === 'complex_multiple' && item.answerKey && (
                        <div>
                          Kunci Opsi Benar:{' '}
                          <strong className="font-mono">
                            {item.answerKey.correctOptionIds?.map((id: string) => id.replace('opt-', '')).join(', ')}
                          </strong>
                        </div>
                      )}

                      {qType === 'short_answer' && item.answerKey && (
                        <div>
                          Kunci Jawaban:{' '}
                          <strong className="font-mono">
                            {item.answerKey.acceptedAnswers?.join(' / ')}
                          </strong>
                        </div>
                      )}

                      {qType === 'ordering' && item.answerKey && (
                        <div>
                          Urutan Resmi:{' '}
                          <strong className="font-mono">
                            {item.answerKey.correctOrder?.join(' -> ')}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Deep Scientific Explanation */}
                {item.explanation && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      Pembahasan Konsep Sains Biologi:
                    </div>
                    <p className="leading-relaxed text-slate-700">
                      {item.explanation}
                    </p>

                    {item.distractorRationale && (
                      <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                        <strong className="block text-slate-800 font-sans">
                          Analisis Pengecoh & Miskonsepsi:
                        </strong>
                        {Object.entries(item.distractorRationale).map(([k, v]) => (
                          <div key={k} className="flex items-start gap-1">
                            <span className="font-mono font-semibold text-slate-700 shrink-0">{k}:</span>
                            <span>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.sourceRef && (
                      <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                        Sumber Rujukan: <em>{item.sourceRef}</em>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PDF Report Preview Modal */}
      {showPdfModal && pdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <FileDown className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-bold font-mono truncate">
                  Rapor_Kuis_Biologi_{result.studentName?.replace(/\s+/g, '_')}.pdf
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {downloadHandler && (
                  <button
                    onClick={downloadHandler}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-lg hover:from-emerald-400 hover:to-teal-400 transition-all font-mono active:scale-95"
                  >
                    <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Unduh PDF</span>
                  </button>
                )}
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden">
              <iframe
                src={pdfUrl}
                title="Pratinjau Rapor PDF"
                className="w-full h-full rounded-xl bg-white shadow-inner border border-slate-300"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
