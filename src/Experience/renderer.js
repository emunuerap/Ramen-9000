import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

export default class Renderer {
  constructor(experience) {
    this.experience = experience;
    
    // Configuración optimizada del WebGLRenderer
    this.instance = new THREE.WebGLRenderer({
      canvas: this.experience.canvas,
      powerPreference: "high-performance",
      antialias: true,
      alpha: true,
      premultipliedAlpha: false ,
      preserveDrawingBuffer: false // ← Mejora rendimiento
    });

    // Configuración básica
    this.instance.physicallyCorrectLights = true;
    this.instance.outputEncoding = THREE.sRGBEncoding;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 0.2;
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
    this.instance.autoClear = false;
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.instance.setSize(window.innerWidth, window.innerHeight);

    // Configuración del efecto Bloom
    this.setupBloomEffect();

    window.addEventListener('resize', this.resize.bind(this));
  }

  setupBloomEffect() {
    this.bloomComposer = new EffectComposer(this.instance);
    this.bloomComposer.renderToScreen = false;
    
    const renderPass = new RenderPass(
      this.experience.scene,
      this.experience.camera.instance
    );
    this.bloomComposer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, 0.4, 0.85
    );
    this.bloomComposer.addPass(this.bloomPass);
  }

  resize() {
    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    if (this.bloomComposer) {
      this.bloomComposer.setSize(window.innerWidth, window.innerHeight);
      this.bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    }
    
    if (this.experience.camera?.instance) {
      this.experience.camera.instance.aspect = window.innerWidth / this.experience.sizes.height;
      this.experience.camera.instance.updateProjectionMatrix();
    }
  }

  update() {
    if (!this.experience.isReady || !this.experience.camera?.instance) return;

    // Reset del estado WebGL
    this.instance.state.reset();
    this.instance.clear();

    const { scene, camera } = this.experience;
    const cameraInstance = camera.instance;

    // Renderizado con manejo de errores
    try {
      // Capa Bloom
      if (cameraInstance.layers) {
        cameraInstance.layers.enable(1);
        this.bloomComposer.render();
      }

      // Capa principal
      cameraInstance.layers.enable(0);
      this.instance.clearDepth();
      this.instance.render(scene, cameraInstance);
    } catch (error) {
      console.error('Error en renderizado:', error);
      // Fallback básico
      this.instance.render(scene, cameraInstance);
    }
  }
}