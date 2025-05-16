varying vec2 vUv;
varying float vDistortion;

uniform float uTime;
uniform float uOpacity; // Uniform para controlar la opacidad
uniform vec3 uColor; // Uniforme para el color base

void main() {
  // Suavizar la animación con una onda en vertical
  float wave = sin(vUv.y * 8.0 + uTime * 0.5); // Reducimos la frecuencia de 10.0 a 8.0 para suavizar

  // Usar el color uniforme en lugar de calcular baseColor
  vec3 baseColor = uColor;

  float glow = 0.5 + 0.5 * smoothstep(0.0, 1.0, wave); // Ajustamos el brillo base a 0.5

  // Fondo semitransparente con mayor opacidad
  vec3 background = vec3(0.0, 0.1, 0.3) * 0.5; // Fondo azul más visible
  vec3 finalColor = mix(background, baseColor * glow, 0.9); // Más énfasis en el color del holograma

  // Ajustar la opacidad base y usar uOpacity
  float alpha = (0.7 + 0.3 * abs(vDistortion)) * uOpacity; // Opacidad base aumentada a 0.7

  gl_FragColor = vec4(finalColor, alpha);
}