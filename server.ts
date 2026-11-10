import { execSync } from 'child_process';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  ANV15_SPECS,
  calculateRpmFromPercent,
  FAN_CURVE_PRESETS,
  formatFanSpeedSysfs,
  interpolateFanCurve,
  mapPlatformProfileToId,
  parseFanSpeedSysfs,
  THERMAL_PROFILES,
} from './src/utils/fanMath';
import { AdvancedSettings, FanCurvePoint, TelemetryData, ThermalProfileId } from './src/utils/nitroTypes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Candidate sysfs paths exposed by Linuwu-Sense on Fedora / Linux kernels for ANV15-52
const CANDIDATE_SENSE_PATHS = [
  '/sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/nitro_sense',
  '/sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/predator_sense',
  '/sys/devices/platform/acer-wmi/nitro_sense',
  '/sys/devices/platform/acer-wmi/predator_sense',
  '/sys/bus/platform/devices/acer-wmi/nitro_sense',
  '/sys/bus/platform/devices/acer-wmi/predator_sense',
];

const SYSFS_PATHS = {
  platformProfile: '/sys/firmware/acpi/platform_profile',
  platformProfileChoices: '/sys/firmware/acpi/platform_profile_choices',
  dmiProductName: '/sys/class/dmi/id/product_name',
  dmiSysVendor: '/sys/class/dmi/id/sys_vendor',
  hwmonBase: '/sys/class/hwmon',
  powerSupplyBase: '/sys/class/power_supply',
  raplEnergy: '/sys/class/powercap/intel-rapl:0/energy_uj',
};

function detectSensePath(): string | null {
  for (const candidate of CANDIDATE_SENSE_PATHS) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function readSysfs(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8').trim();
    }
  } catch {
    // Ignore permission or missing attribute errors
  }
  return null;
}

// Writes to sysfs directly, with automatic fallback to `sudo -n tee` if running as non-root user
function writeSysfs(filePath: string, value: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  try {
    fs.writeFileSync(filePath, `${value}\n`, 'utf-8');
    return true;
  } catch {
    try {
      execSync(`printf '%s\\n' "${value}" | sudo -n tee "${filePath}" >/dev/null`, {
        stdio: ['ignore', 'ignore', 'ignore'],
        timeout: 1500,
      });
      return true;
    } catch (err) {
      console.error(`Error writing to ${filePath} (even with sudo fallback):`, err);
      return false;
    }
  }
}

// Discover hwmon directory by chip name (e.g., "acer", "coretemp", "acpitz")
function findHwmonByName(targetNames: string[]): string | null {
  try {
    if (!fs.existsSync(SYSFS_PATHS.hwmonBase)) return null;
    const entries = fs.readdirSync(SYSFS_PATHS.hwmonBase);
    for (const entry of entries) {
      const dir = path.join(SYSFS_PATHS.hwmonBase, entry);
      const name = readSysfs(path.join(dir, 'name'))?.toLowerCase();
      if (name && targetNames.includes(name)) {
        return dir;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function hasRealLinuxHwmon(): boolean {
  return !!findHwmonByName(['acer', 'coretemp', 'k10temp', 'acpitz', 'nvme']);
}

// Read real CPU temperature (°C) from coretemp or acer hwmon on Intel Core i5-13420H
function readRealCpuTemp(): number | null {
  // Check acer WMI hwmon first (temp1_input = ACER_WMID_SENSOR_CPU_TEMPERATURE)
  const acerHwmon = findHwmonByName(['acer']);
  if (acerHwmon) {
    const raw = readSysfs(path.join(acerHwmon, 'temp1_input'));
    if (raw) {
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val > 0) return Math.round((val / 1000) * 10) / 10;
    }
  }
  // Check Intel coretemp (temp1_input = Package id 0)
  const coretemp = findHwmonByName(['coretemp', 'k10temp', 'acpitz']);
  if (coretemp) {
    const raw = readSysfs(path.join(coretemp, 'temp1_input'));
    if (raw) {
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val > 0) return Math.round((val / 1000) * 10) / 10;
    }
  }
  return null;
}

// Read real NVIDIA GeForce RTX 4060 metrics via nvidia-smi and/or acer hwmon
function readRealGpuMetrics(): { temp: number | null; usage: number | null; powerWatts: number | null } {
  let temp: number | null = null;
  let usage: number | null = null;
  let powerWatts: number | null = null;

  const acerHwmon = findHwmonByName(['acer']);
  if (acerHwmon) {
    const raw2 = readSysfs(path.join(acerHwmon, 'temp2_input'));
    const raw3 = readSysfs(path.join(acerHwmon, 'temp3_input'));
    const raw = raw2 || raw3;
    if (raw) {
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val > 0) temp = Math.round((val / 1000) * 10) / 10;
    }
  }

  try {
    const out = execSync(
      'nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,power.draw --format=csv,noheader,nounits',
      { stdio: ['ignore', 'pipe', 'ignore'], timeout: 800, encoding: 'utf-8' }
    ).trim();
    if (out) {
      const firstLine = out.split('\n')[0];
      const parts = firstLine.split(',').map((s) => parseFloat(s.trim()));
      if (!isNaN(parts[0]) && parts[0] > 0) temp = parts[0];
      if (!isNaN(parts[1]) && parts[1] >= 0) usage = Math.round(parts[1]);
      if (!isNaN(parts[2]) && parts[2] >= 0) powerWatts = Math.round(parts[2]);
    }
  } catch {
    // nvidia-smi not installed or GPU in D3cold power-saving state
  }

  return { temp, usage, powerWatts };
}

// Read real Fan RPMs from acer hwmon (fan1_input = CPU fan, fan2_input = GPU fan)
// Never fabricates RPMs when real hwmon attributes exist!
function readRealFanRpms(): { cpuRpm: number | null; gpuRpm: number | null } {
  let cpuRpm: number | null = null;
  let gpuRpm: number | null = null;

  const acerHwmon = findHwmonByName(['acer']);
  if (acerHwmon) {
    const f1 = readSysfs(path.join(acerHwmon, 'fan1_input'));
    const f2 = readSysfs(path.join(acerHwmon, 'fan2_input'));
    if (f1 !== null && !isNaN(parseInt(f1, 10))) {
      cpuRpm = Math.max(0, parseInt(f1, 10));
    }
    if (f2 !== null && !isNaN(parseInt(f2, 10))) {
      gpuRpm = Math.max(0, parseInt(f2, 10));
    }
    return { cpuRpm, gpuRpm };
  }

  // Fallback: scan any hwmon device that exposes fan1_input / fan2_input
  try {
    if (fs.existsSync(SYSFS_PATHS.hwmonBase)) {
      for (const entry of fs.readdirSync(SYSFS_PATHS.hwmonBase)) {
        const dir = path.join(SYSFS_PATHS.hwmonBase, entry);
        const f1 = readSysfs(path.join(dir, 'fan1_input'));
        const f2 = readSysfs(path.join(dir, 'fan2_input'));
        if (f1 !== null && !isNaN(parseInt(f1, 10))) {
          cpuRpm = Math.max(0, parseInt(f1, 10));
        }
        if (f2 !== null && !isNaN(parseInt(f2, 10))) {
          gpuRpm = Math.max(0, parseInt(f2, 10));
        }
        if (cpuRpm !== null || gpuRpm !== null) break;
      }
    }
  } catch {
    // ignore
  }

  return { cpuRpm, gpuRpm };
}

// Calculate real CPU usage from /proc/stat delta
let prevCpuIdle = 0;
let prevCpuTotal = 0;
function readRealCpuUsage(): number | null {
  try {
    if (!fs.existsSync('/proc/stat')) return null;
    const line = fs.readFileSync('/proc/stat', 'utf-8').split('\n')[0];
    if (!line || !line.startsWith('cpu ')) return null;
    const parts = line
      .trim()
      .split(/\s+/)
      .slice(1)
      .map((n) => parseInt(n, 10));
    const idle = parts[3] + (parts[4] || 0);
    const total = parts.reduce((acc, v) => acc + (isNaN(v) ? 0 : v), 0);
    const diffIdle = idle - prevCpuIdle;
    const diffTotal = total - prevCpuTotal;
    prevCpuIdle = idle;
    prevCpuTotal = total;
    if (diffTotal <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((1 - diffIdle / diffTotal) * 100)));
  } catch {
    return null;
  }
}

// Calculate real CPU Package Power (Watts) via Intel RAPL
let prevRaplUj: number | null = null;
let prevRaplTime = 0;
function readRealCpuWatts(): number | null {
  try {
    const raw = readSysfs(SYSFS_PATHS.raplEnergy);
    if (!raw) return null;
    const currentUj = parseInt(raw, 10);
    const now = Date.now();
    if (isNaN(currentUj)) return null;
    if (prevRaplUj !== null && now > prevRaplTime) {
      const deltaUj = currentUj >= prevRaplUj ? currentUj - prevRaplUj : 0;
      const deltaSec = (now - prevRaplTime) / 1000;
      prevRaplUj = currentUj;
      prevRaplTime = now;
      if (deltaSec > 0 && deltaUj > 0) {
        const watts = Math.round(deltaUj / 1_000_000 / deltaSec);
        if (watts > 0 && watts < 150) return watts;
      }
    } else {
      prevRaplUj = currentUj;
      prevRaplTime = now;
    }
  } catch {
    // ignore
  }
  return null;
}

// Read real battery and AC status from /sys/class/power_supply
function readRealPowerStatus(): {
  acConnected: boolean | null;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
} {
  let acConnected: boolean | null = null;
  let batteryLevel: number | null = null;
  let batteryCharging: boolean | null = null;

  try {
    if (!fs.existsSync(SYSFS_PATHS.powerSupplyBase)) {
      return { acConnected, batteryLevel, batteryCharging };
    }
    const supplies = fs.readdirSync(SYSFS_PATHS.powerSupplyBase);
    for (const s of supplies) {
      const dir = path.join(SYSFS_PATHS.powerSupplyBase, s);
      const type = readSysfs(path.join(dir, 'type'))?.toLowerCase();
      if (type === 'mains' || s.startsWith('AC') || s.startsWith('ADP')) {
        const online = readSysfs(path.join(dir, 'online'));
        if (online === '1' || online === '0') {
          acConnected = online === '1';
        }
      } else if (type === 'battery' || s.startsWith('BAT')) {
        const cap = readSysfs(path.join(dir, 'capacity'));
        const status = readSysfs(path.join(dir, 'status'))?.toLowerCase();
        if (cap && !isNaN(parseInt(cap, 10))) {
          batteryLevel = Math.max(0, Math.min(100, parseInt(cap, 10)));
        }
        if (status) {
          batteryCharging = status === 'charging';
        }
      }
    }
  } catch {
    // ignore
  }
  return { acConnected, batteryLevel, batteryCharging };
}

interface ServerState {
  cpuTemp: number;
  gpuTemp: number;
  cpuFanTargetPercent: number;
  gpuFanTargetPercent: number;
  cpuFanRpm: number;
  gpuFanRpm: number;
  cpuUsage: number;
  gpuUsage: number;
  cpuPowerWatts: number;
  gpuPowerWatts: number;
  activeProfile: ThermalProfileId;
  fanMode: 'auto' | 'custom' | 'max';
  customCurveActive: boolean;
  customCurve: FanCurvePoint[];
  acConnected: boolean;
  batteryLevel: number;
  batteryCharging: boolean;
  workload: 'idle' | 'balanced' | 'gaming' | 'stress';
  simulatorForced: boolean;
  settings: AdvancedSettings;
}

const state: ServerState = {
  cpuTemp: 46.0,
  gpuTemp: 41.0,
  cpuFanTargetPercent: 0,
  gpuFanTargetPercent: 0,
  cpuFanRpm: 1920,
  gpuFanRpm: 0,
  cpuUsage: 11,
  gpuUsage: 5,
  cpuPowerWatts: 18,
  gpuPowerWatts: 14,
  activeProfile: 'balanced',
  fanMode: 'auto',
  customCurveActive: false,
  customCurve: FAN_CURVE_PRESETS.balanced,
  acConnected: true,
  batteryLevel: 80,
  batteryCharging: false,
  workload: 'idle',
  simulatorForced: false,
  settings: {
    batteryLimiter: true,
    lcdOverdrive: true,
    keyboardBacklightTimeout: false,
    usbPowerOffCharging: 0,
    autoProfileOnBattery: true,
    batteryProfile: 'eco',
    acProfile: 'balanced',
  },
};

function pollRealHardwareOnce() {
  const currentSensePath = detectSensePath();
  const realCpuT = readRealCpuTemp();
  if (realCpuT !== null) state.cpuTemp = realCpuT;

  const gpuMetrics = readRealGpuMetrics();
  if (gpuMetrics.temp !== null) state.gpuTemp = gpuMetrics.temp;
  if (gpuMetrics.usage !== null) state.gpuUsage = gpuMetrics.usage;
  if (gpuMetrics.powerWatts !== null) state.gpuPowerWatts = gpuMetrics.powerWatts;

  const realCpuU = readRealCpuUsage();
  if (realCpuU !== null) state.cpuUsage = realCpuU;

  const realCpuW = readRealCpuWatts();
  if (realCpuW !== null) {
    state.cpuPowerWatts = realCpuW;
  }

  if (currentSensePath) {
    const rawFanSpeed = readSysfs(path.join(currentSensePath, 'fan_speed'));
    if (rawFanSpeed) {
      const parsed = parseFanSpeedSysfs(rawFanSpeed);
      state.cpuFanTargetPercent = parsed.cpu;
      state.gpuFanTargetPercent = parsed.gpu;
      if (parsed.cpu === 100 && parsed.gpu === 100) {
        state.fanMode = 'max';
      } else if (parsed.cpu === 0 && parsed.gpu === 0 && !state.customCurveActive) {
        state.fanMode = 'auto';
      } else {
        state.fanMode = 'custom';
      }
    }

    const rawLimiter = readSysfs(path.join(currentSensePath, 'battery_limiter'));
    if (rawLimiter === '1' || rawLimiter === '0') {
      state.settings.batteryLimiter = rawLimiter === '1';
    }
  }

  // Always use real RPMs from hwmon when available (including 0 RPM at idle!)
  const rpms = readRealFanRpms();
  if (rpms.cpuRpm !== null) {
    state.cpuFanRpm = rpms.cpuRpm;
  }
  if (rpms.gpuRpm !== null) {
    state.gpuFanRpm = rpms.gpuRpm;
  }

  const rawProfile = readSysfs(SYSFS_PATHS.platformProfile);
  if (rawProfile) {
    state.activeProfile = mapPlatformProfileToId(rawProfile);
  }

  const pwr = readRealPowerStatus();
  if (pwr.acConnected !== null) state.acConnected = pwr.acConnected;
  if (pwr.batteryLevel !== null) state.batteryLevel = pwr.batteryLevel;
  if (pwr.batteryCharging !== null) state.batteryCharging = pwr.batteryCharging;
}

// Main 1Hz hardware monitor & thermal control loop
setInterval(() => {
  const currentSensePath = detectSensePath();
  const isRealLinuxHardware = (!!currentSensePath || hasRealLinuxHwmon()) && !state.simulatorForced;

  if (isRealLinuxHardware) {
    pollRealHardwareOnce();

    // If custom curve is active in custom fanMode, dynamically apply interpolated speed to hardware
    if (currentSensePath && state.fanMode === 'custom' && state.customCurveActive) {
      const maxTemp = Math.max(state.cpuTemp, state.gpuTemp);
      const curveSpeed = interpolateFanCurve(maxTemp, state.customCurve);
      if (
        Math.abs(curveSpeed - state.cpuFanTargetPercent) >= 3 ||
        Math.abs(curveSpeed - state.gpuFanTargetPercent) >= 3
      ) {
        state.cpuFanTargetPercent = curveSpeed;
        state.gpuFanTargetPercent = curveSpeed;
        writeSysfs(
          path.join(currentSensePath, 'fan_speed'),
          formatFanSpeedSysfs(curveSpeed, curveSpeed)
        );
      }
    }
    return;
  }

  // Simulated physics ONLY when running in cloud preview container or when Workload Simulator is triggered
  let baseCpuHeat = 15;
  let baseGpuHeat = 10;
  let targetUsageCpu = 14;
  let targetUsageGpu = 6;

  if (state.workload === 'balanced') {
    baseCpuHeat = 32;
    baseGpuHeat = 28;
    targetUsageCpu = 42;
    targetUsageGpu = 35;
  } else if (state.workload === 'gaming') {
    baseCpuHeat = 65;
    baseGpuHeat = 70;
    targetUsageCpu = 78;
    targetUsageGpu = 89;
  } else if (state.workload === 'stress') {
    baseCpuHeat = 90;
    baseGpuHeat = 85;
    targetUsageCpu = 98;
    targetUsageGpu = 96;
  }

  state.cpuUsage = Math.max(1, Math.min(100, Math.round(targetUsageCpu + (Math.random() * 6 - 3))));
  state.gpuUsage = Math.max(0, Math.min(100, Math.round(targetUsageGpu + (Math.random() * 6 - 3))));

  let effectiveCpuPercent = state.cpuFanTargetPercent;
  let effectiveGpuPercent = state.gpuFanTargetPercent;

  if (state.fanMode === 'max' || state.activeProfile === 'turbo') {
    effectiveCpuPercent = 100;
    effectiveGpuPercent = 100;
  } else if (state.fanMode === 'custom' && state.customCurveActive) {
    const maxTemp = Math.max(state.cpuTemp, state.gpuTemp);
    effectiveCpuPercent = interpolateFanCurve(maxTemp, state.customCurve);
    effectiveGpuPercent = effectiveCpuPercent;
    state.cpuFanTargetPercent = effectiveCpuPercent;
    state.gpuFanTargetPercent = effectiveGpuPercent;
  } else if (state.fanMode === 'auto') {
    if (state.cpuTemp > 85) effectiveCpuPercent = 90;
    else if (state.cpuTemp > 75) effectiveCpuPercent = 70;
    else if (state.cpuTemp > 65) effectiveCpuPercent = 50;
    else if (state.cpuTemp > 50) effectiveCpuPercent = 30;
    else effectiveCpuPercent = 20;

    if (state.gpuTemp > 80) effectiveGpuPercent = 85;
    else if (state.gpuTemp > 70) effectiveGpuPercent = 65;
    else if (state.gpuTemp > 55) effectiveGpuPercent = 45;
    else if (state.gpuTemp > 45) effectiveGpuPercent = 25;
    else effectiveGpuPercent = 0;
  }

  const cpuCooling = (effectiveCpuPercent / 100) * 80;
  const gpuCooling = (effectiveGpuPercent / 100) * 85;

  const ambient = 24.0;
  const targetCpuTemp = ambient + Math.max(18, baseCpuHeat * 1.05 - cpuCooling * 0.45);
  const targetGpuTemp = ambient + Math.max(16, baseGpuHeat * 0.95 - gpuCooling * 0.48);

  state.cpuTemp += (targetCpuTemp - state.cpuTemp) * 0.12 + (Math.random() * 0.4 - 0.2);
  state.gpuTemp += (targetGpuTemp - state.gpuTemp) * 0.12 + (Math.random() * 0.3 - 0.15);
  state.cpuTemp = Math.round(state.cpuTemp * 10) / 10;
  state.gpuTemp = Math.round(state.gpuTemp * 10) / 10;

  state.cpuPowerWatts = Math.round(15 + (state.cpuUsage / 100) * 55);
  state.gpuPowerWatts = Math.round(12 + (state.gpuUsage / 100) * 63);

  const targetCpuRpm = calculateRpmFromPercent(effectiveCpuPercent, 'cpu');
  const targetGpuRpm = calculateRpmFromPercent(effectiveGpuPercent, 'gpu');

  state.cpuFanRpm += Math.round((targetCpuRpm - state.cpuFanRpm) * 0.25);
  state.gpuFanRpm += Math.round((targetGpuRpm - state.gpuFanRpm) * 0.25);

  if (state.settings.batteryLimiter && state.batteryLevel >= 80) {
    state.batteryCharging = false;
  }
}, 1000);

// API: Get Telemetry
app.get('/api/telemetry', (_req: Request, res: Response) => {
  const currentSensePath = detectSensePath();
  const isHardwareDetected = !!currentSensePath;

  if ((isHardwareDetected || hasRealLinuxHwmon()) && !state.simulatorForced) {
    pollRealHardwareOnce();
  }

  const telemetry: TelemetryData = {
    timestamp: Date.now(),
    cpuTemp: state.cpuTemp,
    gpuTemp: state.gpuTemp,
    cpuFanRpm: state.cpuFanRpm,
    gpuFanRpm: state.gpuFanRpm,
    cpuFanPercent: state.cpuFanTargetPercent,
    gpuFanPercent: state.gpuFanTargetPercent,
    cpuUsage: state.cpuUsage,
    gpuUsage: state.gpuUsage,
    cpuPowerWatts: state.cpuPowerWatts,
    gpuPowerWatts: state.gpuPowerWatts,
    acConnected: state.acConnected,
    batteryLevel: state.batteryLevel,
    batteryCharging: state.batteryCharging,
    batteryLimiterActive: state.settings.batteryLimiter,
    activeProfile: state.activeProfile,
    fanMode: state.fanMode,
    isHardwareDetected,
    driverStatus: isHardwareDetected ? 'active' : 'fallback_simulated',
    sysfsPaths: {
      sensePath: currentSensePath,
      fanSpeedPath: currentSensePath ? path.join(currentSensePath, 'fan_speed') : null,
      platformProfilePath: fs.existsSync(SYSFS_PATHS.platformProfile) ? SYSFS_PATHS.platformProfile : null,
      batteryLimiterPath: currentSensePath ? path.join(currentSensePath, 'battery_limiter') : null,
    },
    deviceModel: ANV15_SPECS.modelName,
  };

  res.json(telemetry);
});

// API: Set Fan Speed or Custom Curve
app.post('/api/fan-speed', (req: Request, res: Response) => {
  const { cpu, gpu, mode, customCurve } = req.body;
  const currentSensePath = detectSensePath();
  const cpuSpeed = typeof cpu === 'number' ? Math.max(0, Math.min(100, cpu)) : 0;
  const gpuSpeed = typeof gpu === 'number' ? Math.max(0, Math.min(100, gpu)) : 0;
  const fanMode = mode === 'max' ? 'max' : mode === 'auto' ? 'auto' : 'custom';

  let targetCpu = cpuSpeed;
  let targetGpu = gpuSpeed;

  if (Array.isArray(customCurve) && customCurve.length >= 2) {
    state.customCurve = customCurve;
    state.customCurveActive = true;
    const maxTemp = Math.max(state.cpuTemp, state.gpuTemp);
    const interpolated = interpolateFanCurve(maxTemp, customCurve);
    targetCpu = interpolated;
    targetGpu = interpolated;
  } else {
    state.customCurveActive = false;
    targetCpu = fanMode === 'max' ? 100 : fanMode === 'auto' ? 0 : cpuSpeed;
    targetGpu = fanMode === 'max' ? 100 : fanMode === 'auto' ? 0 : gpuSpeed;
  }

  const sysfsPayload = formatFanSpeedSysfs(targetCpu, targetGpu);

  let writtenToHardware = false;
  if (currentSensePath) {
    // On ANV15-52, if platform_profile is in 'quiet' or 'low-power' (eco), the EC at 0xFE708607
    // restricts manual fan speeds. Ensure platform_profile is in 'balanced' or 'performance' first!
    if (fs.existsSync(SYSFS_PATHS.platformProfile)) {
      const currentProf = readSysfs(SYSFS_PATHS.platformProfile)?.trim();
      if (fanMode === 'max' || (targetCpu === 100 && targetGpu === 100)) {
        writeSysfs(SYSFS_PATHS.platformProfile, 'performance');
        state.activeProfile = 'turbo';
      } else if (fanMode === 'custom' && (currentProf === 'quiet' || currentProf === 'low-power')) {
        writeSysfs(SYSFS_PATHS.platformProfile, 'balanced');
        state.activeProfile = 'balanced';
      }
    }

    writtenToHardware = writeSysfs(path.join(currentSensePath, 'fan_speed'), sysfsPayload);
    if (!writtenToHardware) {
      res.status(500).json({
        success: false,
        writtenToHardware: false,
        error: 'Permissão negada ao gravar em nitro_sense/fan_speed. Execute sudo ./install.sh.',
      });
      return;
    }
  }

  state.fanMode = fanMode;
  state.cpuFanTargetPercent = targetCpu;
  state.gpuFanTargetPercent = targetGpu;

  if (currentSensePath) {
    pollRealHardwareOnce();
  }

  res.json({
    success: true,
    applied: {
      cpu: state.cpuFanTargetPercent,
      gpu: state.gpuFanTargetPercent,
      mode: state.fanMode,
      customCurveActive: state.customCurveActive,
    },
    sysfsPayload,
    writtenToHardware,
  });
});

// API: Set Thermal Profile
app.post('/api/profile', (req: Request, res: Response) => {
  const { profile } = req.body;
  if (!profile || !THERMAL_PROFILES[profile as ThermalProfileId]) {
    res.status(400).json({ error: 'Perfil inválido' });
    return;
  }

  const currentSensePath = detectSensePath();
  const profileId = profile as ThermalProfileId;
  const targetProfile = THERMAL_PROFILES[profileId];
  state.activeProfile = profileId;
  state.customCurveActive = false;

  if (profileId === 'turbo') {
    state.fanMode = 'max';
    state.cpuFanTargetPercent = 100;
    state.gpuFanTargetPercent = 100;
  } else if (profileId === 'performance') {
    state.fanMode = 'custom';
    state.cpuFanTargetPercent = 75;
    state.gpuFanTargetPercent = 75;
  } else {
    state.fanMode = 'auto';
    state.cpuFanTargetPercent = 0;
    state.gpuFanTargetPercent = 0;
  }

  let writtenToHardware = false;
  if (fs.existsSync(SYSFS_PATHS.platformProfile)) {
    writtenToHardware = writeSysfs(SYSFS_PATHS.platformProfile, targetProfile.platformProfile);
  }
  if (currentSensePath) {
    const fanPayload = formatFanSpeedSysfs(state.cpuFanTargetPercent, state.gpuFanTargetPercent);
    writtenToHardware = writeSysfs(path.join(currentSensePath, 'fan_speed'), fanPayload) || writtenToHardware;
    pollRealHardwareOnce();
  }

  res.json({
    success: true,
    activeProfile: profileId,
    ecMode: targetProfile.ecMode,
    platformProfile: targetProfile.platformProfile,
    writtenToHardware,
  });
});

// API: Update Advanced Settings
app.post('/api/settings', (req: Request, res: Response) => {
  const currentSensePath = detectSensePath();
  const {
    batteryLimiter,
    lcdOverdrive,
    keyboardBacklightTimeout,
    usbPowerOffCharging,
    autoProfileOnBattery,
    batteryProfile,
    acProfile,
  } = req.body;

  if (typeof batteryLimiter === 'boolean') {
    state.settings.batteryLimiter = batteryLimiter;
    if (currentSensePath) {
      writeSysfs(path.join(currentSensePath, 'battery_limiter'), batteryLimiter ? '1' : '0');
    }
  }

  if (typeof lcdOverdrive === 'boolean') {
    state.settings.lcdOverdrive = lcdOverdrive;
    if (currentSensePath) {
      writeSysfs(path.join(currentSensePath, 'lcd_override'), lcdOverdrive ? '1' : '0');
    }
  }

  if (typeof keyboardBacklightTimeout === 'boolean') {
    state.settings.keyboardBacklightTimeout = keyboardBacklightTimeout;
    if (currentSensePath) {
      writeSysfs(path.join(currentSensePath, 'backlight_timeout'), keyboardBacklightTimeout ? '1' : '0');
    }
  }

  if (typeof usbPowerOffCharging === 'number') {
    state.settings.usbPowerOffCharging = usbPowerOffCharging;
    if (currentSensePath) {
      writeSysfs(path.join(currentSensePath, 'usb_charging'), usbPowerOffCharging.toString());
    }
  }

  if (typeof autoProfileOnBattery === 'boolean') {
    state.settings.autoProfileOnBattery = autoProfileOnBattery;
  }
  if (batteryProfile && THERMAL_PROFILES[batteryProfile as ThermalProfileId]) {
    state.settings.batteryProfile = batteryProfile;
  }
  if (acProfile && THERMAL_PROFILES[acProfile as ThermalProfileId]) {
    state.settings.acProfile = acProfile;
  }

  res.json({ success: true, settings: state.settings });
});

// API: Simulate Workload / Power source toggle
app.post('/api/simulate-workload', (req: Request, res: Response) => {
  const { workload, acConnected } = req.body;
  if (workload && ['idle', 'balanced', 'gaming', 'stress'].includes(workload)) {
    state.workload = workload;
    state.simulatorForced = workload !== 'idle';
  }
  if (typeof acConnected === 'boolean') {
    state.acConnected = acConnected;
    if (state.settings.autoProfileOnBattery) {
      state.activeProfile = acConnected ? state.settings.acProfile : state.settings.batteryProfile;
    }
  }
  res.json({
    success: true,
    workload: state.workload,
    acConnected: state.acConnected,
    profile: state.activeProfile,
  });
});

// API: System Info & ANV15-52-52VN Official Diagnostic
app.get('/api/system-info', (_req: Request, res: Response) => {
  const currentSensePath = detectSensePath();
  res.json({
    model: ANV15_SPECS.modelName,
    dmiProductName: ANV15_SPECS.dmiProductName,
    hardwareSpecs: {
      cpu: ANV15_SPECS.cpuModel,
      gpu: ANV15_SPECS.gpuModel,
      igpu: ANV15_SPECS.igpuModel,
      ram: ANV15_SPECS.ramSpecs,
      storage: ANV15_SPECS.storageSpecs,
      display: ANV15_SPECS.displaySpecs,
      battery: ANV15_SPECS.batterySpecs,
      os: ANV15_SPECS.osTarget,
    },
    ecSpecs: {
      windowBase: ANV15_SPECS.ecWindowBase,
      profileOffset: ANV15_SPECS.ecProfileModeOffset,
      acpiMethod: ANV15_SPECS.ec0Q30Path,
      quirk: ANV15_SPECS.quirkName,
      quirkFlags: ['nitro_v4=1', 'ec_mmio_profile=1'],
    },
    fanSpecs: {
      cpuMaxRpm: ANV15_SPECS.maxCpuRpm,
      gpuMaxRpm: ANV15_SPECS.maxGpuRpm,
      idleRpm: ANV15_SPECS.idleCpuRpm,
    },
    driver: {
      detected: !!currentSensePath,
      status: currentSensePath ? 'loaded' : 'simulated_container',
      sensePath: currentSensePath,
      modprobeCommand: 'sudo modprobe linuwu_sense',
      modprobeConfig: 'Auto DMI: Nitro ANV15-52 -> quirk_acer_nitro_anv15_52 (nitro_v4=1, ec_mmio_profile=1)',
      serviceName: 'nitrosense-linux.service',
    },
  });
});

// Self-contained Sync & Install Script endpoint so the user can update their Fedora machine & GitHub in 1 command
app.get('/api/sync-bundle.sh', (_req: Request, res: Response) => {
  const filesToSync = [
    'package.json',
    '.npmrc',
    '.gitignore',
    'install.sh',
    'server.ts',
    'README.md',
    'src/App.tsx',
    'src/utils/nitroTypes.ts',
    'src/utils/fanMath.ts',
    'src/utils/fanMath.test.ts',
    'src/components/Header.tsx',
    'src/components/Gauge.tsx',
    'src/components/TempHistoryChart.tsx',
    'src/components/Dashboard.tsx',
    'src/components/FanControlView.tsx',
    'src/components/FanCurveCanvas.tsx',
    'src/components/ProfilesView.tsx',
    'src/components/HardwareSettingsView.tsx',
    'src/components/DriverAndGitView.tsx',
  ];

  let script = `#!/usr/bin/env bash
set -e
echo "======================================================================"
echo "  Sincronizando NitroSense Linux (RTX 4060 | 8600 RPM | Telemetria Real)"
echo "======================================================================"
mkdir -p src/utils src/components
`;

  for (const relPath of filesToSync) {
    const absPath = path.join(__dirname, relPath);
    if (fs.existsSync(absPath)) {
      const b64 = fs.readFileSync(absPath).toString('base64');
      script += `echo "Atualizando ${relPath}..."\n`;
      script += `echo "${b64}" | base64 -d > "${relPath}"\n`;
    }
  }

  script += `
chmod +x install.sh
echo "Atualizando repositório Git local e enviando para o GitHub..."
git add -A 2>/dev/null || true
git commit -m "fix: telemetria real hwmon/nvidia-smi, controle físico sysfs e limite 8600 RPM (ANV15-52-52VN)" 2>/dev/null || true
git push origin main 2>/dev/null || echo "Nota: git push automático ignorado (você pode rodar 'git push origin main' depois)."

echo "Executando sudo ./install.sh..."
sudo ./install.sh
`;

  res.setHeader('Content-Type', 'text/x-sh; charset=utf-8');
  res.send(script);
});

// GitHub Device Flow & Auto-Push State for https://github.com/luisggurgel/linuwu-sense-anv15.git
const GITHUB_CLIENT_ID = '178c6fc778ccc68e1d6a';
const GITHUB_TOKEN_CACHE_PATH = '/root/.gh_token';
const GITHUB_STATE_CACHE_PATH = '/tmp/nitrosense_gh_state.json';

interface GitHubPushState {
  repoUrl: string;
  userCode: string | null;
  deviceCode: string | null;
  verificationUri: string;
  status: 'idle' | 'awaiting_authorization' | 'pushing' | 'pushed' | 'error';
  message: string;
  lastPushTimestamp: number | null;
}

const ghState: GitHubPushState = {
  repoUrl: 'https://github.com/luisggurgel/linuwu-sense-anv15.git',
  userCode: null,
  deviceCode: null,
  verificationUri: 'https://github.com/login/device',
  status: 'idle',
  message: 'Clique em "Gerar Código de Autorização" para autenticar e enviar para o GitHub.',
  lastPushTimestamp: null,
};

function saveGhState() {
  try {
    fs.writeFileSync(GITHUB_STATE_CACHE_PATH, JSON.stringify(ghState), { mode: 0o600 });
  } catch {
    // ignore
  }
}

function loadGhState() {
  try {
    if (fs.existsSync(GITHUB_STATE_CACHE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(GITHUB_STATE_CACHE_PATH, 'utf-8'));
      if (raw && typeof raw === 'object') {
        Object.assign(ghState, raw);
      }
    }
  } catch {
    // ignore
  }
}

loadGhState();

function executeGitPushWithToken(accessToken: string, repoUrl: string): { ok: boolean; output: string } {
  try {
    try {
      fs.writeFileSync(GITHUB_TOKEN_CACHE_PATH, accessToken.trim(), { mode: 0o600 });
    } catch {
      // Ignore if /root is not writable
    }
    const cleanRepo = repoUrl.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const authUrl = `https://x-access-token:${accessToken}@github.com/${cleanRepo}.git`;
    execSync('git config --global --add safe.directory "*"', { stdio: 'pipe' });
    execSync('git config user.name "Luis Guilherme"', { stdio: 'pipe' });
    execSync('git config user.email "luisguilhermegurgelamaral@gmail.com"', { stdio: 'pipe' });
    execSync('git add -A', { stdio: 'pipe' });
    try {
      execSync(
        'git commit -m "fix: telemetria real hwmon/nvidia-smi, controle físico sysfs e limite 8600 RPM (ANV15-52-52VN)"',
        { stdio: 'pipe' }
      );
    } catch {
      // Nothing new to commit
    }
    execSync('git branch -M main', { stdio: 'pipe' });
    execSync(
      `git remote set-url origin https://github.com/${cleanRepo}.git 2>/dev/null || git remote add origin https://github.com/${cleanRepo}.git`,
      { stdio: 'pipe' }
    );
    const out = execSync(`GIT_TERMINAL_PROMPT=0 git push -u "${authUrl}" main --force`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { ok: true, output: out || 'Push realizado com sucesso para branch main!' };
  } catch (err: any) {
    const errMsg = (err?.stderr?.toString() || err?.message || 'Erro ao executar git push').replace(
      /x-access-token:[^@]+@/g,
      'x-access-token:***@'
    );
    return { ok: false, output: errMsg };
  }
}

setInterval(async () => {
  loadGhState();
  if (ghState.status !== 'awaiting_authorization' || !ghState.deviceCode) return;
  try {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      device_code: ghState.deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) return;
    const data: any = await res.json();
    if (data.access_token) {
      ghState.status = 'pushing';
      ghState.message =
        'Autorizado! Enviando commits para https://github.com/luisggurgel/linuwu-sense-anv15.git...';
      saveGhState();
      const result = executeGitPushWithToken(data.access_token, ghState.repoUrl);
      if (result.ok) {
        ghState.status = 'pushed';
        ghState.deviceCode = null;
        ghState.lastPushTimestamp = Date.now();
        ghState.message =
          'Repositório atualizado com sucesso em https://github.com/luisggurgel/linuwu-sense-anv15!';
      } else {
        ghState.status = 'error';
        ghState.message = `Erro no push: ${result.output}`;
      }
      saveGhState();
    } else if (data.error === 'expired_token' || data.error === 'access_denied') {
      ghState.status = 'error';
      ghState.deviceCode = null;
      ghState.message = 'O código expirou. Clique em "Novo Código" para gerar outro.';
      saveGhState();
    }
  } catch {
    // Ignore transient network errors during polling
  }
}, 4000);

app.get('/api/github/status', (_req: Request, res: Response) => {
  loadGhState();
  res.json({
    repoUrl: ghState.repoUrl,
    userCode: ghState.userCode,
    verificationUri: ghState.verificationUri,
    status: ghState.status,
    message: ghState.message,
    lastPushTimestamp: ghState.lastPushTimestamp,
  });
});

app.post('/api/github/start-device-flow', async (req: Request, res: Response) => {
  try {
    loadGhState();
    const { repoUrl } = req.body || {};
    if (repoUrl && typeof repoUrl === 'string') {
      ghState.repoUrl = repoUrl.trim();
    }
    if (fs.existsSync(GITHUB_TOKEN_CACHE_PATH)) {
      const cachedToken = fs.readFileSync(GITHUB_TOKEN_CACHE_PATH, 'utf-8').trim();
      if (cachedToken) {
        const result = executeGitPushWithToken(cachedToken, ghState.repoUrl);
        if (result.ok) {
          ghState.status = 'pushed';
          ghState.userCode = null;
          ghState.deviceCode = null;
          ghState.lastPushTimestamp = Date.now();
          ghState.message =
            'Repositório atualizado com sucesso em https://github.com/luisggurgel/linuwu-sense-anv15!';
          saveGhState();
          res.json({
            success: true,
            userCode: null,
            verificationUri: ghState.verificationUri,
            status: ghState.status,
            message: ghState.message,
          });
          return;
        }
      }
    }
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo',
    });
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data: any = await response.json();
    if (data.user_code && data.device_code) {
      ghState.userCode = data.user_code;
      ghState.deviceCode = data.device_code;
      ghState.verificationUri = data.verification_uri || 'https://github.com/login/device';
      ghState.status = 'awaiting_authorization';
      ghState.message = `Aguardando confirmação do código ${data.user_code} em github.com/login/device...`;
      saveGhState();
      res.json({
        success: true,
        userCode: ghState.userCode,
        verificationUri: ghState.verificationUri,
        status: ghState.status,
        message: ghState.message,
      });
    } else {
      res.status(500).json({ error: 'Falha ao iniciar Device Flow do GitHub' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erro de conexão com GitHub' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NitroSense Linux (ANV15-52-52VN) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
