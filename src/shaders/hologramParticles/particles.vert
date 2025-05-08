uniform float uTime;
attribute float aScale;

void main() {
  vec3 pos = position;
  pos.y += sin(uTime + position.x * 5.0) * 0.3;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aScale * 10.0 / -mvPosition.z; // perspectiva más real
}
