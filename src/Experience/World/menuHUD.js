import * as THREE from 'three';
import createMenuTexture from './hudMenuTexture.js';

export default function createMenuHUD(buttonRef = {}) {
  const texture = createMenuTexture(buttonRef);

  // Ajustamos las proporciones a 16:9 para evitar stretching
  const width = 3.5;
  const height = (width * 9) / 16; // 3.5 * 9/16 = 1.96875 aprox.

  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;
  mesh.renderOrder = 999;
  mesh.position.set(0, 2.5, -1);
  mesh.rotation.y = Math.PI;

  return mesh;
}
