import * as THREE from 'three';

export default class CustomReflector extends THREE.Mesh {
  constructor(geometry, options = {}) {
    super(geometry);

    // Configuración básica
    const defaults = {
      color: new THREE.Color(0x777777),
      textureWidth: window.innerWidth * window.devicePixelRatio,
      textureHeight: window.innerHeight * window.devicePixelRatio,
      clipBias: 0.003,
      opacity: 0.3 // Aumentamos la opacidad para mayor visibilidad
    };

    const settings = { ...defaults, ...options };

    // Elementos necesarios para el reflector
    this.reflectorPlane = new THREE.Plane();
    this.normal = new THREE.Vector3();
    this.reflectorWorldPosition = new THREE.Vector3();
    this.cameraWorldPosition = new THREE.Vector3();
    this.rotationMatrix = new THREE.Matrix4();
    this.lookAtPosition = new THREE.Vector3(0, 0, -1);
    this.clipPlane = new THREE.Vector4();
    this.view = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.q = new THREE.Vector4();
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
          vUv = textureMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform sampler2D tDiffuse;
        uniform float opacity;
        varying vec4 vUv;

        float blendOverlay(float base, float blend) {
          return (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)));
        }

        vec3 blendOverlay(vec3 base, vec3 blend) {
          return vec3(
            blendOverlay(base.r, blend.r),
            blendOverlay(base.g, blend.g),
            blendOverlay(base.b, blend.b)
          );
        }

        void main() {
          vec4 base = texture2DProj(tDiffuse, vUv);
          gl_FragColor = vec4(blendOverlay(base.rgb, color), opacity);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    // Configuración del comportamiento antes del renderizado
    this.onBeforeRender = (renderer, scene, camera) => {
      this.reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld);
      this.cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

      // Orientación del reflector
      this.rotationMatrix.extractRotation(this.matrixWorld);
      this.normal.set(0, 0, 1); // Asumimos que el suelo está orientado hacia arriba
      this.normal.applyMatrix4(this.rotationMatrix).normalize();

      // Vector de vista
      this.view.subVectors(this.reflectorWorldPosition, this.cameraWorldPosition);
      if (this.view.dot(this.normal) > 0) return; // No renderizar si el reflector está de espaldas

      // Configurar cámara virtual para el reflejo
      this.view.reflect(this.normal).negate();
      this.view.add(this.reflectorWorldPosition);

      this.rotationMatrix.extractRotation(camera.matrixWorld);
      this.lookAtPosition.set(0, 0, -1);
      this.lookAtPosition.applyMatrix4(this.rotationMatrix);
      this.lookAtPosition.add(this.cameraWorldPosition);

      this.target.subVectors(this.reflectorWorldPosition, this.lookAtPosition);
      this.target.reflect(this.normal).negate();
      this.target.add(this.reflectorWorldPosition);

      this.virtualCamera.position.copy(this.view);
      this.virtualCamera.up.set(0, 1, 0);
      this.virtualCamera.up.applyMatrix4(this.rotationMatrix);
      this.virtualCamera.up.reflect(this.normal);
      this.virtualCamera.lookAt(this.target);

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

      // Configurar plano de recorte oblicuo
      this.reflectorPlane.setFromNormalAndCoplanarPoint(this.normal, this.reflectorWorldPosition);
      this.reflectorPlane.applyMatrix4(this.virtualCamera.matrixWorldInverse);
      this.clipPlane.set(
        this.reflectorPlane.normal.x,
        this.reflectorPlane.normal.y,
        this.reflectorPlane.normal.z,
        this.reflectorPlane.constant
      );

      const projectionMatrix = this.virtualCamera.projectionMatrix;
      this.q.x = (Math.sign(this.clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
      this.q.y = (Math.sign(this.clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
      this.q.z = -1.0;
      this.q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

      this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(this.q));

      projectionMatrix.elements[2] = this.clipPlane.x;
      projectionMatrix.elements[6] = this.clipPlane.y;
      projectionMatrix.elements[10] = this.clipPlane.z + 1.0 - settings.clipBias;
      projectionMatrix.elements[14] = this.clipPlane.w;

      // Renderizar el reflejo
      this.visible = false;
      const ground = scene.getObjectByName('Ground_Grey_0');
      if (ground) ground.visible = false;

      const currentRenderTarget = renderer.getRenderTarget();
      const currentXrEnabled = renderer.xr.enabled;
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;

      renderer.setRenderTarget(this.renderTarget);
      renderer.state.buffers.depth.setMask(true);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, this.virtualCamera);

      renderer.xr.enabled = currentXrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
      renderer.setRenderTarget(currentRenderTarget);

      const viewport = camera.viewport;
      if (viewport !== undefined) {
        renderer.state.viewport(viewport);
      }

      this.visible = true;
      if (ground) ground.visible = true;
    };
  }

  getRenderTarget() {
    return this.renderTarget;
  }
}