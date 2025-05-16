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
      uOpacity: { value: 0.8 }, // Opacidad inicial
      uOpacity: { value: 0.8 }, // Opacidad inicial
      uColor: { value: new THREE.Color(0.2, 0.6, 1.0) } // Color inicial (coincide con el baseColor inicial del fragment shader)    },
    },
      depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}