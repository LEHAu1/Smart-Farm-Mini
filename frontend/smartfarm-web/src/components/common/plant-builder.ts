import * as THREE from 'three';

export interface PlantBuilderOptions {
  particleCount?: number;
  stemColor?: number;
  leafColor?: number;
  potColor?: number;
  pedestalColor?: number;
  includeFlower?: boolean;
  flowerColor?: number;
  isAuthGarden?: boolean;
}

export interface ProceduralPlant {
  group: THREE.Group;
  pedestal: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  halo: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  pot: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  soil: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  stem: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  leaves: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[];
  flower?: THREE.Mesh<THREE.DodecahedronGeometry, THREE.MeshStandardMaterial>;
  flowerBuds?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[];
  particles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

/**
 * Creates a reusable 3D procedural plant with pedestal, pot, stem, leaves,
 * floating particles, and optional flower bloom.
 * Used identically by HeroPlantScene (Dashboard) and AuthPlantScene (Login/Register).
 */
export function createPlantGroup(options: PlantBuilderOptions = {}): ProceduralPlant {
  const {
    particleCount = 20,
    stemColor = 0x059669,
    leafColor = 0x10b981,
    potColor = 0xf1f5f9,
    pedestalColor = 0x064e3b,
    includeFlower = false,
    flowerColor = 0xfbbf24,
    isAuthGarden = false,
  } = options;

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const group = new THREE.Group();

  // 1. Pedestal (Bệ tròn có rêu sẫm cho Auth Garden)
  const actualPedestalColor = isAuthGarden ? 0x063d2f : pedestalColor;
  const pedestalGeo = new THREE.CylinderGeometry(1.2, 1.35, 0.15, 32);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: actualPedestalColor,
    metalness: 0.25,
    roughness: isAuthGarden ? 0.75 : 0.4,
  });
  geometries.push(pedestalGeo);
  materials.push(pedestalMat);
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.y = -0.55;
  group.add(pedestal);

  // 2. Halo ring on pedestal (Vành phát quang xanh ngọc)
  const haloGeo = new THREE.TorusGeometry(1.22, 0.03, 16, 48);
  const haloMat = new THREE.MeshBasicMaterial({ color: isAuthGarden ? 0x10b981 : 0x34d399 });
  geometries.push(haloGeo);
  materials.push(haloMat);
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.47;
  group.add(halo);

  // 3. Pot (Chậu cây gốm trắng tinh)
  const potGeo = new THREE.CylinderGeometry(0.72, 0.52, 0.9, 24);
  const potMat = new THREE.MeshStandardMaterial({
    color: potColor,
    roughness: 0.3,
    metalness: 0.1,
  });
  geometries.push(potGeo);
  materials.push(potMat);
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.y = -0.05;
  group.add(pot);

  // 4. Soil (Đất mùn hữu cơ)
  const soilGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.05, 24);
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 });
  geometries.push(soilGeo);
  materials.push(soilMat);
  const soil = new THREE.Mesh(soilGeo, soilMat);
  soil.position.y = 0.38;
  group.add(soil);

  // 5. Stem (Thân cây mập mạp)
  const stemGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.9, 12);
  const stemMat = new THREE.MeshStandardMaterial({ color: stemColor, roughness: 0.5 });
  geometries.push(stemGeo);
  materials.push(stemMat);
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.8;
  group.add(stem);

  // 6. Leaves (Tán lá xanh tươi - Dày dặn 5 lá cho Auth Garden)
  const leafGeo = new THREE.SphereGeometry(0.42, 8, 6);
  leafGeo.scale(1.2, 0.22, 0.55);
  geometries.push(leafGeo);

  const leafMat = new THREE.MeshStandardMaterial({
    color: leafColor,
    roughness: 0.35,
    metalness: 0.15,
    flatShading: true,
  });
  materials.push(leafMat);

  const leaf1 = new THREE.Mesh(leafGeo, leafMat);
  leaf1.position.set(-0.35, 0.95, 0.1);
  leaf1.rotation.set(0.2, 0.3, 0.5);
  group.add(leaf1);

  const leaf2 = new THREE.Mesh(leafGeo, leafMat);
  leaf2.position.set(0.35, 1.1, -0.1);
  leaf2.rotation.set(-0.2, -0.4, -0.5);
  group.add(leaf2);

  const leaf3 = new THREE.Mesh(leafGeo, leafMat);
  leaf3.position.set(0.05, 1.3, 0.25);
  leaf3.rotation.set(0.5, 0.1, 0.1);
  group.add(leaf3);

  const leaves = [leaf1, leaf2, leaf3];

  if (isAuthGarden) {
    // Thêm 2 lá nhỏ tạo tán lá xum xuê cho Auth
    const leaf4 = new THREE.Mesh(leafGeo, leafMat);
    leaf4.scale.set(0.75, 0.75, 0.75);
    leaf4.position.set(-0.25, 1.25, -0.2);
    leaf4.rotation.set(-0.3, 0.6, 0.4);
    group.add(leaf4);
    leaves.push(leaf4);

    const leaf5 = new THREE.Mesh(leafGeo, leafMat);
    leaf5.scale.set(0.7, 0.7, 0.7);
    leaf5.position.set(0.28, 0.85, 0.22);
    leaf5.rotation.set(0.4, -0.5, -0.3);
    group.add(leaf5);
    leaves.push(leaf5);
  }

  // 7. Flower & Ivory Blossom Buds
  let flower: THREE.Mesh<THREE.DodecahedronGeometry, THREE.MeshStandardMaterial> | undefined;
  const flowerBuds: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];

  if (includeFlower) {
    const actualFlowerColor = isAuthGarden ? 0xfef9c3 : flowerColor;
    const flowerGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const flowerMat = new THREE.MeshStandardMaterial({
      color: actualFlowerColor,
      emissive: isAuthGarden ? 0xd97706 : 0xd97706,
      emissiveIntensity: isAuthGarden ? 0.28 : 0.35,
      roughness: 0.25,
      metalness: 0.1,
    });
    geometries.push(flowerGeo);
    materials.push(flowerMat);
    flower = new THREE.Mesh(flowerGeo, flowerMat);
    flower.position.set(0, 1.32, 0);
    flower.scale.set(0.001, 0.001, 0.001);
    group.add(flower);

    if (isAuthGarden) {
      // 2 Nụ hoa nhỏ màu trắng ngà nép bên cành
      const budGeo = new THREE.SphereGeometry(0.065, 8, 6);
      const budMat = new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        roughness: 0.4,
        metalness: 0.1,
      });
      geometries.push(budGeo);
      materials.push(budMat);

      const bud1 = new THREE.Mesh(budGeo, budMat);
      bud1.position.set(-0.12, 1.15, 0.08);
      group.add(bud1);
      flowerBuds.push(bud1);

      const bud2 = new THREE.Mesh(budGeo, budMat);
      bud2.position.set(0.14, 1.02, -0.06);
      group.add(bud2);
      flowerBuds.push(bud2);
    }
  }

  // 8. Energy Floating Particles (Phấn hoa / đom đóm vàng nhạt ấm)
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 2.2;
    particlePositions[i + 1] = Math.random() * 2.2 - 0.3;
    particlePositions[i + 2] = (Math.random() - 0.5) * 2.2;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  geometries.push(particleGeo);

  const particleMat = new THREE.PointsMaterial({
    color: isAuthGarden ? 0xfef08a : 0x34d399, // Phấn hoa vàng ấm dịu
    size: 0.05,
    transparent: true,
    opacity: 0.75,
  });
  materials.push(particleMat);

  const particles = new THREE.Points(particleGeo, particleMat);
  group.add(particles);

  return {
    group,
    pedestal,
    halo,
    pot,
    soil,
    stem,
    leaves,
    flower,
    flowerBuds: flowerBuds.length ? flowerBuds : undefined,
    particles,
    geometries,
    materials,
  };
}

/**
 * Cleanly disposes of all geometries and materials created for a procedural plant.
 */
export function disposePlantGroup(plant: ProceduralPlant): void {
  for (const geo of plant.geometries) {
    geo.dispose();
  }
  for (const mat of plant.materials) {
    mat.dispose();
  }
}
