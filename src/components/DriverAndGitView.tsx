import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clipboard,
  Download,
  FolderGit2,
  Github,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { ANV15_SPECS } from '../utils/fanMath';
import { TelemetryData } from '../utils/nitroTypes';

interface DriverAndGitViewProps {
  telemetry: TelemetryData | null;
}

export const DriverAndGitView: React.FC<DriverAndGitViewProps> = ({ telemetry }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<string>('luisguilhermegurgelamaral');
  const [repoName, setRepoName] = useState<string>('linuwu-sense-anv15-gui');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const installScriptContent = `#!/usr/bin/env bash
# Script de Instalação do NitroSense Linux para Acer Nitro V15 (ANV15-52-52VN)
# Baseado no módulo de kernel Linuwu-Sense (0x7375646F)

set -e

echo "=== Instalando dependências e módulo Linuwu-Sense para ANV15-52 ==="

# 1. Instalar headers do kernel e ferramentas
if command -v apt-get &>/dev/null; then
    sudo apt-get update
    sudo apt-get install -y git build-essential dkms "linux-headers-$(uname -r)"
elif command -v pacman &>/dev/null; then
    sudo pacman -S --needed --noconfirm git base-devel linux-headers dkms
elif command -v dnf &>/dev/null; then
    sudo dnf install -y git make gcc kernel-devel-$(uname -r) dkms
fi

# 2. Clonar e compilar Linuwu-Sense
TEMP_DIR=$(mktemp -d)
git clone --depth 1 https://github.com/0x7375646F/Linuwu-Sense.git "$TEMP_DIR/Linuwu-Sense"
cd "$TEMP_DIR/Linuwu-Sense"

echo "Compilando e instalando o módulo linuwu_sense..."
sudo make install

# 3. Configurar parâmetro nitro_v4=1 para o modelo ANV15-52
echo "Configurando /etc/modprobe.d/linuwu_sense.conf..."
echo "options linuwu_sense nitro_v4=1" | sudo tee /etc/modprobe.d/linuwu_sense.conf

# 4. Carregar módulo
sudo modprobe -r acer-wmi 2>/dev/null || true
sudo modprobe linuwu_sense nitro_v4=1

echo "=== Módulo Linuwu-Sense carregado com sucesso para o Nitro ANV15-52! ==="
`;

  const systemdServiceContent = `[Unit]
Description=NitroSense Linux Daemon para Acer Nitro V15
After=multi-user.target

[Service]
Type=simple
WorkingDirectory=/opt/nitrosense-linux
ExecStart=/usr/bin/node /opt/nitrosense-linux/server.js
Restart=always
RestartSec=5
User=root
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
`;

  const gitPushScript = `# 1. Inicializar e comitar o repositório completo
git init
git add .
git commit -m "feat: NitroSense Linux GUI para Acer Nitro V15 (ANV15-52-52VN)"
git branch -M main

# 2. Conectar ao seu repositório no GitHub
git remote add origin https://github.com/${githubUser}/${repoName}.git

# 3. Fazer o push para seu GitHub
git push -u origin main
`;

  const handleDownloadInstallScript = () => {
    const blob = new Blob([installScriptContent], { type: 'text/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'install-anv15.sh';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Driver Diagnostics Status Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                Diagnóstico de Hardware
              </span>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  telemetry?.isHardwareDetected
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}
              >
                {telemetry?.isHardwareDetected ? 'KERNEL MODULE DETECTADO' : 'MODO DE SIMULAÇÃO ATIVO'}
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Driver Linuwu-Sense (0x7375646F)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compatibilidade específica para Acer Nitro V15 (ANV15-52-52VN) com suporte a WMI v4 e EC MMIO.
            </p>
          </div>

          <div className="text-right font-mono text-xs text-slate-400">
            <div>Quirk: <span className="text-slate-200 font-bold">quirk_acer_nitro_anv15_52</span></div>
            <div className="mt-0.5">Parâmetro: <code className="text-red-400">nitro_v4=1</code></div>
          </div>
        </div>
      </div>

      {/* GitHub Repository Ready & Push Helper */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/20 border border-red-500/30 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white shadow-inner">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Repositório GitHub Pronto para Publicação
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Código 100% Pronto
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Envie o aplicativo testado para a sua conta do GitHub com apenas 3 comandos.
              </p>
            </div>
          </div>

          <a
            href={`https://github.com/${githubUser}/${repoName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white hover:border-slate-700 transition-all"
          >
            <FolderGit2 className="w-4 h-4 text-red-400" />
            <span>Abrir no GitHub</span>
          </a>
        </div>

        {/* Inputs to customize username and repo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">
              Usuário GitHub (Username):
            </label>
            <input
              type="text"
              value={githubUser}
              onChange={(e) => setGithubUser(e.target.value)}
              aria-label="Usuário GitHub"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">
              Nome do Repositório:
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              aria-label="Nome do Repositório"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Terminal Code Snippet for Git Push */}
        <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-slate-300">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-slate-500 text-[11px]">
            <span>bash — terminal</span>
            <button
              onClick={() => copyToClipboard(gitPushScript, 'git')}
              aria-label="Copiar comandos git"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
            >
              {copiedKey === 'git' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Copiar Comandos</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-red-400/90 whitespace-pre leading-relaxed">{gitPushScript}</pre>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Link de destino do seu repositório:</span>
            <code className="text-slate-200 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              https://github.com/{githubUser}/{repoName}
            </code>
          </div>

          <button
            onClick={handleDownloadInstallScript}
            aria-label="Baixar script de instalação install.sh"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar install.sh
          </button>
        </div>
      </div>

      {/* Linux Kernel Setup for ANV15-52-52VN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Step 1: Kernel Modprobe Configuration */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              1. Carregamento do Módulo no Linux
            </h3>
            <button
              onClick={() =>
                copyToClipboard(
                  'echo "options linuwu_sense nitro_v4=1" | sudo tee /etc/modprobe.d/linuwu_sense.conf\nsudo modprobe linuwu_sense nitro_v4=1',
                  'modprobe'
                )
              }
              aria-label="Copiar comando modprobe"
              className="text-xs font-mono text-slate-400 hover:text-white"
            >
              {copiedKey === 'modprobe' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Para o Nitro V15 (ANV15-52), é obrigatório utilizar o parâmetro <code className="text-red-400">nitro_v4=1</code> para mapear a janela de memória do controlador EC:
          </p>

          <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
{`# Criar configuração permanente
echo "options linuwu_sense nitro_v4=1" | sudo tee /etc/modprobe.d/linuwu_sense.conf

# Recarregar módulo no kernel
sudo modprobe -r acer-wmi 2>/dev/null || true
sudo modprobe linuwu_sense nitro_v4=1`}
          </pre>
        </div>

        {/* Step 2: Systemd Daemon Service */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-sky-400" />
              2. Inicialização Automática (systemd)
            </h3>
            <button
              onClick={() => copyToClipboard(systemdServiceContent, 'systemd')}
              aria-label="Copiar serviço systemd"
              className="text-xs font-mono text-slate-400 hover:text-white"
            >
              {copiedKey === 'systemd' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Inicie a interface do NitroSense junto com o sistema operacional:
          </p>

          <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
{`# Salvar serviço em /etc/systemd/system/nitro-sense.service
sudo systemctl daemon-reload
sudo systemctl enable --now nitro-sense.service`}
          </pre>
        </div>
      </div>
    </div>
  );
};
