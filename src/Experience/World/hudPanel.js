import * as THREE from 'three';
import fragment from '../../shaders/hudPanel/panel.frag';
import vertex from '../../shaders/hudPanel/panel.vert';

export default function createHUDPanel() {
  const geometry = new THREE.PlaneGeometry(1.5, 0.5);
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }
    }
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0.8, 3.2, 0.3); // ajusta para ponerlo encima/lado del holograma
  return { mesh, material };
}
