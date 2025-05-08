import * as THREE from 'three';

export default function createMenuTexture(buttonRef) {
  const width = 1600;
  const height = 900;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fondo elegante azul petróleo oscuro
  ctx.fillStyle = '#102f3a';
  ctx.fillRect(0, 0, width, height);

  // Título
  ctx.font = 'bold 50px Orbitron';
  ctx.fillStyle = '#8ff7ff';
  ctx.textAlign = 'center';
  ctx.fillText('🍜 RAMEN 9000 MENU 🍜', width / 2, 90);

  // Estilo de platos
  ctx.font = '36px Orbitron';
  ctx.fillStyle = '#e0f7ff';
  const sections = {
    'Especialidades': [
      'Tonkotsu Ramen',
      'Shoyu Ramen',
      'Miso Ramen',
      'Tsukemen'
    ],
    'Entrantes': [
      'Gyozas',
      'Takoyaki',
      'Edamame'
    ],
    'Bebidas': [
      'Sake',
      'Té verde',
      'Ramune'
    ]
  };

  let y = 160;

  for (const section in sections) {
    // Sección
    ctx.font = 'bold 42px Orbitron';
    ctx.fillStyle = '#00ffff';
    ctx.fillText(section, width / 2, y);
    y += 55;

    // Platos
    ctx.font = '32px Orbitron';
    ctx.fillStyle = '#e0f7ff';
    sections[section].forEach(item => {
      ctx.fillText(item, width / 2, y);
      y += 45;
    });

    y += 30; // Separación entre secciones
  }

  // Botón Volver
  const backText = '← Volver';
  const backX = width - 120;
  const backY = height - 50;
  ctx.font = 'bold 34px Orbitron';
  ctx.fillStyle = '#8ff7ff';
  ctx.textAlign = 'right';
  ctx.fillText(backText, backX, backY);

  // Botón área clicable
  buttonRef.x = backX;
  buttonRef.y = backY - 30;
  buttonRef.width = 180;
  buttonRef.height = 50;

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
