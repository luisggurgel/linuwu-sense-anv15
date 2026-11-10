#!/usr/bin/env bash
# ==============================================================================
# NitroSense Linux - Instalador Automático (Otimizado para Fedora Linux)
# Notebook Alvo: Acer Nitro V 15 (ANV15-52-52VN)
# CPU: Intel Core i5-13420H | GPU: NVIDIA GeForce RTX 4060 (8 GB GDDR6)
# Rotação Máxima Oficial: 8600 RPM (CPU & GPU Fans)
# Baseado no módulo Linuwu-Sense (https://github.com/0x7375646F/Linuwu-Sense)
# ==============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="/opt/nitrosense-linux"

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}   NitroSense Linux - Acer Nitro V 15 (ANV15-52-52VN | RTX 4060)      ${NC}"
echo -e "${CYAN}   Otimizado para Fedora Linux (x86_64) • Suporte até 8600 RPM        ${NC}"
echo -e "${CYAN}======================================================================${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Erro: Execute este script como root: sudo ./install.sh${NC}"
  exit 1
fi

echo -e "\n[1/5] Verificando dependências do sistema (Fedora DNF / Linux)..."
if command -v dnf &>/dev/null; then
    dnf install -y git make gcc dkms kernel-devel nodejs npm
elif command -v pacman &>/dev/null; then
    pacman -S --needed --noconfirm base-devel git dkms linux-headers nodejs npm
elif command -v apt-get &>/dev/null; then
    apt-get update
    apt-get install -y build-essential git dkms "linux-headers-$(uname -r)" nodejs npm
else
    echo -e "${YELLOW}Aviso: Gerenciador não reconhecido automaticamente. Certifique-se de ter git, make, gcc, dkms, kernel-devel e nodejs instalados.${NC}"
fi

echo -e "\n[2/5] Verificando módulo de kernel Linuwu-Sense (DKMS)..."
if dkms status -m linuwu_sense 2>/dev/null | grep -q "$(uname -r).*installed" && [ "$1" != "--rebuild-driver" ]; then
    echo -e "${GREEN}Módulo linuwu_sense já está compilado e instalado no DKMS para o kernel $(uname -r)!${NC}"
elif [ ! -d "/lib/modules/$(uname -r)/build" ]; then
    echo -e "${YELLOW}Aviso: Os headers do kernel em execução ($(uname -r)) não foram encontrados em /lib/modules/$(uname -r)/build.${NC}"
    echo -e "${YELLOW}No Fedora, se o kernel foi atualizado pelo DNF recentemente, reinicie o notebook no kernel novo antes de compilar o módulo.${NC}"
else
    TEMP_DIR=$(mktemp -d)
    git clone --depth 1 https://github.com/0x7375646F/Linuwu-Sense.git "$TEMP_DIR/Linuwu-Sense"
    cd "$TEMP_DIR/Linuwu-Sense"
    make install || make LLVM=1 install || echo -e "${YELLOW}Aviso: Falha ao compilar o módulo linuwu_sense. Verifique os headers do kernel.${NC}"
    cd "$PROJECT_DIR"
    rm -rf "$TEMP_DIR"
fi

echo -e "\n[3/5] Ativando quirk DMI nativo (quirk_acer_nitro_anv15_52) e permissões de escrita sysfs..."
# Importante: Em linuwu_sense.c (find_quirks), passar 'options linuwu_sense nitro_v4=1' via modprobe
# força quirk_acer_nitro_v4 genérico (sem ec_mmio_profile=1) e pula dmi_check_system(acer_quirks).
# Removemos /etc/modprobe.d/linuwu_sense.conf para que o DMI ("Nitro ANV15-52") ative
# automaticamente quirk_acer_nitro_anv15_52 (.nitro_v4 = 1 e .ec_mmio_profile = 1).
rm -f /etc/modprobe.d/linuwu_sense.conf
echo "blacklist acer_wmi" > /etc/modprobe.d/blacklist-acer_wmi.conf
echo "linuwu_sense" > /etc/modules-load.d/linuwu_sense.conf

depmod -a 2>/dev/null || true
modprobe -r acer_wmi 2>/dev/null || true
modprobe -r linuwu_sense 2>/dev/null || true

if ! modprobe linuwu_sense 2>/dev/null; then
    echo -e "${YELLOW}Nota: Não foi possível carregar 'linuwu_sense' agora (verifique se o Secure Boot está ativo no BIOS/Fedora ou se é necessário importar a chave MOK/reiniciar).${NC}"
else
    echo -e "${GREEN}Módulo linuwu_sense carregado com sucesso via DMI (quirk_acer_nitro_anv15_52)!${NC}"
fi

# Garantir permissões 0666 permanentes via tmpfiles.d e sudoers para que tanto o systemd (root)
# quanto execuções locais (npm run dev) possam gravar diretamente em fan_speed e platform_profile
cat << 'EOF' > /etc/tmpfiles.d/linuwu_sense.conf
f /sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/nitro_sense/fan_speed 0666 root root
f /sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/nitro_sense/battery_limiter 0666 root root
f /sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/nitro_sense/battery_calibration 0666 root root
f /sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/nitro_sense/usb_charging 0666 root root
f /sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/nitro_sense/backlight_timeout 0666 root root
f /sys/firmware/acpi/platform_profile 0666 root root
EOF

systemd-tmpfiles --create /etc/tmpfiles.d/linuwu_sense.conf 2>/dev/null || true
chmod 0666 /sys/firmware/acpi/platform_profile 2>/dev/null || true
chmod 0666 /sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/nitro_sense/* 2>/dev/null || true
chmod 0666 /sys/devices/platform/acer-wmi/nitro_sense/* 2>/dev/null || true

cat << 'EOF' > /etc/sudoers.d/nitrosense-linux
ALL ALL=(root) NOPASSWD: /usr/bin/tee /sys/module/linuwu_sense/drivers/platform\:acer-wmi/acer-wmi/nitro_sense/*
ALL ALL=(root) NOPASSWD: /usr/bin/tee /sys/devices/platform/acer-wmi/nitro_sense/*
ALL ALL=(root) NOPASSWD: /usr/bin/tee /sys/firmware/acpi/platform_profile
ALL ALL=(root) NOPASSWD: /usr/bin/chmod 0666 /sys/firmware/acpi/platform_profile
ALL ALL=(root) NOPASSWD: /usr/local/bin/linuwu-sense *
EOF
chmod 0440 /etc/sudoers.d/nitrosense-linux

echo -e "\n[4/5] Instalando dependências NPM e compilando o NitroSense Linux GUI..."
cd "$PROJECT_DIR"
npm install --legacy-peer-deps || npm install --force
npm run build

if [ -n "$SUDO_USER" ]; then
    chown -R "$SUDO_USER:$SUDO_USER" "$PROJECT_DIR"
fi

echo -e "\n[5/5] Instalando serviço em ${INSTALL_DIR} (compatível com SELinux no Fedora)..."
systemctl stop nitrosense-linux.service 2>/dev/null || true
# Libera porta 3000 caso haja um 'npm run dev' rodando sem privilégio root
fuser -k 3000/tcp 2>/dev/null || true

mkdir -p "$INSTALL_DIR"
rm -rf "$INSTALL_DIR/dist" "$INSTALL_DIR/node_modules"
cp -r "$PROJECT_DIR/dist" "$INSTALL_DIR/"
cp "$PROJECT_DIR/server.js" "$INSTALL_DIR/"
cp "$PROJECT_DIR/package.json" "$INSTALL_DIR/"
cp "$PROJECT_DIR/.npmrc" "$INSTALL_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/node_modules" "$INSTALL_DIR/"

# Ajustar contexto SELinux no Fedora para permitir execução pelo systemd
if command -v restorecon &>/dev/null; then
    restorecon -Rv "$INSTALL_DIR" >/dev/null 2>&1 || true
fi

NODE_BIN="$(command -v node)"

cat << EOF > /etc/systemd/system/nitrosense-linux.service
[Unit]
Description=NitroSense Linux GUI Daemon para Acer Nitro V 15 (ANV15-52-52VN)
After=network.target multi-user.target linuwu_sense.service

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
ExecStartPre=-/usr/bin/chmod 0666 /sys/firmware/acpi/platform_profile
ExecStart=${NODE_BIN} ${INSTALL_DIR}/server.js
Restart=always
RestartSec=3
User=root
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now nitrosense-linux.service

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}   Instalação concluída com sucesso no Fedora Linux!                  ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Acesse a interface gráfica no navegador em: ${CYAN}http://localhost:3000${NC}"
echo -e "Para verificar o serviço: ${CYAN}sudo systemctl status nitrosense-linux.service${NC}"
