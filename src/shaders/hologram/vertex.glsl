varying vec2 vUv;
varying float vDistortion;

uniform float uTime;

void main() {
  vUv = uv;

  vec3 newPosition = position;
  float distanceFromCenter = length(position.xz);
  float ripple = sin(distanceFromCenter * 10.0 - uTime * 0.5) * 0.02;

  newPosition.y += ripple;
  vDistortion = ripple;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
