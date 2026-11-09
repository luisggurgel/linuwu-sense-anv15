import React from 'react';
import { FanCurvePoint } from '../utils/nitroTypes';

interface FanCurveCanvasProps {
  curve: FanCurvePoint[];
  onChange: (newCurve: FanCurvePoint[]) => void;
  currentTemp?: number;
  currentCalculatedSpeed?: number;
}

export const FanCurveCanvas: React.FC<FanCurveCanvasProps> = ({
  curve,
  onChange,
  currentTemp = 48,
  currentCalculatedSpeed = 35,
}) => {
  const width = 600;
  const height = 240;
  const padding = { top: 20, bottom: 35, left: 45, right: 25 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const minTemp = 30;
  const maxTemp = 100;
  const minSpeed = 0;
  const maxSpeed = 100;

  const tempToX = (t: number) => padding.left + ((t - minTemp) / (maxTemp - minTemp)) * plotW;
  const speedToY = (s: number) => padding.top + (1 - (s - minSpeed) / (maxSpeed - minSpeed)) * plotH;

  // Build SVG path from curve points
  const sorted = [...curve].sort((a, b) => a.temp - b.temp);
  const pathData = sorted
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${tempToX(pt.temp).toFixed(1)},${speedToY(pt.speed).toFixed(1)}`)
    .join(' ');

  // Area under curve
  const areaPath = sorted.length > 0
    ? `${pathData} L ${tempToX(sorted[sorted.length - 1].temp).toFixed(1)},${speedToY(0)} L ${tempToX(sorted[0].temp).toFixed(1)},${speedToY(0)} Z`
    : '';

  const handlePointChange = (index: number, field: 'temp' | 'speed', val: number) => {
    const updated = [...curve];
    if (field === 'temp') {
      updated[index].temp = Math.max(30, Math.min(100, val));
    } else {
      updated[index].speed = Math.max(0, Math.min(100, val));
    }
    onChange(updated);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            Curva Térmica Personalizada (Temperatura vs Velocidade)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            O algoritmo calcula e envia a velocidade proporcional via sysfs em tempo real.
          </p>
        </div>

        {/* Real-time operating crosshair indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          <span className="text-slate-300">Temp Atual:</span>
          <span className="text-red-400 font-bold">{currentTemp}°C</span>
          <span className="text-slate-500">→</span>
          <span className="text-slate-300">Alvo:</span>
          <span className="text-emerald-400 font-bold">{currentCalculatedSpeed}% Fan</span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden bg-slate-950/60 rounded-xl border border-slate-800/80 p-2">
        <svg className="w-full h-56" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid: Speed horizontal lines */}
          {[0, 25, 50, 75, 100].map((s) => {
            const y = speedToY(s);
            return (
              <g key={s}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(51, 65, 85, 0.4)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {s}%
                </text>
              </g>
            );
          })}

          {/* Grid: Temp vertical lines */}
          {[30, 45, 60, 75, 90, 100].map((t) => {
            const x = tempToX(t);
            return (
              <g key={t}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="rgba(51, 65, 85, 0.3)"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {t}°C
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          {areaPath && <path d={areaPath} fill="url(#curveGradient)" />}

          {/* Curve stroke */}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))' }}
            />
          )}

          {/* Current Temp operating line & point */}
          {currentTemp >= minTemp && currentTemp <= maxTemp && (
            <g>
              <line
                x1={tempToX(currentTemp)}
                y1={padding.top}
                x2={tempToX(currentTemp)}
                y2={height - padding.bottom}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <circle
                cx={tempToX(currentTemp)}
                cy={speedToY(currentCalculatedSpeed)}
                r="6"
                fill="#38bdf8"
                stroke="#0284c7"
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 8px #38bdf8)' }}
              />
            </g>
          )}

          {/* Knots */}
          {sorted.map((pt, idx) => {
            const cx = tempToX(pt.temp);
            const cy = speedToY(pt.speed);
            return (
              <g key={idx} className="cursor-pointer group">
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-transform group-hover:scale-125"
                />
                <text
                  x={cx}
                  y={cy - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#f87171"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {pt.speed}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Numerical knots editor */}
      <div className="mt-4 pt-3 border-t border-slate-800">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Pontos de Calibração da Curva
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {sorted.map((pt, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-1.5"
            >
              <div className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
                Ponto #{idx + 1}
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <label className="text-slate-400">Temp:</label>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min={30}
                    max={100}
                    value={pt.temp}
                    onChange={(e) => handlePointChange(idx, 'temp', parseInt(e.target.value) || 30)}
                    aria-label={`Temperatura ponto ${idx + 1}`}
                    className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-right text-white font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                  <span className="text-slate-400 text-[10px]">°C</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <label className="text-slate-400">Fan:</label>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={pt.speed}
                    onChange={(e) => handlePointChange(idx, 'speed', parseInt(e.target.value) || 0)}
                    aria-label={`Velocidade ventoinha ponto ${idx + 1}`}
                    className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-right text-emerald-400 font-mono text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                  <span className="text-slate-400 text-[10px]">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
