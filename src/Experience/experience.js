import * as THREE from 'three';
import Sizes from './Utils/sizes.js';
import Time from './Utils/time.js';
import Camera from './camera.js';
import Renderer from './renderer.js';
import Resources from './Utils/resources.js';
import sources from './sources.js';
import World from './World/world.js';
import Environment from './World/environment.js';

export default class Experience {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.isReady = false; // Estado para controlar la carga

    const ambient = new THREE.AmbientLight(0xffffff, 0.05);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.1);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    this.scene.add(sun);

    this.sizes = new Sizes();
    this.time = new Time();
    this.camera = new Camera(this);
    this.renderer = new Renderer(this);
    this.resources = new Resources(sources);
    this.environment = new Environment(this);

    // Placeholder mientras carga
    this.scene.environment = new THREE.CubeTexture();

    this.resources.loadingManager.onLoad = () => {
      console.log('✅ Todos los recursos están listos');
      this.world = new World(this);
      this.isReady = true; // Marca como listo para renderizar
    };

    this.sizes.on('resize', () => {
      this.resize();
    });

    this.time.on('tick', () => {
      if (this.isReady) {
        this.update(this.time.delta * 0.001);
      }
    });
  }

  resize() {
    this.camera.resize();
    this.renderer.resize();
  }

  update(delta) {
    this.camera.update(delta);
    if (this.world) this.world.update();
    this.renderer.update();
  }
}