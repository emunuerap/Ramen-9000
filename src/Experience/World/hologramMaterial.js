import * as THREE from 'three';
import fragment from '../../shaders/hologram/fragment.glsl';
import vertex from '../../shaders/hologram/vertex.glsl';

export default function createHologramMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    uniforms: {
      uTime: { value: 0.0 },
      uOpacity: { value: 0.8 } // Opacidad inicial
    },
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}