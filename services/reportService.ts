
import { Candidate, EvaluationResult } from "../types";

export const generateBODReport = (candidates: Candidate[], filterDivision: string, filterPosition: string): boolean => {
  if (candidates.length === 0) {
    return false;
  }

  const doc = new window.jspdf.jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // -- HEADER --
  // Header Violet Bar
  doc.setFillColor(109, 40, 217); // Violet 700 (was Blue 800)
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Logo / Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN HASIL SELEKSI", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Generated: ${dateStr}`, 14, 30);
  doc.text(`Divisi: ${filterDivision || 'Semua'} | Posisi: ${filterPosition || 'Semua'}`, 14, 35);

  let yPos = 55;

  // -- 1. RINGKASAN EKSEKUTIF (Hanya di halaman pertama) --
  const total = candidates.length;
  const lulus = candidates.filter(c => c.status === 'LULUS').length;
  const tidakLulus = candidates.filter(c => c.status === 'TIDAK LULUS').length;
  const bestCandidate = candidates
    .filter(c => c.status === 'LULUS')
    .sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0))[0];

  doc.setTextColor(109, 40, 217); // Violet 700
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("1. RINGKASAN EKSEKUTIF", 14, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  
  // Stats Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(14, yPos, pageWidth - 28, 25, 3, 3, 'FD');
  
  doc.text(`Total Kandidat: ${total}`, 20, yPos + 10);
  doc.text(`Lolos: ${lulus} (${total ? Math.round((lulus/total)*100) : 0}%)`, 80, yPos + 10);
  doc.text(`Tidak Lolos: ${tidakLulus}`, 140, yPos + 10);
  
  if (bestCandidate) {
    doc.setTextColor(22, 163, 74); // Green
    doc.setFont("helvetica", "bold");
    doc.text(`Top Rekomendasi: ${bestCandidate.name} (${bestCandidate.evaluation?.score}/100)`, 20, yPos + 18);
  } else {
    doc.setTextColor(150, 150, 150);
    doc.text("Belum ada kandidat yang LULUS.", 20, yPos + 18);
  }

  yPos += 35;

  // -- 2. REKAPITULASI TABEL --
  doc.setTextColor(109, 40, 217); // Violet 700
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("2. REKAPITULASI KANDIDAT", 14, yPos);
  yPos += 5;

  const tableData = candidates.map((c, i) => [
    i + 1,
    c.name,
    c.position,
    c.evaluation?.score ? `${c.evaluation.score}` : '-',
    c.status,
    c.evaluation?.generalScore || '-',
    c.evaluation?.technicalScore || '-'
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['No', 'Nama', 'Posisi', 'Total', 'Status', 'General', 'Teknis']],
    body: tableData,
    headStyles: { fillColor: [109, 40, 217], halign: 'center' }, // Violet 700
    bodyStyles: { textColor: 50 },
    theme: 'grid',
    styles: { fontSize: 9, halign: 'center', cellPadding: 3 },
    columnStyles: { 1: { halign: 'left' }, 2: { halign: 'left' } }
  });

  // -- 3. DETAIL RAPOR PER KANDIDAT --
  const evaluatedCandidates = candidates.filter(c => c.evaluation).sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0));

  if (evaluatedCandidates.length > 0) {
    evaluatedCandidates.forEach((c) => {
      doc.addPage();
      yPos = 20;

      // Header Nama Kandidat
      const isPass = c.status === 'LULUS';
      doc.setFillColor(isPass ? 220 : 254, isPass ? 252 : 226, isPass ? 231 : 226); // Soft Green or Red
      doc.rect(0, 0, pageWidth, 30, 'F');

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(c.name, 14, 18);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${c.position}  |  ${c.division}`, 14, 25);

      // Score Badge in Top Right
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(isPass ? 22 : 220, isPass ? 163 : 38, isPass ? 74 : 38);
      doc.text(`${c.evaluation?.score}`, pageWidth - 30, 20, { align: 'right' });
      doc.setFontSize(8);
      doc.text("SKOR AKHIR", pageWidth - 30, 25, { align: 'right' });

      yPos = 40;

      // -- A. ANALISIS KUALITATIF (Strengths & Weaknesses) --
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(109, 40, 217); // Violet 700
      doc.text("A. ANALISIS KUALITATIF AI", 14, yPos);
      yPos += 5;

      // Box Strengths
      doc.setFillColor(240, 253, 244); // Green 50
      doc.setDrawColor(22, 163, 74); // Green 600
      doc.rect(14, yPos, (pageWidth/2) - 20, 40, 'FD');
      
      doc.setTextColor(22, 163, 74);
      doc.setFontSize(10);
      doc.text("KEKUATAN (STRENGTHS)", 18, yPos + 8);
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      const strengthsText = (c.evaluation?.strengths || []).map(s => `• ${s}`).join("\n");
      const splitStrengths = doc.splitTextToSize(strengthsText, (pageWidth/2) - 30);
      doc.text(splitStrengths, 18, yPos + 14);

      // Box Weaknesses
      doc.setFillColor(254, 242, 242); // Red 50
      doc.setDrawColor(220, 38, 38); // Red 600
      doc.rect((pageWidth/2) + 6, yPos, (pageWidth/2) - 20, 40, 'FD');

      doc.setTextColor(220, 38, 38);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("AREA PERBAIKAN (WEAKNESSES)", (pageWidth/2) + 10, yPos + 8);
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      const weakText = (c.evaluation?.weaknesses || []).map(w => `• ${w}`).join("\n");
      const splitWeak = doc.splitTextToSize(weakText, (pageWidth/2) - 30);
      doc.text(splitWeak, (pageWidth/2) + 10, yPos + 14);

      yPos += 50;

      // -- B. DETAIL PERTANYAAN & SKOR --
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(109, 40, 217); // Violet 700
      doc.text("B. DETAIL PERTANYAAN & SKOR", 14, yPos);
      yPos += 5;

      // Prepare Data from questionBreakdown
      // Fallback if breakdown doesn't exist (old data)
      let detailData = [];
      if (c.evaluation?.questionBreakdown && c.evaluation.questionBreakdown.length > 0) {
        detailData = c.evaluation.questionBreakdown.map((q) => [
          q.category,
          q.question, // Question text
          q.reasoning || '-', // New: Reasoning/Explanation
          `${q.weight}%`, // Weight
          q.score // Score
        ]);
      } else {
        // Fallback for old data without breakdown
        detailData = [
            ['General', 'Nilai Rata-rata General (Data Lama)', 'Data Lama', '50%', c.evaluation?.generalScore || 0],
            ['Technical', 'Nilai Rata-rata Technical (Data Lama)', 'Data Lama', '50%', c.evaluation?.technicalScore || 0]
        ];
      }

      doc.autoTable({
        startY: yPos,
        head: [['Kategori', 'Pertanyaan', 'Analisis / Respon', 'Bobot', 'Skor']],
        body: detailData,
        theme: 'grid',
        headStyles: { fillColor: [243, 232, 255], textColor: [109, 40, 217], fontStyle: 'bold' }, // Violet 100 bg, Violet 700 text
        styles: { fontSize: 8, cellPadding: 3, valign: 'middle', overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold' },
          1: { cellWidth: 60 }, // Question
          2: { cellWidth: 'auto' }, // Reasoning (Dynamic)
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: function(data: any) {
            // Color code the score column (index 4)
            if (data.section === 'body' && data.column.index === 4) {
                const val = parseInt(data.cell.raw);
                if (val >= 80) data.cell.styles.textColor = [22, 163, 74]; // Green
                else if (val < 50) data.cell.styles.textColor = [220, 38, 38]; // Red
            }
        }
      });

      // -- C. KESIMPULAN --
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(14, finalY, pageWidth - 28, 20, 2, 2, 'FD');
      
      doc.setFontSize(9);
      doc.setTextColor(109, 40, 217); // Violet 700
      doc.setFont("helvetica", "bold");
      doc.text("KESIMPULAN AI:", 18, finalY + 6);
      
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      doc.setFont("helvetica", "italic");
      const summaryText = doc.splitTextToSize(`"${c.evaluation?.summary || '-'}"`, pageWidth - 40);
      doc.text(summaryText, 18, finalY + 11);
    });
  }

  // Footer Numbering
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Daniswara Onboarding AI - Page ${i} of ${pageCount}`, pageWidth - 60, pageHeight - 10);
  }

  doc.save(`Laporan_Seleksi_${dateStr.replace(/ /g, '_')}.pdf`);
  return true;
};
