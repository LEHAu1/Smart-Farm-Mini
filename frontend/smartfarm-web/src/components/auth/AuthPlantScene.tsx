import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createPlantGroup, disposePlantGroup, type ProceduralPlant } from '../common/plant-builder';
import type { PlantMood } from './auth-plant-mood';
import { AuthPlantFallback } from './AuthPlantFallback';

export interface AuthPlantSceneProps {
  className?: string;
  mood?: PlantMood;
  progress?: number;
}

export function AuthPlantScene({
  className = '',
  mood = 'idle',
  progress = 0,
}: AuthPlantSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);

  // Keep live refs for props to access seamlessly inside animation loop
  const moodRef = useRef<PlantMood>(mood);
  moodRef.current = mood;
  const progressRef = useRef<number>(progress);
  progressRef.current = progress;

  // Track error wilt animation timestamp
  const errorStartRef = useRef<number>(0);
  const prevMoodRef = useRef<PlantMood>(mood);

  useEffect(() => {
    if (mood === 'error' && prevMoodRef.current !== 'error') {
      errorStartRef.current = performance.now();
    }
    prevMoodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setHasWebGL(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

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

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 360;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 5.0);
    camera.lookAt(0, 0.45, 0);

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

    // 2. Lighting & Rim Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    // Key Light from front-right
    const dirLight = new THREE.DirectionalLight(0xd1fae5, 2.0);
    dirLight.position.set(2.5, 4, 3.5);
    scene.add(dirLight);

    // Warm soft fill from left
    const pointLight = new THREE.PointLight(0x34d399, 2.4, 10);
    pointLight.position.set(-2, 2.2, 2);
    scene.add(pointLight);

    // Rim Light (Backlight behind the plant to separate its silhouette cleanly against dark scene)
    const rimLight = new THREE.DirectionalLight(0x6ee7b7, 3.2);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // 3. Shared Procedural Plant with Flower & Auth Garden Enhancements
    const plant: ProceduralPlant = createPlantGroup({
      includeFlower: true,
      isAuthGarden: true,
    });
    const plantGroup = plant.group;
    scene.add(plantGroup);

    // 4. Subtle Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = Math.max(-1, Math.min(1, x));
      mouseY = Math.max(-1, Math.min(1, y));
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 5. Visibility and Resizing
    let isVisible = true;
    let animFrameId: number;

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting && !document.hidden;
      });
      observer.observe(container);
    }

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 6. Animation Loop
    let clock = new THREE.Clock();
    let currentTiltZ = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();
      const currentMood = moodRef.current;
      const currentProgress = progressRef.current;
      const now = performance.now();

      // Continuous gentle idle spin
      plantGroup.rotation.y += delta * 0.35;

      // Mouse Parallax Lerp
      const targetTiltY = mouseX * 0.25;
      const targetTiltX = -mouseY * 0.15;
      currentTiltX += (targetTiltX - currentTiltX) * 0.05;
      currentTiltY += (targetTiltY - currentTiltY) * 0.05;
      plantGroup.rotation.x = currentTiltX;
      plantGroup.rotation.y += currentTiltY * 0.02;

      // Mood Reactivity
      let targetZ = 0;
      if (currentMood === 'focus') {
        // Leans gently toward the form (to the right / slightly downward)
        targetZ = -0.12;
        pointLight.color.setHex(0x38bdf8); // Sky blue focus
      } else if (currentMood === 'success') {
        targetZ = 0;
        pointLight.color.setHex(0x34d399); // Emerald success
      } else if (currentMood === 'error') {
        pointLight.color.setHex(0xf87171); // Soft rose error
      } else {
        pointLight.color.setHex(0x34d399); // Default emerald
      }

      currentTiltZ += (targetZ - currentTiltZ) * 0.08;
      plantGroup.rotation.z = currentTiltZ;

      // Error Wilt Animation (~600ms leaf droop then smooth recovery)
      const errorElapsed = now - errorStartRef.current;
      let leafDroop = 0;
      if (errorElapsed < 600) {
        // Sine curve peaking at ~300ms
        const progressFrac = errorElapsed / 600;
        leafDroop = Math.sin(progressFrac * Math.PI) * 0.35;
      }

      plant.leaves.forEach((leaf, idx) => {
        // Apply droop to rotation and Y position
        leaf.rotation.x = (idx % 2 === 0 ? 0.2 : -0.2) + leafDroop;
        leaf.position.y = (0.95 + idx * 0.15) - leafDroop * 0.15;
      });

      // Growth Progress & Blooming Flower
      if (plant.flower) {
        const flowerTargetScale = Math.max(0.001, Math.min(1.2, currentProgress * 1.1 + (currentMood === 'success' ? 0.3 : 0)));
        const currentScale = plant.flower.scale.x;
        const newScale = currentScale + (flowerTargetScale - currentScale) * 0.1;
        plant.flower.scale.set(newScale, newScale, newScale);
        plant.flower.rotation.y += delta * 0.8;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animFrameId);
      if (observer) {
        observer.disconnect();
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', handleMouseMove);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      disposePlantGroup(plant);
      renderer.dispose();
    };
  }, []);

  if (!hasWebGL) {
    return <AuthPlantFallback className={className} mood={mood} progress={progress} />;
  }

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center overflow-hidden select-none pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%', minHeight: '300px' }}
      aria-label="Cảnh 3D mầm xanh tương tác"
    />
  );
}
