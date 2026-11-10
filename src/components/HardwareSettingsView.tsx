import React, { useState } from 'react';
import {
  Battery,
  Check,
  Cpu,
  Monitor,
  Power,
  Sliders,
  Sparkles,
  Usb,
  Zap,
} from 'lucide-react';
import { AdvancedSettings, TelemetryData } from '../utils/nitroTypes';

interface HardwareSettingsViewProps {
  settings: AdvancedSettings;
  telemetry: TelemetryData | null;
  onUpdateSettings: (newSettings: Partial<AdvancedSettings>) => void;
}

export const HardwareSettingsView: React.FC<HardwareSettingsViewProps> = ({
  settings,
  telemetry,
  onUpdateSettings,
}) => {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-red-500" />
          Configurações de Hardware Acer Nitro V 15 (ANV15-52-52VN)
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Recursos oficiais do modelo ANV15-52-52VN integrados via Linuwu-Sense no Fedora Linux (bateria de 57 Wh, painel IPS Full HD de 165 Hz, teclado ABNT2 retroiluminado branco e portas USB 3.2 / Thunderbolt 4).
        </p>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Battery Care Limiter (80%) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                <Battery className="w-5 h-5" />
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.batteryLimiter}
                  onChange={(e) => {
                    onUpdateSettings({ batteryLimiter: e.target.checked });
                    showToast(
                      e.target.checked
                        ? 'Limite de carga de 80% ATIVADO (Preserva vida útil da bateria de 57 Wh)'
                        : 'Limite de carga DESATIVADO (Carga total até 100%)'
                    );
                  }}
                  aria-label="Alternar limite de carga da bateria em 80%"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Limite de Carga da Bateria (80%)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Recomendado
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Interrompe a recarga ao atingir 80% da capacidade da bateria de 57 Wh (4 células). Essencial ao usar a RTX 4060 conectada à fonte de 135W na tomada, evitando degradação química das células de íons de lítio.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Sysfs node:</span>
            <code className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              battery_limiter
            </code>
          </div>
        </div>

        {/* LCD Overdrive */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-800/40 text-purple-400">
                <Monitor className="w-5 h-5" />
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.lcdOverdrive}
                  onChange={(e) => {
                    onUpdateSettings({ lcdOverdrive: e.target.checked });
                    showToast(
                      e.target.checked
                        ? 'LCD Overdrive ATIVADO no painel IPS de 165 Hz'
                        : 'LCD Overdrive DESATIVADO'
                    );
                  }}
                  aria-label="Alternar LCD Overdrive"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <h3 className="text-base font-bold text-white">
              LCD Overdrive (Painel 15,6" IPS 165 Hz)
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Acelera a transição pixel-a-pixel no painel IPS Full HD (1920x1080) de 165 Hz do ANV15-52-52VN, reduzindo rastros (ghosting) em jogos competitivos.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Sysfs node:</span>
            <code className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              lcd_override
            </code>
          </div>
        </div>

        {/* Keyboard Backlight Timeout */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/40 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.keyboardBacklightTimeout}
                  onChange={(e) => {
                    onUpdateSettings({ keyboardBacklightTimeout: e.target.checked });
                    showToast(
                      e.target.checked
                        ? 'Desligamento automático do teclado (30s) ATIVADO'
                        : 'Retroiluminação branca do teclado ABNT2 SEMPRE LIGADA'
                    );
                  }}
                  aria-label="Alternar desligamento automático da luz do teclado"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            <h3 className="text-base font-bold text-white">
              Timeout do Teclado ABNT2 (Retroiluminado Branco)
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Desliga a retroiluminação branca do teclado ABNT2 após 30 segundos de inatividade para economizar bateria. Se desativado, permanece aceso continuamente.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Sysfs node:</span>
            <code className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              backlight_timeout
            </code>
          </div>
        </div>

        {/* USB Power-Off Charging */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400">
                <Usb className="w-5 h-5" />
              </div>

              <select
                value={settings.usbPowerOffCharging}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onUpdateSettings({ usbPowerOffCharging: val });
                  showToast(
                    val === 0
                      ? 'Carregamento USB desligado DESATIVADO'
                      : `Carregamento USB ativo até ${val}% da bateria restante`
                  );
                }}
                aria-label="Nível de corte de carga USB desligado"
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-red-500"
              >
                <option value={0}>Desativado (0%)</option>
                <option value={10}>Até 10% bateria</option>
                <option value={20}>Até 20% bateria</option>
                <option value={30}>Até 30% bateria</option>
              </select>
            </div>

            <h3 className="text-base font-bold text-white">
              Carregamento USB 3.2 com Notebook Desligado
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Permite carregar periféricos pela porta USB 3.2 Gen 1 energizada mesmo com o ANV15-52-52VN desligado, respeitando o corte de segurança da bateria.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Sysfs node:</span>
            <code className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              usb_charging
            </code>
          </div>
        </div>
      </div>

      {/* Official Technical Sheet Card for ANV15-52-52VN */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-3">
          Especificações Oficiais de Fábrica — Acer Nitro V 15 (ANV15-52-52VN)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">PROCESSADOR (CPU)</span>
            <span className="text-white font-bold">Intel Core i5-13420H (13ª Ger)</span>
            <span className="text-slate-400 block text-[11px]">8 Núcleos (4P + 4E) / 12 Threads • 12MB Cache • Até 4.60 GHz</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">PLACA DE VÍDEO (GPU)</span>
            <span className="text-emerald-400 font-bold">NVIDIA GeForce RTX 4060 (8 GB)</span>
            <span className="text-slate-400 block text-[11px]">8 GB GDDR6 dedicada + Intel UHD Graphics integrada</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">MEMÓRIA E ARMAZENAMENTO</span>
            <span className="text-white font-bold">16 GB DDR5 5200 MHz</span>
            <span className="text-slate-400 block text-[11px]">Expansível até 32 GB • SSD 512 GB NVMe PCIe 4.0 x4</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">TELA (DISPLAY)</span>
            <span className="text-white font-bold">15,6" IPS Full HD 165 Hz</span>
            <span className="text-slate-400 block text-[11px]">1920x1080 • 300 nits • Acer ComfyView antirreflexo</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">CONECTIVIDADE E PORTAS</span>
            <span className="text-white font-bold">Thunderbolt 4 / USB-C + HDMI 2.1</span>
            <span className="text-slate-400 block text-[11px]">3x USB 3.2 Gen 1 • RJ-45 Gigabit • Wi-Fi 6</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">SISTEMA E KERNEL MODULE</span>
            <span className="text-sky-400 font-bold">Fedora Linux (x86_64)</span>
            <span className="text-slate-400 block text-[11px]">quirk_acer_nitro_anv15_52 (nitro_v4=1 / ec_mmio_profile=1)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
