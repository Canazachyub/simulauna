import { Calculator, Users, Heart, CheckCircle } from 'lucide-react';
import type { AreaType, Config } from '../types';
import { AREA_INFO } from '../types';

interface AreaSelectorProps {
  selectedArea: AreaType | null;
  onSelectArea: (area: AreaType) => void;
  config: Config | null;
}

const AREA_ICONS = {
  'Ingenierías': Calculator,
  'Sociales': Users,
  'Biomédicas': Heart
};

const AREA_COLORS = {
  'Ingenierías': {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    selectedBorder: 'border-indigo-500',
    selectedBg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    iconBg: 'bg-indigo-100'
  },
  'Sociales': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    selectedBorder: 'border-emerald-500',
    selectedBg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-100'
  },
  'Biomédicas': {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    selectedBorder: 'border-rose-500',
    selectedBg: 'bg-rose-50',
    icon: 'text-rose-600',
    iconBg: 'bg-rose-100'
  }
};

export function AreaSelector({ selectedArea, onSelectArea, config }: AreaSelectorProps) {
  const areas: AreaType[] = ['Ingenierías', 'Sociales', 'Biomédicas'];

  return (
    <div className="grid gap-4">
      {areas.map((area) => {
        const Icon = AREA_ICONS[area];
        const colors = AREA_COLORS[area];
        const isSelected = selectedArea === area;
        const areaConfig = config?.[area];
        const info = AREA_INFO[area];

        return (
          <button
            key={area}
            onClick={() => onSelectArea(area)}
            className={`
              relative p-6 rounded-xl border-2 text-left transition-all duration-200
              ${isSelected
                ? `${colors.selectedBorder} ${colors.selectedBg} shadow-lg`
                : `${colors.border} bg-white hover:${colors.bg} hover:shadow-md`
              }
            `}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-4 right-4">
                <CheckCircle className={`w-6 h-6 ${colors.icon}`} />
              </div>
            )}

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`${colors.iconBg} p-3 rounded-xl`}>
                <Icon className={`w-8 h-8 ${colors.icon}`} />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 mb-1">
                  {area}
                </h3>
                <p className="text-slate-600 text-sm mb-3">
                  {info.description}
                </p>

                {/* Stats */}
                {areaConfig && (
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-700">
                        {areaConfig.totalQuestions}
                      </span>
                      <span className="text-slate-500">preguntas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-700">
                        {areaConfig.subjects.length}
                      </span>
                      <span className="text-slate-500">asignaturas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-700">
                        {areaConfig.totalMaxScore.toLocaleString()}
                      </span>
                      <span className="text-slate-500">pts máx</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
