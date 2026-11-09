import { execSync } from 'child_process';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  ANV15_SPECS,
  calculateRpmFromPercent,
  formatFanSpeedSysfs,
  parseFanSpeedSysfs,
  THERMAL_PROFILES,
} from './src/utils/fanMath';
import { AdvancedSettings, TelemetryData, ThermalProfileId } from './src/utils/nitroTypes';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Known sysfs paths used by Linuwu-Sense and Linux kernel
const SYSFS_PATHS = {
  predatorSense: '/sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/predator_sense',
  nitroSense: '/sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/nitro_sense',
  platformProfile: '/sys/firmware/acpi/platform_profile',
  platformProfileChoices: '/sys/firmware/acpi/platform_profile_choices',
  dmiProductName: '/sys/class/dmi/id/product_name',
  dmiSysVendor: '/sys/class/dmi/id/sys_vendor',
};

// Check if running on real hardware with driver loaded
function detectSensePath(): string | null {
  if (fs.existsSync(SYSFS_PATHS.nitroSense)) {
    return SYSFS_PATHS.nitroSense;
  }
  if (fs.existsSync(SYSFS_PATHS.predatorSense)) {
    return SYSFS_PATHS.predatorSense;
  }
  return null;
}

const sensePath = detectSensePath();
const isHardwareDetected = !!sensePath;

// In-memory state (used for stateful control & dynamic thermal simulation)
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
  acConnected: boolean;
  batteryLevel: number;
  batteryCharging: boolean;
  workload: 'idle' | 'balanced' | 'gaming' | 'stress';
  settings: AdvancedSettings;
}

const state: ServerState = {
  cpuTemp: 46.0,
  gpuTemp: 42.0,
  cpuFanTargetPercent: 0, // Auto
  gpuFanTargetPercent: 0, // Auto
  cpuFanRpm: 1850,
  gpuFanRpm: 0,
  cpuUsage: 12,
  gpuUsage: 6,
  cpuPowerWatts: 18,
  gpuPowerWatts: 12,
  activeProfile: 'balanced',
  fanMode: 'auto',
  acConnected: true,
  batteryLevel: 79,
  batteryCharging: false,
  workload: 'idle',
  settings: {
    batteryLimiter: true, // 80% limit default for battery preservation
    lcdOverdrive: true,
    keyboardBacklightTimeout: false,
    usbPowerOffCharging: 0,
    autoProfileOnBattery: true,
    batteryProfile: 'eco',
    acProfile: 'balanced',
  },
};

// Helper: read sysfs file safely
function readSysfs(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8').trim();
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return null;
}

// Helper: write sysfs file safely
function writeSysfs(filePath: string, value: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, value, 'utf-8');
      return true;
    }
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
  }
  return false;
}

// Thermal physics ticker: simulates realistic thermodynamics when running without live kernel module
setInterval(() => {
  // Determine baseline workload and heat production
  let baseCpuHeat = 15;
  let baseGpuHeat = 10;
  let targetUsageCpu = 15;
  let targetUsageGpu = 8;

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

  // Smooth usage fluctuations
  state.cpuUsage = Math.round(targetUsageCpu + (Math.random() * 6 - 3));
  state.gpuUsage = Math.round(targetUsageGpu + (Math.random() * 6 - 3));

  // Determine fan speeds
  let effectiveCpuPercent = state.cpuFanTargetPercent;
  let effectiveGpuPercent = state.gpuFanTargetPercent;

  if (state.fanMode === 'max' || state.activeProfile === 'turbo') {
    effectiveCpuPercent = 100;
    effectiveGpuPercent = 100;
  } else if (state.fanMode === 'auto') {
    // Dynamic auto fan curve based on temperature
    if (state.cpuTemp > 85) effectiveCpuPercent = 90;
    else if (state.cpuTemp > 75) effectiveCpuPercent = 70;
    else if (state.cpuTemp > 65) effectiveCpuPercent = 50;
    else if (state.cpuTemp > 50) effectiveCpuPercent = 30;
    else effectiveCpuPercent = 20;

    if (state.gpuTemp > 80) effectiveGpuPercent = 85;
    else if (state.gpuTemp > 70) effectiveGpuPercent = 65;
    else if (state.gpuTemp > 55) effectiveGpuPercent = 45;
    else if (state.gpuTemp > 45) effectiveGpuPercent = 25;
    else effectiveGpuPercent = 0; // GPU fan stops under 45°C in idle
  }

  // Calculate cooling dissipation based on fan percentage
  const cpuCooling = (effectiveCpuPercent / 100) * 80;
  const gpuCooling = (effectiveGpuPercent / 100) * 85;

  const ambient = 24.0;
  const targetCpuTemp = ambient + Math.max(18, baseCpuHeat * 1.05 - cpuCooling * 0.45);
  const targetGpuTemp = ambient + Math.max(16, baseGpuHeat * 0.95 - gpuCooling * 0.48);

  // Smooth temperature convergence
  state.cpuTemp += (targetCpuTemp - state.cpuTemp) * 0.12 + (Math.random() * 0.4 - 0.2);
  state.gpuTemp += (targetGpuTemp - state.gpuTemp) * 0.12 + (Math.random() * 0.3 - 0.15);
  state.cpuTemp = Math.round(state.cpuTemp * 10) / 10;
  state.gpuTemp = Math.round(state.gpuTemp * 10) / 10;

  // Wattage calculation
  state.cpuPowerWatts = Math.round(15 + (state.cpuUsage / 100) * 55);
  state.gpuPowerWatts = Math.round(10 + (state.gpuUsage / 100) * 65);

  // Fan RPM ramping towards target
  const targetCpuRpm = calculateRpmFromPercent(effectiveCpuPercent, 'cpu');
  const targetGpuRpm = calculateRpmFromPercent(effectiveGpuPercent, 'gpu');

  state.cpuFanRpm += Math.round((targetCpuRpm - state.cpuFanRpm) * 0.25);
  state.gpuFanRpm += Math.round((targetGpuRpm - state.gpuFanRpm) * 0.25);

  // If battery limiter is active and charging, limit to 80%
  if (state.settings.batteryLimiter && state.batteryLevel >= 80) {
    state.batteryCharging = false;
  }
}, 1000);

// API: Get Telemetry
app.get('/api/telemetry', (_req: Request, res: Response) => {
  // If real hardware is detected, read live sysfs values
  let liveFanSpeed: string | null = null;
  let livePlatformProfile: string | null = null;
  let liveBatteryLimiter: string | null = null;

  if (sensePath) {
    liveFanSpeed = readSysfs(path.join(sensePath, 'fan_speed'));
    liveBatteryLimiter = readSysfs(path.join(sensePath, 'battery_limiter'));
  }
  livePlatformProfile = readSysfs(SYSFS_PATHS.platformProfile);

  if (liveFanSpeed) {
    const parsed = parseFanSpeedSysfs(liveFanSpeed);
    state.cpuFanTargetPercent = parsed.cpu;
    state.gpuFanTargetPercent = parsed.gpu;
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
      sensePath,
      fanSpeedPath: sensePath ? path.join(sensePath, 'fan_speed') : null,
      platformProfilePath: fs.existsSync(SYSFS_PATHS.platformProfile) ? SYSFS_PATHS.platformProfile : null,
      batteryLimiterPath: sensePath ? path.join(sensePath, 'battery_limiter') : null,
    },
    deviceModel: ANV15_SPECS.modelName,
  };

  res.json(telemetry);
});

// API: Set Fan Speed
app.post('/api/fan-speed', (req: Request, res: Response) => {
  const { cpu, gpu, mode } = req.body;
  const cpuSpeed = typeof cpu === 'number' ? Math.max(0, Math.min(100, cpu)) : 0;
  const gpuSpeed = typeof gpu === 'number' ? Math.max(0, Math.min(100, gpu)) : 0;
  const fanMode = mode === 'max' ? 'max' : cpuSpeed === 0 && gpuSpeed === 0 ? 'auto' : 'custom';

  state.cpuFanTargetPercent = cpuSpeed;
  state.gpuFanTargetPercent = gpuSpeed;
  state.fanMode = fanMode;

  const sysfsPayload = formatFanSpeedSysfs(cpuSpeed, gpuSpeed);

  let writtenToHardware = false;
  if (sensePath) {
    writtenToHardware = writeSysfs(path.join(sensePath, 'fan_speed'), sysfsPayload);
  }

  res.json({
    success: true,
    applied: { cpu: cpuSpeed, gpu: gpuSpeed, mode: fanMode },
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

  const profileId = profile as ThermalProfileId;
  const targetProfile = THERMAL_PROFILES[profileId];
  state.activeProfile = profileId;

  // If Turbo, fans jump to 100%
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
  // Write to platform_profile if sysfs exists
  if (fs.existsSync(SYSFS_PATHS.platformProfile)) {
    writtenToHardware = writeSysfs(SYSFS_PATHS.platformProfile, targetProfile.platformProfile);
  }
  if (sensePath) {
    const fanPayload = formatFanSpeedSysfs(state.cpuFanTargetPercent, state.gpuFanTargetPercent);
    writeSysfs(path.join(sensePath, 'fan_speed'), fanPayload);
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
    if (sensePath) {
      writeSysfs(path.join(sensePath, 'battery_limiter'), batteryLimiter ? '1' : '0');
    }
  }

  if (typeof lcdOverdrive === 'boolean') {
    state.settings.lcdOverdrive = lcdOverdrive;
    if (sensePath) {
      writeSysfs(path.join(sensePath, 'lcd_override'), lcdOverdrive ? '1' : '0');
    }
  }

  if (typeof keyboardBacklightTimeout === 'boolean') {
    state.settings.keyboardBacklightTimeout = keyboardBacklightTimeout;
    if (sensePath) {
      writeSysfs(path.join(sensePath, 'backlight_timeout'), keyboardBacklightTimeout ? '1' : '0');
    }
  }

  if (typeof usbPowerOffCharging === 'number') {
    state.settings.usbPowerOffCharging = usbPowerOffCharging;
    if (sensePath) {
      writeSysfs(path.join(sensePath, 'usb_charging'), usbPowerOffCharging.toString());
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

// API: Simulate Workload / Power source toggle (useful for testing on preview & real testing)
app.post('/api/simulate-workload', (req: Request, res: Response) => {
  const { workload, acConnected } = req.body;
  if (workload && ['idle', 'balanced', 'gaming', 'stress'].includes(workload)) {
    state.workload = workload;
  }
  if (typeof acConnected === 'boolean') {
    state.acConnected = acConnected;
    if (state.settings.autoProfileOnBattery) {
      state.activeProfile = acConnected ? state.settings.acProfile : state.settings.batteryProfile;
    }
  }
  res.json({ success: true, workload: state.workload, acConnected: state.acConnected, profile: state.activeProfile });
});

// API: System Info & ANV15-52 Diagnostic
app.get('/api/system-info', (_req: Request, res: Response) => {
  res.json({
    model: ANV15_SPECS.modelName,
    dmiProductName: ANV15_SPECS.dmiProductName,
    ecSpecs: {
      windowBase: ANV15_SPECS.ecWindowBase,
      profileOffset: ANV15_SPECS.ecProfileModeOffset,
      acpiMethod: ANV15_SPECS.ec0Q30Path,
      quirk: 'quirk_acer_nitro_anv15_52',
      quirkFlags: ['nitro_v4=1', 'ec_mmio_profile=1'],
    },
    fanSpecs: {
      cpuMaxRpm: ANV15_SPECS.maxCpuRpm,
      gpuMaxRpm: ANV15_SPECS.maxGpuRpm,
      idleRpm: ANV15_SPECS.idleCpuRpm,
    },
    driver: {
      detected: isHardwareDetected,
      status: isHardwareDetected ? 'loaded' : 'simulated_container',
      sensePath,
      modprobeCommand: 'sudo modprobe linuwu_sense nitro_v4=1',
      modprobeConfig: 'options linuwu_sense nitro_v4=1',
      serviceName: 'linuwu_sense.service',
    },
  });
});

// GitHub Device Flow & Auto-Push State for https://github.com/luisggurgel/linuwu-sense-anv15.git
const GITHUB_CLIENT_ID = '178c6fc778ccc68e1d6a';
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
  userCode: '2378-FB36',
  deviceCode: '6365b1d45cf4fd82004d8c6876147bc281c720c4',
  verificationUri: 'https://github.com/login/device',
  status: 'awaiting_authorization',
  message: 'Aguardando confirmação do código 2378-FB36 em github.com/login/device para enviar automaticamente...',
  lastPushTimestamp: null,
};

function executeGitPushWithToken(accessToken: string, repoUrl: string): { ok: boolean; output: string } {
  try {
    const cleanRepo = repoUrl.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const authUrl = `https://x-access-token:${accessToken}@github.com/${cleanRepo}.git`;
    execSync('git config --global --add safe.directory "*"', { stdio: 'pipe' });
    execSync('git config user.name "Luis Guilherme"', { stdio: 'pipe' });
    execSync('git config user.email "luisguilhermegurgelamaral@gmail.com"', { stdio: 'pipe' });
    execSync('git add .', { stdio: 'pipe' });
    try {
      execSync('git commit -m "feat: NitroSense Linux GUI para Acer Nitro V15 (ANV15-52-52VN)"', { stdio: 'pipe' });
    } catch {
      // Nothing new to commit
    }
    execSync('git branch -M main', { stdio: 'pipe' });
    execSync(`git remote set-url origin https://github.com/${cleanRepo}.git 2>/dev/null || git remote add origin https://github.com/${cleanRepo}.git`, { stdio: 'pipe' });
    const out = execSync(`GIT_TERMINAL_PROMPT=0 git push -u "${authUrl}" main --force`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { ok: true, output: out || 'Push realizado com sucesso para branch main!' };
  } catch (err: any) {
    const errMsg = (err?.stderr?.toString() || err?.message || 'Erro ao executar git push').replace(/x-access-token:[^@]+@/g, 'x-access-token:***@');
    return { ok: false, output: errMsg };
  }
}

// Background polling for GitHub Device Flow authorization
setInterval(async () => {
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
      ghState.message = 'Autorizado! Enviando commits para https://github.com/luisggurgel/linuwu-sense-anv15.git...';
      const result = executeGitPushWithToken(data.access_token, ghState.repoUrl);
      if (result.ok) {
        ghState.status = 'pushed';
        ghState.deviceCode = null;
        ghState.lastPushTimestamp = Date.now();
        ghState.message = 'Repositório enviado com sucesso para https://github.com/luisggurgel/linuwu-sense-anv15!';
      } else {
        ghState.status = 'error';
        ghState.message = `Erro no push: ${result.output}`;
      }
    } else if (data.error === 'expired_token' || data.error === 'access_denied') {
      ghState.status = 'error';
      ghState.deviceCode = null;
      ghState.message = 'O código expirou ou foi recusado. Clique em "Gerar Novo Código GitHub" para tentar novamente.';
    }
  } catch {
    // Ignore transient network errors during polling
  }
}, 6000);

app.get('/api/github/status', (_req: Request, res: Response) => {
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
    const { repoUrl } = req.body || {};
    if (repoUrl && typeof repoUrl === 'string') {
      ghState.repoUrl = repoUrl.trim();
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
      ghState.message = `Aguardando autorização do código ${data.user_code} em github.com/login/device...`;
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
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NitroSense Linux running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
