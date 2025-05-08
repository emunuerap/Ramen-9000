import * as THREE from 'three';

export default function createHUDTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  const lines = [
    'RAMEN-9000',
    'Scan: ', // luego añadimos tiempo
    'Proyecto 3: Aplicación Interactiva',
    'Eduardo Munuera Porlan'
  ];

  const typedLengths = [0, 0, 0, 0];
  const charSpeed = 0.1; // velocidad de escritura
  const lineDelays = [0, 1.2, 2.4, 3.6]; // segundos entre líneas

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.format = THREE.RGBAFormat;

  function drawText(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo HUD
    ctx.fillStyle = 'rgba(0, 255, 255, 0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < lines.length; i++) {
      const delay = lineDelays[i];
      const fullLine = i === 1 ? `${lines[i]}${(time % 10).toFixed(1)}s` : lines[i];

      if (time > delay) {
        const maxChars = Math.min(fullLine.length, Math.floor((time - delay) / charSpeed));
        const typed = fullLine.substring(0, maxChars);

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

        ctx.fillText(typed, canvas.width / 2, 60 + i * 50);
      }
    }

    // Efecto de escáner
    const lineY = (Math.sin(time * 2) * 0.5 + 0.5) * canvas.height;
    const gradient = ctx.createLinearGradient(0, lineY - 10, 0, lineY + 10);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.2)');
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, lineY - 10, canvas.width, 20);

    texture.needsUpdate = true;
  }

  return {
    texture,
    update: (elapsedTime) => {
      drawText(elapsedTime);
    }
  };
}
