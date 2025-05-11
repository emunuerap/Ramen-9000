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
const uocColor   = 0x00ffff; // color azul holográfico de la UOC


export default class World {
  constructor(experience) {
    this.experience = experience;
    this.scene = experience.scene;
    this.renderer = experience.renderer;
    this.clock = new THREE.Clock(); 

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
    this.createMenuNode();
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
  
    // Escalado y centrado (tu código existente)
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
    // Crear una nueva geometría plana (ignoramos los bordes y el grosor)
    const groundGeometry = new THREE.PlaneGeometry(5, 5); // Ajusta el tamaño según la escena
    groundGeometry.computeVertexNormals();

    // Crear reflector personalizado
    this.groundReflector = new CustomReflector(groundGeometry, {
      clipBias: 0.003,
      textureWidth: window.innerWidth * window.devicePixelRatio,
      textureHeight: window.innerHeight * window.devicePixelRatio,
      color: new THREE.Color(0x777777),
      opacity: 0.05
    });

    // Posicionar el reflector usando la posición de Ground_Grey_0
    ground.updateWorldMatrix(true, true);
    const worldPos = new THREE.Vector3();
    ground.getWorldPosition(worldPos);

    this.groundReflector.position.copy(worldPos);
    this.groundReflector.rotation.x = -Math.PI / 2; // Asegurar que esté horizontal (normal hacia Y positivo)
    this.groundReflector.scale.set(1, 1, 1); // Escala uniforme

    // Ajuste para evitar z-fighting
    this.groundReflector.position.y += 0.03;

    // Hacer el material transparente
    this.groundReflector.material.transparent = true;
    this.scene.add(this.groundReflector);
  }
  


// ──────────────────────────────────────────────
// 2) FAROLES (5 superiores + 1 cilíndrico)
// ──────────────────────────────────────────────
const lanternNames = [
  'Lantern_7_Red_0',
  'Lantern_5_Red_0',
  'Lantern_4_Red_0',
  'Lantern_6_Red_0',
  'Lantern_2_2_Red_0',
  'Lantern_Red_0'
];

const shellColor = 0xff88a8;
const glowColor = 0xff5f8e;

lanternNames.forEach(name => {
  const lantern = model.getObjectByName(name);
  if (!lantern?.isMesh) return;

  // Crear material para el farol
  const lanternMat = new THREE.MeshPhysicalMaterial({
    color: shellColor,
    roughness: 0.9,
    metalness: 0,
    transmission: 0.9,
    thickness: 0.1,
    emissive: glowColor,
    emissiveIntensity: 1.2,
    envMapIntensity: 0.1
  });

  // Asignar environment map si existe
  if (this.scene.environment) {
    lanternMat.envMap = this.scene.environment;
    lanternMat.envMap.mapping = THREE.CubeReflectionMapping;
  }

  // Asignar material al farol
  lantern.material = lanternMat;

  // Añadir luz puntual
  const point = new THREE.PointLight(glowColor, 3.5, 2.5, 1);
  point.position.set(0, 0, 0);
  point.castShadow = true;
  point.shadow.mapSize.width = 512;
  point.shadow.mapSize.height = 512;
  point.shadow.camera.near = 0.1;
  point.shadow.camera.far = 2.5;
  point.layers.enable(BLOOM_LAYER);
  point.layers.enable(0);
  lantern.add(point);

  // Añadir núcleo brillante
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 12, 12),
    new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  core.layers.enable(BLOOM_LAYER);
  core.layers.enable(0);
  lantern.add(core);

  // Ajustes especiales para el farol principal
  if (name === 'Lantern_7_Red_0') {
    point.intensity = 5.0;
    point.distance = 3.0;
    point.shadow.camera.far = 3.0;
  }

  // Habilitar capas
  lantern.layers.enable(BLOOM_LAYER);
  lantern.layers.enable(0);
});



// ——— BLOQUE UNIFICADO PARA UOC_Sign ———
{
  const uocSign = model.getObjectByName('UOC_Sign');
  if (!uocSign?.isMesh) {
    console.warn('⚠️ UOC_Sign no encontrado');
  } else {
    // 1) Material holográfico + bloom
    const holoMat = new THREE.MeshBasicMaterial({
      color: uocColor,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    uocSign.material = holoMat;
    uocSign.layers.enable(BLOOM_LAYER);

    // 2) Halos
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

    // 3) userData para flicker
    uocSign.userData = {
      baseMaterial: holoMat,
      haloMaterial: halo1.material,
      halo2Material: halo2.material,
      isClicked: false,
      clickTime: 0,
      isOn: true,
      fadeProgress: 1
    };

    // 4) Clic solo para animación on/off (separado del logo)
    this.experience.canvas.addEventListener('click', (e) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera({ x: mx, y: my }, this.experience.camera.instance);
      const intersects = this.raycaster.intersectObject(uocSign, true);
      if (intersects.length > 0) {
        // Reproducir sonido al hacer clic en UOC_Sign
        const clickSound = document.getElementById('click-sound');
        if (clickSound) {
          clickSound.currentTime = 0;
          clickSound.play();
        }

        uocSign.userData.isClicked = !uocSign.userData.isClicked;
        uocSign.userData.clickTime = this.clock.getElapsedTime();
      }
    });

    // 5) Panel holográfico clicable
    createUOCText({
      uocSign,
      camera: this.experience.camera.instance,
      raycaster: this.raycaster,
      canvas: this.experience.canvas,
      scene: this.scene
    });
  }
}



//Efectos Ramen LETRERO
setupRamenEffects(model, BLOOM_LAYER);

  
    // Other nodes
    this.mano = model.getObjectByName('Mano_2');
    this.ramenBowlNode = model.getObjectByName('Ramen_1');
    const controls = this.experience.camera.controls;
    controls.target.set(0, 0, 0);
    controls.update();
  } 
 
  
  // ─── MÉTODOS DE INTERACCIÓN CON EL RAMEN ──────────────────────

  onMouseMove(event) {
    // Configuración inicial del mouse y raycaster
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.experience.camera.instance);
  
    // Definir todos los elementos interactivos primero
    const interactiveElements = [
      this.modelGroup.getObjectByName('Ramen_Black_0'),
      this.modelGroup.getObjectByName('Fideo_Black_0'),
      this.modelGroup.getObjectByName('Cone_1_Black_0'),
      this.modelGroup.getObjectByName('Cone_Black_0')
    ].filter(Boolean); // Filtra elementos nulos/undefined
  
    // Verificar hover para cada elemento
    interactiveElements.forEach(element => {
      const intersects = this.raycaster.intersectObject(element, true);
      element.userData.isHovered = intersects.length > 0;
      
    });
  
    // Control de amortiguación de cámara basado en hover
    const isAnyHovered = interactiveElements.some(el => el.userData.isHovered);
    this.experience.camera.controls.dampingFactor = isAnyHovered ? 0.3 : 0.95;
  }

  onMouseClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.experience.camera.instance);

    // Primero verificar clicks en HUDs
    if (this.menuHUDMesh.visible || this.ingredientHUDMesh.visible) {
      const hudMesh = this.menuHUDMesh.visible ? this.menuHUDMesh : this.ingredientHUDMesh;
      const intersects = this.raycaster.intersectObject(hudMesh);
      
      if (intersects.length > 0) {
        this.handleHUDClick(intersects[0].uv, hudMesh);
        return;
      }
    }

    // Verificar clicks en elementos del ramen
    const ramenElements = [
      this.modelGroup.getObjectByName('Ramen_Black_0'),
      this.modelGroup.getObjectByName('Fideo_Black_0'),
      ...['Cone_1_Black_0', 'Cone_Black_0'].map(name => 
        this.modelGroup.getObjectByName(name))
    ].filter(Boolean);

    const intersects = this.raycaster.intersectObjects(ramenElements);
    if (intersects.length > 0) {
      this.handleRamenElementClick(intersects[0].object);
      return;
    }

    // Resto de la lógica de click existente...
    if (this.menuNode && !this.menuHUDMesh.visible && !this.ingredientHUDMesh.visible) {
      const menuIntersects = this.raycaster.intersectObject(this.menuNode);
      if (menuIntersects.length > 0) {
        this.moveCameraToMenu();
        return;
      }
    }

    if (this.ramenBowlNode && !this.menuHUDMesh.visible && !this.ingredientHUDMesh.visible) {
      const ramenIntersects = this.raycaster.intersectObject(this.ramenBowlNode, true);
      if (ramenIntersects.length > 0) {
        this.moveCameraToIngredients();
      }
    }
  }

  handleHUDClick(uv, hudMesh) {
    const canvasWidth = hudMesh.material.map.image.width;
    const canvasHeight = hudMesh.material.map.image.height;
    const canvasX = uv.x * canvasWidth;
    const canvasY = (1 - uv.y) * canvasHeight;

    const btnArea = this.menuHUDMesh.visible ? this.backButtonArea : this.ingredientBackButtonArea;

    if (canvasX >= btnArea.x - btnArea.width / 2 &&
        canvasX <= btnArea.x + btnArea.width / 2 &&
        canvasY >= btnArea.y &&
        canvasY <= btnArea.y + btnArea.height) {
      this.onBackButtonClick();
    }
  }

  handleRamenElementClick(mesh) {
    // Sonido de click
    const clickSound = document.getElementById('click-sound');
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play();
    }
    
    // Animación de click
    gsap.to(mesh.scale, {
      x: mesh.userData.originalScale.x * 0.9,
      y: mesh.userData.originalScale.y * 0.9,
      z: mesh.userData.originalScale.z * 0.9,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });
    
    // Efecto especial según el elemento
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
    
    // Aumentar emisión durante el giro
    gsap.to(noodles.userData.baseMaterial.emissive, {
      r: 0.5, g: 1, b: 1,
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
    
    // Destello de luz
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
      blending: THREE.AdditiveBlending
    });
    this.hudMesh = new THREE.Mesh(geo, mat);
    this.hudMesh.position.set(0, 3, 0.5);
    this.scene.add(this.hudMesh);
  }

  addHologramMesh() {
    const glb = this.experience.resources.items.hologramBowl?.scene;
    if (!glb) return;
    const group = new THREE.Group();
    group.scale.set(0.5, 0.5, 0.5);
    group.rotation.set(-Math.PI/2,0,0);
    group.position.set(0,2.75,0);
    glb.traverse(c => {
      if (c.isMesh) {
        const m = new THREE.Mesh(c.geometry.clone(), createHologramMaterial());
        group.add(m);
        this.hologramParts.push(m);
      }
    });
    this.hologramBase = group;
    this.scene.add(group);
  }

  createMenuNode() {
    const geo = new THREE.SphereGeometry(0.2,32,32);
    const mat = new THREE.MeshBasicMaterial({ color:0x00ffff });
    this.menuNode = new THREE.Mesh(geo,mat);
    this.menuNode.position.set(0,2.5,-2);
    this.modelGroup.add(this.menuNode);
  }

  onMouseClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.experience.camera.instance);
  
    if (this.menuHUDMesh.visible || this.ingredientHUDMesh.visible) {
      const hudMesh = this.menuHUDMesh.visible ? this.menuHUDMesh : this.ingredientHUDMesh;
      const intersects = this.raycaster.intersectObject(hudMesh);
  
      if (intersects.length > 0) {
        const uv = intersects[0].uv;
  
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
          console.log("✅ Botón Volver pulsado");
          this.onBackButtonClick();
          return;
        }
      }
    }
  
    if (this.menuNode && !this.menuHUDMesh.visible && !this.ingredientHUDMesh.visible) {
      const intersects = this.raycaster.intersectObject(this.menuNode);
      if (intersects.length > 0) {
        this.moveCameraToMenu();
        return;
      }
    }
  
    if (this.ramenBowlNode && !this.menuHUDMesh.visible && !this.ingredientHUDMesh.visible) {
      const intersects = this.raycaster.intersectObject(this.ramenBowlNode, true);
      if (intersects.length > 0) {
        this.moveCameraToIngredients();
        return;
      }
    }
  }
  
  
  

  moveCameraToMenu() {
    this.menuNode.visible = false;
     this.animateMoveHUD(
         this.menuHUDMesh,
         // Alejamos la cámara 2 unidades más atrás en Z
         new THREE.Vector3(0, 2.5, -7),
         new THREE.Vector3(0, 2.5, 0)
       );
      }
  
  
  

  moveCameraToIngredients() {
    if (this.menuNode) this.menuNode.visible = false;

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
  
    // Sonidos de transición
    const clickSound      = document.getElementById('click-sound');
    const transitionSound = document.getElementById('transition-sound');
    clickSound?.play();
    transitionSound?.play();
  
    const initialPos  = camera.position.clone();
    const initialLook = controls.target.clone();
    let startTime     = null;
    const duration    = 1; // segundos
  
    const animate = (time) => {
      if (!startTime) startTime = time;
      const t = Math.min((time - startTime) / (duration * 1000), 1);
  
      // muevo cámara
      camera.position.lerpVectors(initialPos, targetPos, t);
      controls.target.lerpVectors(initialLook, targetLookAt, t);
      controls.update();
  
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // —— Aquí termina la animación de cámara —— 
  
        if (ramenPos) {
                // Ingredientes: encima del ramen
                hudMesh.position.set(ramenPos.x, ramenPos.y + 0.8, ramenPos.z + 0.1);
                hudMesh.lookAt(camera.position);
              } else {
                // Menú: justo enfrente de la cámara
                const camDir = new THREE.Vector3();
                camera.getWorldDirection(camDir);
                hudMesh.position.copy(camera.position).add(camDir.multiplyScalar(3));
                hudMesh.lookAt(camera.position);
              }
  
        // 2) Orientar siempre hacia la cámara
        hudMesh.lookAt(camera.position);
  
        // 3) Hacerlo visible con fade-in
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
        this.menuNode.visible = true;
        this.experience.camera.controls.enabled = true;
        this.experience.camera.controls.target.set(0, 1.2, 0);
        this.experience.camera.controls.update();
      }
    );
  }

  update() {
    // 1) Efectos holograma (rotación, uniforms, etc)
    const elapsed = this.hologramClock.getElapsedTime();
  
    // 2) Efectos ramen + flickering + otros
    const time = this.clock.getElapsedTime();
    updateRamenEffects(this.scene, this.modelGroup, time);
  
    // ————— Flickering de UOC_Sign —————
    this.modelGroup.traverse(obj => {
      const ud = obj.userData;
      if (!ud?.baseMaterial || !ud.haloMaterial || !ud.halo2Material) return;
  
      const flicker       = Math.sin(time * 1.5) * 0.3 + 0.6;
      const randomFlicker = Math.random() < 0.05 ? 0.3 : 1;
      let finalOpacity    = flicker * randomFlicker * ud.fadeProgress;
  
      if (ud.isClicked) {
        const clickDuration  = 1;
        const sinceClick     = time - ud.clickTime;
  
        if (ud.isOn) {
          ud.fadeProgress = Math.max(0.2, 1 - sinceClick / clickDuration);
          if (sinceClick >= clickDuration) {
            ud.isOn      = false;
            ud.isClicked = false;
            ud.clickTime = time;
          }
        } else {
          ud.fadeProgress = Math.min(1, 0.2 + sinceClick / clickDuration);
          if (sinceClick >= clickDuration) {
            ud.isOn      = true;
            ud.isClicked = false;
          }
        }
        finalOpacity = flicker * randomFlicker * ud.fadeProgress;
      }
  
      ud.baseMaterial.opacity  = finalOpacity;
      ud.haloMaterial.opacity  = finalOpacity * 0.5;
      ud.halo2Material.opacity = finalOpacity * 0.3;
    });
  
    // 3) HUD, hologramBase, manos, etc
    if (this.hud?.update) this.hud.update(elapsed);
    if (this.hudMesh)        this.hudMesh.lookAt(this.experience.camera.instance.position);
    if (this.hologramBase)   this.hologramBase.rotation.z += 0.005;
    this.hologramParts.forEach(p => { if (p.material.uniforms?.uTime) p.material.uniforms.uTime.value = elapsed; });
    if (this.menuHUDMesh?.visible)       this.menuHUDMesh.lookAt(this.experience.camera.instance.position);
    if (this.ingredientHUDMesh?.visible) this.ingredientHUDMesh.lookAt(this.experience.camera.instance.position);
    if (this.mano)                       this.mano.rotation.z = Math.sin(elapsed * 2) * 0.8;
    if (this.ingredientHUDMesh?.visible && this.ingredientHUDMesh.updateCanvas) this.ingredientHUDMesh.updateCanvas();
  
    // 4) *** Aquí llamamos UNA VEZ a todos los userData.update de createUOCText ***
    this.scene.traverse(obj => {
      if (obj.userData?.update) obj.userData.update(time);
    });
  }
  

}