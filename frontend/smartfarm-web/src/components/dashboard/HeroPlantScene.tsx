import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { HeroPlantFallback } from './HeroPlantFallback';
import { createPlantGroup, disposePlantGroup } from '../common/plant-builder';

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

    // 3. 3D Model: Shared Procedural Plant Group
    const plant = createPlantGroup();
    const plantGroup = plant.group;
    scene.add(plantGroup);

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
      disposePlantGroup(plant);
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
