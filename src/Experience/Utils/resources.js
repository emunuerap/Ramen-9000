import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

export default class Resources {
  constructor(sources) {
    this.sources = sources;
    this.items = {};
    this.toLoad = this.sources.length;
    this.loaded = 0;

    this.loadingManager = new THREE.LoadingManager();

    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = (itemsLoaded / itemsTotal) * 100;
  const bar = document.getElementById('loader-bar-fill');
  const percentText = document.getElementById('loading-percent');
  if (bar) bar.style.width = `${progress}%`;
  if (percentText) percentText.textContent = `${Math.floor(progress)}%`;
};

    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.ktx2Loader = new KTX2Loader()
      .setTranscoderPath('/static/basis/')
      .detectSupport(new THREE.WebGLRenderer());

    this.loadingBar = document.getElementById('loader-bar');
    this.loadingScreen = document.getElementById('loader');

    this.startLoading();
  }

  startLoading() {
    for (const source of this.sources) {
      if (source.type === 'gltfModel') {
        this.gltfLoader.load(
                    source.path,
                    (gltf) => {
                      // ——— INSPECCIÓN AQUÍ ———
                      console.group(`✅ GLTF cargado: ${source.name}`);
                      console.log('URL:', source.path);
                      console.log('Scene root:', gltf.scene);
                      // Bounding box para ver escala:
                      const bbox = new THREE.Box3().setFromObject(gltf.scene);
                      const size = bbox.getSize(new THREE.Vector3());
                      console.log('Tamaño del modelo (x,y,z):', size);
                      console.groupEnd();
          
                      this.sourceLoaded(source, gltf);
                    },
                    undefined,
                    (err) => console.error(`❌ Error cargando ${source.name}`, err)
                  );

      } else if (source.type === 'texture') {
        this.textureLoader.load(source.path, (file) => {
          this.sourceLoaded(source, file);
        });
      } else if (source.type === 'ktx2') {
        this.ktx2Loader.load(source.path, (file) => {
          this.sourceLoaded(source, file);
        });
      }
    }
  }

  sourceLoaded(source, file) {
    this.items[source.name] = file;
    this.loaded++;

    const progress = (this.loaded / this.toLoad) * 100;
    if (this.loadingBar) this.loadingBar.style.width = `${progress}%`;

    if (this.loaded === this.toLoad) {
      console.log('✅ Todos los recursos están listos');
      if (this.loadingScreen) {
        setTimeout(() => {
          this.loadingScreen.style.opacity = '0';
          setTimeout(() => {
            this.loadingScreen.style.display = 'none';
          }, 1000);
        }, 300);
      }
    }
  }
}
