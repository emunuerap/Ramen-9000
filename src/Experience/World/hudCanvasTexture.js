import * as THREE from 'three';

export default function createHUDTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 280;
  const ctx = canvas.getContext('2d');

  const defaultLines = [
    'RAMEN-9000',
    'Scan: ',
    'Proyecto 3: Aplicación Interactiva',
    'Eduardo Munuera Porlan'
  ];

  const hud = {
    texture: new THREE.CanvasTexture(canvas),
    scannerSpeed: 2,
    lines: [...defaultLines],
    typedLengths: [0, 0, 0, 0],
    charSpeed: 0.08, // Base para "RAMEN-9000"
    lineDelays: [0, 0.8, 1.6, 2.4],
    isConnected: false,
    scanEffect: false,
    scanProgress: 0,
    needsUpdate: true,
    startTime: 0,
    update: (elapsedTime) => {
      drawText(elapsedTime);
    }
  };

  hud.texture.minFilter = THREE.LinearFilter;
  hud.texture.magFilter = THREE.LinearFilter;
  hud.texture.format = THREE.RGBAFormat;

  function drawText(elapsedTime) {
    const relativeTime = elapsedTime - hud.startTime; // Tiempo relativo al inicio


    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo HUD
    ctx.fillStyle = `rgba(0, 255, 255, ${hud.isConnected ? 0.3 : 0.2})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Ajustar velocidad de escritura según el estado
    const currentCharSpeed = hud.isConnected ? 0.02 : 0.1; // 0.02 para "CONEXION INICIADA", 0.1 para "RAMEN-9000"

    for (let i = 0; i < hud.lines.length; i++) {
      const delay = hud.lineDelays[i];
      const fullLine = i === 1 ? `${hud.lines[i]}${(relativeTime % 10).toFixed(1)}s` : hud.lines[i];

      if (relativeTime > delay) {
        let typed;
        if (hud.scanEffect && relativeTime > 4.2) {
          typed = fullLine.substring(0, Math.floor(fullLine.length * hud.scanProgress));
        } else {
          const maxChars = Math.min(fullLine.length, Math.floor((relativeTime - delay) / currentCharSpeed));
          typed = fullLine.substring(0, maxChars);
        }

        if (i === 3) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 12;
          ctx.font = 'bold 24px Orbitron';
        } else {
          ctx.fillStyle = '#00ffff';
          ctx.shadowBlur = 0;
          ctx.font = 'bold 26px Orbitron';
        }

        // Efecto de glitch durante la transición
        // Extender el rango temporalmente para depuración
        if (hud.isConnected && relativeTime >= 1.5 && relativeTime < 3) {
          if (Math.random() < 0.7) {
            typed = typed
              .split('')
              .map(char => (Math.random() < 0.5 ? String.fromCharCode(33 + Math.random() * 94) : char))
              .join('');
            ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`; // Colores aleatorios
          }
        }

        ctx.fillText(typed, canvas.width / 2, 60 + i * 50);
      }
    }

    // Efecto de escáner vertical
    const lineY = (Math.sin(relativeTime * hud.scannerSpeed) * 0.5 + 0.5) * canvas.height;
    const gradient = ctx.createLinearGradient(0, lineY - 10, 0, lineY + 10);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, `rgba(0, 255, 255, ${hud.isConnected ? 0.5 : 0.3})`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, lineY - 10, canvas.width, 20);

    // Efecto de escaneo horizontal si está activo
    if (hud.scanEffect) {
      hud.scanProgress += 0.04;
      if (hud.scanProgress >= 1) {
        hud.scanProgress = 1;
        hud.scanEffect = false;
      }
      const scanX = hud.scanProgress * canvas.width;
      const scanGradient = ctx.createLinearGradient(scanX - 50, 0, scanX, 0);
      scanGradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
      scanGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.9)');
      scanGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
      ctx.fillStyle = scanGradient;
      ctx.fillRect(scanX - 50, 0, 50, canvas.height);
    }

    hud.texture.needsUpdate = true;
  }

  return hud;
}