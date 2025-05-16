import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export default class Camera {
  constructor(experience) {
    this.experience = experience;
    this.sizes = experience.sizes;
    this.scene = experience.scene;
    this.canvas = experience.canvas;

    this.setInstance();
    this.setOrbitControls();
    this.initPointerLockControls();
  }

  setInstance() {
    this.instance = new THREE.PerspectiveCamera(
      40,
      this.sizes.width / this.sizes.height,
      0.1,
      100
    );
    this.instance.position.set(10, 2, -10); // posición inicial cinematográfica
    this.scene.add(this.instance);
  }

  setOrbitControls() {
    this.controls = new OrbitControls(this.instance, this.canvas);

    this.controls.enableDamping = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 20;
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.maxPolarAngle = Math.PI / 1.8;

    this.controls.enabled = false;

    this.controls.target.set(0, 1.2, 0);
    this.controls.update();
  }

  initPointerLockControls() {
    this.fpControls = new PointerLockControls(this.instance, this.canvas);
    this.scene.add(this.fpControls.object); // ✅ Nueva sintaxis (r125+)

    this.fpVelocity = new THREE.Vector3();
    this.fpDirection = new THREE.Vector3();
    this.fpEnabled = false;

    this.fpKeys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };

    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': this.fpKeys.forward = true; break;
        case 'KeyS': this.fpKeys.backward = true; break;
        case 'KeyA': this.fpKeys.left = true; break;
        case 'KeyD': this.fpKeys.right = true; break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.fpKeys.forward = false; break;
        case 'KeyS': this.fpKeys.backward = false; break;
        case 'KeyA': this.fpKeys.left = false; break;
        case 'KeyD': this.fpKeys.right = false; break;
      }
    });
  }

  animateToPosition(targetPos, targetLookAt, duration = 2, onComplete) {
    const startPos = this.instance.position.clone();
    const startLook = this.controls.target.clone();
    const clock = new THREE.Clock();

    const tick = () => {
      const elapsed = clock.getElapsedTime();
      const t = Math.min(elapsed / duration, 1);

      this.instance.position.lerpVectors(startPos, targetPos, t);
      this.controls.target.lerpVectors(startLook, targetLookAt, t);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        this.controls.enabled = true;
        if (onComplete) onComplete();
      }
    };

    tick();
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update(delta) {
    if (this.fpEnabled) {
      const speed = 5.0;
      this.fpDirection.z = Number(this.fpKeys.backward) - Number(this.fpKeys.forward);
      this.fpDirection.x = Number(this.fpKeys.right) - Number(this.fpKeys.left);
      this.fpDirection.normalize();

      if (this.fpDirection.length() > 0) {
        this.fpVelocity.x = this.fpDirection.x * speed * delta;
        this.fpVelocity.z = this.fpDirection.z * speed * delta;

this.fpControls.object.translateX(this.fpVelocity.x); // ✅ Nueva sintaxis
this.fpControls.object.translateZ(this.fpVelocity.z); // ✅ Nueva sintaxis
      }
    } else {
      this.controls.update();
    }
  }
}
