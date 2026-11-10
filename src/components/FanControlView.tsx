import React, { useState } from 'react';
import {
  Check,
  Cpu,
  Fan,
  Flame,
  Link,
  RotateCcw,
  Sliders,
  Sparkles,
  Unlink,
  Volume2,
  Zap,
} from 'lucide-react';
import {
  ANV15_SPECS,
  calculateRpmFromPercent,
  FAN_CURVE_PRESETS,
  formatFanSpeedSysfs,
  interpolateFanCurve,
} from '../utils/fanMath';
import { FanConfig, FanCurvePoint, TelemetryData } from '../utils/nitroTypes';
import { FanCurveCanvas } from './FanCurveCanvas';

interface FanControlViewProps {
  telemetry: TelemetryData | null;
  fanConfig: FanConfig;
  onUpdateFanConfig: (newConfig: Partial<FanConfig>) => void;
  onApplyFanSpeed: (
    cpu: number,
    gpu: number,
    mode: 'auto' | 'custom' | 'max',
    customCurve?: FanCurvePoint[]
  ) => Promise<{ ok: boolean; writtenToHardware?: boolean; message?: string }> | void;
}

export const FanControlView: React.FC<FanControlViewProps> = ({
  telemetry,
  fanConfig,
  onUpdateFanConfig,
  onApplyFanSpeed,
}) => {
  const [manualCpu, setManualCpu] = useState<number>(fanConfig.cpuSpeedPercent || 50);
  const [manualGpu, setManualGpu] = useState<number>(fanConfig.gpuSpeedPercent || 50);
  const [appliedNotification, setAppliedNotification] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  const currentCpuTemp = telemetry?.cpuTemp ?? 48;
  const currentCalculatedFanSpeed = interpolateFanCurve(currentCpuTemp, fanConfig.customCurve);

  const handleCpuSlider = (val: number) => {
    setManualCpu(val);
    if (fanConfig.linkedFans) {
      setManualGpu(val);
    }
  };

  const handleGpuSlider = (val: number) => {
    setManualGpu(val);
    if (fanConfig.linkedFans) {
      setManualCpu(val);
    }
  };

  const handleApplyManual = async () => {
    onUpdateFanConfig({
      mode: 'custom',
      cpuSpeedPercent: manualCpu,
      gpuSpeedPercent: manualGpu,
    });
    const res = await onApplyFanSpeed(manualCpu, manualGpu, 'custom');
    if (res && !res.ok) {
      setAppliedNotification({
        text: res.message || 'Falha ao gravar em fan_speed (verifique permissões root/sudo)',
        isError: true,
      });
    } else {
      setAppliedNotification({
        text:
          res?.writtenToHardware
            ? `Gravado no hardware via sysfs (nitro_sense/fan_speed): CPU=${manualCpu}%, GPU=${manualGpu}%`
            : `Velocidades aplicadas: CPU=${manualCpu}%, GPU=${manualGpu}%`,
      });
    }
    setTimeout(() => setAppliedNotification(null), 4000);
  };

  const handleSetMode = async (mode: 'auto' | 'custom' | 'max') => {
    onUpdateFanConfig({ mode });
    let res;
    if (mode === 'auto') {
      res = await onApplyFanSpeed(0, 0, 'auto');
      setAppliedNotification({
        text: res && !res.ok ? res.message || 'Erro ao ativar modo Auto' : 'Modo Automático ativado: controlador EC regula as ventoinhas',
        isError: !!(res && !res.ok),
      });
    } else if (mode === 'max') {
      res = await onApplyFanSpeed(100, 100, 'max');
      setAppliedNotification({
        text:
          res && !res.ok
            ? res.message || 'Erro ao ativar modo Máximo'
            : `Modo Turbo Máximo ativado: ventoinhas em 100% (até ${ANV15_SPECS.maxCpuRpm} RPM)`,
        isError: !!(res && !res.ok),
      });
    } else {
      res = await onApplyFanSpeed(manualCpu, manualGpu, 'custom');
      setAppliedNotification({
        text: res && !res.ok ? res.message || 'Erro ao ativar modo Personalizado' : 'Modo Personalizado ativado',
        isError: !!(res && !res.ok),
      });
    }
    setTimeout(() => setAppliedNotification(null), 4000);
  };

  const handleSelectPreset = async (presetKey: 'silent' | 'balanced' | 'gaming' | 'aggressive') => {
    const newCurve = FAN_CURVE_PRESETS[presetKey];
    const targetSpeed = interpolateFanCurve(currentCpuTemp, newCurve);
    onUpdateFanConfig({
      mode: 'custom',
      activeCurvePreset: presetKey,
      customCurve: newCurve,
    });
    const res = await onApplyFanSpeed(targetSpeed, targetSpeed, 'custom', newCurve);
    setAppliedNotification({
      text:
        res && !res.ok
          ? res.message || 'Erro ao ativar curva'
          : `Curva '${presetKey}' ativada no daemon (${targetSpeed}% @ ${currentCpuTemp}°C)!`,
      isError: !!(res && !res.ok),
    });
    setTimeout(() => setAppliedNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {appliedNotification && (
        <div
          className={`p-3 border text-xs font-mono rounded-xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
            appliedNotification.isError
              ? 'bg-red-950/90 border-red-500/60 text-red-200'
              : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Check className={`w-4 h-4 ${appliedNotification.isError ? 'text-red-400' : 'text-emerald-400'}`} />
            <span>{appliedNotification.text}</span>
          </div>
          <span className="text-[10px] opacity-80 font-mono">
            {formatFanSpeedSysfs(manualCpu, manualGpu)}
          </span>
        </div>
      )}

      {/* Mode Selector Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-red-500" />
              Controle de Velocidade das Ventoinhas
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Selecione o modo de operação do sistema térmico do Acer Nitro V 15 (até {ANV15_SPECS.maxCpuRpm} RPM).
            </p>
          </div>

          {/* Mode Pill Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 self-start md:self-auto">
            <button
              onClick={() => handleSetMode('auto')}
              aria-label="Selecionar modo automático"
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                fanConfig.mode === 'auto'
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Automático (EC)
            </button>
            <button
              onClick={() => handleSetMode('custom')}
              aria-label="Selecionar modo personalizado"
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                fanConfig.mode === 'custom'
                  ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Personalizado
            </button>
            <button
              onClick={() => handleSetMode('max')}
              aria-label="Selecionar modo máximo"
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                fanConfig.mode === 'max'
                  ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Máximo (100% / {ANV15_SPECS.maxCpuRpm} RPM)
            </button>
          </div>
        </div>
      </div>

      {/* Manual Sliders & Link controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CPU Fan Slider Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-800/40 text-sky-400">
                <Fan className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Ventoinha 1 (Core i5-13420H)</span>
                <h3 className="text-sm font-bold text-white">CPU Cooler • Real: {telemetry?.cpuFanRpm ?? 0} RPM</h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xl font-black font-mono text-sky-400">{manualCpu}%</span>
              <div className="text-[10px] font-mono text-slate-400">
                Alvo: ~{calculateRpmFromPercent(manualCpu, 'cpu')} RPM
              </div>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={manualCpu}
            onChange={(e) => handleCpuSlider(parseInt(e.target.value, 10))}
            aria-label="Controle de velocidade da ventoinha do CPU"
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
            <span>0% (Auto)</span>
            <span>50% (~5200 RPM)</span>
            <span>100% ({ANV15_SPECS.maxCpuRpm} RPM)</span>
          </div>
        </div>

        {/* GPU Fan Slider Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-400">
                <Fan className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Ventoinha 2 (RTX 4060)</span>
                <h3 className="text-sm font-bold text-white">GPU Cooler • Real: {telemetry?.gpuFanRpm ?? 0} RPM</h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xl font-black font-mono text-purple-400">{manualGpu}%</span>
              <div className="text-[10px] font-mono text-slate-400">
                Alvo: ~{calculateRpmFromPercent(manualGpu, 'gpu')} RPM
              </div>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={manualGpu}
            onChange={(e) => handleGpuSlider(parseInt(e.target.value, 10))}
            aria-label="Controle de velocidade da ventoinha do GPU"
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
            <span>0% (Auto)</span>
            <span>50% (~5200 RPM)</span>
            <span>100% ({ANV15_SPECS.maxGpuRpm} RPM)</span>
          </div>
        </div>
      </div>

      {/* Linking & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
        <button
          onClick={() => onUpdateFanConfig({ linkedFans: !fanConfig.linkedFans })}
          aria-label={fanConfig.linkedFans ? 'Desvincular ventoinhas' : 'Vincular ventoinhas'}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
            fanConfig.linkedFans
              ? 'bg-red-950/60 border-red-500/50 text-red-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {fanConfig.linkedFans ? <Link className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
          {fanConfig.linkedFans ? 'Ventoinhas Vinculadas (Sincronizadas)' : 'Ventoinhas Independentes'}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setManualCpu(50);
              setManualGpu(50);
            }}
            aria-label="Redefinir para 50%"
            className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 hover:text-white"
          >
            Redefinir (50%)
          </button>

          <button
            onClick={handleApplyManual}
            aria-label="Aplicar velocidades personalizadas agora"
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-mono font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-md transition-all"
          >
            <Check className="w-4 h-4" />
            Aplicar Velocidades via Sysfs
          </button>
        </div>
      </div>

      {/* Preset Curve Buttons */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Presets de Curva Térmica
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Ajuste automático conforme aquecimento do ANV15-52
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => handleSelectPreset('silent')}
            aria-label="Preset Curva Silenciosa"
            className={`p-3 rounded-xl text-left border font-mono transition-all ${
              fanConfig.activeCurvePreset === 'silent'
                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              Silencioso
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Foco acústico (0dB até 50°C)</div>
          </button>

          <button
            onClick={() => handleSelectPreset('balanced')}
            aria-label="Preset Curva Equilibrada"
            className={`p-3 rounded-xl text-left border font-mono transition-all ${
              fanConfig.activeCurvePreset === 'balanced'
                ? 'bg-blue-950/40 border-blue-500/50 text-blue-300 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              Equilibrado
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Padrão ótimo Nitro V15</div>
          </button>

          <button
            onClick={() => handleSelectPreset('gaming')}
            aria-label="Preset Curva Jogos"
            className={`p-3 rounded-xl text-left border font-mono transition-all ${
              fanConfig.activeCurvePreset === 'gaming'
                ? 'bg-orange-950/40 border-orange-500/50 text-orange-300 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              Gamer
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Acelera a partir de 60°C</div>
          </button>

          <button
            onClick={() => handleSelectPreset('aggressive')}
            aria-label="Preset Curva Agressiva"
            className={`p-3 rounded-xl text-left border font-mono transition-all ${
              fanConfig.activeCurvePreset === 'aggressive'
                ? 'bg-red-950/40 border-red-500/50 text-red-300 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <div className="font-bold text-xs flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-red-400" />
              Agressivo
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Máxima refrigeração preventiva</div>
          </button>
        </div>
      </div>

      {/* Interactive Canvas Fan Curve Component */}
      <FanCurveCanvas
        curve={fanConfig.customCurve}
        onChange={(newCurve) => {
          const targetSpeed = interpolateFanCurve(currentCpuTemp, newCurve);
          onUpdateFanConfig({
            mode: 'custom',
            customCurve: newCurve,
            activeCurvePreset: 'custom',
          });
          onApplyFanSpeed(targetSpeed, targetSpeed, 'custom', newCurve);
        }}
        currentTemp={currentCpuTemp}
        currentCalculatedSpeed={currentCalculatedFanSpeed}
      />
    </div>
  );
};
