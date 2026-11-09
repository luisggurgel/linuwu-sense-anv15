#!/usr/bin/env bash
# ==============================================================================
# NitroSense Linux - Instalador Automático
# Notebook Alvo: Acer Nitro V 15 (ANV15-52-52VN)
# Baseado no módulo Linuwu-Sense (https://github.com/0x7375646F/Linuwu-Sense)
# ==============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}   NitroSense Linux - Acer Nitro V15 (ANV15-52-52VN)   ${NC}"
echo -e "${CYAN}======================================================${NC}"

# Verificar permissões root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Erro: Por favor, execute este script como root (sudo ./install.sh)${NC}"
  exit 1
fi

echo -e "\n[1/5] Detectando gerenciador de pacotes e instalando dependências..."
if command -v pacman &>/dev/null; then
    pacman -S --needed --noconfirm base-devel git dkms linux-headers nodejs npm
elif command -v apt-get &>/dev/null; then
    apt-get update
    apt-get install -y build-essential git dkms "linux-headers-$(uname -r)" nodejs npm
elif command -v dnf &>/dev/null; then
    dnf install -y make gcc git dkms kernel-devel-$(uname -r) nodejs npm
else
    echo -e "${RED}Gerenciador de pacotes não suportado automaticamente. Instale git, dkms, headers e nodejs manualmente.${NC}"
fi

echo -e "\n[2/5] Compilando e instalando o módulo Linuwu-Sense..."
TEMP_DIR=$(mktemp -d)
git clone --depth 1 https://github.com/0x7375646F/Linuwu-Sense.git "$TEMP_DIR/Linuwu-Sense"
cd "$TEMP_DIR/Linuwu-Sense"

make install
cd - >/dev/null
rm -rf "$TEMP_DIR"

echo -e "\n[3/5] Configurando modprobe para ANV15-52 (nitro_v4=1)..."
cat << 'EOF' > /etc/modprobe.d/linuwu_sense.conf
# Configuração obrigatória para Acer Nitro V15 ANV15-52 / ANV15-51
# Ativa a interface EC MMIO no endereço 0xFE708000 para perfis e controle de fans
options linuwu_sense nitro_v4=1
EOF

# Descarregar acer-wmi conflitante se existir
modprobe -r acer-wmi 2>/dev/null || true
# Carregar linuwu_sense com nitro_v4=1
modprobe linuwu_sense nitro_v4=1

echo -e "\n[4/5] Instalando dependências e compilando o NitroSense Linux GUI..."
npm install
npm run build

echo -e "\n[5/5] Configurando serviço do systemd..."
cat << EOF > /etc/systemd/system/nitrosense-linux.service
[Unit]
Description=NitroSense Linux GUI Daemon para Acer Nitro V15
After=network.target

[Service]
Type=simple
WorkingDirectory=$(pwd)
ExecStart=$(which node) $(pwd)/server.js
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

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}   Instalação concluída com sucesso!                  ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "Acesse a interface gráfica no navegador em: ${CYAN}http://localhost:3000${NC}"
echo -e "Status do serviço: ${CYAN}systemctl status nitrosense-linux.service${NC}"
