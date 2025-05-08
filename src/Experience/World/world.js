import * as THREE from 'three';
import { gsap } from 'gsap';
import CustomReflector from './customReflector.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import Environment from './environment.js';
import createHologramMaterial from './hologramMaterial.js';
import createHUDTexture from './hudCanvasTexture.js';
import createMenuHUD from './menuHUD.js';
import createIngredientHUD from './ingredientHUD.js';
const BLOOM_LAYER = 1;

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

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    window.addEventListener('click', this.onMouseClick.bind(this));

  
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
  
      // Configurar reflector para el suelo
      const ground = model.getObjectByName('Ground_Grey_0');
      if (ground?.isMesh) {
        // Clonar la geometría del suelo
        const groundGeometry = ground.geometry.clone();
        
        // Crear reflector personalizado
        const reflector = new CustomReflector(groundGeometry, {
          opacity: 0.15, // Ajusta según necesites
          color: new THREE.Color(0x777777)
        });
        
        // Posicionar el reflector ligeramente sobre el suelo
        ground.updateWorldMatrix(true, true);
        const worldPos = new THREE.Vector3();
ground.getWorldPosition(worldPos);

const worldQuat = new THREE.Quaternion();
ground.getWorldQuaternion(worldQuat);

const worldScale = new THREE.Vector3();
ground.getWorldScale(worldScale);

reflector.position.copy(worldPos);
reflector.quaternion.copy(worldQuat);
reflector.scale.copy(worldScale);

// Ajuste muy pequeño para evitar z-fighting
reflector.position.y += 0.01;

// Añadir directamente a la escena (no a ground.parent)
this.scene.add(reflector);

  
  
  
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


  
    // Other nodes
    this.mano = model.getObjectByName('Mano_2');
    this.ramenBowlNode = model.getObjectByName('Ramen_1');
    const controls = this.experience.camera.controls;
    controls.target.set(0, 0, 0);
    controls.update();
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
    const elapsed = this.hologramClock.getElapsedTime();
    const time = this.clock.getElapsedTime();
this.scene.traverse(obj => {
  if (obj.userData.update) obj.userData.update(time);
});
    if (this.hud?.update) this.hud.update(elapsed);
    if (this.hudMesh) this.hudMesh.lookAt(this.experience.camera.instance.position);
    if (this.hologramBase) this.hologramBase.rotation.z += 0.005;

    this.hologramParts.forEach(part => {
      if (part.material.uniforms?.uTime) {
        part.material.uniforms.uTime.value = elapsed;
      }
    });

    if (this.menuHUDMesh?.visible) {
      this.menuHUDMesh.lookAt(this.experience.camera.instance.position);
    }

    if (this.ingredientHUDMesh?.visible) {
      this.ingredientHUDMesh.lookAt(this.experience.camera.instance.position);
    }

    if (this.mano) {
      this.mano.rotation.z = Math.sin(elapsed * 2) * 0.8;
    }

    if (this.ingredientHUDMesh?.visible && this.ingredientHUDMesh.updateCanvas) {
  this.ingredientHUDMesh.updateCanvas();
}

  }
}