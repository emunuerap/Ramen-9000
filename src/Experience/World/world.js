import * as THREE from 'three';
import { gsap } from 'gsap';
import { createUOCText } from './createUOCText.js';
import CustomReflector from './customReflector.js';
import { setupRamenEffects, updateRamenEffects } from './setupRamenEffects.js';
import Environment from './environment.js';
import createHologramMaterial from './hologramMaterial.js';
import createHUDTexture from './hudCanvasTexture.js';
import createMenuHUD from './menuHUD.js';
import createIngredientHUD from './ingredientHUD.js';

const BLOOM_LAYER = 1;
const uocColor = 0x00ffff; // color azul holográfico de la UOC

export default class World {
  constructor(experience) {
    this.experience = experience;
    this.scene = experience.scene;
    this.renderer = experience.renderer;
    this.clock = new THREE.Clock();
    this.hologramRotationSpeed = 0.005; // Velocidad base de rotación
    this.rotationAnimation = null; // Para almacenar la animación de rotación
    this.connectionLine = null; // Para la línea holográfica

    // Setup environment (HDRI)
    this.environment = new Environment(experience);

    // HUD
    this.hud = createHUDTexture();
    this.createHUDPlane();

    // Group for model
    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    // Raycaster
    this.raycaster = new THREE.Raycaster();

    // Load and setup model
    this.setupModel();

    // Hologram
    this.hologramClock = new THREE.Clock();
    this.hologramParts = [];
    this.addHologramMesh();

    // Menu HUDs
    // Eliminamos createMenuNode() porque ya no usaremos la esfera
    this.menuHUDMesh = createMenuHUD(this.backButtonArea = {});
    this.menuHUDMesh.visible = false;
    this.menuHUDMesh.material.opacity = 0;
    this.scene.add(this.menuHUDMesh);

    this.ingredientHUDMesh = createIngredientHUD(this.ingredientBackButtonArea = {});
    this.ingredientHUDMesh.visible = false;
    this.ingredientHUDMesh.material.opacity = 0;
    this.scene.add(this.ingredientHUDMesh);

    this.mouse = new THREE.Vector2();
    window.addEventListener('click', this.onMouseClick.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  setupModel() {
    const model = this.experience.resources.items.sushiRamenModel?.scene;
    if (!model) return;
  
    // Escalado y centrado
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = 5 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    this.modelGroup.add(model);
  
    // Crear reflector
    const ground = model.getObjectByName('Ground_Grey_0');
    if (ground?.isMesh) {
      const groundGeometry = new THREE.PlaneGeometry(5, 5);
      groundGeometry.computeVertexNormals();
  
      this.groundReflector = new CustomReflector(groundGeometry, {
        clipBias: 0.003,
        textureWidth: window.innerWidth * window.devicePixelRatio,
        textureHeight: window.innerHeight * window.devicePixelRatio,
        color: new THREE.Color(0x777777),
        opacity: 0.2
      });
  
      ground.updateWorldMatrix(true, true);
      const worldPos = new THREE.Vector3();
      ground.getWorldPosition(worldPos);
  
      this.groundReflector.position.copy(worldPos);
      this.groundReflector.rotation.x = -Math.PI / 2;
      this.groundReflector.scale.set(1, 1, 1);
      this.groundReflector.position.y += 0.03;
      this.groundReflector.material.transparent = true;
      this.scene.add(this.groundReflector);
    }
  
    // Faroles
    const lanternNames = ['Lantern_7_Red_0', 'Lantern_5_Red_0', 'Lantern_4_Red_0', 'Lantern_6_Red_0', 'Lantern_2_2_Red_0', 'Lantern_Red_0'];
    const shellColor = 0xff88a8;
    const glowColor = 0xff5f8e;
    const secondColor = 0x00ffff;
    lanternNames.forEach(name => {
      const lantern = model.getObjectByName(name);
      if (!lantern?.isMesh) return;

      window.addEventListener('click', (event) => {
        const lanternObj = this.modelGroup.getObjectByName(name);
        if (!lanternObj?.isMesh) return;
    
        const intersects = this.raycaster.intersectObject(lanternObj);
        if (intersects.length > 0) {
          // Cambiar el color de la luz a verde cuando se haga clic en el farol
          const pointLight = lantern.getObjectByName('pointLight');
          const clickSound = document.getElementById('click-sound');
          if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play();
          }
          if (pointLight) {
            if (pointLight.color.getHex() === glowColor) {
              pointLight.color.set(secondColor);
              lanternObj.material.emissive.set(secondColor);
            } else {
              pointLight.color.set(glowColor);
              lanternObj.material.emissive.set(glowColor);
            }
            console.log(`✅ Farol ${name} clickeado, color de luz cambiado a ${pointLight.color}`);
          }
        }
      });
  
      const lanternMat = new THREE.MeshPhysicalMaterial({
        color: shellColor,
        roughness: 0.3,
        metalness: 0,
        transmission: 0.1,
        thickness: 0.1,
        emissive: glowColor,
        emissiveIntensity: 2.5,
        envMapIntensity: 0.5,
        transparent: false
      });
  
      if (this.scene.environment) {
        lanternMat.envMap = this.scene.environment;
        lanternMat.envMap.mapping = THREE.CubeReflectionMapping;
      }
  
      lantern.material = lanternMat;
  
      const point = new THREE.PointLight(glowColor, 4.0, 2.5, 1);
      point.position.set(0, 0, 0);
      point.name = "pointLight";
      point.castShadow = true;
      point.shadow.mapSize.width = 512;
      point.shadow.mapSize.height = 512;
      point.shadow.camera.near = 0.1;
      point.shadow.camera.far = 2.5;
      point.layers.enable(BLOOM_LAYER);
      point.layers.enable(0);
      lantern.add(point);
  
      // Usar MeshStandardMaterial para el núcleo
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 12, 12),
        new THREE.MeshStandardMaterial({
          color: glowColor,
          emissive: glowColor,
          emissiveIntensity: 3.0,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      core.layers.enable(BLOOM_LAYER);
      core.layers.enable(0);
      lantern.add(core);
  
      gsap.to(core.material, {
        emissiveIntensity: 2.5,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: "power1.inOut"
      });
  
      if (name === 'Lantern_7_Red_0') {
        point.intensity = 6.0;
        point.distance = 3.0;
        point.shadow.camera.far = 3.0;
      }
  
      lantern.layers.enable(BLOOM_LAYER);
      lantern.layers.enable(0);
    });
  
    // UOC_Sign
    const uocSign = model.getObjectByName('UOC_Sign');
    if (!uocSign?.isMesh) {
      console.warn('⚠️ UOC_Sign no encontrado');
    } else {
      const holoMat = new THREE.MeshBasicMaterial({
        color: uocColor,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      uocSign.material = holoMat;
      uocSign.layers.enable(BLOOM_LAYER);
  
      const halo1 = uocSign.clone();
      halo1.geometry = uocSign.geometry.clone();
      halo1.material = holoMat.clone();
      halo1.material.opacity = 0.7;
      halo1.scale.multiplyScalar(1.08);
      halo1.layers.enable(BLOOM_LAYER);
      uocSign.parent.add(halo1);
  
      const halo2 = uocSign.clone();
      halo2.geometry = uocSign.geometry.clone();
      halo2.material = holoMat.clone();
      halo2.material.opacity = 0.3;
      halo2.scale.multiplyScalar(1.10);
      halo2.layers.enable(BLOOM_LAYER);
      uocSign.parent.add(halo2);
  
      uocSign.userData = {
        baseMaterial: holoMat,
        haloMaterial: halo1.material,
        halo2Material: halo2.material,
        isClicked: false,
        clickTime: 0,
        isOn: true,
        fadeProgress: 1
      };
  
      this.experience.canvas.addEventListener('click', (e) => {
        const mx = (e.clientX / window.innerWidth) * 2 - 1;
        const my = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera({ x: mx, y: my }, this.experience.camera.instance);
        const intersects = this.raycaster.intersectObject(uocSign, true);
        if (intersects.length > 0) {
          const clickSound = document.getElementById('click-sound');
          if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play();
          }
  
          uocSign.userData.isClicked = !uocSign.userData.isClicked;
          uocSign.userData.clickTime = this.clock.getElapsedTime();
        }
      });
  
      createUOCText({
        uocSign,
        camera: this.experience.camera.instance,
        raycaster: this.raycaster,
        canvas: this.experience.canvas,
        scene: this.scene
      });
    }
  
    // Efectos Ramen
    setupRamenEffects(model, BLOOM_LAYER);
  
    // Otros nodos
    this.mano = model.getObjectByName('Mano_2');
    this.manoGirando = false;
    window.addEventListener('click', (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
      this.raycaster.setFromCamera(this.mouse, this.experience.camera.instance);
    
      const intersects = this.raycaster.intersectObject(this.mano, true);
      if (intersects.length > 0) {
        if (!this.manoGirando) {
          const clickSound = document.getElementById('click-sound');
          if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play();
          }
          this.manoGirando = true;
          gsap.to(this.mano.rotation, {
            z: this.mano.rotation.z - Math.PI * 2,
            duration: 2,
            ease: 'power2.inOut',
            onComplete: () => {
              this.manoGirando = false;
            }
          });
        }
      }
    });
    this.ramenBowlNode = model.getObjectByName('Ramen_1');
    this.woodSign = model.getObjectByName('Wood_Sign_2');
    this.woodPole1 = model.getObjectByName('Wood_Pole_2');
    this.woodPole2 = model.getObjectByName('Wood_Pole_1_2');
    const controls = this.experience.camera.controls;
    controls.target.set(0, 0, 0);
    controls.update();
  }

  onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.experience.camera.instance);

    const interactiveElements = [
      this.modelGroup.getObjectByName('Ramen_Black_0'),
      this.modelGroup.getObjectByName('Fideo_Black_0'),
      this.modelGroup.getObjectByName('Cone_1_Black_0'),
      this.modelGroup.getObjectByName('Cone_Black_0')
    ].filter(Boolean);

    interactiveElements.forEach(element => {
      const intersects = this.raycaster.intersectObject(element, true);
      element.userData.isHovered = intersects.length > 0;
    });

    const isAnyHovered = interactiveElements.some(el => el.userData.isHovered);
    this.experience.camera.controls.dampingFactor = isAnyHovered ? 0.3 : 0.95;
  }

  onMouseClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.experience.camera.instance);
  
    // Verificar clics en HUDs
    if (this.menuHUDMesh.visible || this.ingredientHUDMesh.visible) {
      const hudMesh = this.menuHUDMesh.visible ? this.menuHUDMesh : this.ingredientHUDMesh;
      const intersects = this.raycaster.intersectObject(hudMesh);
      if (intersects.length > 0) {
        this.handleHUDClick(intersects[0].uv, hudMesh);
        return;
      }
    }
  
    // Verificar clics en elementos del ramen
    const ramenElements = [
      this.modelGroup.getObjectByName('Ramen_Black_0'),
      this.modelGroup.getObjectByName('Fideo_Black_0'),
      ...['Cone_1_Black_0', 'Cone_Black_0'].map(name => this.modelGroup.getObjectByName(name))
    ].filter(Boolean);
    const ramenIntersects = this.raycaster.intersectObjects(ramenElements);
    if (ramenIntersects.length > 0) {
      this.handleRamenElementClick(ramenIntersects[0].object);
      return;
    }
  
    // Verificar clics en el letrero (Wood_Sign_2, Wood_Pole_2, Wood_Pole_1_2)
    const signObjects = [this.woodSign, this.woodPole1, this.woodPole2].filter(Boolean);
    const signIntersects = this.raycaster.intersectObjects(signObjects);
    if (signIntersects.length > 0) {
      console.log('Clic detectado en letrero');
      this.moveCameraToMenu();
      return;
    }
  
    // Verificar clics en el ramen bowl para ingredientes
    if (this.ramenBowlNode && !this.menuHUDMesh.visible && !this.ingredientHUDMesh.visible) {
      const ramenIntersects = this.raycaster.intersectObject(this.ramenBowlNode, true);
      if (ramenIntersects.length > 0) {
        this.moveCameraToIngredients();
        return;
      }
    }
  
    // Verificar clics en el hologramBowl
    if (this.hologramBase) {
      const hologramIntersects = this.raycaster.intersectObjects(this.hologramBase.children, true);
      if (hologramIntersects.length > 0) {
        console.log('Clic detectado en hologramBowl');
        this.handleHologramClick(hologramIntersects[0].object); // Aseguramos que se llame al método
        return;
      }
    }

    // Verificar clics en el hudMesh
  if (this.hudMesh) {
    const hudIntersects = this.raycaster.intersectObject(this.hudMesh);
    if (hudIntersects.length > 0) {
      console.log('Clic detectado en hudMesh');
      this.handleHUDMeshClick();
      return;
    }
  }
  }

  handleHologramClick(mesh) {
    const clickSound = document.getElementById('click-sound');
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play();
    }
  
    // Detener cualquier animación previa de velocidad
    if (this.rotationAnimation) {
      this.rotationAnimation.kill();
    }
  
    // Acelerar la rotación temporalmente
    this.hologramRotationSpeed = 0.05; // Velocidad máxima al hacer clic
    this.rotationAnimation = gsap.to(this, {
      hologramRotationSpeed: 0.005, // Volver a la velocidad inicial
      duration: 3, // 3 segundos para volver a la velocidad normal
      ease: "power2.out",
      onUpdate: () => {
        this.hologramBase.rotation.z += this.hologramRotationSpeed;
      }
    });
  
    // Crear partículas
    const particleCount = 10;
    const particleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
  
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      particle.position.copy(this.hologramBase.position);
      particle.position.x += (Math.random() - 0.5) * 0.5;
      particle.position.y += (Math.random() - 0.5) * 0.5;
      particle.position.z += (Math.random() - 0.5) * 0.5;
      this.scene.add(particle);
  
      gsap.to(particle.position, {
        x: particle.position.x + (Math.random() - 0.5) * 1,
        y: particle.position.y + (Math.random() - 0.5) * 1,
        z: particle.position.z + (Math.random() - 0.5) * 1,
        duration: 1,
        ease: "power1.out"
      });
      gsap.to(particle.material, {
        opacity: 0,
        duration: 1,
        ease: "power1.out",
        onComplete: () => this.scene.remove(particle)
      });
    }
  }
  handleHUDMeshClick() {
    const clickSound = document.getElementById('click-sound');
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play();
    }
  
    // Activar estado de conexión
    if (this.hud && this.hologramBase) {
      this.hud.isConnected = true;
      this.hud.scannerSpeed = 4; // Acelerar escáner
      this.hud.startTime = this.hologramClock.getElapsedTime(); // Reiniciar tiempo
      this.hud.typedLengths = [0, 0, 0, 0]; // Reiniciar escritura progresiva
      this.hud.lineDelays = [0, 0.3, 0.6, 0.8]; // Retrasos
      this.hud.needsUpdate = true; // Forzar actualización
  
  
      // Establecer las líneas de conexión
      this.hud.lines = [
        'CONEXION INICIADA',
        'Scan: ',
        'Conectando con Holograma...',
        'Estado: Activa'
      ];
  
      // Reproducir sonido de conexión
      const connectSound = document.getElementById('connect-sound');
      if (connectSound) {
        connectSound.currentTime = 0;
        connectSound.play();
      }
  
      // Aumentar brillo y velocidad del hologramBowl
      this.hologramParts.forEach(part => {
        gsap.to(part.material.uniforms.uOpacity, {
          value: 1.0,
          duration: 0.5
        });
      });
      gsap.to(this, {
        hologramRotationSpeed: 0.04,
        duration: 0.5
      });
  
      // Crear línea holográfica
      this.createConnectionLine();
  
      // Efecto de brillo en el HUD
      gsap.to(this.hudMesh.material, {
        opacity: 1.0,
        duration: 0.5,
        yoyo: true,
        repeat: 1
      });
  
      // Volver al estado normal con transición después de 5 segundos (antes era 4)
      gsap.delayedCall(5, () => {
        this.hud.isConnected = false;
        this.hud.scannerSpeed = 2;
  
        // Depuración: Confirmar que isConnected se cambia a false
        console.log(`transitionToNormalHUD - isConnected cambiado a false, elapsedTime: ${this.hologramClock.getElapsedTime()}`);
  
        // Efecto de desvanecimiento y transición
        this.transitionToNormalHUD();
  
        // Restaurar velocidad y opacidad del holograma
        this.hologramParts.forEach(part => {
          gsap.to(part.material.uniforms.uOpacity, {
            value: 0.9,
            duration: 0.5
          });
        });
        gsap.to(this, {
          hologramRotationSpeed: 0.005,
          duration: 0.5
        });
      });
  
      // Eliminar la línea de conexión después de 6 segundos
      gsap.delayedCall(6, () => {
        if (this.connectionLine) {
          this.scene.remove(this.connectionLine);
          this.connectionLine = null;
        }
      });
    }
  }
  
  transitionToNormalHUD() {
    // Desvanecer opacidad del HUD
    gsap.to(this.hudMesh.material, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        // Cambiar las letras a las originales y activar el efecto de escaneo
        this.hud.lines = [
          'RAMEN-9000',
          'Scan: ',
          'Proyecto 3: Aplicación Interactiva',
          'Eduardo Munuera Porlan'
        ];
        this.hud.scanEffect = true; // Activar el escaneo horizontal
        this.hud.scanProgress = 0;  // Reiniciar el progreso
        this.hud.typedLengths = [0, 0, 0, 0]; // Reiniciar escritura progresiva
        this.hud.lineDelays = [0, 0.8, 1.6, 2.4]; // Retrasos
        this.hud.startTime = this.hologramClock.getElapsedTime(); // Reiniciar tiempo
        this.hud.needsUpdate = true;
  
        // Restaurar opacidad con transición más rápida
        gsap.to(this.hudMesh.material, {
          opacity: 0.9,
          duration: 0.7,
          ease: "power2.in",
          onComplete: () => {
            this.hud.scanEffect = false; // Asegurar que el escaneo termine
          }
        });
  
        // Añadir más partículas con movimiento más pronunciado
        this.addTransitionParticles();
      }
    });
  }
  
  // Ajustar addTransitionParticles para más partículas y movimiento
  addTransitionParticles() {
    const particleCount = 30; // Aumentar a 30 partículas
    const particleGeometry = new THREE.SphereGeometry(0.015, 8, 8); // Tamaño ligeramente mayor
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
  
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      particle.position.copy(this.hudMesh.position);
      particle.position.x += (Math.random() - 0.5) * 2.4; // Ancho del HUD
      particle.position.y += (Math.random() - 0.5) * 0.75; // Alto del HUD
      this.scene.add(particle);
  
      gsap.to(particle.position, {
        x: particle.position.x + (Math.random() - 0.5) * 2, // Mayor desplazamiento
        y: particle.position.y + (Math.random() - 0.5) * 1.5, // Mayor desplazamiento
        z: particle.position.z + (Math.random() - 0.5) * 1, // Añadir profundidad
        duration: 1.2, // Reducir duración para movimiento más rápido
        ease: "power2.out"
      });
      gsap.to(particle.material, {
        opacity: 0,
        duration: 1.2,
        ease: "power1.out",
        onComplete: () => this.scene.remove(particle)
      });
    }
  }
  
  createConnectionLine() {
    if (this.connectionLine) this.scene.remove(this.connectionLine);
  
    const geometry = new THREE.BufferGeometry();
    const points = [];
    const hudPosition = this.hudMesh.position.clone();
    // Bajar el inicio de la línea al borde inferior del hudMesh (y = 2.125) o más abajo (y = 1.8)
    const startPosition = hudPosition.clone();
    startPosition.y -= 0.7; // Ajustar a y = 1.8 (2.5 - 0.7)
    const hologramPosition = this.hologramBase.position.clone().add(new THREE.Vector3(0, 0.5, 0)); // Ajuste para centrarse en el bowl
  
    points.push(startPosition); // Nuevo inicio más abajo
    points.push(hologramPosition);
  
    geometry.setFromPoints(points);
  
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
  
    this.connectionLine = new THREE.Line(geometry, material);
    this.scene.add(this.connectionLine);
  
    // Animar la línea (hacerla parpadear durante más tiempo)
    gsap.to(material, {
      opacity: 0.2,
      duration: 1,
      yoyo: true,
      repeat: 5 // Repetir más veces para que dure 6 segundos
    });
  
    // Añadir partículas
    for (let i = 0; i < 5; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, blending: THREE.AdditiveBlending })
      );
      particle.position.lerpVectors(startPosition, hologramPosition, i / 5); // Usar el nuevo inicio
      this.scene.add(particle);
      gsap.to(particle.position, {
        y: particle.position.y + 0.2,
        duration: 4, // Duración extendida a 6 segundos
        onComplete: () => this.scene.remove(particle)
      });
    }
  }

  handleHUDClick(uv, hudMesh) {
    const canvasWidth = hudMesh.material.map.image.width;
    const canvasHeight = hudMesh.material.map.image.height;
    const canvasX = uv.x * canvasWidth;
    const canvasY = (1 - uv.y) * canvasHeight;

    const btnArea = this.menuHUDMesh.visible ? this.backButtonArea : this.ingredientBackButtonArea;

    if (
      canvasX >= btnArea.x - btnArea.width / 2 &&
      canvasX <= btnArea.x + btnArea.width / 2 &&
      canvasY >= btnArea.y &&
      canvasY <= btnArea.y + btnArea.height
    ) {
      this.onBackButtonClick();
    }
  }

  handleRamenElementClick(mesh) {
    const clickSound = document.getElementById('click-sound');
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play();
    }

    gsap.to(mesh.scale, {
      x: mesh.userData.originalScale.x * 0.9,
      y: mesh.userData.originalScale.y * 0.9,
      z: mesh.userData.originalScale.z * 0.9,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });

    if (mesh.name === 'Ramen_Black_0') {
      this.createBubbleEffect(mesh.position);
    } else if (mesh.name === 'Fideo_Black_0') {
      this.createNoodleTwistEffect(mesh);
    } else if (mesh.name.includes('Cone')) {
      this.createChopstickSpinEffect(mesh);
    }
  }



  createNoodleTwistEffect(noodles) {
    const originalRotation = noodles.rotation.clone();

    gsap.to(noodles.rotation, {
      z: originalRotation.z + Math.PI * 0.5,
      duration: 0.5,
      ease: "elastic.out(1, 0.5)",
      onComplete: () => {
        gsap.to(noodles.rotation, {
          z: originalRotation.z,
          duration: 1,
          ease: "elastic.out(1, 0.3)"
        });
      }
    });

    gsap.to(noodles.userData.baseMaterial.emissive, {
      r: 0.5,
      g: 1,
      b: 1,
      duration: 0.3,
      yoyo: true,
      repeat: 1
    });
  }

  createChopstickSpinEffect(chopstick) {
    const spinAngle = chopstick.name === 'Cone_1_Black_0' ? Math.PI * 2 : -Math.PI * 2;

    gsap.to(chopstick.rotation, {
      z: chopstick.rotation.z + spinAngle,
      duration: 1,
      ease: "power2.out"
    });

    const pointLight = new THREE.PointLight(0x00ffff, 3, 0.5);
    pointLight.position.copy(chopstick.position);
    this.scene.add(pointLight);

    gsap.to(pointLight, {
      intensity: 0,
      duration: 0.5,
      onComplete: () => this.scene.remove(pointLight)
    });
  }

  createHUDPlane() {
    const geo = new THREE.PlaneGeometry(2.4, 0.75);
    const mat = new THREE.MeshBasicMaterial({
      map: this.hud.texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.9 // Opacidad inicial
    });
    this.hudMesh = new THREE.Mesh(geo, mat);
    this.hudMesh.position.set(0, 2.5, 0);
    this.scene.add(this.hudMesh);
    console.log('Posición de hudMesh:', this.hudMesh.position);
  }
  addHologramMesh() {
    const glb = this.experience.resources.items.hologramBowl?.scene;
    if (!glb) return;
    const group = new THREE.Group();
    group.scale.set(0.5, 0.5, 0.5);
    group.rotation.set(-Math.PI / 2, 0, 0);
    group.position.set(0, 1.5, 0);
    glb.traverse(c => {
      if (c.isMesh) {
        const m = new THREE.Mesh(c.geometry.clone(), createHologramMaterial());
        m.userData.isHologram = true; // Marcamos para detección de clics
        group.add(m);
        this.hologramParts.push(m);
      }
    });
    this.hologramBase = group;
    this.scene.add(group);
  }


  moveCameraToMenu() {
    // Calcular la posición promedio de los objetos del letrero
    const signObjects = [this.woodSign, this.woodPole1, this.woodPole2].filter(Boolean);
    if (signObjects.length === 0) {
      console.warn('No se encontraron objetos del letrero para posicionar el menú');
      return;
    }

    let averagePosition = new THREE.Vector3();
    signObjects.forEach(obj => {
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos); // Usamos getWorldPosition para obtener la posición global
      averagePosition.add(worldPos);
    });
    averagePosition.divideScalar(signObjects.length);

    // Ajustar la posición de la cámara para mirar hacia el letrero
    const targetPos = averagePosition.clone().add(new THREE.Vector3(0, 2, -5)); // Cámara 5 unidades atrás y 1 arriba
    const targetLookAt = averagePosition.clone().add(new THREE.Vector3(0, 1, 0)); // Mirar al centro del letrero

    this.animateMoveHUD(
      this.menuHUDMesh,
      targetPos,
      targetLookAt
    );
  }

  moveCameraToIngredients() {
    const ramenWorldPos = new THREE.Vector3();
    this.ramenBowlNode.getWorldPosition(ramenWorldPos);

    const offset = new THREE.Vector3(0, 0.8, 3);
    const targetPos = ramenWorldPos.clone().add(offset);
    const targetLookAt = ramenWorldPos.clone().add(new THREE.Vector3(0, 0.8, 0));

    this.animateMoveHUD(this.ingredientHUDMesh, targetPos, targetLookAt, ramenWorldPos);
  }

  animateMoveHUD(hudMesh, targetPos, targetLookAt, ramenPos = null) {
    const camera = this.experience.camera.instance;
    const controls = this.experience.camera.controls;
    controls.enabled = true;

    const clickSound = document.getElementById('click-sound');
    const transitionSound = document.getElementById('transition-sound');
    clickSound?.play();
    transitionSound?.play();

    const initialPos = camera.position.clone();
    const initialLook = controls.target.clone();
    let startTime = null;
    const duration = 1;

    const animate = (time) => {
      if (!startTime) startTime = time;
      const t = Math.min((time - startTime) / (duration * 1000), 1);

      camera.position.lerpVectors(initialPos, targetPos, t);
      controls.target.lerpVectors(initialLook, targetLookAt, t);
      controls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        if (ramenPos) {
          hudMesh.position.set(ramenPos.x, ramenPos.y + 0.8, ramenPos.z + 0.1);
          hudMesh.lookAt(camera.position);
        } else {
          const camDir = new THREE.Vector3();
          camera.getWorldDirection(camDir);
          hudMesh.position.copy(camera.position).add(camDir.multiplyScalar(5));
          hudMesh.lookAt(camera.position);
        }

        hudMesh.lookAt(camera.position);

        hudMesh.visible = true;
        hudMesh.material.opacity = 0;
        gsap.to(hudMesh.material, { opacity: 1, duration: 1 });
      }
    };

    requestAnimationFrame(animate);
  }

  onBackButtonClick() {
    const clickSound = document.getElementById('click-sound');
    const transitionSound = document.getElementById('transition-sound');
    clickSound?.play();
    transitionSound?.play();

    const fadeOutDuration = 0.8;

    [this.menuHUDMesh, this.ingredientHUDMesh].forEach(hud => {
      if (hud.visible) {
        gsap.to(hud.material, {
          opacity: 0,
          duration: fadeOutDuration,
          onComplete: () => {
            hud.visible = false;
            hud.material.opacity = 1;
          }
        });
      }
    });

    this.experience.camera.animateToPosition(
      new THREE.Vector3(10, 1, -10),
      new THREE.Vector3(0, 1.2, 0),
      2,
      () => {
        this.experience.camera.controls.enabled = true;
        this.experience.camera.controls.target.set(0, 1.2, 0);
        this.experience.camera.controls.update();
      }
    );
  }

  update() {
    const elapsed = this.hologramClock.getElapsedTime();
    const time = this.clock.getElapsedTime();
  
    updateRamenEffects(this.scene, this.modelGroup, time);
  
    this.modelGroup.traverse(obj => {
      const ud = obj.userData;
      if (!ud?.baseMaterial || !ud.haloMaterial || !ud.halo2Material) return;
  
      const flicker = Math.sin(time * 1.5) * 0.3 + 0.6;
      const randomFlicker = Math.random() < 0.05 ? 0.3 : 1;
      let finalOpacity = flicker * randomFlicker * ud.fadeProgress;
  
      if (ud.isClicked) {
        const clickDuration = 1;
        const sinceClick = time - ud.clickTime;
  
        if (ud.isOn) {
          ud.fadeProgress = Math.max(0.2, 1 - sinceClick / clickDuration);
          if (sinceClick >= clickDuration) {
            ud.isOn = false;
            ud.isClicked = false;
            ud.clickTime = time;
          }
        } else {
          ud.fadeProgress = Math.min(1, 0.2 + sinceClick / clickDuration);
          if (sinceClick >= clickDuration) {
            ud.isOn = true;
            ud.isClicked = false;
          }
        }
        finalOpacity = flicker * randomFlicker * ud.fadeProgress;
      }
  
      ud.baseMaterial.opacity = finalOpacity;
      ud.haloMaterial.opacity = finalOpacity * 0.5;
      ud.halo2Material.opacity = finalOpacity * 0.3;
    });
  
    if (this.hud?.update) this.hud.update(elapsed);
    if (this.hudMesh) this.hudMesh.lookAt(this.experience.camera.instance.position);
    if (this.hologramBase) this.hologramBase.rotation.z += this.hologramRotationSpeed; // Usar la velocidad dinámica
    this.hologramParts.forEach(p => {
      if (p.material.uniforms?.uTime) p.material.uniforms.uTime.value = elapsed;
      if (p.material.uniforms?.uOpacity) p.material.uniforms.uOpacity.value = 0.9 + 0.1 * Math.sin(elapsed * 0.5);
    });
    if (this.menuHUDMesh?.visible) this.menuHUDMesh.lookAt(this.experience.camera.instance.position);
    if (this.ingredientHUDMesh?.visible) this.ingredientHUDMesh.lookAt(this.experience.camera.instance.position);
    if (this.mano && !this.manoGirando) {
      this.mano.rotation.z = Math.sin(elapsed * 2) * 0.8;
    }
    if (this.ingredientHUDMesh?.visible && this.ingredientHUDMesh.updateCanvas) this.ingredientHUDMesh.updateCanvas();
  
    this.scene.traverse(obj => {
      if (obj.userData?.update) obj.userData.update(time);
    });
  }
}