varying vec2 vUv;
varying float vDistortion;

uniform float uTime;

void main() {
  // Suavizar la animación con una onda en vertical
  float wave = sin(vUv.y * 10.0 + uTime * 0.5);

  // Colores suaves en degradado animado
  vec3 baseColor = vec3(
    0.4 + 0.4 * sin(uTime + vUv.y * 2.0),
    0.8 + 0.2 * sin(uTime + vUv.y * 2.0 + 2.0),
    1.0
  );

  float glow = 0.4 + 0.6 * smoothstep(0.0, 1.0, wave);

  float alpha = 0.3 + 0.7 * abs(vDistortion);

  gl_FragColor = vec4(baseColor * glow, alpha);
}
