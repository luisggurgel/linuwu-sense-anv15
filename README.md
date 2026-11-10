# 🔥 NitroSense Linux — Acer Nitro V 15 (ANV15-52-52VN)

> Interface gráfica e daemon para controle de ventoinhas, curvas térmicas personalizadas, perfis de energia e monitoramento em tempo real do **Acer Nitro V 15 (ANV15-52-52VN)** no **Fedora Linux**. Baseado no módulo de kernel [Linuwu-Sense](https://github.com/0x7375646F/Linuwu-Sense).

---

## 💻 Ficha Técnica Oficial Suportada (ANV15-52-52VN)

| Componente | Especificação Oficial (Acer Nitro V 15 ANV15-52-52VN) |
| :--- | :--- |
| **Modelo / DMI** | `Acer Nitro V 15 (ANV15-52-52VN)` • DMI: `Nitro ANV15-52` |
| **Processador (CPU)** | **Intel Core i5-13420H** (13ª Geração • 8 núcleos: 4P + 4E • 12 threads • 12 MB Cache • até 4.60 GHz) |
| **Placa de Vídeo (dGPU)** | **NVIDIA GeForce RTX 4060 Laptop GPU** com **8 GB GDDR6** dedicada |
| **Gráficos Integrados (iGPU)** | Intel UHD Graphics |
| **Memória RAM** | **16 GB DDR5 5200 MHz** (Expansível até 32 GB) |
| **Armazenamento** | **512 GB SSD NVMe M.2** (PCIe 4.0 x4) |
| **Tela (Display)** | **15,6" IPS Full HD (1920x1080) 165 Hz** • 300 nits • Acer ComfyView™ |
| **Teclado** | Padrão ABNT2 com numérico dedicado, **retroiluminado na cor branca** + Tecla NitroSense |
| **Bateria e Fonte** | **57 Wh** (Íon de lítio, 4 células) • Fonte AC de 135W |
| **Portas** | 1x Thunderbolt 4 / USB-C, 3x USB 3.2 Gen 1 (1x energizada), HDMI 2.1, RJ-45 Gigabit |
| **Sistema Operacional Alvo** | **Fedora Linux (x86_64)** |
| **Quirk / EC MMIO** | `quirk_acer_nitro_anv15_52` (`nitro_v4=1`, `ec_mmio_profile=1`, base `0xFE708000` offset `0x607`, ACPI `\_SB.PC00.LPCB.EC0._Q30`) |

---

## 🚀 Principais Recursos

1. **Monitoramento Físico Real no Fedora Linux (`hwmon`, `nvidia-smi`, `RAPL`, `sysfs`):**
   * Leitura direta dos sensores do módulo `acer` (`hwmon`), `coretemp` (Intel i5-13420H) e `nvidia-smi` (GeForce RTX 4060 8GB).
   * Gauges radiais para temperatura da CPU e da RTX 4060, consumo em Watts (RAPL + TGP) e rotação real das ventoinhas em RPM (`fan1_input` até 5.400 RPM e `fan2_input` até 5.600 RPM).
   * Gráfico contínuo dos últimos 60 segundos com métricas de máxima e média.

2. **Perfis Térmicos e de Energia (Mapeamento EC 0x607 + `platform_profile`):**
   * **Eco (Modo EC 4 / `low-power`):** Máxima autonomia para a bateria de 57 Wh e ruído mínimo.
   * **Silencioso (Modo EC 3 / `quiet`):** Acústica ultrabaixa para estudos e navegação.
   * **Equilibrado (Modo EC 2 / `balanced`):** Padrão de fábrica do ANV15-52-52VN.
   * **Desempenho (Modo EC 1 / `balanced-performance`):** Libera maior PL1/PL2 no Core i5-13420H e TGP na RTX 4060 com curvas aceleradas.
   * **Turbo Máximo (Modo EC 0 / `performance`):** Ventoinhas em 100% (5400/5600 RPM) para máxima dissipação térmica.

3. **Controle de Ventoinhas e Daemon de Curva Térmica:**
   * Modos: **Automático (EC)**, **Personalizado** e **Turbo Máximo (100%)**.
   * Sliders manuais de 0% a 100% com opção de ventoinhas vinculadas ou independentes.
   * Editor interativo de **Curva Térmica** (temperatura vs velocidade) que atua em background ajustando o `fan_speed` via `sysfs` conforme a temperatura da CPU/RTX 4060 varia.

4. **Gerenciamento de Bateria e Hardware (Sysfs `nitro_sense` / `predator_sense`):**
   * **Battery Care Limiter (80%):** Limita a carga em 80% via `battery_limiter` para preservar a bateria de 57 Wh.
   * **LCD Overdrive (165 Hz):** Reduz o tempo de resposta no painel IPS Full HD de 165 Hz (`lcd_override`).
   * **Timeout do Teclado ABNT2:** Controle do desligamento automático da retroiluminação branca em 30s (`backlight_timeout`).
   * **Carregamento USB 3.2 Desligado:** Ajuste do corte de segurança em 10%, 20% ou 30% (`usb_charging`).

---

## 📦 Instalação no Fedora Linux

### 1. Clonar ou atualizar o repositório
```bash
git clone https://github.com/luisggurgel/linuwu-sense-anv15.git
cd linuwu-sense-anv15
```
*(Se já tiver clonado anteriormente, basta rodar `git pull origin main` dentro da pasta).*

### 2. Executar o instalador automático para Fedora
```bash
sudo ./install.sh
```

O instalador foi ajustado especificamente para o **Fedora Linux**:
* Instala `git`, `make`, `gcc`, `clang`, `llvm`, `dkms`, `kernel-devel`, `kernel-headers`, `nodejs` e `npm` via `dnf`.
* Compila o módulo `linuwu_sense` e configura `/etc/modprobe.d/linuwu_sense.conf` com `options linuwu_sense nitro_v4=1`.
* Executa `npm install --legacy-peer-deps` e `npm run build` (sem conflito `ERESOLVE` do `esbuild` com `vite`) preservando as permissões do seu usuário local (`$SUDO_USER`).
* Instala o binário de produção (`server.js` + `dist/`) em `/opt/nitrosense-linux` com contexto **SELinux** (`restorecon`) compatível com o `systemd` do Fedora.
* Inicia e habilita o serviço `nitrosense-linux.service` na porta `3000`.

### 3. Acessar a interface
Abra no navegador:
```
http://localhost:3000
```

---

## 🧪 Testes Automatizados

Para rodar a suíte de testes unitários:
```bash
npx --yes tsx --test src/utils/fanMath.test.ts
```

---

## 📄 Licença e Créditos

* Baseado no módulo de kernel [Linuwu-Sense](https://github.com/0x7375646F/Linuwu-Sense) por **0x7375646F**.
* Calibrado para o **Acer Nitro V 15 (ANV15-52-52VN — Core i5-13420H + RTX 4060 8GB)** no **Fedora Linux**.
* Licença: GPL-3.0.
