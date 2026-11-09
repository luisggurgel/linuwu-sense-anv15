# 🔥 NitroSense Linux (Acer Nitro V 15 - ANV15-52-52VN)

> Interface gráfica moderna e completa para controle de ventoinhas, curvas térmicas personalizadas e perfis de desempenho no notebook **Acer Nitro V 15 (ANV15-52-52VN)** rodando Linux. Baseado no módulo de kernel [Linuwu-Sense](https://github.com/0x7375646F/Linuwu-Sense).

---

## 💻 Compatibilidade e Especificações do Modelo

Este projeto foi especialmente calibrado e testado para a plataforma **Acer Nitro V 15 ANV15-52**:

* **Modelo:** Acer Nitro V 15 (`ANV15-52-52VN` / `ANV15-51` / `ANV15-52`)
* **Processador:** Intel Core i5-13420H / Intel Core i7 13ª geração
* **Placa de Vídeo:** NVIDIA GeForce RTX 2050 / RTX 3050 / RTX 4050
* **Quirk do Kernel:** `quirk_acer_nitro_anv15_52`
* **Parâmetro Obrigatório do Módulo:** `nitro_v4=1`
* **Janela EC Compartilhada (MMIO):** Base `0xFE708000`, Offset `0x607`
* **Método ACPI de Notificação:** `\_SB.PC00.LPCB.EC0._Q30`
* **Velocidade Máxima das Ventoinhas:**
  * CPU Fan: ~5.400 RPM
  * GPU Fan: ~5.600 RPM

---

## 🚀 Principais Recursos

1. **Monitoramento Térmico em Tempo Real:**
   * Gauges radiais com brilho dinâmico para CPU e GPU (°C).
   * Rotação e velocidade das ventoinhas em RPM com animação proporcional.
   * Gráfico contínuo dos últimos 60 segundos com métricas de máxima e média.
   * Consumo energético em Watts (PL1/PL2 da CPU e TGP da RTX).

2. **Perfis Térmicos e de Energia:**
   * **Eco (Modo EC 4 / `low-power`):** Máxima autonomia de bateria e ruído zero.
   * **Silencioso (Modo EC 3 / `quiet`):** Mantém acústica suave em tarefas leves.
   * **Equilibrado (Modo EC 2 / `balanced`):** Padrão do Nitro V15. Equilíbrio perfeito.
   * **Desempenho (Modo EC 1 / `balanced-performance`):** Acelera os clocks e ventoinhas preventivamente para jogos pesados.
   * **Turbo Máximo (Modo EC 0 / `performance`):** 100% de ventoinha para máximo resfriamento e sem restrições de thermal throttling.

3. **Controle de Ventoinhas e Curvas:**
   * Modos: **Automático (EC)**, **Personalizado** e **Turbo Máximo (100%)**.
   * Sliders manuais de 0% a 100% com opção de ventoinhas vinculadas ou independentes.
   * Editor interativo de **Curva Térmica** (temperatura vs velocidade) com visualização em tempo real do ponto de operação.
   * Presets de curva prontos: *Silencioso*, *Equilibrado*, *Gamer* e *Agressivo*.

4. **Gerenciamento de Bateria e Hardware:**
   * **Battery Care Limiter (80%):** Limita a carga em 80% via `battery_limiter` para evitar a degradação da bateria na tomada.
   * **LCD Overdrive:** Reduz o tempo de resposta no painel IPS de 144Hz para 3ms.
   * **Timeout do Teclado:** Controle do desligamento automático da iluminação do teclado após 30 segundos.
   * **Carregamento USB Desligado:** Ajuste do corte de segurança (10%, 20%, 30%).

---

## 📦 Instalação Rápida no Linux

### 1. Clonar o repositório
```bash
git clone https://github.com/luisggurgel/linuwu-sense-anv15.git
cd linuwu-sense-anv15
```

### 2. Executar o instalador automático (com permissão sudo)
```bash
sudo ./install.sh
```

O script irá:
1. Instalar os headers do seu kernel e compiladores (`gcc`, `make`, `dkms`).
2. Baixar e compilar o módulo `linuwu_sense`.
3. Configurar `/etc/modprobe.d/linuwu_sense.conf` com `options linuwu_sense nitro_v4=1`.
4. Carregar o driver e iniciar o serviço web na porta `3000`.

### 3. Acessar a interface
Abra seu navegador em:
```
http://localhost:3000
```

---

## 🛠️ Comandos Manuais do Módulo (Se preferir)

### Carregar o módulo manualmente:
```bash
echo "options linuwu_sense nitro_v4=1" | sudo tee /etc/modprobe.d/linuwu_sense.conf
sudo modprobe -r acer-wmi 2>/dev/null || true
sudo modprobe linuwu_sense nitro_v4=1
```

### Testar a velocidade das ventoinhas via terminal:
```bash
# Modo Automático
echo "0,0" | sudo tee /sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/predator_sense/fan_speed

# Ventoinhas em 100% (Turbo)
echo "100,100" | sudo tee /sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/predator_sense/fan_speed

# CPU em 60% e GPU em 80%
echo "60,80" | sudo tee /sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/predator_sense/fan_speed
```

### Ativar o limitador de bateria (80%):
```bash
echo "1" | sudo tee /sys/module/linuwu_sense/drivers/platform:acer-wmi/acer-wmi/predator_sense/battery_limiter
```

---

## 🧪 Testes Automatizados

O projeto conta com suíte de testes unitários com o test runner nativo do Node.js:
```bash
npx --yes tsx --test src/utils/fanMath.test.ts
```

---

## 📄 Licença e Créditos

* Baseado no módulo de kernel [Linuwu-Sense](https://github.com/0x7375646F/Linuwu-Sense) criado por **0x7375646F**.
* Desenvolvido e calibrado para o **Acer Nitro V 15 (ANV15-52-52VN)**.
* Licença: GPL-3.0.
