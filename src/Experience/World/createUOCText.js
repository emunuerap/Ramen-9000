// createUOCText.js
import * as THREE from 'three';

export function createUOCText({ uocSign, camera, raycaster, canvas, scene }) {
  // 1) Cargar el logo de la UOC
  const textureLoader = new THREE.TextureLoader();
  const logoTexture = textureLoader.load(
    '../../../public/assets/logo_uoc.jpg',
    () => {
      console.log('Logo de la UOC cargado correctamente');
    },
    undefined,
    (error) => {
      console.error('Error cargando el logo de la UOC:', error);
    }
  );
  logoTexture.minFilter = THREE.LinearFilter;

  // 2) Material holográfico (usando MeshStandardMaterial)
  const material = new THREE.MeshBasicMaterial({
    map: logoTexture, // Colores naturales del logo
    transparent: true,
    opacity: 0, // Valor inicial para el fade-in
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    color: 0xffffff, // Tono azul claro para un brillo holográfico suave
    
  });

  // 3) Geometría del plano (ajustada a las proporciones del logo)
  const aspect = 669 / 173; // Proporción real del logo
  const height = 0.15;
  const width = height * aspect;
  const geo = new THREE.PlaneGeometry(width, height);

  // 4) Crear el panel del logo
  const panel = new THREE.Mesh(geo, material);
  panel.visible = false;
  scene.add(panel);

  // 5) Variables de timing y estado
  let showLogo = false;
  let clickTime = 0;
  const fadeIn = 0.1;
  const stay = 8.0;
  const fadeOut = 0.5;

  // 6) Función para posicionar al lado de uocSign
  function updatePosition() {
    uocSign.updateWorldMatrix(true, false);
    const pos = new THREE.Vector3();
    uocSign.getWorldPosition(pos);
    const bbox = new THREE.Box3().setFromObject(uocSign);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Mover el logo a la derecha
    const offset = new THREE.Vector3(size.x * 5, 0, 0);
    panel.position.copy(pos).add(offset);
    panel.rotation.copy(uocSign.rotation);
    panel.lookAt(camera.position);
  }

  // 7) Listener de click: mostrar panel y detectar clicks en él
  canvas.addEventListener('click', (e) => {
    const mx = (e.clientX / window.innerWidth) * 2 - 1;
    const my = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera({ x: mx, y: my }, camera);

    // Ampliar la zona de detección con un bounding box ficticio alrededor de uocSign
    const expandedBox = new THREE.Box3();
    expandedBox.copy(uocSign.geometry.boundingBox).expandByVector(new THREE.Vector3(0.5, 0.5, 0.5));
    const intersects = raycaster.intersectObject(uocSign, true);

    if (intersects.length > 0) {
      // Reproducir sonido al hacer clic en UOC_Sign
      const clickSound = document.getElementById('click-sound');
      if (clickSound) {
        clickSound.currentTime = 0;
        clickSound.play();
      }

      showLogo = true;
      clickTime = performance.now() / 1000;
      panel.visible = true;
      updatePosition();
      console.log('Clic detectado en UOC_Sign, logo debería aparecer inmediatamente');
      // Forzar actualización inmediata usando requestAnimationFrame
      requestAnimationFrame(() => {
        material.opacity = Math.min((performance.now() / 1000 - clickTime) / fadeIn, 1);
      });
    }

    // Click sobre el panel → web UOC
    if (panel.visible && raycaster.intersectObject(panel, true).length) {
      // Reproducir sonido al hacer clic en el logo
      const clickSound = document.getElementById('click-sound');
      if (clickSound) {
        clickSound.currentTime = 0;
        clickSound.play();
      }

      console.log('Clicked on UOC logo');
      window.open('https://www.uoc.edu', '_blank');
    }
  });

  // 8) Exponer update en userData para el loop principal
  panel.userData.update = (t) => {
    if (!showLogo) return;
    const elapsed = t - clickTime;
    if (elapsed < fadeIn) {
      material.opacity = elapsed / fadeIn;
    } else if (elapsed < fadeIn + stay) {
      material.opacity = 1;
    } else if (elapsed < fadeIn + stay + fadeOut) {
      const f = 1 - (elapsed - fadeIn - stay) / fadeOut;
      material.opacity = f;
    } else {
      material.opacity = 0;
      panel.visible = false;
      showLogo = false;
    }
    updatePosition();
  };
}