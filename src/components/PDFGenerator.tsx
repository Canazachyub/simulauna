import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
// jspdf/jspdf-autotable pesan ~500KB minificados: se cargan con import()
// dinámico DENTRO de generatePDF para que no entren al chunk de Results
// (solo se descargan si el usuario pulsa "Descargar PDF").
import type jsPDF from 'jspdf';
import type { ExamResult } from '../types';
import { PERFORMANCE_MESSAGES } from '../types';
import { formatNumber, formatDate, formatTimeReadable } from '../utils/calculations';

interface PDFGeneratorProps {
  result: ExamResult;
  /** Color institucional (hex) de la universidad activa, ya garantizado AA — ver
   * src/theme/universityThemes.ts. Si no se recibe, usa el azul de marca por defecto. */
  accentColor?: string;
  /** Nombre completo de la universidad activa (registro maestro), para el encabezado del PDF. */
  universidadNombre?: string;
}

/** #RRGGBB → [r, g, b] (0-255) para las APIs de color de jsPDF, que no aceptan hex directo. */
function hexToRgbTuple(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 61, 122];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mezcla un [r,g,b] hacia blanco (0-1) para tintes suaves de fondo (cajas de score, etc). */
function lightenRgb([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return [mix(r), mix(g), mix(b)];
}

export function PDFGenerator({ result, accentColor = '#003D7A', universidadNombre = 'Universidad Nacional del Altiplano' }: PDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [accentR, accentG, accentB] = hexToRgbTuple(accentColor);

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const doc = new JsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Header — color institucional de la universidad activa
      doc.setFillColor(accentR, accentG, accentB);
      doc.rect(0, 0, pageWidth, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('SimulaUNA', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Resultados del Examen Simulacro', pageWidth / 2, 30, { align: 'center' });
      doc.text(universidadNombre, pageWidth / 2, 38, { align: 'center' });

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

      // Score box — tinte suave del color institucional
      const performanceInfo = PERFORMANCE_MESSAGES[result.performanceLevel];
      const [scoreBoxR, scoreBoxG, scoreBoxB] = lightenRgb([accentR, accentG, accentB], 0.9);
      doc.setFillColor(scoreBoxR, scoreBoxG, scoreBoxB);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 35, 3, 3, 'F');

      doc.setTextColor(accentR, accentG, accentB);
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

      const [tableTintR, tableTintG, tableTintB] = lightenRgb([accentR, accentG, accentB], 0.9);

      autoTable(doc, {
        startY: yPos,
        head: [['Asignatura', 'Correctas', 'Porcentaje', 'Puntos']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [accentR, accentG, accentB],
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
          fillColor: [tableTintR, tableTintG, tableTintB],
          textColor: [accentR, accentG, accentB],
          fontStyle: 'bold'
        },
        didParseCell: function(data) {
          // Style the last row (totals)
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fillColor = [tableTintR, tableTintG, tableTintB];
            data.cell.styles.textColor = [accentR, accentG, accentB];
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
        universidadNombre,
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
