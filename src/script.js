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

// Elementos de la leyenda
const legend = document.getElementById('legend');
const toggleLegendBtn = document.getElementById('toggle-legend');
const closeLegendBtn = document.getElementById('close-legend');
const toggleSoundBtn = document.getElementById('toggle-sound');
const soundIcon = document.getElementById('sound-icon');

let progress = 0;
const duration = 2700;
const steps = 60;
const increment = 100 / steps;
const interval = duration / steps;

// Estado del sonido (activado por defecto)
let isSoundOn = true;

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
     
    // Tras un breve delay, ocultamos loader y mostramos botón
    setTimeout(() => {
      loadingVisual.style.display = 'none';
      startScreen.style.display = 'block';
    }, 300);
  }
}, interval);

// Función para reproducir el sonido de clic
const playClickSound = () => {
  const clickSound = document.getElementById('click-sound');
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play().catch(err => console.warn('❌ No se pudo reproducir el sonido de clic:', err));
  }
};

// Mostrar la leyenda y ocultar el ícono de ramen al hacer clic en el toggle
toggleLegendBtn.addEventListener('click', () => {
  if (legend.classList.contains('hidden')) {
    playClickSound();
    legend.classList.remove('hidden');
    legend.classList.add('visible');
    toggleLegendBtn.classList.remove('visible');
    toggleLegendBtn.classList.add('hidden');
  }
});

// Cerrar la leyenda y mostrar el ícono de ramen al hacer clic en la X
closeLegendBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  if (legend.classList.contains('visible')) {
    playClickSound();
    legend.classList.remove('visible');
    legend.classList.add('hidden');
    toggleLegendBtn.classList.remove('hidden');
    toggleLegendBtn.classList.add('visible');
  }
});

// Cerrar la leyenda al hacer clic en cualquier parte de la leyenda (excepto el botón X)
legend.addEventListener('click', () => {
  if (legend.classList.contains('visible')) {
    playClickSound();
    legend.classList.remove('visible');
    legend.classList.add('hidden');
    toggleLegendBtn.classList.remove('hidden');
    toggleLegendBtn.classList.add('visible');
  }
});

// Alternar el sonido ambiental
toggleSoundBtn.addEventListener('click', () => {
  playClickSound();
  const ambience = document.getElementById('ambience-sound');
  if (ambience) {
    if (isSoundOn) {
      ambience.pause();
      isSoundOn = false;
      // Cambiar el ícono a "mute"
      soundIcon.innerHTML = `
        <path d="M11 5L6 9H2v6h4l5 4V5z" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="15" y1="9" x2="21" y2="15" stroke-linecap="round"/>
        <line x1="15" y1="15" x2="21" y2="9" stroke-linecap="round"/>
      `;
    } else {
      ambience.play().catch(err => console.warn('No se pudo reanudar el sonido ambiente:', err));
      ambience.volume = 0.3;
      isSoundOn = true;
      // Cambiar el ícono a "sonido activado"
      soundIcon.innerHTML = `
        <path d="M11 5L6 9H2v6h4l5 4V5z" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    }
  }
});

if (!canvas) {
  console.error('No se encontró el canvas con id="webgl"');
} else {
  startBtn.addEventListener('click', () => {
    playClickSound();

    // Oculta loader y pausa hervor
    loader.style.display = 'none';
    const boilingSound = document.getElementById('boiling-sound');
    if (boilingSound) boilingSound.pause();

    // Inicia ambience con fade
    const ambience = document.getElementById('ambience-sound');
    if (ambience) {
      ambience.volume = 0;
      ambience.play().then(() => {
        document.addEventListener('visibilitychange', () => {
          if (!ambience) return;
        
          if (document.visibilityState === 'visible') {
            if (isSoundOn && ambience.paused) {
              ambience.play().catch(err => console.warn('No se pudo reanudar el sonido ambiente:', err));
            }
          } else {
            ambience.pause();
          }
        });
  
        let vol = 0;
        const fadeInterval = setInterval(() => {
          vol += 0.05;
          ambience.volume = Math.min(vol, 0.3);
          if (vol >= 0.3) clearInterval(fadeInterval);
        }, 200);
      }).catch(() => {
        document.body.addEventListener('click', () => {
          if (isSoundOn) {
            ambience.play().then(() => { ambience.volume = 0.3; });
          }
        }, { once: true });
      });
    }

    // ✨ Inicio de la experiencia
    window.experience = new Experience(canvas);

    // Mostrar el botón de sonido y el ícono del ramen después de iniciar la experiencia
    toggleLegendBtn.classList.remove('hidden');
    toggleLegendBtn.classList.add('visible');
    toggleSoundBtn.classList.remove('hidden');
    toggleSoundBtn.classList.add('visible');

    // 🎥 Animación inicial de cámara con sonido de llegada
    setTimeout(() => {
      const transitionSound = document.getElementById('transition-sound');
      if (transitionSound) transitionSound.play();

      const targetPos = new THREE.Vector3(0, 2, 15);
      const targetLook = new THREE.Vector3(0, 2, 0);

      window.experience.camera.animateToPosition(targetPos, targetLook, 2, () => {
        const arrivalSound = document.getElementById('arrival-sound');
        if (arrivalSound) arrivalSound.play();
      });
    }, 600);
  });
}