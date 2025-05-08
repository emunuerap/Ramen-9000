import * as THREE from 'three';

export default class CustomReflector extends THREE.Mesh {
  constructor(geometry, options = {}) {
    super(geometry);

    // Configuración básica
    const defaults = {
      color: new THREE.Color(0xffffff),
      textureWidth: 512,
      textureHeight: 512,
      clipBias: 0.003,
      opacity: 0.8
    };

    const settings = {...defaults, ...options};

    // Elementos necesarios para el reflector
    this.reflectorPlane = new THREE.Plane();
    this.normal = new THREE.Vector3(0, 1, 0);
    this.reflectorWorldPosition = new THREE.Vector3();
    this.cameraWorldPosition = new THREE.Vector3();
    this.textureMatrix = new THREE.Matrix4();
    this.virtualCamera = new THREE.PerspectiveCamera();

    // Render target para el reflejo
    this.renderTarget = new THREE.WebGLRenderTarget(
      settings.textureWidth, 
      settings.textureHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        encoding: THREE.sRGBEncoding
      }
    );

    // Material del reflector
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: settings.color },
        tDiffuse: { value: this.renderTarget.texture },
        textureMatrix: { value: this.textureMatrix },
        opacity: { value: settings.opacity }
      },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 vUv;
    
        void main() {
vUv = vec4(uv, 0.0, 1.0); // solo para test
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform sampler2D tDiffuse;
        uniform float opacity;
        varying vec4 vUv;
    
        void main() {
vec4 base = texture2D(tDiffuse, vUv.xy);
gl_FragColor = vec4(base.rgb, opacity); // sin multiplicar por color
        }
      `,
      transparent: true,
      depthWrite: false
    });
    
  
    console.log('🧪 Texture Matrix:\n', this.textureMatrix.elements);


    // Configuración del comportamiento antes del renderizado
    this.onBeforeRender = (renderer, scene, camera) => {
      this.reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld);
      this.cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

      // Orientación del reflector
      const rotationMatrix = new THREE.Matrix4().extractRotation(this.matrixWorld);
      this.normal.set(0, 1, 0).applyMatrix4(rotationMatrix).normalize();

      // Vector de vista
      const view = new THREE.Vector3().subVectors(this.reflectorWorldPosition, this.cameraWorldPosition);
      if (view.dot(this.normal) > 0) return; // No renderizar si el reflector está de espaldas

      // Configurar cámara virtual para el reflejo
      view.reflect(this.normal).negate();
      view.add(this.reflectorWorldPosition);

      const target = new THREE.Vector3().subVectors(this.reflectorWorldPosition, this.normal);
      this.virtualCamera.position.copy(view);
      this.virtualCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix).reflect(this.normal);
      this.virtualCamera.lookAt(target);
      this.virtualCamera.far = camera.far;
      this.virtualCamera.updateMatrixWorld();
      this.virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

      // Actualizar matriz de textura
      this.textureMatrix.set(
        0.5, 0.0, 0.0, 0.5,
        0.0, 0.5, 0.0, 0.5,
        0.0, 0.0, 0.5, 0.5,
        0.0, 0.0, 0.0, 1.0
      );
      this.textureMatrix.multiply(this.virtualCamera.projectionMatrix);
      this.textureMatrix.multiply(this.virtualCamera.matrixWorldInverse);
      this.textureMatrix.multiply(this.matrixWorld);

      // Renderizar el reflejo
      this.visible = false;
      const currentRenderTarget = renderer.getRenderTarget();
      const currentXrEnabled = renderer.xr.enabled;
      
      renderer.xr.enabled = false;
      renderer.setRenderTarget(this.renderTarget);
      renderer.state.buffers.depth.setMask(true);
      renderer.clear();
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, this.virtualCamera);
      
      renderer.xr.enabled = currentXrEnabled;
      renderer.setRenderTarget(currentRenderTarget);
      this.visible = true;
    };
  }
}