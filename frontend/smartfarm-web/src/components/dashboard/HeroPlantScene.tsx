import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { HeroPlantFallback } from './HeroPlantFallback';

export interface HeroPlantSceneProps {
  className?: string;
  isIrrigating?: boolean;
}

export default function HeroPlantScene({ className = '', isIrrigating = false }: HeroPlantSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const isIrrigatingRef = useRef(isIrrigating);
  isIrrigatingRef.current = isIrrigating;

  useEffect(() => {
    // Check for prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setHasWebGL(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const width = container.clientWidth || 240;
    const height = container.clientHeight || 240;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 4.6);
    camera.lookAt(0, 0.4, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      setHasWebGL(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa7f3d0, 2.2);
    dirLight.position.set(3, 5, 4);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x34d399, 2.5, 8);
    pointLight.position.set(-2, 2, 2);
    scene.add(pointLight);

    // 3. 3D Model: Group
    const plantGroup = new THREE.Group();
    scene.add(plantGroup);

    // Bệ tròn (Pedestal)
    const pedestalGeo = new THREE.CylinderGeometry(1.2, 1.35, 0.15, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      metalness: 0.3,
      roughness: 0.4,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.55;
    plantGroup.add(pedestal);

    // Vành phát quang trên bệ
    const haloGeo = new THREE.TorusGeometry(1.22, 0.03, 16, 48);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.47;
    plantGroup.add(halo);

    // Chậu cây (Pot)
    const potGeo = new THREE.CylinderGeometry(0.72, 0.52, 0.9, 24);
    const potMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.3,
      metalness: 0.1,
    });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = -0.05;
    plantGroup.add(pot);

    // Đất (Soil)
    const soilGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.05, 24);
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.38;
    plantGroup.add(soil);

    // Thân cây (Stem)
    const stemGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.9, 12);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.5 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.8;
    plantGroup.add(stem);

    // Lá cây (Leaves - Low poly soft shaded)
    const leafGeo = new THREE.SphereGeometry(0.42, 8, 6);
    leafGeo.scale(1.2, 0.22, 0.55);

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.35,
      metalness: 0.15,
      flatShading: true,
    });

    const leaf1 = new THREE.Mesh(leafGeo, leafMat);
    leaf1.position.set(-0.35, 0.95, 0.1);
    leaf1.rotation.set(0.2, 0.3, 0.5);
    plantGroup.add(leaf1);

    const leaf2 = new THREE.Mesh(leafGeo, leafMat);
    leaf2.position.set(0.35, 1.1, -0.1);
    leaf2.rotation.set(-0.2, -0.4, -0.5);
    plantGroup.add(leaf2);

    const leaf3 = new THREE.Mesh(leafGeo, leafMat);
    leaf3.position.set(0.05, 1.3, 0.25);
    leaf3.rotation.set(0.5, 0.1, 0.1);
    plantGroup.add(leaf3);

    // 4. Energy Floating Particles
    const particleCount = 20;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 2.2;
      particlePositions[i + 1] = Math.random() * 2.2 - 0.3;
      particlePositions[i + 2] = (Math.random() - 0.5) * 2.2;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.05,
      transparent: true,
      opacity: 0.75,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    plantGroup.add(particles);

    // 5. Rain Drops System for Quick Irrigation Animation
    const rainCount = 40;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 1.6;
      rainPositions[i + 1] = Math.random() * 2 + 1.2;
      rainPositions[i + 2] = (Math.random() - 0.5) * 1.6;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.065,
      transparent: true,
      opacity: 0,
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    scene.add(rainPoints);

    // 6. Lifecycle & Animation Controls
    let isVisible = true;
    let animFrameId: number;

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting && !document.hidden;
    });
    observer.observe(container);

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Resize handler
    const onResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 240;
      const h = container.clientHeight || 240;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 7. Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const delta = clock.getDelta();
      // Gentle slow 360 degree rotation
      plantGroup.rotation.y += delta * 0.45;

      // Pulse leaves color when irrigating
      if (isIrrigatingRef.current) {
        rainMat.opacity = Math.min(rainMat.opacity + delta * 2, 0.9);
        pointLight.intensity = 4.2;

        // Animate rain drops falling down
        const positions = rainGeo.attributes.position.array as Float32Array;
        for (let i = 1; i < rainCount * 3; i += 3) {
          positions[i] -= delta * 3.5;
          if (positions[i] < 0.2) {
            positions[i] = 2.4;
          }
        }
        rainGeo.attributes.position.needsUpdate = true;
      } else {
        rainMat.opacity = Math.max(rainMat.opacity - delta * 2, 0);
        pointLight.intensity = 2.5;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup
    return () => {
      cancelAnimationFrame(animFrameId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose geometries and materials
      pedestalGeo.dispose();
      pedestalMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      potGeo.dispose();
      potMat.dispose();
      soilGeo.dispose();
      soilMat.dispose();
      stemGeo.dispose();
      stemMat.dispose();
      leafGeo.dispose();
      leafMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      rainGeo.dispose();
      rainMat.dispose();
      renderer.dispose();
    };
  }, []);

  if (!hasWebGL) {
    return <HeroPlantFallback className={className} isIrrigating={isIrrigating} />;
  }

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center overflow-hidden select-none pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%', minHeight: '220px' }}
      aria-label="Cảnh 3D vườn thông minh tương tác"
    />
  );
}
