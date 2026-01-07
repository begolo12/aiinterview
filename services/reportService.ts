import { Candidate, EvaluationResult } from "../types";

export const generateBODReport = (candidates: Candidate[], filterDivision: string, filterPosition: string) => {
  if (candidates.length === 0) {
    alert("Tidak ada data kandidat untuk dilaporkan.");
    return;
  }

  const doc = new window.jspdf.jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // -- HEADER --
  doc.setFillColor(30, 58, 138); // Blue 800
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN HASIL SELEKSI (BOD)", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Tanggal: ${dateStr}`, 14, 30);
  doc.text(`Filter: ${filterDivision || 'Semua Divisi'} - ${filterPosition || 'Semua Posisi'}`, 14, 35);

  let yPos = 50;

  // -- 1. RINGKASAN EKSEKUTIF --
  const total = candidates.length;
  const lulus = candidates.filter(c => c.status === 'LULUS').length;
  const tidakLulus = candidates.filter(c => c.status === 'TIDAK LULUS').length;
  
  // Top Candidate Logic
  const bestCandidate = candidates
    .filter(c => c.status === 'LULUS')
    .sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0))[0];

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("1. RINGKASAN EKSEKUTIF", 14, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  doc.text(`• Total Kandidat: ${total} Orang`, 14, yPos); yPos += 6;
  doc.text(`• Lolos Seleksi (>=70): ${lulus} Orang (${Math.round((lulus/total)*100)}%)`, 14, yPos); yPos += 6;
  doc.text(`• Tidak Lolos: ${tidakLulus} Orang`, 14, yPos); yPos += 6;
  
  if (bestCandidate) {
    doc.setFillColor(220, 252, 231); // Green 100
    doc.rect(14, yPos, pageWidth - 28, 15, 'F');
    doc.setTextColor(21, 128, 61); // Green 700
    doc.setFont("helvetica", "bold");
    doc.text(`REKOMENDASI TERBAIK: ${bestCandidate.name}`, 18, yPos + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`Posisi: ${bestCandidate.position} | Skor Total: ${bestCandidate.evaluation?.score || 0}/100`, 18, yPos + 11);
    doc.setTextColor(0,0,0);
  }
  yPos += 25;

  // -- 2. REKAPITULASI NILAI --
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("2. REKAPITULASI KANDIDAT", 14, yPos);
  yPos += 5;

  const tableData = candidates.map((c, i) => {
    // Helper to calc average score based on types
    const getAvg = (types: string[]) => {
      if (!c.evaluation?.criteriaScores) return '-';
      const scores = c.evaluation.criteriaScores.filter(s => types.includes(s.type));
      if (scores.length === 0) return '-';
      return Math.round(scores.reduce((acc: number, curr) => acc + curr.score, 0) / scores.length);
    };

    return [
      i + 1,
      c.name,
      c.position,
      c.evaluation?.score ? `${c.evaluation.score}` : '-',
      c.status,
      // Column 5: Manual/General Score
      getAvg(['Manual (HR)', 'General']),
      // Column 6: AI/Technical Score
      getAvg(['Analisis AI', 'Technical'])
    ];
  });

  doc.autoTable({
    startY: yPos,
    head: [['No', 'Nama', 'Posisi', 'Total', 'Status', 'Nilai Manual', 'Nilai AI']],
    body: tableData,
    headStyles: { fillColor: [30, 58, 138] },
    theme: 'grid',
    styles: { fontSize: 9, halign: 'center' },
    columnStyles: { 1: { halign: 'left' }, 2: { halign: 'left' } }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // -- 3. DETAIL RAPOR PENILAIAN (10 SEKTOR) --
  // Hanya menampilkan kandidat yang sudah dievaluasi
  const evaluatedCandidates = candidates.filter(c => c.evaluation).sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0));

  if (evaluatedCandidates.length > 0) {
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("3. RAPOR DETAIL PENILAIAN", 14, yPos);
    yPos += 10;

    evaluatedCandidates.forEach((c) => {
      // Check page break if header won't fit
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      // Store Start Y for the bounding box
      const startBoxY = yPos;
      
      // -- Candidate Header Bar --
      const isPass = c.status === 'LULUS';
      doc.setFillColor(isPass ? 220 : 254, isPass ? 252 : 226, isPass ? 231 : 226); // Green or Red tint
      doc.rect(14, yPos, pageWidth - 28, 14, 'F');
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0,0,0);
      doc.text(`${c.name} - ${c.position}`, 18, yPos + 9);
      
      doc.setFontSize(10);
      doc.text(`SKOR AKHIR: ${c.evaluation?.score}`, pageWidth - 50, yPos + 9);

      // -- Data Table --
      let tableY = yPos + 14; // Start right below header
      
      const criteriaData = c.evaluation?.criteriaScores?.map(cs => [
        cs.type,
        cs.name,
        `${cs.score}/100`,
        cs.reason
      ]) || [];

      doc.autoTable({
        startY: tableY,
        margin: { left: 14, right: 14 }, // Align with box
        tableWidth: pageWidth - 28,
        head: [['Tipe', 'Indikator Penilaian', 'Skor', 'Keterangan']],
        body: criteriaData,
        theme: 'grid', // Changed to grid for better sector separation
        // CRITICAL FIX: linebreak allowing text wrapping
        styles: { 
          fontSize: 8, 
          cellPadding: 3, 
          overflow: 'linebreak', // Allows wrapping
          valign: 'middle'
        },
        headStyles: { 
          fontSize: 8, 
          fontStyle: 'bold', 
          fillColor: [240, 240, 240], 
          textColor: 50,
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Tipe
          1: { cellWidth: 45 }, // Indikator
          2: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, // Skor
          3: { cellWidth: 'auto' } // Keterangan takes remaining space
        }
      });

      // -- Conclusion / Summary --
      const tableFinalY = (doc as any).lastAutoTable.finalY;
      
      // Check if summary needs new page
      let currentY = tableFinalY + 5;
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 20;
      }

      // Add "Kesimpulan" Label
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Kesimpulan Eksekutif:", 18, currentY + 4);
      
      // Add Summary Text with wrapping
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      
      const splitSummary = doc.splitTextToSize(`"${c.evaluation?.summary || '-'}"`, pageWidth - 40);
      doc.text(splitSummary, 18, currentY + 10);
      
      const summaryHeight = (splitSummary.length * 4) + 15; // Calc height of summary
      const endBoxY = currentY + summaryHeight;

      // -- Draw Outer Border --
      // We draw this LAST so we know exactly how high the content was
      // Note: If autoTable triggered a page break internally, drawing a single rect is hard.
      // We will skip drawing the giant rect across pages to avoid artifacts, 
      // but we will draw a bottom line to close the section.
      
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      
      // If the table didn't break page (simple case), we can try to box it, 
      // but to be safe against page breaks, we just draw a separator line at the bottom.
      doc.line(14, endBoxY, pageWidth - 14, endBoxY);

      // Prepare Y for next candidate
      yPos = endBoxY + 10;
    });
  }

  // Footer Numbering
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated by Daniswara Onboarding System - Page ${i} of ${pageCount}`, pageWidth - 70, pageHeight - 10);
  }

  doc.save(`Laporan_Seleksi_${dateStr.replace(/ /g, '_')}.pdf`);
};