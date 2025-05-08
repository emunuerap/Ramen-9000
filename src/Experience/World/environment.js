import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { PMREMGenerator } from 'three';

export default class Environment {
  constructor(experience) {
    this.experience = experience;
    this.scene = this.experience.scene;
    this.renderer = this.experience.renderer.instance;
    this.setEnvironmentMap();
  }

  async setEnvironmentMap() {
    try {
      // 1. Carga el HDRI con configuración optimizada
      const hdrTexture = await new RGBELoader()
        .setDataType(THREE.FloatType)
        .loadAsync('assets/rooftop_night_2k.hdr');
      
      // Configuración para eliminar warnings:
      hdrTexture.generateMipmaps = false; // ← Desactiva mipmaps
      hdrTexture.minFilter = THREE.LinearFilter; // ← Filtrado básico
      hdrTexture.magFilter = THREE.LinearFilter;
      hdrTexture.encoding = THREE.LinearEncoding;

      // 2. Genera el cubemap
      const pmremGenerator = new PMREMGenerator(this.renderer);
      pmremGenerator.compileEquirectangularShader();
      const cubeRenderTarget = pmremGenerator.fromEquirectangular(hdrTexture);
      
      // Configuración final del environment map
      cubeRenderTarget.texture.needsUpdate = true;
      this.scene.environment = cubeRenderTarget.texture;

      // Limpieza
      hdrTexture.dispose();
      pmremGenerator.dispose();

    } catch (error) {
      console.error('Error cargando HDRI:', error);
      // Fallback opcional
      this.scene.environment = new THREE.CubeTextureLoader()
        .load([/* Texturas vacías */]);
    }
  }
}