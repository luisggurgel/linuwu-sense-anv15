import React from 'react';

interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  title: string;
  unit: string;
  subtitle?: string;
  color?: string;
  subValue?: string;
  icon?: React.ReactNode;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  min = 0,
  max = 100,
  title,
  unit,
  subtitle,
  color = '#ef4444',
  subValue,
  icon,
}) => {
  const clamped = Math.max(min, Math.min(max, value));
  const percentage = ((clamped - min) / (max - min)) * 100;

  // Gauge geometry: 240-degree arc from 150° to 390°
  const radius = 64;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (240 / 360);
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg backdrop-blur-sm group hover:border-slate-700 transition-all duration-300">
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          {icon}
          {title}
        </span>
        {subValue && (
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50">
            {subValue}
          </span>
        )}
      </div>

      <div className="relative w-40 h-36 flex items-center justify-center">
        <svg className="w-40 h-40 transform rotate-[150deg] overflow-visible" viewBox="0 0 160 160">
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="rgba(51, 65, 85, 0.4)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Active Colored Arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color}80)`,
            }}
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-2">
          <div className="flex items-baseline">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
              {Math.round(value)}
            </span>
            <span className="text-sm font-semibold text-slate-400 ml-1">{unit}</span>
          </div>
          {subtitle && (
            <span className="text-[11px] font-medium text-slate-400 mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Min/Max range indicator */}
      <div className="flex justify-between w-full px-2 text-[10px] font-mono text-slate-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};
