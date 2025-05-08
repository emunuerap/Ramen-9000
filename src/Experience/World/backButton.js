import * as THREE from 'three';

export default function createBackButton(onClick) {
  const geometry = new THREE.CircleGeometry(0.15, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(1.3, 1.3, 0.01); // posición relativa al panel

  // Flecha (opcionalmente puedes dibujar una flecha con CanvasTexture también)
  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    0.2,
    0xffffff
  );
  mesh.add(arrow);

  mesh.userData.isBackButton = true; // importante para raycasting
  mesh.onClick = onClick; // callback personalizado

  return mesh;
}
