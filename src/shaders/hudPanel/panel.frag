uniform float uTime;
varying vec2 vUv;

void main() {
  float lines = sin((vUv.y + uTime * 0.2) * 100.0) * 0.1;
  float glow = 0.5 + 0.5 * sin(uTime * 3.0 + vUv.x * 10.0);

  vec3 color = vec3(0.0, 1.0, 1.0) + glow * 0.2;
  color += lines;

  float alpha = 0.5;

  gl_FragColor = vec4(color, alpha);
}
