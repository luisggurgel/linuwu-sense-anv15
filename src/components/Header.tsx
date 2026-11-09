import React from 'react';
import {
  Activity,
  Battery,
  BatteryCharging,
  Cpu,
  Flame,
  Layers,
  Sliders,
  Terminal,
  Zap,
} from 'lucide-react';
import { TelemetryData, ThermalProfileId } from '../utils/nitroTypes';

interface HeaderProps {
  activeTab: 'dashboard' | 'fans' | 'profiles' | 'hardware' | 'driver';
  setActiveTab: (tab: 'dashboard' | 'fans' | 'profiles' | 'hardware' | 'driver') => void;
  telemetry: TelemetryData | null;
  onTurboToggle: () => void;
  isTurboActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  telemetry,
  onTurboToggle,
  isTurboActive,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Model Identity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Nitro Emblem */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-950 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.35)]">
              <Flame className="w-5 h-5 text-white animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-wider text-white">
                  NITROSENSE
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                  LINUX
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>Acer Nitro V 15</span>
                <span className="text-slate-600">•</span>
                <span className="text-red-400/90 font-semibold">ANV15-52-52VN</span>
              </div>
            </div>
          </div>

          {/* Mobile Turbo button */}
          <button
            onClick={onTurboToggle}
            aria-label="Alternar modo Turbo"
            className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs font-mono transition-all duration-200 border ${
              isTurboActive
                ? 'bg-red-600 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-red-500/50'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isTurboActive ? 'fill-current animate-bounce' : ''}`} />
            TURBO
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none" aria-label="Navegação principal">
          <button
            onClick={() => setActiveTab('dashboard')}
            aria-label="Aba Painel de Controle"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Painel</span>
          </button>

          <button
            onClick={() => setActiveTab('fans')}
            aria-label="Aba Ventoinhas e Curvas"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'fans'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Ventoinhas & Curvas</span>
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            aria-label="Aba Perfis Térmicos"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'profiles'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Perfis Térmicos</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            aria-label="Aba Hardware e Bateria"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'hardware'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Hardware & Bateria</span>
          </button>

          <button
            onClick={() => setActiveTab('driver')}
            aria-label="Aba Driver e GitHub"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'driver'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Driver & GitHub</span>
          </button>
        </nav>

        {/* Right Status Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Driver Status pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                telemetry?.isHardwareDetected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-400">
              {telemetry?.isHardwareDetected ? 'linuwu_sense' : 'Modo ANV15 Ativo'}
            </span>
          </div>

          {/* Battery Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
            {telemetry?.batteryCharging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{telemetry?.batteryLevel ?? 80}%</span>
            {telemetry?.batteryLimiterActive && (
              <span className="text-[9px] text-emerald-400 px-1 py-0.2 bg-emerald-950/60 rounded border border-emerald-800/40">
                80% LIM
              </span>
            )}
          </div>

          {/* Turbo Quick Toggle Button */}
          <button
            onClick={onTurboToggle}
            aria-label="Alternar modo Turbo"
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-bold text-xs font-mono transition-all duration-300 border ${
              isTurboActive
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-400 shadow-[0_0_18px_rgba(239,68,68,0.7)] animate-pulse'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-red-500/50 hover:text-white'
            }`}
          >
            <Zap className={`w-4 h-4 ${isTurboActive ? 'fill-current' : 'text-red-400'}`} />
            {isTurboActive ? 'TURBO ATIVO (100%)' : 'TURBO BOOST'}
          </button>
        </div>
      </div>
    </header>
  );
};
