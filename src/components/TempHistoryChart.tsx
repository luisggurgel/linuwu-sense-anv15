import React from 'react';

export interface HistoryDataPoint {
  time: string;
  cpu: number;
  gpu: number;
}

interface TempHistoryChartProps {
  history: HistoryDataPoint[];
  cpuTemp: number;
  gpuTemp: number;
}

export const TempHistoryChart: React.FC<TempHistoryChartProps> = ({
  history,
  cpuTemp,
  gpuTemp,
}) => {
  // If we have fewer than 2 points, render placeholder grid
  const width = 600;
  const height = 140;
  const padding = { top: 15, bottom: 25, left: 35, right: 15 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const minTemp = 30;
  const maxTemp = 100;

  const getCoordinates = (points: { val: number }[]) => {
    if (points.length < 2) return '';
    return points
      .map((p, idx) => {
        const x = padding.left + (idx / (points.length - 1)) * plotWidth;
        const normY = (Math.max(minTemp, Math.min(maxTemp, p.val)) - minTemp) / (maxTemp - minTemp);
        const y = padding.top + (1 - normY) * plotHeight;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const cpuPath = getCoordinates(history.map((h) => ({ val: h.cpu })));
  const gpuPath = getCoordinates(history.map((h) => ({ val: h.gpu })));

  // Compute stats
  const cpuValues = history.map((h) => h.cpu);
  const gpuValues = history.map((h) => h.gpu);
  const maxCpu = cpuValues.length ? Math.max(...cpuValues) : cpuTemp;
  const maxGpu = gpuValues.length ? Math.max(...gpuValues) : gpuTemp;
  const avgCpu = cpuValues.length ? Math.round(cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length) : cpuTemp;
  const avgGpu = gpuValues.length ? Math.round(gpuValues.reduce((a, b) => a + b, 0) / gpuValues.length) : gpuTemp;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Histórico Térmico em Tempo Real
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            (Últimos 60s)
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            <span className="text-slate-300">CPU:</span>
            <span className="font-semibold text-red-400">{cpuTemp}°C</span>
            <span className="text-[10px] text-slate-500">(Máx: {maxCpu}°C | Méd: {avgCpu}°C)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-slate-300">GPU:</span>
            <span className="font-semibold text-emerald-400">{gpuTemp}°C</span>
            <span className="text-[10px] text-slate-500">(Máx: {maxGpu}°C | Méd: {avgGpu}°C)</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          className="w-full h-36"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {/* Horizontal grid lines */}
          {[40, 60, 80, 100].map((t) => {
            const normY = (t - minTemp) / (maxTemp - minTemp);
            const y = padding.top + (1 - normY) * plotHeight;
            return (
              <g key={t}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(51, 65, 85, 0.4)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {t}°
                </text>
              </g>
            );
          })}

          {/* Area gradients */}
          <defs>
            <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* GPU Line */}
          {gpuPath && (
            <path
              d={gpuPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* CPU Line */}
          {cpuPath && (
            <path
              d={cpuPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.4))' }}
            />
          )}

          {/* Warning threshold line at 90°C */}
          <line
            x1={padding.left}
            y1={padding.top + (1 - (90 - minTemp) / (maxTemp - minTemp)) * plotHeight}
            x2={width - padding.right}
            y2={padding.top + (1 - (90 - minTemp) / (maxTemp - minTemp)) * plotHeight}
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
};
