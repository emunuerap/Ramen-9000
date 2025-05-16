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
const uocColor = 0x00ffff; // Color azul holográfico de la UOC

export default class World {
  // Inicialización de la clase World, configurando referencias a la experiencia, escena, renderizador y elementos clave como HUD y holograma
  constructor(experience) {
    this.experience = experience;
    this.scene = experience.scene;
    this.renderer = experience.renderer;
    this.clock = new THREE.Clock();
    this.hologramRotationSpeed = 0.005; // Velocidad base de rotación
    this.rotationAnimation = null; // Para almacenar la animación de rotación
    this.connectionLine = null; // Para la línea holográfica

    // Configuración del entorno con HDRI
    this.environment = new Environment(experience);

    // Creación del HUD y su plano en la escena
    this.hud = createHUDTexture();
    this.createHUDPlane();

    // Grupo para organizar el modelo 3D
    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    // Configuración del raycaster para interacciones
    this.raycaster = new THREE.Raycaster();

    // Carga y configuración inicial del modelo
    this.setupModel();

    // Configuración del holograma con su material y luz dinámica
    this.hologramClock = new THREE.Clock();
    this.hologramParts = [];
    this.addHologramMesh();

    // Configuración de los HUDs de menú e ingredientes, inicialmente ocultos
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

  // Configuración del modelo 3D, incluyendo escalado, reflector del suelo, faroles con luces, letrero UOC y efectos de ramen
  setupModel() {
    const model = this.experience.resources.items.sushiRamenModel?.scene;
    if (!model) return;
  
    // Ajuste de escala y centrado del modelo
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = 5 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    this.modelGroup.add(model);
  
    // Creación de un reflector para simular un suelo reflectante
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
 
    
    // Configuración de faroles con materiales y luces dinámicas
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
        thickness: 0.5,
        emissive: glowColor,
        emissiveIntensity: 2,
        envMapIntensity: 0.5,
        transparent: false
      });
  
      if (this.scene.environment) {
        lanternMat.envMap = this.scene.environment;
        lanternMat.envMap.mapping = THREE.CubeReflectionMapping;
      }
  
      lantern.material = lanternMat;
  
      const point = new THREE.PointLight(glowColor, 4.0, 2.5, 1);
      point.name = "pointLight";
      point.position.set(0, 0, 0);
      point.castShadow = true;
      point.shadow.mapSize.width = 512;
      point.shadow.mapSize.height = 512;
      point.shadow.camera.near = 0.1;
      point.shadow.camera.far = 2.5;
      point.layers.enable(BLOOM_LAYER);
      point.layers.enable(0);
      lantern.add(point);
  
      // Creación de un núcleo brillante para los faroles
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
  
    // Configuración del letrero UOC con material holográfico y efectos de interacción
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
  
    // Aplicación de efectos visuales al ramen
    setupRamenEffects(model, BLOOM_LAYER);
  
    // Asignación de referencias a objetos interactivos
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
    this.floorSign = model.getObjectByName('Floor_Sign');
    const controls = this.experience.camera.controls;
    controls.target.set(0, 0, 0);
    controls.update();
  }

  // Manejo del movimiento del ratón para detectar hover sobre elementos interactivos
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

  // Gestión de clics en diferentes elementos de la escena (HUD, ramen, letreros, holograma)
  onMouseClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.experience.camera.instance);
  
    // Detección de clics en los HUDs de menú o ingredientes
    if (this.menuHUDMesh.visible || this.ingredientHUDMesh.visible) {
      const hudMesh = this.menuHUDMesh.visible ? this.menuHUDMesh : this.ingredientHUDMesh;
      const intersects = this.raycaster.intersectObject(hudMesh);
      if (intersects.length > 0) {
        this.handleHUDClick(intersects[0].uv, hudMesh);
        return;
      }
    }
  
    // Detección de clics en elementos del ramen
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
  
    // Detección de clics en el letrero (Wood_Sign_2, Wood_Pole_2, Wood_Pole_1_2)
    if (this.floorSign) {
      const signIntersects = this.raycaster.intersectObject(this.floorSign, true); // con `true` detecta hijos
      if (signIntersects.length > 0) {
        console.log('Clic detectado en Floor_Sign');
        this.moveCameraToMenu();
        return;
      }
    }
    
  
    // Detección de clics en el ramen bowl para mostrar ingredientes
    if (this.ramenBowlNode && !this.menuHUDMesh.visible && !this.ingredientHUDMesh.visible) {
      const ramenIntersects = this.raycaster.intersectObject(this.ramenBowlNode, true);
      if (ramenIntersects.length > 0) {
        this.moveCameraToIngredients();
        return;
      }
    }
  
    // Detección de clics en el holograma
    if (this.hologramBase) {
      const hologramIntersects = this.raycaster.intersectObjects(this.hologramBase.children, true);
      if (hologramIntersects.length > 0) {
        console.log('Clic detectado en hologramBowl');
        this.handleHologramClick(hologramIntersects[0].object);
        return;
      }
    }

    // Detección de clics en el HUD general
    if (this.hudMesh) {
      const hudIntersects = this.raycaster.intersectObject(this.hudMesh);
      if (hudIntersects.length > 0) {
        console.log('Clic detectado en hudMesh');
        this.handleHUDMeshClick();
        return;
      }
    }
  }

  // Manejo de clics en el holograma con efectos de partículas y animación de rotación
  handleHologramClick(mesh) {
    const clickSound = document.getElementById('click-sound');
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play();
    }
  
    if (this.rotationAnimation) {
      this.rotationAnimation.kill();
    }
  
    this.hologramRotationSpeed = 0.05;
    this.rotationAnimation = gsap.to(this, {
      hologramRotationSpeed: 0.005,
      duration: 3,
      ease: "power2.out",
      onUpdate: () => {
        this.hologramBase.rotation.z += this.hologramRotationSpeed;
      }
    });
  
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

  // Manejo de clics en el HUD general con efectos de conexión y transición
  handleHUDMeshClick() {
    const clickSound = document.getElementById('click-sound');
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play();
    }
  
    if (this.hud && this.hologramBase) {
      this.hud.isConnected = true;
      this.hud.scannerSpeed = 4;
      this.hud.startTime = this.hologramClock.getElapsedTime();
      this.hud.typedLengths = [0, 0, 0, 0];
      this.hud.lineDelays = [0, 0.3, 0.6, 0.8];
      this.hud.needsUpdate = true;
  
      this.hud.lines = [
        'CONEXION INICIADA',
        'Scan: ',
        'Conectando con Holograma...',
        'Estado: Activa'
      ];
  
      const connectSound = document.getElementById('connect-sound');
      if (connectSound) {
        connectSound.currentTime = 0;
        connectSound.play();
      }
  
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
  
      this.createConnectionLine();
  
      gsap.to(this.hudMesh.material, {
        opacity: 1.0,
        duration: 0.5,
        yoyo: true,
        repeat: 1
      });
  
      gsap.delayedCall(5, () => {
        this.hud.isConnected = false;
        this.hud.scannerSpeed = 2;
  
        console.log(`transitionToNormalHUD - isConnected cambiado a false, elapsedTime: ${this.hologramClock.getElapsedTime()}`);
  
        this.transitionToNormalHUD();
  
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
  
      gsap.delayedCall(6, () => {
        if (this.connectionLine) {
          this.scene.remove(this.connectionLine);
          this.connectionLine = null;
        }
      });
    }
  }
  
  // Transición del HUD a su estado normal con desvanecimiento y partículas
  transitionToNormalHUD() {
    gsap.to(this.hudMesh.material, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        this.hud.lines = [
          'RAMEN-9000',
          'Scan: ',
          'Proyecto 3: Aplicación Interactiva',
          'Eduardo Munuera Porlan'
        ];
        this.hud.scanEffect = true;
        this.hud.scanProgress = 0;
        this.hud.typedLengths = [0, 0, 0, 0];
        this.hud.lineDelays = [0, 0.8, 1.6, 2.4];
        this.hud.startTime = this.hologramClock.getElapsedTime();
        this.hud.needsUpdate = true;
  
        gsap.to(this.hudMesh.material, {
          opacity: 0.9,
          duration: 0.7,
          ease: "power2.in",
          onComplete: () => {
            this.hud.scanEffect = false;
          }
        });
  
        this.addTransitionParticles();
      }
    });
  }
  
  // Generación de partículas de transición con mayor cantidad y movimiento
  addTransitionParticles() {
    const particleCount = 30;
    const particleGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
  
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      particle.position.copy(this.hudMesh.position);
      particle.position.x += (Math.random() - 0.5) * 2.4;
      particle.position.y += (Math.random() - 0.5) * 0.75;
      this.scene.add(particle);
  
      gsap.to(particle.position, {
        x: particle.position.x + (Math.random() - 0.5) * 2,
        y: particle.position.y + (Math.random() - 0.5) * 1.5,
        z: particle.position.z + (Math.random() - 0.5) * 1,
        duration: 1.2,
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
  
  // Creación de una línea holográfica entre el HUD y el holograma
  createConnectionLine() {
    if (this.connectionLine) this.scene.remove(this.connectionLine);
  
    const geometry = new THREE.BufferGeometry();
    const points = [];
    const hudPosition = this.hudMesh.position.clone();
    const startPosition = hudPosition.clone();
    startPosition.y -= 0.7;
    const hologramPosition = this.hologramBase.position.clone().add(new THREE.Vector3(0, 0.5, 0));
  
    points.push(startPosition);
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
  
    gsap.to(material, {
      opacity: 0.2,
      duration: 1,
      yoyo: true,
      repeat: 5
    });
  
    for (let i = 0; i < 5; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, blending: THREE.AdditiveBlending })
      );
      particle.position.lerpVectors(startPosition, hologramPosition, i / 5);
      this.scene.add(particle);
      gsap.to(particle.position, {
        y: particle.position.y + 0.2,
        duration: 4,
        onComplete: () => this.scene.remove(particle)
      });
    }
  }

  // Manejo de clics en los botones del HUD
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

  // Manejo de clics en elementos del ramen con animaciones y efectos (sin burbujas)
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

    // Eliminar efectos de burbujas y otros no implementados
    if (mesh.name === 'Fideo_Black_0') {
      this.createNoodleTwistEffect(mesh);
    } else if (mesh.name.includes('Cone')) {
      this.createChopstickSpinEffect(mesh);
    }
  }

  // Animación de giro para los fideos
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

  // Animación de giro para los palillos con luz temporal
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

  // Creación del plano del HUD en la escena
  createHUDPlane() {
    const geo = new THREE.PlaneGeometry(2.4, 0.75);
    const mat = new THREE.MeshBasicMaterial({
      map: this.hud.texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.9
    });
    this.hudMesh = new THREE.Mesh(geo, mat);
    this.hudMesh.position.set(0, 2.5, 0);
    this.scene.add(this.hudMesh);
    console.log('Posición de hudMesh:', this.hudMesh.position);
  }

  // Añadir el holograma con su base, partes y luz dinámica
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
        m.userData.isHologram = true;
        group.add(m);
        this.hologramParts.push(m);
      }
    });
    this.hologramBase = group;
    this.scene.add(group);
  
    this.hologramLight = new THREE.PointLight(0x00ffff, 2, 10);
    this.hologramLight.position.set(0, 5, 0);
    this.scene.add(this.hologramLight);
  }

  // Animación de movimiento de la cámara hacia el menú
  moveCameraToMenu() {
    const signObjects = [this.floorSign].filter(Boolean);
    if (signObjects.length === 0) {
      console.warn('No se encontraron objetos del letrero para posicionar el menú');
      return;
    }

    let averagePosition = new THREE.Vector3();
    signObjects.forEach(obj => {
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      averagePosition.add(worldPos);
    });
    averagePosition.divideScalar(signObjects.length);

    const targetPos = averagePosition.clone().add(new THREE.Vector3(0, 2, -5));
    const targetLookAt = averagePosition.clone().add(new THREE.Vector3(0, 1, 0));

    this.animateMoveHUD(
      this.menuHUDMesh,
      targetPos,
      targetLookAt
    );
  }

  // Animación de movimiento de la cámara hacia los ingredientes
  moveCameraToIngredients() {
    const ramenWorldPos = new THREE.Vector3();
    this.ramenBowlNode.getWorldPosition(ramenWorldPos);

    const offset = new THREE.Vector3(0, 0.8, 3);
    const targetPos = ramenWorldPos.clone().add(offset);
    const targetLookAt = ramenWorldPos.clone().add(new THREE.Vector3(0, 0.8, 0));

    this.animateMoveHUD(this.ingredientHUDMesh, targetPos, targetLookAt, ramenWorldPos);
  }

  // Animación general de movimiento del HUD y la cámara
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
    const duration = 2;

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

  // Manejo del clic en el botón de retroceso
  onBackButtonClick() {
    const clickSound = document.getElementById('click-sound');
    const transitionSound = document.getElementById('transition-sound');
    clickSound?.play();
    transitionSound?.play();
  
    const fadeOutDuration = 0.8; // Desvanecimiento del HUD
  
    // Determinar qué HUD está activo para ajustar la duración de la cámara
    const isIngredientHUD = this.ingredientHUDMesh.visible;
    const cameraAnimationDuration = isIngredientHUD ? 2 : 1.5; // 3 segundos para ingredientHUD, 1 para menuHUD
  
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
      cameraAnimationDuration, // Usamos la duración específica según el HUD
      () => {
        this.experience.camera.controls.enabled = true;
        this.experience.camera.controls.target.set(0, 1.2, 0);
        this.experience.camera.controls.update();
      }
    );
  }

  // Actualización continua de la escena, manejando animaciones y efectos
  update() {
    const elapsed = this.hologramClock.getElapsedTime();
    const time = this.clock.getElapsedTime();
  
    updateRamenEffects(this.scene, this.modelGroup, time); // Actualización de efectos de ramen
  
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
    if (this.hologramBase) this.hologramBase.rotation.z += this.hologramRotationSpeed;
  
    // Actualización dinámica del color y luz del holograma
    if (this.hologramParts.length > 0) {
      const baseColor = new THREE.Color(
        0.2 + 0.5 * Math.sin(elapsed + 2.0),
        0.6 + 0.4 * Math.sin(elapsed + 2.0 + 2.0),
        1.0
      );
  
      this.hologramParts.forEach(p => {
        if (p.material.uniforms?.uColor) {
          p.material.uniforms.uColor.value.copy(baseColor);
        }
      });
  
      if (this.hologramLight) {
        this.hologramLight.color.copy(baseColor);
      }
    }
  
    // Movimiento circular de la luz del holograma
    if (this.hologramLight) {
      const angle = this.hologramBase.rotation.z;
      const radius = 0.2;
      this.hologramLight.position.x = Math.sin(angle) * radius;
      this.hologramLight.position.z = Math.cos(angle) * radius;
      this.hologramLight.position.y = 1.4;
    }
  
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