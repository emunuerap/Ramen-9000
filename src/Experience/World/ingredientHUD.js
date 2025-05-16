import * as THREE from 'three';

export default function createIngredientHUD(backButtonArea) {
  const width = 1600;
  const height = 900;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const geometry = new THREE.PlaneGeometry(3.2, 1.8); // Proporción 16:9 (3.2 / 1.8 = 1.777)
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 999;
  material.depthTest = false;

  const video = document.createElement('video');
  video.src = '/assets/video_ramen.mp4';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.play();

  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBAFormat;

  mesh.userData.video = video;
  mesh.userData.videoTexture = videoTexture;
  mesh.userData.canvas = canvas;
  mesh.userData.ctx = ctx;

  mesh.updateCanvas = () => {
    ctx.clearRect(0, 0, width, height);

    // Fondo general
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);

    // Sección de ingredientes
    ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
    ctx.fillRect(0, 0, width * 0.5, height);

    ctx.font = '28px Orbitron, sans-serif';
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';

    const lines = [
      '🍜 Ingredientes del Ramen',
      '',
      '',
      '- Fideos de trigo',
      '',
      '- Caldo de cerdo (tonkotsu)',
      '',
      '- Chashu (cerdo asado)',
      '',
      '- Huevo marinado',
      '',
      '- Cebolleta picada',
      '',
      '- Algas nori',
      '',
      '- Bambú fermentado'
    ];
    const lineHeight = 42;
    let y = 90;
    lines.forEach(line => {
      ctx.fillText(line, width * 0.25, y);
      y += line ? lineHeight : lineHeight / 2;
    });

    // Botón "Volver"
    ctx.font = 'bold 30px Orbitron';
    ctx.fillStyle = '#00ffff';
    const backY = height - 70;
    ctx.fillText('← Volver', width * 0.25, backY);

    backButtonArea.x = width * 0.25;
    backButtonArea.y = backY - 25;
    backButtonArea.width = 200;
    backButtonArea.height = 50;

    // Sección de vídeo
    ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
    ctx.fillRect(width * 0.5, 0, width * 0.5, height);

    // Ajustar el video para proporción 16:9
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      const maxVideoWidth = width * 0.4; // Ancho máximo (40% del canvas)
      const videoAspectRatio = 16 / 9; // Proporción 16:9
      const videoW = maxVideoWidth; // Usamos el ancho máximo
      const videoH = videoW / videoAspectRatio; // Calculamos la altura para mantener 16:9

      // Centrar el video en el área disponible
      const videoX = width * 0.5 + (width * 0.5 - videoW) / 2; // Centrado horizontalmente en la mitad derecha
      const videoY = (height - videoH) / 2; // Centrado verticalmente

      ctx.drawImage(video, videoX, videoY, videoW, videoH);
    }

    texture.needsUpdate = true;
  };

  return mesh;
}