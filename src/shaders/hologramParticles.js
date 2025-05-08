import * as THREE from 'three';
import fragment from '../../shaders/hologramParticles/particles.frag';
import vertex from '../../shaders/hologramParticles/particles.vert';


export default function createHologramParticles() {
  const count = 300;
  const positions = new Float32Array(count * 3);
  const aScale = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3 + 0] = (Math.random() - 0.5) * 3;
    positions[i3 + 1] = Math.random() * 2;
    positions[i3 + 2] = (Math.random() - 0.5) * 3;
    aScale[i] = Math.random() * 1.0 + 0.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(aScale, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    uniforms: {
      uTime: { value: 0 }
    },
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'HologramParticles';
  return { points, material };
}
