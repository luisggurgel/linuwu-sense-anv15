/**
 * Type definitions for NitroSense Linux (Acer Nitro ANV15-52-52VN)
 * Based on Linuwu-Sense kernel module sysfs interfaces and ANV15 EC specifications.
 */

export type ThermalProfileId = 'eco' | 'quiet' | 'balanced' | 'performance' | 'turbo';

export interface ThermalProfileInfo {
  id: ThermalProfileId;
  name: string;
  namePt: string;
  description: string;
  ecMode: number; // ANV15 EC mode: 0=Turbo, 1=Balanced-Perf, 2=Balanced, 3=Quiet, 4=Eco
  platformProfile: 'low-power' | 'quiet' | 'balanced' | 'balanced-performance' | 'performance';
  defaultCpuFanPercent: number; // 0 means Auto
  defaultGpuFanPercent: number; // 0 means Auto
  color: string;
  accentBg: string;
  badge: string;
  powerLimitWatts: number;
}

export interface FanCurvePoint {
  temp: number;   // In degrees Celsius (e.g. 40, 55, 70, 85)
  speed: number;  // Fan speed in % (20 - 100)
}

export interface FanConfig {
  mode: 'auto' | 'custom' | 'max';
  cpuSpeedPercent: number; // 0 = auto, 1-100 = manual %
  gpuSpeedPercent: number; // 0 = auto, 1-100 = manual %
  linkedFans: boolean;
  activeCurvePreset: 'silent' | 'balanced' | 'gaming' | 'aggressive' | 'custom';
  customCurve: FanCurvePoint[];
}

export interface TelemetryData {
  timestamp: number;
  cpuTemp: number; // °C
  gpuTemp: number; // °C
  cpuFanRpm: number;
  gpuFanRpm: number;
  cpuFanPercent: number;
  gpuFanPercent: number;
  cpuUsage: number; // %
  gpuUsage: number; // %
  cpuPowerWatts: number;
  gpuPowerWatts: number;
  acConnected: boolean;
  batteryLevel: number; // %
  batteryCharging: boolean;
  batteryLimiterActive: boolean; // 80% limit
  activeProfile: ThermalProfileId;
  fanMode: 'auto' | 'custom' | 'max';
  isHardwareDetected: boolean;
  driverStatus: 'active' | 'fallback_simulated' | 'not_loaded';
  sysfsPaths: {
    sensePath: string | null;
    fanSpeedPath: string | null;
    platformProfilePath: string | null;
    batteryLimiterPath: string | null;
  };
  deviceModel: string;
}

export interface AdvancedSettings {
  batteryLimiter: boolean; // 80% charge threshold
  lcdOverdrive: boolean;
  keyboardBacklightTimeout: boolean;
  usbPowerOffCharging: number; // 0 = off, 10, 20, 30%
  autoProfileOnBattery: boolean;
  batteryProfile: ThermalProfileId;
  acProfile: ThermalProfileId;
}
