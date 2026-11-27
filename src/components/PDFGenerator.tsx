import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
// jspdf/jspdf-autotable pesan ~500KB minificados: se cargan con import()
// dinámico DENTRO de generatePDF para que no entren al chunk de Results
// (solo se descargan si el usuario pulsa "Descargar PDF").
import type jsPDF from 'jspdf';
import type { ExamResult } from '../types';
import { PERFORMANCE_MESSAGES } from '../types';
import { formatNumber, formatDate, formatTimeReadable, getPerformanceLevel } from '../utils/calculations';
import { getUserHistory, normalizarSubjectResults, type UserHistory } from '../services/api';

interface PDFGeneratorProps {
  result: ExamResult;
  /** Color institucional (hex) de la universidad activa, ya garantizado AA — ver
   * src/theme/universityThemes.ts. Si no se recibe, usa el azul de marca por defecto. */
  accentColor?: string;
  /** Nombre completo de la universidad activa (registro maestro), para el encabezado del PDF. */
  universidadNombre?: string;
  /** Historial ya cargado por Results (si no viene, se pide al generar el PDF). */
  history?: UserHistory | null;
}

type RGB = [number, number, number];

/** #RRGGBB → [r, g, b] (0-255) para las APIs de color de jsPDF, que no aceptan hex directo. */
function hexToRgbTuple(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 61, 122];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mezcla un [r,g,b] hacia blanco (0-1) para tintes suaves de fondo. */
function lightenRgb([r, g, b]: RGB, amount: number): RGB {
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return [mix(r), mix(g), mix(b)];
}

const TINTA: RGB = [30, 41, 59];      // texto principal
const GRIS: RGB = [100, 116, 139];    // etiquetas
const LINEA: RGB = [203, 213, 225];   // bordes finos

function fechaCorta(v: string | Date): string {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v ?? '');
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Reporte formal de resultados en UNA hoja A4: encabezado institucional, datos del postulante,
 * resumen, resultados por asignatura e historial de simulacros (tabla + evolución del puntaje).
 */
export function PDFGenerator({ result, accentColor = '#003D7A', universidadNombre = 'Universidad Nacional del Altiplano', history }: PDFGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const accent = hexToRgbTuple(accentColor);

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const [{ default: JsPDF }, { default: autoTable }, hist] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        history !== undefined && history !== null
          ? Promise.resolve(history)
          : getUserHistory(result.student.dni, result.universidad || 'una', result.proceso).catch(() => null)
      ]);
      const doc = new JsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();   // 210
      const H = doc.internal.pageSize.getHeight();  // 297
      const M = 14;                                  // margen
      const ancho = W - M * 2;
      const tinte = lightenRgb(accent, 0.92);
      const lastY = () => (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

      const titulo = (texto: string, y: number) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...accent);
        doc.text(texto.toUpperCase(), M, y);
        doc.setDrawColor(...accent); doc.setLineWidth(0.35); doc.line(M, y + 1.4, M + ancho, y + 1.4);
        return y + 4.5;
      };

      // ── Encabezado ─────────────────────────────────────────────────────────
      doc.setFillColor(...accent); doc.rect(0, 0, W, 3, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...TINTA);
      doc.text(universidadNombre, M, 13);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRIS);
      doc.text('Sinapsis Preu · Plataforma de simulacros de admisión', M, 18);

      const proceso = (result.proceso || 'ORDINARIO').toUpperCase() === 'CEPRE' ? 'CEPRE' : 'ORDINARIO';
      const codigo = `SU-${result.student.dni}-${new Date(result.date).getTime().toString(36).toUpperCase()}`;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...accent);
      doc.text('REPORTE DE RESULTADOS', W - M, 12, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
      doc.text(`Simulacro ${proceso}`, W - M, 16.5, { align: 'right' });
      doc.text(`N.° ${codigo}`, W - M, 20.5, { align: 'right' });
      doc.setDrawColor(...LINEA); doc.setLineWidth(0.3); doc.line(M, 24, W - M, 24);

      // ── Datos del postulante ──────────────────────────────────────────────
      let y = titulo('Datos del postulante', 31);
      autoTable(doc, {
        startY: y, theme: 'plain', margin: { left: M, right: M },
        styles: { fontSize: 8.5, cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }, textColor: TINTA },
        columnStyles: { 0: { fontStyle: 'bold', textColor: GRIS, cellWidth: 35 }, 1: { cellWidth: 62 }, 2: { fontStyle: 'bold', textColor: GRIS, cellWidth: 30 } },
        body: [
          ['Apellidos y nombres', result.student.fullName, 'DNI', result.student.dni],
          ['Área / división', String(result.student.area), 'Fecha del examen', formatDate(result.date)],
        ],
      });

      // ── Resumen ───────────────────────────────────────────────────────────
      y = titulo('Resumen del resultado', lastY() + 6);
      const nivel = PERFORMANCE_MESSAGES[getPerformanceLevel(result.totalScore, result.umbrales)];
      const correctas = result.answers.filter(a => a.isCorrect).length;
      const enBlanco = result.answers.filter(a => a.selectedOption === null).length;
      const incorrectas = result.answers.length - correctas - enBlanco;
      const celdas: [string, string][] = [
        ['Puntaje', `${formatNumber(result.totalScore, 2)} / ${formatNumber(result.maxScore, 0)}`],
        ['Porcentaje', `${result.percentage.toFixed(1)} %`],
        ['Nivel', nivel.title.replace(/[¡!]/g, '')],
        ['Correctas', `${correctas} de ${result.answers.length}`],
        ['Incorrectas', String(incorrectas)],
        ['En blanco', String(enBlanco)],
        ['Tiempo', formatTimeReadable(result.totalTime)],
      ];
      const cw = ancho / celdas.length, ch = 15;
      celdas.forEach(([etq, val], i) => {
        const x = M + i * cw;
        doc.setFillColor(...(i === 0 ? tinte : [255, 255, 255] as RGB));
        doc.setDrawColor(...LINEA); doc.setLineWidth(0.25);
        doc.rect(x, y, cw, ch, 'FD');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS);
        doc.text(etq.toUpperCase(), x + cw / 2, y + 4.6, { align: 'center' });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(i === 0 ? 10.5 : 9.5);
        doc.setTextColor(...(i === 0 ? accent : TINTA));
        doc.text(val, x + cw / 2, y + 10.8, { align: 'center', maxWidth: cw - 2 });
      });
      y += ch;

      // ── Resultados por asignatura ─────────────────────────────────────────
      y = titulo('Resultados por asignatura', y + 7);
      const asign = normalizarSubjectResults(result.subjectResults);
      autoTable(doc, {
        startY: y, theme: 'grid', margin: { left: M, right: M },
        styles: { fontSize: 7.8, cellPadding: { top: 0.75, bottom: 0.75, left: 1.6, right: 1.6 }, textColor: TINTA, lineColor: LINEA, lineWidth: 0.2 },
        headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: { 0: { halign: 'center', cellWidth: 9 }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right' } },
        head: [['N.°', 'Asignatura', 'Preguntas', 'Correctas', '% de acierto', 'Puntaje']],
        body: asign.map((s, i) => [
          String(i + 1), s.name, String(s.totalQuestions), String(s.correctAnswers),
          `${s.percentage.toFixed(1)} %`, `${formatNumber(s.pointsObtained)} / ${formatNumber(s.maxPoints)}`,
        ]),
        foot: [['', 'TOTAL', String(result.answers.length), String(correctas), `${result.percentage.toFixed(1)} %`,
          `${formatNumber(result.totalScore)} / ${formatNumber(result.maxScore)}`]],
        footStyles: { fillColor: tinte, textColor: accent, fontStyle: 'bold', halign: 'center' },
        didParseCell: (d) => { if (d.section === 'foot' && d.column.index === 5) d.cell.styles.halign = 'right'; },
      });

      // ── Historial de simulacros ───────────────────────────────────────────
      y = titulo('Historial de simulacros', lastY() + 7);
      const intentos = (hist?.history || []).slice(0, 8);   // vienen del más reciente al más antiguo
      if (!intentos.length) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...GRIS);
        doc.text('Este es tu primer simulacro registrado: aún no hay historial para comparar.', M, y + 3);
        y += 6;
      } else {
        const tablaAncho = ancho * 0.58;
        autoTable(doc, {
          startY: y, theme: 'grid', margin: { left: M, right: W - M - tablaAncho }, tableWidth: tablaAncho,
          styles: { fontSize: 7.6, cellPadding: { top: 0.7, bottom: 0.7, left: 1.4, right: 1.4 }, textColor: TINTA, lineColor: LINEA, lineWidth: 0.2, halign: 'center' },
          headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: 'bold' },
          head: [['N.°', 'Fecha', 'Área', 'Puntaje', '%', 'Correctas']],
          body: intentos.map((h, i) => [
            String(intentos.length - i), fechaCorta(h.fecha), String(h.area ?? ''),
            formatNumber(h.puntaje), `${Number(h.porcentaje || 0).toFixed(1)}`, `${h.correctas}/${h.total}`,
          ]),
        });
        const finTabla = lastY();
        // resumen + evolución del puntaje a la derecha
        const gx = M + tablaAncho + 6, gw = ancho - tablaAncho - 6;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); doc.setTextColor(...GRIS);
        const mejor = hist?.mejorPuntaje ?? Math.max(...intentos.map(h => h.puntaje));
        const total = hist?.totalIntentos ?? intentos.length;
        doc.text(`Intentos: ${total}`, gx, y + 2.5);
        doc.text(`Mejor puntaje: ${formatNumber(mejor)}`, gx + gw / 2, y + 2.5);
        const gy = y + 6, gh = Math.max(22, finTabla - gy);
        doc.setDrawColor(...LINEA); doc.setLineWidth(0.25); doc.rect(gx, gy, gw, gh);
        const serie = [...intentos].reverse();
        const maxP = Math.max(...serie.map(h => h.puntajeMax || 0), ...serie.map(h => h.puntaje), 1);
        const px = (i: number) => gx + 5 + (serie.length === 1 ? (gw - 10) / 2 : (i * (gw - 10)) / (serie.length - 1));
        const py = (p: number) => gy + gh - 4 - (p / maxP) * (gh - 9);
        doc.setDrawColor(...accent); doc.setLineWidth(0.6);
        for (let i = 1; i < serie.length; i++) doc.line(px(i - 1), py(serie[i - 1].puntaje), px(i), py(serie[i].puntaje));
        serie.forEach((h, i) => {
          doc.setFillColor(...accent); doc.circle(px(i), py(h.puntaje), 0.9, 'F');
          doc.setFontSize(6.2); doc.setTextColor(...TINTA);
          doc.text(formatNumber(h.puntaje, 0), px(i), py(h.puntaje) - 1.8, { align: 'center' });
        });
        doc.setFontSize(6.2); doc.setTextColor(...GRIS);
        doc.text('Evolución del puntaje (del más antiguo al más reciente)', gx + gw / 2, gy + gh - 1, { align: 'center' });
        y = Math.max(finTabla, gy + gh);
      }

      // ── Pie ───────────────────────────────────────────────────────────────
      const pieY = H - 14;
      doc.setDrawColor(...LINEA); doc.setLineWidth(0.3); doc.line(M, pieY, W - M, pieY);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS);
      doc.text('Documento referencial generado por Sinapsis Preu. No constituye un resultado oficial de admisión.', M, pieY + 4);
      doc.text(`Emitido el ${formatDate(new Date())}`, M, pieY + 8);
      doc.text(`${universidadNombre} · ${codigo}`, W - M, pieY + 8, { align: 'right' });

      const fileName = `SinapsisPreu_${result.student.dni}_${new Date().toISOString().split('T')[0]}.pdf`;
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
