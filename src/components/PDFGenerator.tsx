import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExamResult } from '../types';
import { PERFORMANCE_MESSAGES } from '../types';
import { formatNumber, formatDate, formatTimeReadable } from '../utils/calculations';

interface PDFGeneratorProps {
  result: ExamResult;
}

export function PDFGenerator({ result }: PDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Header
      doc.setFillColor(79, 70, 229); // primary-600
      doc.rect(0, 0, pageWidth, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('SimulaUNA', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Resultados del Examen Simulacro', pageWidth / 2, 30, { align: 'center' });
      doc.text('Universidad Nacional del Altiplano', pageWidth / 2, 38, { align: 'center' });

      yPos = 55;

      // Student info box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 45, 3, 3, 'F');

      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DEL POSTULANTE', margin + 5, yPos + 10);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(`DNI: ${result.student.dni}`, margin + 5, yPos + 22);
      doc.text(`Nombre: ${result.student.fullName}`, margin + 5, yPos + 32);
      doc.text(`Área: ${result.student.area}`, pageWidth / 2, yPos + 22);
      doc.text(`Fecha: ${formatDate(result.date)}`, pageWidth / 2, yPos + 32);

      yPos += 55;

      // Score box
      const performanceInfo = PERFORMANCE_MESSAGES[result.performanceLevel];
      doc.setFillColor(238, 242, 255); // primary-50
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 35, 3, 3, 'F');

      doc.setTextColor(79, 70, 229); // primary-600
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text(formatNumber(result.totalScore, 2), pageWidth / 2, yPos + 18, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont('helvetica', 'normal');
      doc.text(`/ ${formatNumber(result.maxScore, 0)} puntos  •  ${result.percentage.toFixed(1)}%  •  ${performanceInfo.title}`, pageWidth / 2, yPos + 28, { align: 'center' });

      yPos += 45;

      // Quick stats
      const totalCorrect = result.answers.filter(a => a.isCorrect).length;
      const totalIncorrect = result.answers.length - totalCorrect;

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);

      const statsY = yPos;
      const statsWidth = (pageWidth - margin * 2) / 4;

      // Correctas
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.roundedRect(margin, statsY, statsWidth - 5, 25, 2, 2, 'F');
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.setFont('helvetica', 'bold');
      doc.text(String(totalCorrect), margin + statsWidth / 2 - 2.5, statsY + 12, { align: 'center' });
      doc.setFontSize(8);
      doc.text('Correctas', margin + statsWidth / 2 - 2.5, statsY + 20, { align: 'center' });

      // Incorrectas
      doc.setFillColor(254, 242, 242); // red-50
      doc.roundedRect(margin + statsWidth, statsY, statsWidth - 5, 25, 2, 2, 'F');
      doc.setTextColor(220, 38, 38); // red-600
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(String(totalIncorrect), margin + statsWidth * 1.5 - 2.5, statsY + 12, { align: 'center' });
      doc.setFontSize(8);
      doc.text('Incorrectas', margin + statsWidth * 1.5 - 2.5, statsY + 20, { align: 'center' });

      // Tiempo total
      doc.setFillColor(239, 246, 255); // blue-50
      doc.roundedRect(margin + statsWidth * 2, statsY, statsWidth - 5, 25, 2, 2, 'F');
      doc.setTextColor(37, 99, 235); // blue-600
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(formatTimeReadable(result.totalTime), margin + statsWidth * 2.5 - 2.5, statsY + 12, { align: 'center' });
      doc.setFontSize(8);
      doc.text('Tiempo total', margin + statsWidth * 2.5 - 2.5, statsY + 20, { align: 'center' });

      // Total preguntas
      doc.setFillColor(245, 243, 255); // violet-50
      doc.roundedRect(margin + statsWidth * 3, statsY, statsWidth - 5, 25, 2, 2, 'F');
      doc.setTextColor(124, 58, 237); // violet-600
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(String(result.answers.length), margin + statsWidth * 3.5 - 2.5, statsY + 12, { align: 'center' });
      doc.setFontSize(8);
      doc.text('Preguntas', margin + statsWidth * 3.5 - 2.5, statsY + 20, { align: 'center' });

      yPos += 35;

      // Table title
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text('RESULTADOS POR ASIGNATURA', margin, yPos);

      yPos += 5;

      // Results table
      const tableData = result.subjectResults.map((subject) => [
        subject.name,
        `${subject.correctAnswers} / ${subject.totalQuestions}`,
        `${subject.percentage.toFixed(1)}%`,
        `${formatNumber(subject.pointsObtained)} / ${formatNumber(subject.maxPoints)}`
      ]);

      // Add totals row
      tableData.push([
        'TOTAL',
        `${totalCorrect} / ${result.answers.length}`,
        `${result.percentage.toFixed(1)}%`,
        `${formatNumber(result.totalScore)} / ${formatNumber(result.maxScore)}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Asignatura', 'Correctas', 'Porcentaje', 'Puntos']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [30, 41, 59],
          fontSize: 9
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'right' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        footStyles: {
          fillColor: [238, 242, 255],
          textColor: [79, 70, 229],
          fontStyle: 'bold'
        },
        didParseCell: function(data) {
          // Style the last row (totals)
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fillColor = [238, 242, 255];
            data.cell.styles.textColor = [79, 70, 229];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: margin, right: margin }
      });

      // Footer
      const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Este documento fue generado automáticamente por SimulaUNA.',
        pageWidth / 2,
        finalY,
        { align: 'center' }
      );
      doc.text(
        'Universidad Nacional del Altiplano - Puno',
        pageWidth / 2,
        finalY + 6,
        { align: 'center' }
      );

      // Save PDF
      const fileName = `SimulaUNA_${result.student.dni}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating}
      className="btn-primary"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <Download className="w-5 h-5" />
          Descargar PDF
        </>
      )}
    </button>
  );
}
