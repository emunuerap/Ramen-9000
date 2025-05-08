import * as THREE from 'three';

export default function createBackButtonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Fondo translúcido
  ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Texto y flecha
  ctx.fillStyle = '#00ffff';
  ctx.font = 'bold 32px "Noto Sans JP"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Back', canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.format = THREE.RGBAFormat;

  return texture;
}
