import React, { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { DriverAndGitView } from './components/DriverAndGitView';
import { FanControlView } from './components/FanControlView';
import { HardwareSettingsView } from './components/HardwareSettingsView';
import { Header } from './components/Header';
import { ProfilesView } from './components/ProfilesView';
import { HistoryDataPoint } from './components/TempHistoryChart';
import { FAN_CURVE_PRESETS } from './utils/fanMath';
import {
  AdvancedSettings,
  FanConfig,
  TelemetryData,
  ThermalProfileId,
} from './utils/nitroTypes';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fans' | 'profiles' | 'hardware' | 'driver'>('dashboard');
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<HistoryDataPoint[]>([]);
  const [currentWorkload, setCurrentWorkload] = useState<'idle' | 'balanced' | 'gaming' | 'stress'>('idle');

  const [fanConfig, setFanConfig] = useState<FanConfig>({
    mode: 'auto',
    cpuSpeedPercent: 50,
    gpuSpeedPercent: 50,
    linkedFans: true,
    activeCurvePreset: 'balanced',
    customCurve: FAN_CURVE_PRESETS.balanced,
  });

  const [settings, setSettings] = useState<AdvancedSettings>({
    batteryLimiter: true,
    lcdOverdrive: true,
    keyboardBacklightTimeout: false,
    usbPowerOffCharging: 0,
    autoProfileOnBattery: true,
    batteryProfile: 'eco',
    acProfile: 'balanced',
  });

  // Fetch telemetry from server
  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/telemetry');
      if (res.ok) {
        const data: TelemetryData = await res.json();
        setTelemetry(data);

        // Update history
        const now = new Date();
        const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        setHistory((prev) => {
          const next = [...prev, { time: timeStr, cpu: data.cpuTemp, gpu: data.gpuTemp }];
          return next.slice(-40); // Keep last 40 data points
        });
      }
    } catch (err) {
      // In early boot or network glitch, fail silently
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 1000);
    return () => clearInterval(interval);
  }, []);

  // Quick Turbo toggle
  const handleTurboToggle = async () => {
    const isCurrentlyTurbo = telemetry?.activeProfile === 'turbo';
    const newProfile: ThermalProfileId = isCurrentlyTurbo ? 'balanced' : 'turbo';
    await handleSelectProfile(newProfile);
  };

  // Select profile
  const handleSelectProfile = async (profile: ThermalProfileId) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      if (res.ok) {
        setTelemetry((prev) =>
          prev
            ? {
                ...prev,
                activeProfile: profile,
                fanMode: profile === 'turbo' ? 'max' : profile === 'performance' ? 'custom' : 'auto',
                cpuFanPercent: profile === 'turbo' ? 100 : profile === 'performance' ? 75 : 0,
                gpuFanPercent: profile === 'turbo' ? 100 : profile === 'performance' ? 75 : 0,
              }
            : null
        );
      }
    } catch (err) {
      console.error('Failed to set profile:', err);
    }
  };

  // Apply fan speed
  const handleApplyFanSpeed = async (cpu: number, gpu: number, mode: 'auto' | 'custom' | 'max') => {
    try {
      await fetch('/api/fan-speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpu, gpu, mode }),
      });
      setTelemetry((prev) =>
        prev
          ? {
              ...prev,
              fanMode: mode,
              cpuFanPercent: cpu,
              gpuFanPercent: gpu,
            }
          : null
      );
    } catch (err) {
      console.error('Failed to set fan speed:', err);
    }
  };

  // Update Settings
  const handleUpdateSettings = async (newSettings: Partial<AdvancedSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (typeof newSettings.batteryLimiter === 'boolean') {
        setTelemetry((prev) =>
          prev ? { ...prev, batteryLimiterActive: newSettings.batteryLimiter! } : null
        );
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  // Simulate workload
  const handleSimulateWorkload = async (workload: 'idle' | 'balanced' | 'gaming' | 'stress') => {
    setCurrentWorkload(workload);
    try {
      await fetch('/api/simulate-workload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workload }),
      });
    } catch (err) {
      console.error('Failed to simulate workload:', err);
    }
  };

  const isTurboActive = telemetry?.activeProfile === 'turbo';

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-red-500/30 selection:text-red-200">
      {/* Top Navigation & Status Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        telemetry={telemetry}
        onTurboToggle={handleTurboToggle}
        isTurboActive={isTurboActive}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            telemetry={telemetry}
            history={history}
            onSelectProfile={handleSelectProfile}
            onSimulateWorkload={handleSimulateWorkload}
            currentWorkload={currentWorkload}
          />
        )}

        {activeTab === 'fans' && (
          <FanControlView
            telemetry={telemetry}
            fanConfig={fanConfig}
            onUpdateFanConfig={(cfg) => setFanConfig((prev) => ({ ...prev, ...cfg }))}
            onApplyFanSpeed={handleApplyFanSpeed}
          />
        )}

        {activeTab === 'profiles' && (
          <ProfilesView
            telemetry={telemetry}
            settings={settings}
            onSelectProfile={handleSelectProfile}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'hardware' && (
          <HardwareSettingsView
            settings={settings}
            telemetry={telemetry}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {activeTab === 'driver' && (
          <DriverAndGitView telemetry={telemetry} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            NitroSense Linux • Otimizado para Acer Nitro V 15 (ANV15-52-52VN)
          </span>
          <span className="flex items-center gap-2">
            <span>Kernel Module: Linuwu-Sense (0x7375646F)</span>
            <span className="text-slate-700">•</span>
            <span className="text-red-400/80 font-bold">nitro_v4=1</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
