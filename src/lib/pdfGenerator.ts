import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ClassSummaryPdfData {
  classroom: {
    name: string;
    code: string;
    academic_year?: string;
  };
  quiz: {
    title: string;
    topic_title?: string;
    passing_score: number;
    duration_minutes?: number;
  };
  teacherName?: string;
  teacherNip?: string;
  schoolName?: string;
  totalStudents: number;
  attemptedCount: number;
  passedCount: number;
  remedialCount: number;
  passRate: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  students: Array<{
    no: number;
    nis: string;
    name: string;
    gender: string;
    breakdown: {
      pg: number;
      bs: number;
      jd: number;
      es: number;
    };
    score: number | null;
    isPassed: boolean;
    kkmStatus: string;
    teacherNote?: string;
  }>;
}

export interface StudentReportCardPdfData {
  attemptId: string;
  student: {
    name: string;
    nis: string;
    gender: string;
    email: string;
    classroom: string;
    academicYear: string;
  };
  quiz: {
    id: string;
    title: string;
    topic: string;
    passingScore: number;
    durationMinutes: number;
    teacherName: string;
    teacherNip?: string;
    schoolName?: string;
  };
  result: {
    score: number;
    maxScore: number;
    percentage: number;
    isPassed: boolean;
    kkmStatus: string;
    feedback?: string;
    startTime?: string;
    endTime?: string;
    evaluatedAt?: string;
  };
  items: Array<{
    no: number;
    type: string;
    cognitiveLevel: string;
    questionText: string;
    pointsEarned: number;
    maxPoints: number;
    isCorrect: boolean;
    studentAnswer: any;
    answerKey: any;
    explanation?: string;
    teacherFeedback?: string;
  }>;
}

/**
 * Generates an official, publication-ready PDF for 35 Students Class Results & KKM Analysis.
 */
export function generateClassSummaryPdf(data: ClassSummaryPdfData): { doc: jsPDF; blobUrl: string; download: () => void } {
  // Use A4 landscape orientation for wide gradebook table
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Official Header / Kop Surat Satuan Pendidikan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI', pageWidth / 2, 13, { align: 'center' });
  
  doc.setFontSize(13);
  doc.setTextColor(6, 78, 59); // Deep emerald
  doc.text('SMA NEGERI 1 LABORATORIUM SAINS BIOLOGI INDONESIA', pageWidth / 2, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Jl. Biologi Sains No. 10, Kampus Merdeka, Jakarta Selatan | Telp: (021) 7890123 | NPSN: 20109988 | bio-lab.sekolah.id', pageWidth / 2, 22.5, { align: 'center' });

  // Double horizontal separator line
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.8);
  doc.line(14, 25, pageWidth - 14, 25);
  doc.setLineWidth(0.2);
  doc.line(14, 26, pageWidth - 14, 26);

  // 2. Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('REKAPITULASI NILAI DAN ANALISIS KETERCAPAIAN KKM KELAS', pageWidth / 2, 33, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Kuis: ${data.quiz.title} (Standar KKM: ${data.quiz.passing_score})`, pageWidth / 2, 37.5, { align: 'center' });

  // 3. Metadata Strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 41, pageWidth - 28, 14, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Kelas / Rombel:', 18, 46);
  doc.text('Mata Pelajaran:', 18, 51.5);

  doc.setFont('helvetica', 'normal');
  doc.text(`${data.classroom.name} (${data.classroom.code})`, 45, 46);
  doc.text('Biologi Fase E (Kelas X SMA/MA)', 45, 51.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Tahun Ajaran:', 110, 46);
  doc.text('Guru Pengampu:', 110, 51.5);

  doc.setFont('helvetica', 'normal');
  doc.text(data.classroom.academic_year || '2026/2027', 135, 46);
  doc.text(data.teacherName || 'Dr. Ratna Dewi, M.Pd.', 135, 51.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Peserta:', 210, 46);
  doc.text('Ketuntasan Klasikal:', 210, 51.5);

  doc.setFont('helvetica', 'normal');
  doc.text(`${data.totalStudents} Murid`, 245, 46);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(data.passRate >= 75 ? 5 : 225, data.passRate >= 75 ? 150 : 29, data.passRate >= 75 ? 105 : 72);
  doc.text(`${data.passedCount}/${data.attemptedCount} Siswa (${data.passRate}%)`, 245, 51.5);

  // 4. Student Score Table (35 Students)
  const tableData = data.students.map((st) => [
    st.no,
    st.nis,
    st.name,
    st.gender,
    st.breakdown.pg,
    st.breakdown.bs,
    st.breakdown.jd,
    st.breakdown.es,
    st.score !== null ? st.score : '-',
    st.isPassed ? 'TUNTAS' : 'REMEDIAL',
    st.isPassed ? 'Pengayaan Mandiri' : 'Bimbingan Remedial',
  ]);

  autoTable(doc, {
    startY: 58,
    margin: { left: 14, right: 14 },
    head: [[
      'No',
      'NIS',
      'Nama Lengkap Murid',
      'L/P',
      'PG (25)',
      'B/S (25)',
      'Jodoh (25)',
      'Uraian (25)',
      'Nilai Akhir',
      'Status KKM (75)',
      'Rekomendasi Tindak Lanjut'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.6,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineWidth: 0.15,
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: [6, 78, 59], // Dark emerald
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 18, font: 'courier' },
      2: { cellWidth: 62, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 10 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      9: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
      10: { cellWidth: 46, fontSize: 7 },
    },
    didParseCell: (hookData) => {
      // Color-code Status KKM
      if (hookData.section === 'body' && hookData.column.index === 9) {
        if (hookData.cell.raw === 'TUNTAS') {
          hookData.cell.styles.fillColor = [236, 253, 245]; // soft emerald
          hookData.cell.styles.textColor = [4, 120, 87];
        } else if (hookData.cell.raw === 'REMEDIAL') {
          hookData.cell.styles.fillColor = [255, 241, 242]; // soft rose
          hookData.cell.styles.textColor = [190, 18, 60];
        }
      }
      // Highlight final score column
      if (hookData.section === 'body' && hookData.column.index === 8) {
        const val = Number(hookData.cell.raw);
        if (val >= 75) {
          hookData.cell.styles.textColor = [5, 150, 105];
        } else if (!isNaN(val)) {
          hookData.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
  });

  // 5. Summary Analysis Box & Signature Block below table
  const finalY = (doc as any).lastAutoTable.finalY || 160;
  let summaryY = finalY + 6;

  // Add new page if table finished too close to bottom
  if (summaryY > pageHeight - 45) {
    doc.addPage();
    summaryY = 18;
  }

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, summaryY, 130, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Statistik & Analisis Hasil Evaluasi Kelas X:', 18, summaryY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Total Murid Terdaftar: ${data.totalStudents} orang`, 18, summaryY + 11);
  doc.text(`• Murid Mencapai KKM (>= 75): ${data.passedCount} orang (${data.passRate}%)`, 18, summaryY + 16);
  doc.text(`• Murid Belum Mencapai KKM (Remedial): ${data.remedialCount} orang (${100 - data.passRate}%)`, 18, summaryY + 21);
  doc.text(`• Nilai Rata-rata: ${data.averageScore} | Tertinggi: ${data.highestScore} | Terendah: ${data.lowestScore}`, 18, summaryY + 26);

  // Official Signature Block
  const sigX = pageWidth - 100;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Jakarta Selatan, ${todayStr}`, sigX, summaryY + 5.5);
  doc.text('Guru Mata Pelajaran Biologi,', sigX, summaryY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text(data.teacherName || 'Dr. Ratna Dewi, M.Pd.', sigX, summaryY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.teacherNip ? `NIP. ${data.teacherNip}` : 'NIP. 19820815 200801 2 015', sigX, summaryY + 28);

  const blobUrl = doc.output('bloburl').toString();
  const filename = `Rekap_Nilai_Biologi_Kelas_X_${data.classroom.name.replace(/\s+/g, '_')}.pdf`;

  return {
    doc,
    blobUrl,
    download: () => {
      doc.save(filename);
    },
  };
}

/**
 * Generates an official, publication-ready Individual Student PDF Report Card.
 */
export function generateStudentReportCardPdf(data: StudentReportCardPdfData): { doc: jsPDF; blobUrl: string; download: () => void } {
  // Use A4 portrait orientation for report card
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Official Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text('KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI', pageWidth / 2, 13, { align: 'center' });

  doc.setFontSize(12.5);
  doc.setTextColor(6, 78, 59);
  doc.text('SMA NEGERI 1 LABORATORIUM SAINS BIOLOGI INDONESIA', pageWidth / 2, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Jl. Biologi Sains No. 10, Kampus Merdeka, Jakarta Selatan | Telp: (021) 7890123 | bio-lab.sekolah.id', pageWidth / 2, 22, { align: 'center' });

  // Double line
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.7);
  doc.line(14, 24.5, pageWidth - 14, 24.5);
  doc.setLineWidth(0.2);
  doc.line(14, 25.5, pageWidth - 14, 25.5);

  // 2. Report Card Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LEMBAR LAPORAN HASIL ASESMEN BIOLOGI FASE E', pageWidth / 2, 33, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Kurikulum Merdeka 2026/2027 · Evaluasi 4 Format Soal Terstandar`, pageWidth / 2, 37.5, { align: 'center' });

  // 3. Student Bio & Quiz Meta Grid
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 41, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Nama Siswa:', 18, 47);
  doc.text('NIS / NISN:', 18, 53);
  doc.text('Kelas / Rombel:', 18, 59);

  doc.setFont('helvetica', 'normal');
  doc.text(data.student.name, 45, 47);
  doc.text(data.student.nis, 45, 53);
  doc.text(data.student.classroom, 45, 59);

  doc.setFont('helvetica', 'bold');
  doc.text('Judul Kuis:', 105, 47);
  doc.text('Topik Materi:', 105, 53);
  doc.text('Batas KKM:', 105, 59);

  doc.setFont('helvetica', 'normal');
  doc.text(data.quiz.title.length > 35 ? data.quiz.title.substring(0, 35) + '...' : data.quiz.title, 130, 47);
  doc.text(data.quiz.topic, 130, 53);
  doc.text(`${data.quiz.passingScore} (Skala 100)`, 130, 59);

  // 4. Large Score & KKM Achievement Badge
  const badgeY = 69;
  const isPassed = data.result.isPassed;
  
  doc.setFillColor(isPassed ? 236 : 255, isPassed ? 253 : 241, isPassed ? 245 : 242);
  doc.setDrawColor(isPassed ? 5 : 225, isPassed ? 150 : 29, isPassed ? 105 : 72);
  doc.roundedRect(14, badgeY, pageWidth - 28, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(isPassed ? 4 : 190, isPassed ? 120 : 18, isPassed ? 87 : 60);
  doc.text(`STATUS KETUNTASAN: ${data.result.kkmStatus}`, 20, badgeY + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    isPassed
      ? 'Selamat! Hasil asesmen Anda telah memenuhi Kriteria Ketuntasan Minimal.'
      : 'Perhatian: Nilai Anda berada di bawah batas KKM 75. Silakan hubungi guru untuk jadwal bimbingan remedial.',
    20,
    badgeY + 14
  );

  // Score Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(isPassed ? 4 : 190, isPassed ? 120 : 18, isPassed ? 87 : 60);
  doc.text(`${Math.round(data.result.percentage)}`, pageWidth - 32, badgeY + 11, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('/ 100 Poin', pageWidth - 32, badgeY + 15, { align: 'center' });

  // 5. Score Breakdown Table Across 4 Formats
  const typeSummary = [
    { format: 'Pilihan Ganda', max: 25, earned: 0 },
    { format: 'Benar / Salah', max: 25, earned: 0 },
    { format: 'Menjodohkan', max: 25, earned: 0 },
    { format: 'Uraian / Essay', max: 25, earned: 0 },
  ];

  data.items.forEach(it => {
    if (it.type === 'single_choice' || it.type === 'complex_multiple') typeSummary[0].earned += it.pointsEarned;
    else if (it.type === 'true_false') typeSummary[1].earned += it.pointsEarned;
    else if (it.type === 'matching' || it.type === 'ordering') typeSummary[2].earned += it.pointsEarned;
    else if (it.type === 'essay' || it.type === 'short_answer') typeSummary[3].earned += it.pointsEarned;
  });

  const breakdownRows = typeSummary.map(t => [
    t.format,
    `${t.max} Poin`,
    `${t.earned} Poin`,
    `${Math.round((t.earned / t.max) * 100)}%`,
    t.earned >= (t.max * 0.75) ? 'Tuntas Kompetensi' : 'Perlu Penguatan Konsep',
  ]);

  autoTable(doc, {
    startY: 91,
    margin: { left: 14, right: 14 },
    head: [['Format Soal Asesmen', 'Bobot Maksimal', 'Poin Dicapai', 'Persentase', 'Keterangan Ketercapaian']],
    body: breakdownRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [6, 78, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center', fontStyle: 'bold' },
      3: { halign: 'center' },
      4: { fontStyle: 'italic', fontSize: 7.5 },
    },
  });

  // 6. Detailed Item Breakdown Table
  const tableY = (doc as any).lastAutoTable.finalY + 6;

  const itemRows = data.items.map(it => {
    let studentAnsStr = '-';
    if (it.studentAnswer) {
      if (typeof it.studentAnswer === 'string') studentAnsStr = it.studentAnswer;
      else if (it.studentAnswer.selectedOptionId) studentAnsStr = `Opsi ${it.studentAnswer.selectedOptionId.replace('opt-', '')}`;
      else if (it.studentAnswer.isTrue !== undefined) studentAnsStr = it.studentAnswer.isTrue ? 'Benar' : 'Salah';
      else if (it.studentAnswer.text) studentAnsStr = it.studentAnswer.text.substring(0, 50) + (it.studentAnswer.text.length > 50 ? '...' : '');
      else if (it.studentAnswer.matches) studentAnsStr = 'Padanan Terisi';
    }

    let keyStr = '-';
    if (it.answerKey) {
      if (it.answerKey.correctOptionId) keyStr = `Opsi ${it.answerKey.correctOptionId.replace('opt-', '')}`;
      else if (it.answerKey.isTrue !== undefined) keyStr = it.answerKey.isTrue ? 'Benar' : 'Salah';
      else if (it.answerKey.idealText) keyStr = it.answerKey.idealText.substring(0, 40) + '...';
      else if (it.answerKey.correctMatches) keyStr = 'Kunci Padanan Valid';
    }

    return [
      it.no,
      it.type.replace('_', ' ').toUpperCase(),
      it.cognitiveLevel,
      `${it.pointsEarned}/${it.maxPoints}`,
      studentAnsStr,
      keyStr,
      it.isCorrect ? 'Benar' : 'Salah / Sebagian',
    ];
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Rincian Jawaban Siswa & Kunci Jawaban Resmi:', 14, tableY);

  autoTable(doc, {
    startY: tableY + 2.5,
    margin: { left: 14, right: 14 },
    head: [['No', 'Tipe Format', 'Bloom', 'Skor', 'Jawaban Siswa', 'Kunci Resmi', 'Status']],
    body: itemRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      font: 'helvetica',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 28, fontSize: 7 },
      2: { halign: 'center', cellWidth: 14, font: 'courier' },
      3: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      4: { cellWidth: 46, fontSize: 7 },
      5: { cellWidth: 44, fontSize: 7 },
      6: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 6) {
        if (hookData.cell.raw === 'Benar') {
          hookData.cell.styles.textColor = [5, 150, 105];
        } else {
          hookData.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
  });

  // 7. Teacher Feedback Box & Signature
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  let bottomY = finalY + 6;

  if (bottomY > pageHeight - 38) {
    doc.addPage();
    bottomY = 18;
  }

  // Teacher feedback box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, bottomY, 110, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Catatan Guru Mata Pelajaran:', 18, bottomY + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const note = data.result.feedback || (isPassed ? 'Penguasaan konsep biologi sangat baik dan tuntas.' : 'Perlu memperdalam konsep daur virus dan mengerjakan latihan remedial.');
  doc.text(doc.splitTextToSize(note, 100), 18, bottomY + 10);

  // Signature
  const sigX = pageWidth - 65;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Jakarta Selatan, ${todayStr}`, sigX, bottomY + 5);
  doc.text('Guru Pengampu,', sigX, bottomY + 9);

  doc.setFont('helvetica', 'bold');
  doc.text(data.quiz.teacherName || 'Dr. Ratna Dewi, M.Pd.', sigX, bottomY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(data.quiz.teacherNip ? `NIP. ${data.quiz.teacherNip}` : 'NIP. 19820815 200801 2 015', sigX, bottomY + 24);

  const blobUrl = doc.output('bloburl').toString();
  const filename = `Rapor_Kuis_Biologi_${data.student.name.replace(/\s+/g, '_')}_NIS_${data.student.nis}.pdf`;

  return {
    doc,
    blobUrl,
    download: () => {
      doc.save(filename);
    },
  };
}
