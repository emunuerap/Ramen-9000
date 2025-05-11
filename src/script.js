import Experience from './Experience/experience.js';
import * as THREE from 'three';

const canvas = document.querySelector('#webgl');
const startBtn = document.getElementById('start-btn');
const loader = document.getElementById('loader');

// Simular barra de carga con porcentaje
const fill = document.getElementById('loader-bar-fill');
const percentText = document.getElementById('loading-percent');
const loadingVisual = document.getElementById('loading-visual');
const startScreen = document.getElementById('start-screen');

let progress = 0;
const duration = 2700;
const steps = 60;
const increment = 100 / steps;
const interval = duration / steps;

// Autoplay del sonido de hervor al cargar la primera vez
window.addEventListener('DOMContentLoaded', () => {
  const boilingSound = document.getElementById('boiling-sound');
  if (boilingSound) {
    boilingSound.volume = 0.4;
    const tryPlay = () => {
      boilingSound.play().catch(() => {
        document.body.addEventListener('click', () => {
          boilingSound.play().catch(err => console.warn('No se pudo reproducir el sonido:', err));
        }, { once: true });
      });
    };
    tryPlay();
  }
});

// Muestra el progreso en la barra
const progressInterval = setInterval(() => {
  progress += increment;
  if (progress > 100) progress = 100;
  fill.style.width = `${progress}%`;
  percentText.innerText = `${Math.floor(progress)}%`;

  if (progress >= 100) {
    clearInterval(progressInterval);
    fill.style.width = `100%`;
    percentText.innerText = `100%`;

    const boilingSound = document.getElementById('boiling-sound');
     if (boilingSound) boilingSound.pause();
     
    // Tras un breve delay, ocultamos loader y mostramos botón
    setTimeout(() => {
      loadingVisual.style.display = 'none';
      startScreen.style.display = 'block';
    }, 300);
  }
}, interval);

if (!canvas) {
  console.error('No se encontró el canvas con id="webgl"');
} else {
  startBtn.addEventListener('click', () => {
    // Sonido de click
    const clickSound = document.getElementById('click-sound');
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play().catch(err => console.warn('❌ No se pudo reproducir el sonido de clic:', err));
    }

    // Oculta loader y pausa hervor
    loader.style.display = 'none';
    const boilingSound = document.getElementById('boiling-sound');
    if (boilingSound) boilingSound.pause();

    // Inicia ambience con fade
    const ambience = document.getElementById('ambience-sound');
    if (ambience) {
      ambience.volume = 0;
      ambience.play().then(() => {
        let vol = 0;
        const fadeInterval = setInterval(() => {
          vol += 0.05;
          ambience.volume = Math.min(vol, 0.3);
          if (vol >= 0.3) clearInterval(fadeInterval);
        }, 200);
      }).catch(() => {
        document.body.addEventListener('click', () => {
          ambience.play().then(() => { ambience.volume = 0.3; });
        }, { once: true });
      });
    }

    // ✨ Inicio de la experiencia
    window.experience = new Experience(canvas);

    // 🎥 Animación inicial de cámara con sonido de llegada
    setTimeout(() => {
      const transitionSound = document.getElementById('transition-sound');
      if (transitionSound) transitionSound.play();

      const targetPos = new THREE.Vector3(0, 5, 10);
      const targetLook = new THREE.Vector3(0, 2, 0);

      window.experience.camera.animateToPosition(targetPos, targetLook, 2, () => {
        const arrivalSound = document.getElementById('arrival-sound');
        if (arrivalSound) arrivalSound.play();
      });
    }, 600);
  });
}
