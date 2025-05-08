void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float alpha = smoothstep(0.5, 0.1, d); // difumina los bordes

  gl_FragColor = vec4(0.0, 1.0, 1.0, alpha * 0.6); // Cyan translúcido
}
