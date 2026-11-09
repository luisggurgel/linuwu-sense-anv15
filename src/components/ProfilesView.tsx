import React, { useState } from 'react';
import {
  Battery,
  Check,
  ChevronRight,
  Cpu,
  Flame,
  Info,
  Layers,
  Power,
  RotateCcw,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { THERMAL_PROFILES } from '../utils/fanMath';
import { AdvancedSettings, TelemetryData, ThermalProfileId } from '../utils/nitroTypes';

interface ProfilesViewProps {
  telemetry: TelemetryData | null;
  settings: AdvancedSettings;
  onSelectProfile: (profile: ThermalProfileId) => void;
  onUpdateSettings: (newSettings: Partial<AdvancedSettings>) => void;
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({
  telemetry,
  settings,
  onSelectProfile,
  onUpdateSettings,
}) => {
  const activeProfile = telemetry?.activeProfile ?? 'balanced';
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleProfileClick = (id: ThermalProfileId) => {
    onSelectProfile(id);
    setSuccessToast(`Perfil alterado para ${THERMAL_PROFILES[id].namePt}`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-500" />
              Perfis Térmicos e de Desempenho
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Cada perfil ajusta os limites de energia PL1/PL2 da CPU Intel Core, o TGP da placa de vídeo RTX, a agressividade das ventoinhas e o registro EC do Acer Nitro V15.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Ativo agora:</span>
            <span
              className="font-bold px-2 py-0.5 rounded"
              style={{
                backgroundColor: THERMAL_PROFILES[activeProfile].accentBg,
                color: THERMAL_PROFILES[activeProfile].color,
              }}
            >
              {THERMAL_PROFILES[activeProfile].namePt}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Cards Grid (5 Profiles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.keys(THERMAL_PROFILES) as ThermalProfileId[]).map((profId) => {
          const profile = THERMAL_PROFILES[profId];
          const isSelected = activeProfile === profId;

          return (
            <div
              key={profId}
              onClick={() => handleProfileClick(profId)}
              className={`relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? 'bg-slate-900/90 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
              style={{
                borderColor: isSelected ? `${profile.color}90` : undefined,
              }}
            >
              {/* Top Row: Badge & Radio indicator */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                    style={{
                      backgroundColor: profile.accentBg,
                      color: profile.color,
                      border: `1px solid ${profile.color}40`,
                    }}
                  >
                    {profile.badge}
                  </span>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-transparent shadow-sm'
                        : 'border-slate-700 bg-slate-900 group-hover:border-slate-500'
                    }`}
                    style={{
                      backgroundColor: isSelected ? profile.color : undefined,
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                </div>

                <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">
                  {profile.namePt}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {profile.description}
                </p>
              </div>

              {/* Bottom Specs */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Alvo: ~{profile.powerLimitWatts}W</span>
                </div>
                <div>
                  <span className="text-slate-500">EC Mode:</span>{' '}
                  <span className="text-slate-300 font-bold">{profile.ecMode}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Automatic Profile Switching Configuration (AC vs Battery) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Power className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Troca Automática por Fonte de Energia
            </h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoProfileOnBattery}
              onChange={(e) => onUpdateSettings({ autoProfileOnBattery: e.target.checked })}
              className="sr-only peer"
              aria-label="Ativar troca automática por fonte de energia"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Alterne os perfis instantaneamente quando o carregador for plugado ou desconectado para garantir autonomia na bateria e potência total na tomada.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-400">
                <Power className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono text-slate-400">Quando na Tomada (AC)</span>
                <div className="text-sm font-bold text-white">Potência Máxima</div>
              </div>
            </div>

            <select
              value={settings.acProfile}
              onChange={(e) => onUpdateSettings({ acProfile: e.target.value as ThermalProfileId })}
              aria-label="Perfil para alimentação na tomada"
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-red-500"
            >
              <option value="balanced">Equilibrado</option>
              <option value="performance">Desempenho</option>
              <option value="turbo">Turbo (100%)</option>
            </select>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-800/40 text-amber-400">
                <Battery className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono text-slate-400">Quando na Bateria (DC)</span>
                <div className="text-sm font-bold text-white">Preservação de Carga</div>
              </div>
            </div>

            <select
              value={settings.batteryProfile}
              onChange={(e) => onUpdateSettings({ batteryProfile: e.target.value as ThermalProfileId })}
              aria-label="Perfil para uso na bateria"
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-red-500"
            >
              <option value="eco">Economia (Eco)</option>
              <option value="quiet">Silencioso</option>
              <option value="balanced">Equilibrado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Linux Kernel & Hardware Mapping Table (ANV15-52 Architecture) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-sky-400" />
          Mapeamento Técnico Linuwu-Sense & ACPI / EC (ANV15-52-52VN)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2">Perfil</th>
                <th className="pb-2">Modo EC (0x607)</th>
                <th className="pb-2">Linux platform_profile</th>
                <th className="pb-2">Chamada ACPI</th>
                <th className="pb-2">Comportamento Ventoinhas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 font-bold text-red-400">Turbo</td>
                <td className="py-2.5">0 (Performance)</td>
                <td className="py-2.5"><code>performance</code></td>
                <td className="py-2.5">\_SB.PC00.LPCB.EC0._Q30</td>
                <td className="py-2.5 text-red-300">100% Máximo Fixo</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-orange-400">Desempenho</td>
                <td className="py-2.5">1 (Bal-Perf)</td>
                <td className="py-2.5"><code>balanced-performance</code></td>
                <td className="py-2.5">\_SB.PC00.LPCB.EC0._Q30</td>
                <td className="py-2.5">Agressiva (~75%)</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-blue-400">Equilibrado</td>
                <td className="py-2.5">2 (Balanced)</td>
                <td className="py-2.5"><code>balanced</code></td>
                <td className="py-2.5">\_SB.PC00.LPCB.EC0._Q30</td>
                <td className="py-2.5">Auto adaptativo EC</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-cyan-400">Silencioso</td>
                <td className="py-2.5">3 (Quiet)</td>
                <td className="py-2.5"><code>quiet</code></td>
                <td className="py-2.5">\_SB.PC00.LPCB.EC0._Q30</td>
                <td className="py-2.5">Suave / 0dB baixo aquecimento</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-emerald-400">Eco</td>
                <td className="py-2.5">4 (Low Power)</td>
                <td className="py-2.5"><code>low-power</code></td>
                <td className="py-2.5">\_SB.PC00.LPCB.EC0._Q30</td>
                <td className="py-2.5">Mínimo ruído acústico</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
