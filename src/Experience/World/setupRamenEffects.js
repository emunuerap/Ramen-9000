import * as THREE from 'three';

// Configuración de parámetros
const EFFECTS_CONFIG = {
  hover: {
    bowl: {
      scale: 1.1,
      emissiveIntensity: {
        normal: 1.2,
        hover: 3.0
      }
    },
    noodles: {
      scale: 1.2,
      movementAmplitude: 0.3,
      movementSpeed: 1.5,
      emissiveIntensity: {
        normal: 1.5,
        hover: 3.5
      }
    },
    chopsticks: {
      scale: 1.25,
      movementAmplitude: 0.2,
      movementSpeed: 1.2,
      rotationAmount: 0.3,
      emissiveIntensity: {
        normal: 1.5,
        hover: 3.0
      }
    }
  }
};

export function setupRamenEffects(model, BLOOM_LAYER) {
  // 🥣 Cuenco de ramen simplificado
  const ramenBowl = model.getObjectByName('Ramen_Black_0');
  if (ramenBowl?.isMesh) {
    const bowlMat = new THREE.MeshPhysicalMaterial({
      color: 0x333333,
      roughness: 0.7,
      metalness: 0.3,
      emissive: 0x00aaff,
      emissiveIntensity: EFFECTS_CONFIG.hover.bowl.emissiveIntensity.normal,
      envMapIntensity: 0.2
    });
    
    ramenBowl.material = bowlMat;
    ramenBowl.layers.enable(BLOOM_LAYER);
    
    ramenBowl.userData = {
      baseMaterial: bowlMat,
      isHovered: false,
      originalScale: ramenBowl.scale.clone()
    };
  }

  // 🍜 Fideos
  const noodles = model.getObjectByName('Fideo_Black_0');
  if (noodles?.isMesh) {
    const noodleMat = new THREE.MeshPhysicalMaterial({
      color: 0x555555,
      roughness: 0.6,
      metalness: 0.4,
      emissive: 0x00aaff,
      emissiveIntensity: EFFECTS_CONFIG.hover.noodles.emissiveIntensity.normal,
      envMapIntensity: 0.2
    });
    
    noodles.material = noodleMat;
    noodles.layers.enable(BLOOM_LAYER);
    
    noodles.userData = {
      baseMaterial: noodleMat,
      originalPosition: noodles.position.clone(),
      originalScale: noodles.scale.clone(),
      isHovered: false
    };
  }

  // 🥢 Palillos
  const chopsticks = ['Cone_1_Black_0', 'Cone_Black_0'];
  chopsticks.forEach(name => {
    const chopstick = model.getObjectByName(name);
    if (chopstick?.isMesh) {
      const chopstickMat = new THREE.MeshPhysicalMaterial({
        color: 0x555555,
        roughness: 0.5,
        metalness: 0.5,
        emissive: 0x00aaff,
        emissiveIntensity: EFFECTS_CONFIG.hover.chopsticks.emissiveIntensity.normal,
        envMapIntensity: 0.2
      });
      
      chopstick.material = chopstickMat;
      chopstick.layers.enable(BLOOM_LAYER);
      
      chopstick.userData = {
        baseMaterial: chopstickMat,
        originalPosition: chopstick.position.clone(),
        originalScale: chopstick.scale.clone(),
        originalRotation: chopstick.rotation.clone(),
        isHovered: false
      };
    }
  });
}
  export function updateRamenEffects(scene, modelGroup, time) {
    const ramenBowl = modelGroup.getObjectByName('Ramen_Black_0');
    const noodles = modelGroup.getObjectByName('Fideo_Black_0');
    const chopsticks = ['Cone_1_Black_0', 'Cone_Black_0'];
  
    // Efectos del cuenco (solo escala y emisión)
    if (ramenBowl?.userData) {
      // Efecto de escala
      const targetScale = ramenBowl.userData.isHovered 
        ? EFFECTS_CONFIG.hover.bowl.scale 
        : 1.0;
      
      ramenBowl.scale.lerp(
        ramenBowl.userData.originalScale.clone().multiplyScalar(targetScale), 
        0.1
      );
  
      // Efecto de emisión
      if (ramenBowl.userData.baseMaterial?.emissive) {
        ramenBowl.userData.baseMaterial.emissiveIntensity = 
          ramenBowl.userData.isHovered
            ? EFFECTS_CONFIG.hover.bowl.emissiveIntensity.hover
            : EFFECTS_CONFIG.hover.bowl.emissiveIntensity.normal;
      }
    }
  
    // Efectos de fideos
    if (noodles?.userData) {
      // Movimiento vertical
      const movement = Math.sin(time * EFFECTS_CONFIG.hover.noodles.movementSpeed) * 
                      EFFECTS_CONFIG.hover.noodles.movementAmplitude;
      
      noodles.position.y = noodles.userData.originalPosition.y + movement + 
                         (noodles.userData.isHovered ? 0.2 : 0);
  
      // Escala y emisión
      if (noodles.userData.baseMaterial?.emissive) {
        const targetScale = noodles.userData.isHovered 
          ? EFFECTS_CONFIG.hover.noodles.scale 
          : 1.0;
        
        noodles.scale.lerp(
          noodles.userData.originalScale.clone().multiplyScalar(targetScale), 
          0.1
        );
  
        noodles.userData.baseMaterial.emissiveIntensity = 
          noodles.userData.isHovered
            ? EFFECTS_CONFIG.hover.noodles.emissiveIntensity.hover
            : EFFECTS_CONFIG.hover.noodles.emissiveIntensity.normal;
      }
    }
  
    // Efectos de palillos
    chopsticks.forEach(name => {
      const chopstick = modelGroup.getObjectByName(name);
      if (chopstick?.userData) {
        // Movimiento vertical
        const movement = Math.sin(time * EFFECTS_CONFIG.hover.chopsticks.movementSpeed) * 
                        EFFECTS_CONFIG.hover.chopsticks.movementAmplitude;
        
        chopstick.position.y = chopstick.userData.originalPosition.y + movement + 
                             (chopstick.userData.isHovered ? 0.15 : 0);
  
        // Rotación, escala y emisión
        if (chopstick.userData.baseMaterial?.emissive) {
          // Rotación
          if (chopstick.userData.isHovered) {
            chopstick.rotation.z = chopstick.userData.originalRotation.z + 
                                 Math.sin(time * 3) * EFFECTS_CONFIG.hover.chopsticks.rotationAmount;
          } else {
            chopstick.rotation.copy(chopstick.userData.originalRotation);
          }
  
          // Escala
          const targetScale = chopstick.userData.isHovered 
            ? EFFECTS_CONFIG.hover.chopsticks.scale 
            : 1.0;
          
          chopstick.scale.lerp(
            chopstick.userData.originalScale.clone().multiplyScalar(targetScale), 
            0.1
          );
  
          // Emisión
          chopstick.userData.baseMaterial.emissiveIntensity = 
            chopstick.userData.isHovered
              ? EFFECTS_CONFIG.hover.chopsticks.emissiveIntensity.hover
              : EFFECTS_CONFIG.hover.chopsticks.emissiveIntensity.normal;
        }
      }
    });
  }