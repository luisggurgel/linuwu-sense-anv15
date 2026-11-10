/**
 * Pure calculation and mapping utilities for Acer Nitro V15 (ANV15-52-52VN)
 * and Linuwu-Sense module sysfs integration.
 */

import { FanCurvePoint, ThermalProfileId, ThermalProfileInfo } from './nitroTypes';

// Official Specifications for Acer Nitro V 15 (ANV15-52-52VN)
export const ANV15_SPECS = {
  modelName: 'Acer Nitro V 15 (ANV15-52-52VN)',
  dmiProductName: 'Nitro ANV15-52',
  cpuModel: 'Intel Core i5-13420H (8C/12T até 4.60 GHz)',
  gpuModel: 'NVIDIA GeForce RTX 4060 Laptop GPU (8 GB GDDR6)',
  igpuModel: 'Intel UHD Graphics',
  ramSpecs: '16 GB DDR5 5200 MHz (Expansível até 32 GB)',
  storageSpecs: '512 GB SSD NVMe PCIe 4.0 x4',
  displaySpecs: '15.6" IPS Full HD (1920x1080) 165 Hz',
  batterySpecs: '57 Wh Li-Ion • Fonte AC 135W',
  keyboardSpecs: 'ABNT2 Retroiluminado Branco + Tecla NitroSense',
  osTarget: 'Fedora Linux (x86_64)',
  quirkName: 'quirk_acer_nitro_anv15_52',
  ecWindowBase: '0xFE708000',
  ecProfileModeOffset: '0x607',
  ec0Q30Path: '\\_SB.PC00.LPCB.EC0._Q30',
  maxCpuRpm: 8600,
  maxGpuRpm: 8600,
  minFanPercent: 20,
  maxFanPercent: 100,
  idleCpuRpm: 1800,
  idleGpuRpm: 0,
};

// Profile definitions matching quirk_acer_nitro_anv15_52 in Linuwu-Sense
export const THERMAL_PROFILES: Record<ThermalProfileId, ThermalProfileInfo> = {
  eco: {
    id: 'eco',
    name: 'Eco',
    namePt: 'Economia (Eco)',
    description: 'Máxima eficiência energética para bateria (57 Wh). Clock reduzido no i5-13420H e ruído mínimo.',
    ecMode: 4, // anv15_ec_mode_to_profile[4] -> PLATFORM_PROFILE_LOW_POWER
    platformProfile: 'low-power',
    defaultCpuFanPercent: 0, // Auto / Whisper
    defaultGpuFanPercent: 0,
    color: '#10b981', // Emerald
    accentBg: 'rgba(16, 185, 129, 0.15)',
    badge: 'ECO',
    powerLimitWatts: 35,
  },
  quiet: {
    id: 'quiet',
    name: 'Quiet',
    namePt: 'Silencioso',
    description: 'Prioriza acústica ultrabaixa. Ventoinhas mantêm RPM moderado e suave (0 RPM em repouso).',
    ecMode: 3, // anv15_ec_mode_to_profile[3] -> PLATFORM_PROFILE_QUIET
    platformProfile: 'quiet',
    defaultCpuFanPercent: 0,
    defaultGpuFanPercent: 0,
    color: '#06b6d4', // Cyan
    accentBg: 'rgba(6, 182, 212, 0.15)',
    badge: 'QUIET',
    powerLimitWatts: 45,
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    namePt: 'Equilibrado',
    description: 'Padrão do Nitro V15 (ANV15-52-52VN). Equilíbrio ideal entre temperatura, ruído e desempenho.',
    ecMode: 2, // anv15_ec_mode_to_profile[2] -> PLATFORM_PROFILE_BALANCED
    platformProfile: 'balanced',
    defaultCpuFanPercent: 0,
    defaultGpuFanPercent: 0,
    color: '#3b82f6', // Blue
    accentBg: 'rgba(59, 130, 246, 0.15)',
    badge: 'BALANCED',
    powerLimitWatts: 65,
  },
  performance: {
    id: 'performance',
    name: 'Performance',
    namePt: 'Desempenho',
    description: 'Libera maior PL1/PL2 no Core i5-13420H e TGP completo na RTX 4060 (8GB) com curvas aceleradas.',
    ecMode: 1, // anv15_ec_mode_to_profile[1] -> PLATFORM_PROFILE_BALANCED_PERFORMANCE
    platformProfile: 'balanced-performance',
    defaultCpuFanPercent: 75,
    defaultGpuFanPercent: 75,
    color: '#f97316', // Orange
    accentBg: 'rgba(249, 115, 22, 0.15)',
    badge: 'PERF',
    powerLimitWatts: 95,
  },
  turbo: {
    id: 'turbo',
    name: 'Turbo',
    namePt: 'Turbo Máximo',
    description: 'Ventoinhas travadas em 100% (até 8600 RPM). Máximo desempenho térmico para a RTX 4060 e i5-13420H.',
    ecMode: 0, // anv15_ec_mode_to_profile[0] -> PLATFORM_PROFILE_PERFORMANCE
    platformProfile: 'performance',
    defaultCpuFanPercent: 100,
    defaultGpuFanPercent: 100,
    color: '#ef4444', // Red
    accentBg: 'rgba(239, 68, 68, 0.2)',
    badge: 'TURBO',
    powerLimitWatts: 115,
  },
};

/**
 * Maps an ANV15 EC mode integer to the corresponding thermal profile.
 */
export function mapEcModeToProfile(mode: number): ThermalProfileId {
  switch (mode) {
    case 0:
      return 'turbo';
    case 1:
      return 'performance';
    case 2:
      return 'balanced';
    case 3:
      return 'quiet';
    case 4:
      return 'eco';
    default:
      return 'balanced';
  }
}

/**
 * Maps a Linux ACPI platform_profile string to ThermalProfileId.
 */
export function mapPlatformProfileToId(raw: string): ThermalProfileId {
  const clean = (raw || '').trim().toLowerCase();
  switch (clean) {
    case 'low-power':
      return 'eco';
    case 'quiet':
      return 'quiet';
    case 'balanced':
      return 'balanced';
    case 'balanced-performance':
      return 'performance';
    case 'performance':
      return 'turbo';
    default:
      return 'balanced';
  }
}

/**
 * Formats CPU and GPU percentages into the Linuwu-Sense sysfs string format: "cpu,gpu"
 * 0 means Auto, 1-100 means manual percentage.
 */
export function formatFanSpeedSysfs(cpuSpeed: number, gpuSpeed: number): string {
  const clamp = (val: number) => {
    if (isNaN(val) || val <= 0) return 0;
    if (val >= 100) return 100;
    return Math.round(val);
  };
  return `${clamp(cpuSpeed)},${clamp(gpuSpeed)}`;
}

/**
 * Parses the sysfs fan_speed string "cpu,gpu" back to numbers.
 */
export function parseFanSpeedSysfs(raw: string): { cpu: number; gpu: number } {
  if (!raw || typeof raw !== 'string') return { cpu: 0, gpu: 0 };
  const parts = raw.trim().split(',');
  const cpu = parseInt(parts[0], 10);
  const gpu = parseInt(parts[1], 10);
  return {
    cpu: isNaN(cpu) ? 0 : Math.max(0, Math.min(100, cpu)),
    gpu: isNaN(gpu) ? 0 : Math.max(0, Math.min(100, gpu)),
  };
}

/**
 * Computes estimated or actual RPM from percentage and fan type for ANV15-52.
 */
export function calculateRpmFromPercent(percent: number, fan: 'cpu' | 'gpu'): number {
  if (percent <= 0) return 0;
  const maxRpm = fan === 'cpu' ? ANV15_SPECS.maxCpuRpm : ANV15_SPECS.maxGpuRpm;
  const minRpm = 1800; // minimum operating RPM when spun up
  const ratio = Math.max(0, Math.min(100, percent)) / 100;
  return Math.round(minRpm + ratio * (maxRpm - minRpm));
}

/**
 * Interpolates fan speed percentage based on current temperature and fan curve knots.
 * Knots must have at least 2 points and be sorted by temp ascending.
 */
export function interpolateFanCurve(temp: number, curve: FanCurvePoint[]): number {
  if (!curve || curve.length === 0) return 0;
  if (curve.length === 1) return curve[0].speed;

  const sorted = [...curve].sort((a, b) => a.temp - b.temp);

  // Below lowest temp knot
  if (temp <= sorted[0].temp) {
    return sorted[0].speed;
  }
  // Above highest temp knot
  if (temp >= sorted[sorted.length - 1].temp) {
    return sorted[sorted.length - 1].speed;
  }

  // Linear interpolation between the two surrounding knots
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (temp >= p1.temp && temp <= p2.temp) {
      if (p2.temp === p1.temp) return p1.speed;
      const t = (temp - p1.temp) / (p2.temp - p1.temp);
      const speed = p1.speed + t * (p2.speed - p1.speed);
      return Math.round(Math.max(0, Math.min(100, speed)));
    }
  }

  return sorted[sorted.length - 1].speed;
}

/**
 * Standard Fan Curve Presets for Acer Nitro V15
 */
export const FAN_CURVE_PRESETS: Record<'silent' | 'balanced' | 'gaming' | 'aggressive', FanCurvePoint[]> = {
  silent: [
    { temp: 35, speed: 0 },
    { temp: 50, speed: 25 },
    { temp: 65, speed: 40 },
    { temp: 75, speed: 60 },
    { temp: 85, speed: 85 },
    { temp: 95, speed: 100 },
  ],
  balanced: [
    { temp: 35, speed: 20 },
    { temp: 50, speed: 35 },
    { temp: 65, speed: 55 },
    { temp: 75, speed: 75 },
    { temp: 85, speed: 95 },
    { temp: 90, speed: 100 },
  ],
  gaming: [
    { temp: 35, speed: 30 },
    { temp: 50, speed: 50 },
    { temp: 65, speed: 70 },
    { temp: 75, speed: 85 },
    { temp: 85, speed: 100 },
  ],
  aggressive: [
    { temp: 35, speed: 45 },
    { temp: 45, speed: 65 },
    { temp: 60, speed: 85 },
    { temp: 75, speed: 100 },
    { temp: 85, speed: 100 },
  ],
};

/**
 * Thermal health status descriptor for UI indicators.
 */
export function getThermalStatus(temp: number): {
  label: string;
  status: 'cool' | 'normal' | 'warm' | 'hot' | 'critical';
  color: string;
} {
  if (temp < 50) return { label: 'Ótima (Frio)', status: 'cool', color: '#10b981' };
  if (temp < 70) return { label: 'Estável (Normal)', status: 'normal', color: '#3b82f6' };
  if (temp < 80) return { label: 'Moderada (Carga)', status: 'warm', color: '#f59e0b' };
  if (temp < 90) return { label: 'Elevada (Alto)', status: 'hot', color: '#f97316' };
  return { label: 'Crítica (Throttling)', status: 'critical', color: '#ef4444' };
}
