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
          Configurações de Hardware Acer Nitro V15
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Recursos específicos do modelo ANV15-52-52VN integrados via Linuwu-Sense (gerenciamento de saúde da bateria, display 144Hz e periféricos).
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
                        ? 'Limite de carga de 80% ATIVADO (Preserva vida útil da bateria)'
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
              Interrompe a recarga ao atingir 80% da capacidade. Essencial para notebooks gamers conectados à tomada com frequência, evitando estresse químico e inchaço das células de íons de lítio.
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
                        ? 'LCD Overdrive ATIVADO (Menor tempo de resposta para jogos)'
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
              LCD Overdrive (3ms Response)
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Acelera a transição pixel-a-pixel no painel IPS de 144Hz do Nitro V 15, eliminando rastros (ghosting) e melhorando a clareza em jogos de tiro em primeira pessoa.
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
                        : 'Iluminação do teclado SEMPRE LIGADA'
                    );
                  }}
                  aria-label="Alternar desligamento automático da luz do teclado"
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            <h3 className="text-base font-bold text-white">
              Timeout da Iluminação do Teclado
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Desliga a luz de fundo do teclado após 30 segundos de inatividade para economizar energia. Se desativado, o teclado permanece aceso continuamente.
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
              Carregamento USB com Notebook Desligado
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Permite carregar smartphones e acessórios pela porta USB 3.2 mesmo com o Nitro V15 suspenso ou desligado, com corte de proteção de bateria.
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
    </div>
  );
};
