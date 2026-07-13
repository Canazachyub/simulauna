/**
 * Gráficos de Results (Recharts) extraídos a su propio chunk:
 * recharts pesa cientos de KB minificado y solo hace falta al abrir las
 * tabs Gráfico/Historial — Results.tsx los carga con React.lazy para
 * sacarlo de la ruta crítica de /resultados (Lighthouse móvil).
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line
} from 'recharts';
import { formatNumber } from '../../utils/calculations';

export interface ChartDataItem {
  name: string;
  fullName: string;
  percentage: number;
  correct: number;
  total: number;
}

interface SubjectBarChartProps {
  chartData: ChartDataItem[];
  /** Color institucional AA de la universidad activa (--uni-primary-safe ya resuelto). */
  accent: string;
  /** Dorado semántico de la escala de desempeño (barras altas). */
  gold: string;
}

/** Barras horizontales de rendimiento por asignatura, tematizadas por universidad. */
export function SubjectBarChart({ chartData, accent, gold }: SubjectBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 40, left: 120, bottom: 10 }}
      >
        <defs>
          {/* Barras con el color institucional de la universidad activa (nunca BRAND_PRIMARY fijo) */}
          <linearGradient id="barGradientHigh" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={accent} stopOpacity={0.85} />
            <stop offset="100%" stopColor={gold} stopOpacity={0.95} />
          </linearGradient>
          <linearGradient id="barGradientLow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.75} />
            <stop offset="100%" stopColor={accent} stopOpacity={0.9} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke="#E2E8F0" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
          stroke="#94A3B8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#475569"
          tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
          width={115}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--uni-primary-soft)' }}
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const data = payload[0].payload as ChartDataItem;
            return (
              <div className="glass rounded-xl px-4 py-3 shadow-elevation-3 border border-white/40">
                <p className="font-display font-bold text-slate-800 mb-1">{data.fullName}</p>
                <p className="font-mono text-sm">
                  <span className="font-bold" style={{ color: accent }}>
                    {data.percentage.toFixed(1)}%
                  </span>
                  <span className="text-slate-500"> · {data.correct}/{data.total}</span>
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="percentage"
          radius={[0, 8, 8, 0]}
          barSize={24}
          background={{ fill: '#F1F5F9', radius: 8 }}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.percentage >= 60 ? 'url(#barGradientHigh)' : 'url(#barGradientLow)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface HistoryPoint {
  intento: string;
  puntaje: number;
  porcentaje: number;
  isBest: boolean;
  isLatest: boolean;
}

interface HistoryLineChartProps {
  data: HistoryPoint[];
  accent: string;
  gold: string;
}

/** Evolución de puntajes del historial (mejor intento en dorado, último resaltado). */
export function HistoryLineChart({ data, accent, gold }: HistoryLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#E2E8F0" />
        <XAxis dataKey="intento" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ stroke: accent, strokeWidth: 1, strokeDasharray: '4 4' }}
          content={({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const point = payload[0].payload as HistoryPoint;
            return (
              <div className="glass rounded-xl px-4 py-3 shadow-elevation-3 border border-white/40">
                <p className="font-display font-bold text-slate-800">{point.intento}</p>
                <p className="font-mono font-bold" style={{ color: accent }}>
                  {formatNumber(point.puntaje, 0)} pts
                </p>
                <p className="font-mono text-slate-500 text-xs">{point.porcentaje}% correctas</p>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="puntaje"
          stroke={accent}
          strokeWidth={3}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dot={((props: any) => {
            const { cx, cy, payload, index } = props;
            if (cx === undefined || cy === undefined || !payload) {
              return <g key={`dot-empty-${index ?? 0}`} />;
            }
            const fill = payload.isBest ? gold : payload.isLatest ? accent : '#fff';
            const stroke = payload.isBest ? gold : accent;
            const r = payload.isBest || payload.isLatest ? 7 : 5;
            return (
              <circle
                key={`dot-${index ?? 0}`}
                cx={cx}
                cy={cy}
                r={r}
                fill={fill}
                stroke={stroke}
                strokeWidth={2}
              />
            );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any}
          activeDot={{ r: 9, fill: gold, stroke: accent, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
