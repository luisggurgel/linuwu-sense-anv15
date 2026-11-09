import React from 'react';
import {
  Activity,
  Cpu,
  Fan,
  Gauge as GaugeIcon,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ANV15_SPECS, getThermalStatus, THERMAL_PROFILES } from '../utils/fanMath';
import { TelemetryData, ThermalProfileId } from '../utils/nitroTypes';
import { Gauge } from './Gauge';
import { HistoryDataPoint, TempHistoryChart } from './TempHistoryChart';

interface DashboardProps {
  telemetry: TelemetryData | null;
  history: HistoryDataPoint[];
  onSelectProfile: (profile: ThermalProfileId) => void;
  onSimulateWorkload: (workload: 'idle' | 'balanced' | 'gaming' | 'stress') => void;
  currentWorkload: 'idle' | 'balanced' | 'gaming' | 'stress';
}

export const Dashboard: React.FC<DashboardProps> = ({
  telemetry,
  history,
  onSelectProfile,
  onSimulateWorkload,
  currentWorkload,
}) => {
  const cpuTemp = telemetry?.cpuTemp ?? 46;
  const gpuTemp = telemetry?.gpuTemp ?? 42;
  const cpuRpm = telemetry?.cpuFanRpm ?? 1850;
  const gpuRpm = telemetry?.gpuFanRpm ?? 0;
  const cpuPercent = telemetry?.cpuFanPercent ?? 0;
  const gpuPercent = telemetry?.gpuFanPercent ?? 0;
  const activeProfile = telemetry?.activeProfile ?? 'balanced';

  const cpuThermalStatus = getThermalStatus(cpuTemp);
  const gpuThermalStatus = getThermalStatus(gpuTemp);

  return (
    <div className="space-y-6">
      {/* Top Banner: Active Profile Overview */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-red-950/30 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Perfil Ativo
            </span>
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: THERMAL_PROFILES[activeProfile].accentBg,
                color: THERMAL_PROFILES[activeProfile].color,
                border: `1px solid ${THERMAL_PROFILES[activeProfile].color}40`,
              }}
            >
              {THERMAL_PROFILES[activeProfile].badge}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            {THERMAL_PROFILES[activeProfile].namePt}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5 max-w-xl">
            {THERMAL_PROFILES[activeProfile].description}
          </p>
        </div>

        {/* Quick Profile Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {(Object.keys(THERMAL_PROFILES) as ThermalProfileId[]).map((profKey) => {
            const prof = THERMAL_PROFILES[profKey];
            const isCurrent = activeProfile === profKey;
            return (
              <button
                key={profKey}
                onClick={() => onSelectProfile(profKey)}
                aria-label={`Selecionar perfil ${prof.namePt}`}
                className={`px-3 py-2 rounded-xl text-xs font-semibold font-mono transition-all duration-200 border flex items-center gap-1.5 ${
                  isCurrent
                    ? 'shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
                style={
                  isCurrent
                    ? {
                        backgroundColor: prof.accentBg,
                        color: prof.color,
                        borderColor: `${prof.color}80`,
                      }
                    : {}
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: prof.color }}
                />
                {prof.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Metric Gauges: 4 Gauges (CPU Temp, GPU Temp, CPU Fan RPM, GPU Fan RPM) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Temp Gauge */}
        <Gauge
          title="CPU Intel Core"
          value={cpuTemp}
          unit="°C"
          min={30}
          max={100}
          color={cpuThermalStatus.color}
          subtitle={cpuThermalStatus.label}
          subValue={`${telemetry?.cpuPowerWatts ?? 25}W | ${telemetry?.cpuUsage ?? 15}%`}
          icon={<Cpu className="w-4 h-4 text-red-400" />}
        />

        {/* GPU Temp Gauge */}
        <Gauge
          title="GPU GeForce RTX"
          value={gpuTemp}
          unit="°C"
          min={30}
          max={100}
          color={gpuThermalStatus.color}
          subtitle={gpuThermalStatus.label}
          subValue={`${telemetry?.gpuPowerWatts ?? 15}W | ${telemetry?.gpuUsage ?? 5}%`}
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
        />

        {/* CPU Fan RPM Gauge */}
        <Gauge
          title="CPU Fan"
          value={cpuRpm}
          unit="RPM"
          min={0}
          max={ANV15_SPECS.maxCpuRpm}
          color="#38bdf8"
          subtitle={cpuPercent === 0 ? 'Automático (EC)' : `${cpuPercent}% Alvo`}
          subValue={`Máx: ${ANV15_SPECS.maxCpuRpm} RPM`}
          icon={
            <Fan
              className={`w-4 h-4 text-sky-400 ${
                cpuRpm > 0 ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: `${Math.max(0.3, 3000 / (cpuRpm || 1000))}s` }}
            />
          }
        />

        {/* GPU Fan RPM Gauge */}
        <Gauge
          title="GPU Fan"
          value={gpuRpm}
          unit="RPM"
          min={0}
          max={ANV15_SPECS.maxGpuRpm}
          color="#a855f7"
          subtitle={gpuPercent === 0 ? (gpuRpm === 0 ? 'Parado (0dB)' : 'Automático') : `${gpuPercent}% Alvo`}
          subValue={`Máx: ${ANV15_SPECS.maxGpuRpm} RPM`}
          icon={
            <Fan
              className={`w-4 h-4 text-purple-400 ${
                gpuRpm > 0 ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: `${Math.max(0.3, 3000 / (gpuRpm || 1000))}s` }}
            />
          }
        />
      </div>

      {/* Real-time Temperature History */}
      <TempHistoryChart
        history={history}
        cpuTemp={cpuTemp}
        gpuTemp={gpuTemp}
      />

      {/* Hardware Telemetry Detail Cards & Workload Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hardware Status: Acer Nitro V 15 ANV15-52-52VN Specifics */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg backdrop-blur-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <GaugeIcon className="w-4 h-4 text-red-400" />
              Especificações e Estado do Hardware (ANV15-52)
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              EC Window 0xFE708000
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Driver do Kernel</span>
              <div className="text-white font-bold mt-1 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Linuwu-Sense
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">nitro_v4=1</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Modo da Ventoinha</span>
              <div className="text-white font-bold mt-1 text-sm capitalize">
                {telemetry?.fanMode === 'auto' ? 'Automático (EC)' : telemetry?.fanMode === 'max' ? 'Turbo Máximo' : 'Curva Custom'}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">sysfs fan_speed</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Consumo Estimado</span>
              <div className="text-white font-bold mt-1 text-sm">
                {(telemetry?.cpuPowerWatts ?? 20) + (telemetry?.gpuPowerWatts ?? 15)} W
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">PL1/PL2 Adaptativo</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Alimentação AC</span>
              <div className="text-white font-bold mt-1 text-sm flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${telemetry?.acConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {telemetry?.acConnected ? 'Carregador Conectado' : 'Operando em Bateria'}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {telemetry?.batteryLimiterActive ? 'Limite 80% Ativo' : 'Carga Normal'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Workload Simulator (Allows testing dynamic fan curves and thermal behavior) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Simulador de Carga Térmica
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Teste a resposta acústica e térmica das ventoinhas simulando diferentes cenários de uso do notebook:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSimulateWorkload('idle')}
                aria-label="Simular carga ociosa"
                className={`p-2.5 rounded-xl text-xs font-mono font-medium transition-all text-left border ${
                  currentWorkload === 'idle'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Ocioso (Idle)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Navegador / ~45°C</div>
              </button>

              <button
                onClick={() => onSimulateWorkload('balanced')}
                aria-label="Simular carga de produtividade"
                className={`p-2.5 rounded-xl text-xs font-mono font-medium transition-all text-left border ${
                  currentWorkload === 'balanced'
                    ? 'bg-blue-950/40 border-blue-500/50 text-blue-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Produtividade
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Compilação / ~62°C</div>
              </button>

              <button
                onClick={() => onSimulateWorkload('gaming')}
                aria-label="Simular carga de jogos"
                className={`p-2.5 rounded-xl text-xs font-mono font-medium transition-all text-left border ${
                  currentWorkload === 'gaming'
                    ? 'bg-orange-950/40 border-orange-500/50 text-orange-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  Jogos (Gaming)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Cyberpunk / ~78°C</div>
              </button>

              <button
                onClick={() => onSimulateWorkload('stress')}
                aria-label="Simular teste de estresse"
                className={`p-2.5 rounded-xl text-xs font-mono font-medium transition-all text-left border ${
                  currentWorkload === 'stress'
                    ? 'bg-red-950/40 border-red-500/50 text-red-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Teste de Estresse
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">100% Carga / ~88°C</div>
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Resposta Térmica Dinâmica</span>
            <span className="text-emerald-400 font-semibold">Ativa</span>
          </div>
        </div>
      </div>
    </div>
  );
};
