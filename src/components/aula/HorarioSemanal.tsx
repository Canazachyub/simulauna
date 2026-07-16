import { CalendarDays, Video, MapPin } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import { DIA_LABEL, DIA_LABEL_CORTO } from './aulaFormat';
import { ordenDia, type DiaSemana, type HorarioItemMock } from './aulaMock';

interface HorarioSemanalProps {
  horario: HorarioItemMock[];
}

/**
 * Horario semanal (docs/AULA_VIRTUAL_DISENO.md §4): agrupado por día,
 * ordenado por hora. En desktop se ve como columnas por día (similar a un
 * calendario), en móvil como lista agrupada — un grid de 7 columnas no es
 * legible en una pantalla angosta, así que se prioriza legibilidad sobre
 * parecerse a un calendario de escritorio.
 */
export function HorarioSemanal({ horario }: HorarioSemanalProps) {
  const porDia = new Map<DiaSemana, HorarioItemMock[]>();
  for (const item of horario) {
    const lista = porDia.get(item.dia) || [];
    lista.push(item);
    porDia.set(item.dia, lista);
  }
  const dias = [...porDia.keys()].sort((a, b) => ordenDia(a) - ordenDia(b));

  return (
    <AulaSectionCard icon={CalendarDays} title="Horario semanal" spanClassName="sm:col-span-2 lg:col-span-2">
      {dias.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no se publicó el horario de este ciclo.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {dias.map((dia) => (
            <div key={dia} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-2">
                <span className="md:hidden">{DIA_LABEL[dia]}</span>
                <span className="hidden md:inline">{DIA_LABEL_CORTO[dia]}</span>
              </p>
              <ul className="space-y-2">
                {porDia
                  .get(dia)!
                  .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
                  .map((bloque, i) => (
                    <li key={i} className="text-sm">
                      <p className="font-semibold text-slate-700 leading-tight">{bloque.curso}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {bloque.horaInicio}–{bloque.horaFin}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        {bloque.modalidad === 'virtual' ? (
                          <Video className="w-3 h-3 shrink-0" aria-hidden="true" />
                        ) : (
                          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                        )}
                        {bloque.docente}
                      </p>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </AulaSectionCard>
  );
}

export default HorarioSemanal;
