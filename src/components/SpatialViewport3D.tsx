import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  SpatialStudy,
  MaterialFinishSpec,
  LightingPresetSpec,
  CameraPresetSpec,
  CAMERA_PRESETS,
  MATERIAL_FINISHES,
  LIGHTING_PRESETS,
  STUDIO_BACKDROP_IMAGE,
} from '../data/spatialCatalog';
import {
  RotateCcw,
  Layers,
  Eye,
  Compass,
  Play,
  Pause,
  Maximize2,
  Sliders,
  Crosshair,
} from 'lucide-react';

interface ProjectedHotspot {
  id: string;
  index: string;
  name: string;
  x: number;
  y: number;
  visible: boolean;
}

interface SpatialViewport3DProps {
  activeStudy: SpatialStudy;
  studies: SpatialStudy[];
  onSelectStudy: (study: SpatialStudy) => void;
  activeMaterial: MaterialFinishSpec;
  onSelectMaterial: (mat: MaterialFinishSpec) => void;
  activeLighting: LightingPresetSpec;
  onSelectLighting: (light: LightingPresetSpec) => void;
  explodeFactor: number;
  onChangeExplodeFactor: (val: number) => void;
  selectedPartId: string | null;
  onSelectPart: (partId: string | null) => void;
  onOpenExportModal: () => void;
}

function createStudioEnvironmentMap(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#090b10');

  // Overhead softbox studio panel
  const topLightGeo = new THREE.PlaneGeometry(18, 18);
  const topLightMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff').multiplyScalar(3.2),
    side: THREE.DoubleSide,
  });
  const topLight = new THREE.Mesh(topLightGeo, topLightMat);
  topLight.position.set(0, 10, 0);
  topLight.rotation.x = Math.PI / 2;
  envScene.add(topLight);

  // Warm key side strip
  const warmStripGeo = new THREE.PlaneGeometry(14, 5);
  const warmStripMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#fbbf24').multiplyScalar(2.4),
    side: THREE.DoubleSide,
  });
  const warmStrip = new THREE.Mesh(warmStripGeo, warmStripMat);
  warmStrip.position.set(9, 3, 6);
  warmStrip.lookAt(0, 0, 0);
  envScene.add(warmStrip);

  // Cool fill side strip
  const coolStripGeo = new THREE.PlaneGeometry(14, 6);
  const coolStripMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#38bdf8').multiplyScalar(2.0),
    side: THREE.DoubleSide,
  });
  const coolStrip = new THREE.Mesh(coolStripGeo, coolStripMat);
  coolStrip.position.set(-9, 2, -6);
  coolStrip.lookAt(0, 0, 0);
  envScene.add(coolStrip);

  const renderTarget = pmremGenerator.fromScene(envScene, 0.04);
  pmremGenerator.dispose();
  return renderTarget.texture;
}

export const SpatialViewport3D: React.FC<SpatialViewport3DProps> = ({
  activeStudy,
  studies,
  onSelectStudy,
  activeMaterial,
  onSelectMaterial,
  activeLighting,
  onSelectLighting,
  explodeFactor,
  onChangeExplodeFactor,
  selectedPartId,
  onSelectPart,
  onOpenExportModal,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [rotationSpeed, setRotationSpeed] = useState<number>(1.0);
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [activeCameraPreset, setActiveCameraPreset] = useState<string>('isometric');
  const [hotspots2D, setHotspots2D] = useState<ProjectedHotspot[]>([]);

  // Mutable refs for animation loop access without re-creating scene
  const stateRef = useRef({
    activeStudy,
    activeMaterial,
    activeLighting,
    explodeFactor,
    selectedPartId,
    isPlaying,
    rotationSpeed,
    showHotspots,
  });

  useEffect(() => {
    stateRef.current = {
      activeStudy,
      activeMaterial,
      activeLighting,
      explodeFactor,
      selectedPartId,
      isPlaying,
      rotationSpeed,
      showHotspots,
    };
  }, [
    activeStudy,
    activeMaterial,
    activeLighting,
    explodeFactor,
    selectedPartId,
    isPlaying,
    rotationSpeed,
    showHotspots,
  ]);

  // Camera spherical coordinates ref for smooth damping
  const cameraRigRef = useRef({
    currentTheta: 0.72,
    currentPhi: 1.15,
    currentRadius: 7.4,
    targetTheta: 0.72,
    targetPhi: 1.15,
    targetRadius: 7.4,
    currentLookAt: new THREE.Vector3(0, 0.1, 0),
    targetLookAt: new THREE.Vector3(0, 0.1, 0),
    currentFov: 38,
    targetFov: 38,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
  });

  // Scene object refs
  const threeRefs = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    rootAssembly?: THREE.Group;
    subGroups: THREE.Group[];
    kineticNodes: { mesh: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }[];
    primaryMat?: THREE.MeshPhysicalMaterial;
    secondaryMat?: THREE.MeshPhysicalMaterial;
    accentMat?: THREE.MeshPhysicalMaterial;
    wireframeMat?: THREE.MeshBasicMaterial;
    keyLight?: THREE.DirectionalLight;
    fillLight?: THREE.DirectionalLight;
    rimLight?: THREE.SpotLight;
  }>({
    subGroups: [],
    kineticNodes: [],
  });

  // Build specific 3D geometry for the active study
  const buildStudyGeometry = useCallback(
    (study: SpatialStudy) => {
      const refs = threeRefs.current;
      if (!refs.rootAssembly || !refs.primaryMat || !refs.secondaryMat || !refs.accentMat) {
        return;
      }

      // Clear previous children & dispose geometries
      while (refs.rootAssembly.children.length > 0) {
        const child = refs.rootAssembly.children[0];
        child.traverse((obj) => {
          if ((obj as THREE.Mesh).geometry) {
            (obj as THREE.Mesh).geometry.dispose();
          }
        });
        refs.rootAssembly.remove(child);
      }

      refs.subGroups = [];
      refs.kineticNodes = [];

      const pMat = refs.primaryMat;
      const sMat = refs.secondaryMat;
      const aMat = refs.accentMat;

      // Create 4 sub-assembly groups corresponding to study.parts[0..3]
      for (let i = 0; i < 4; i++) {
        const g = new THREE.Group();
        g.userData = { partIndex: i, partId: study.parts[i]?.id };
        refs.subGroups.push(g);
        refs.rootAssembly.add(g);
      }

      if (study.id === 'chronos-tourbillon') {
        // Part 0: Outer Zenith Gimbal Cage
        const g0 = refs.subGroups[0];
        const outerCage = new THREE.Group();
        const outerRingGeo = new THREE.TorusGeometry(1.75, 0.085, 28, 96);
        const outerRing = new THREE.Mesh(outerRingGeo, pMat);
        outerRing.castShadow = true;
        outerRing.receiveShadow = true;
        outerCage.add(outerRing);

        const orthoArchGeo = new THREE.TorusGeometry(1.75, 0.055, 20, 96, Math.PI);
        const orthoArch = new THREE.Mesh(orthoArchGeo, sMat);
        orthoArch.rotation.y = Math.PI / 2;
        outerCage.add(orthoArch);

        // Precision index notches around outer ring
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const lugGeo = new THREE.BoxGeometry(0.12, 0.08, 0.22);
          const lug = new THREE.Mesh(lugGeo, aMat);
          lug.position.set(Math.cos(angle) * 1.75, Math.sin(angle) * 1.75, 0);
          lug.rotation.z = angle;
          outerCage.add(lug);
        }
        g0.add(outerCage);
        refs.kineticNodes.push({ mesh: outerCage, axis: 'y', speed: 0.45 });

        // Part 1: Orthogonal Escapement Carriage
        const g1 = refs.subGroups[1];
        const innerCarriage = new THREE.Group();
        const midRingGeo = new THREE.TorusGeometry(1.32, 0.07, 24, 80);
        const midRing = new THREE.Mesh(midRingGeo, sMat);
        midRing.rotation.x = Math.PI / 2;
        midRing.castShadow = true;
        innerCarriage.add(midRing);

        const bridgeGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.64, 16);
        const bridge = new THREE.Mesh(bridgeGeo, pMat);
        bridge.rotation.z = Math.PI / 2;
        innerCarriage.add(bridge);

        // Escapement pillar struts
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const strutGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.45, 12);
          const strut = new THREE.Mesh(strutGeo, aMat);
          strut.position.set(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15);
          innerCarriage.add(strut);
        }
        g1.add(innerCarriage);
        refs.kineticNodes.push({ mesh: innerCarriage, axis: 'x', speed: -0.75 });

        // Part 2: Variable-Inertia Balance & Hairspring Core
        const g2 = refs.subGroups[2];
        const balanceGroup = new THREE.Group();
        const balanceRimGeo = new THREE.TorusGeometry(0.86, 0.06, 24, 64);
        const balanceRim = new THREE.Mesh(balanceRimGeo, aMat);
        balanceGroup.add(balanceRim);

        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const spokeGeo = new THREE.BoxGeometry(1.68, 0.035, 0.04);
          const spoke = new THREE.Mesh(spokeGeo, pMat);
          spoke.rotation.z = angle;
          balanceGroup.add(spoke);

          // Timing inertia weight
          const weightGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.14, 16);
          const weight = new THREE.Mesh(weightGeo, aMat);
          weight.position.set(Math.cos(angle) * 0.86, Math.sin(angle) * 0.86, 0);
          weight.rotation.x = Math.PI / 2;
          balanceGroup.add(weight);
        }

        const jewelCoreGeo = new THREE.OctahedronGeometry(0.26, 2);
        const jewelCore = new THREE.Mesh(jewelCoreGeo, aMat);
        balanceGroup.add(jewelCore);

        const spindleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 16);
        const spindle = new THREE.Mesh(spindleGeo, sMat);
        spindle.rotation.x = Math.PI / 2;
        balanceGroup.add(spindle);

        g2.add(balanceGroup);
        refs.kineticNodes.push({ mesh: balanceGroup, axis: 'z', speed: 1.65 });

        // Part 3: Seismic Isolation Base Plinth
        const g3 = refs.subGroups[3];
        const plinthGroup = new THREE.Group();
        const baseDiscGeo = new THREE.CylinderGeometry(1.85, 2.05, 0.36, 64);
        const baseDisc = new THREE.Mesh(baseDiscGeo, sMat);
        baseDisc.position.y = -2.15;
        baseDisc.receiveShadow = true;
        plinthGroup.add(baseDisc);

        const trimRingGeo = new THREE.TorusGeometry(1.9, 0.03, 16, 80);
        const trimRing = new THREE.Mesh(trimRingGeo, aMat);
        trimRing.rotation.x = Math.PI / 2;
        trimRing.position.y = -1.97;
        plinthGroup.add(trimRing);

        // Twin biaxial support cradles
        for (const dir of [-1, 1]) {
          const pylonGeo = new THREE.BoxGeometry(0.18, 2.15, 0.28);
          const pylon = new THREE.Mesh(pylonGeo, pMat);
          pylon.position.set(dir * 1.85, -1.0, 0);
          pylon.castShadow = true;
          plinthGroup.add(pylon);

          const bearingCapGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.24, 24);
          const bearingCap = new THREE.Mesh(bearingCapGeo, aMat);
          bearingCap.rotation.z = Math.PI / 2;
          bearingCap.position.set(dir * 1.85, 0, 0);
          plinthGroup.add(bearingCap);
        }
        g3.add(plinthGroup);
      } else if (study.id === 'aeroturbine-core') {
        // Part 0: Acoustic Containment Cowl
        const g0 = refs.subGroups[0];
        const cowlGroup = new THREE.Group();
        const shroudRingGeo = new THREE.TorusGeometry(1.85, 0.16, 32, 96);
        const shroudRing = new THREE.Mesh(shroudRingGeo, pMat);
        shroudRing.position.z = 0.35;
        cowlGroup.add(shroudRing);

        const aftRingGeo = new THREE.TorusGeometry(1.72, 0.12, 28, 96);
        const aftRing = new THREE.Mesh(aftRingGeo, sMat);
        aftRing.position.z = -0.55;
        cowlGroup.add(aftRing);

        const lipRingGeo = new THREE.TorusGeometry(1.86, 0.035, 16, 96);
        const lipRing = new THREE.Mesh(lipRingGeo, aMat);
        lipRing.position.z = 0.52;
        cowlGroup.add(lipRing);
        g0.add(cowlGroup);

        // Part 1: 24-Blade Swept Titanium Fan Stage
        const g1 = refs.subGroups[1];
        const rotorGroup = new THREE.Group();
        const hubGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.48, 36);
        const hub = new THREE.Mesh(hubGeo, sMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.z = 0.2;
        rotorGroup.add(hub);

        const bladeCount = 24;
        for (let i = 0; i < bladeCount; i++) {
          const angle = (i / bladeCount) * Math.PI * 2;
          const bladePivot = new THREE.Group();
          bladePivot.rotation.z = angle;

          const bladeGeo = new THREE.BoxGeometry(0.045, 1.18, 0.32);
          const blade = new THREE.Mesh(bladeGeo, pMat);
          blade.position.set(0, 1.12, 0.2);
          blade.rotation.y = 0.52; // pitch twist
          blade.castShadow = true;
          bladePivot.add(blade);
          rotorGroup.add(bladePivot);
        }
        g1.add(rotorGroup);
        refs.kineticNodes.push({ mesh: rotorGroup, axis: 'z', speed: 1.8 });

        // Part 2: Swirl-Recovery Stator Vane Ring
        const g2 = refs.subGroups[2];
        const statorGroup = new THREE.Group();
        const statorCount = 18;
        for (let i = 0; i < statorCount; i++) {
          const angle = (i / statorCount) * Math.PI * 2;
          const vanePivot = new THREE.Group();
          vanePivot.rotation.z = angle;

          const vaneGeo = new THREE.BoxGeometry(0.035, 1.05, 0.28);
          const vane = new THREE.Mesh(vaneGeo, sMat);
          vane.position.set(0, 1.05, -0.45);
          vane.rotation.y = -0.38;
          vanePivot.add(vane);
          statorGroup.add(vanePivot);
        }
        const coreDrumGeo = new THREE.CylinderGeometry(0.58, 0.52, 0.75, 36);
        const coreDrum = new THREE.Mesh(coreDrumGeo, aMat);
        coreDrum.rotation.x = Math.PI / 2;
        coreDrum.position.z = -0.45;
        statorGroup.add(coreDrum);
        g2.add(statorGroup);

        // Part 3: Thermal Nose & Exhaust Core Spindle + Stand
        const g3 = refs.subGroups[3];
        const spindleGroup = new THREE.Group();
        const noseConeGeo = new THREE.ConeGeometry(0.55, 0.95, 48);
        const noseCone = new THREE.Mesh(noseConeGeo, aMat);
        noseCone.rotation.x = Math.PI / 2;
        noseCone.position.z = 0.92;
        spindleGroup.add(noseCone);

        const standPylonGeo = new THREE.BoxGeometry(0.22, 1.35, 0.55);
        const standPylon = new THREE.Mesh(standPylonGeo, sMat);
        standPylon.position.set(0, -1.55, -0.1);
        spindleGroup.add(standPylon);

        const standBaseGeo = new THREE.CylinderGeometry(1.65, 1.85, 0.3, 64);
        const standBase = new THREE.Mesh(standBaseGeo, pMat);
        standBase.position.set(0, -2.15, 0);
        spindleGroup.add(standBase);
        g3.add(spindleGroup);
      } else if (study.id === 'acoustic-monolith') {
        // Part 0: Hyperbolic Acoustic Dispersion Lens
        const g0 = refs.subGroups[0];
        const crownGroup = new THREE.Group();
        const topConeGeo = new THREE.ConeGeometry(1.45, 0.55, 64);
        const topCone = new THREE.Mesh(topConeGeo, pMat);
        topCone.rotation.x = Math.PI;
        topCone.position.y = 1.55;
        crownGroup.add(topCone);

        const haloRingGeo = new THREE.TorusGeometry(1.5, 0.045, 24, 96);
        const haloRing = new THREE.Mesh(haloRingGeo, aMat);
        haloRing.rotation.x = Math.PI / 2;
        haloRing.position.y = 1.8;
        crownGroup.add(haloRing);
        g0.add(crownGroup);

        // Part 1: 18-Fin Helical Waveguide Array
        const g1 = refs.subGroups[1];
        const louverGroup = new THREE.Group();
        const finCount = 18;
        for (let i = 0; i < finCount; i++) {
          const angle = (i / finCount) * Math.PI * 2;
          const finPivot = new THREE.Group();
          finPivot.rotation.y = angle;

          const finGeo = new THREE.BoxGeometry(0.55, 2.55, 0.045);
          const fin = new THREE.Mesh(finGeo, pMat);
          fin.position.set(1.18, 0.0, 0);
          fin.rotation.z = 0.14;
          fin.castShadow = true;
          finPivot.add(fin);
          louverGroup.add(finPivot);
        }
        g1.add(louverGroup);
        refs.kineticNodes.push({ mesh: louverGroup, axis: 'y', speed: 0.28 });

        // Part 2: Suspended Brass Helmholtz Chamber
        const g2 = refs.subGroups[2];
        const coreGroup = new THREE.Group();
        const cylinderGeo = new THREE.CylinderGeometry(0.68, 0.54, 2.1, 48);
        const cylinder = new THREE.Mesh(cylinderGeo, aMat);
        coreGroup.add(cylinder);

        for (let r = -3; r <= 3; r++) {
          const beltGeo = new THREE.TorusGeometry(0.66, 0.03, 16, 64);
          const belt = new THREE.Mesh(beltGeo, sMat);
          belt.rotation.x = Math.PI / 2;
          belt.position.y = r * 0.26;
          coreGroup.add(belt);
        }
        g2.add(coreGroup);
        refs.kineticNodes.push({ mesh: coreGroup, axis: 'y', speed: -0.5 });

        // Part 3: Decoupled Mass-Loaded Base
        const g3 = refs.subGroups[3];
        const baseGroup = new THREE.Group();
        const plinthGeo = new THREE.CylinderGeometry(1.75, 1.95, 0.45, 64);
        const plinth = new THREE.Mesh(plinthGeo, sMat);
        plinth.position.y = -1.95;
        baseGroup.add(plinth);

        const isolationRingGeo = new THREE.TorusGeometry(1.62, 0.05, 20, 80);
        const isolationRing = new THREE.Mesh(isolationRingGeo, aMat);
        isolationRing.rotation.x = Math.PI / 2;
        isolationRing.position.y = -1.68;
        baseGroup.add(isolationRing);
        g3.add(baseGroup);
      } else {
        // Geodesic Tensegrity Pavilion
        // Part 0: Triangulated Icosahedral Space-Frame
        const g0 = refs.subGroups[0];
        const shellGroup = new THREE.Group();
        const icoGeo = new THREE.IcosahedronGeometry(1.85, 1);
        const wireframeShellMat = pMat.clone();
        wireframeShellMat.wireframe = true;
        const shellMesh = new THREE.Mesh(icoGeo, wireframeShellMat);
        shellMesh.position.y = 0.25;
        shellGroup.add(shellMesh);

        const outerCageGeo = new THREE.DodecahedronGeometry(1.92, 0);
        const outerEdges = new THREE.EdgesGeometry(outerCageGeo);
        const lineMat = new THREE.LineBasicMaterial({ color: activeMaterial.accentHex });
        const lineSegments = new THREE.LineSegments(outerEdges, lineMat);
        lineSegments.position.y = 0.25;
        shellGroup.add(lineSegments);
        g0.add(shellGroup);
        refs.kineticNodes.push({ mesh: shellGroup, axis: 'y', speed: 0.32 });

        // Part 1: Faceted Acoustic Atrium Core
        const g1 = refs.subGroups[1];
        const nucleusGroup = new THREE.Group();
        const coreOctaGeo = new THREE.OctahedronGeometry(1.02, 2);
        const coreOcta = new THREE.Mesh(coreOctaGeo, aMat);
        coreOcta.position.y = 0.25;
        nucleusGroup.add(coreOcta);
        g1.add(nucleusGroup);
        refs.kineticNodes.push({ mesh: nucleusGroup, axis: 'y', speed: -0.65 });

        // Part 2: Pre-Stressed Perimeter Tension Ring
        const g2 = refs.subGroups[2];
        const ringGroup = new THREE.Group();
        const tensionRingGeo = new THREE.TorusGeometry(2.05, 0.09, 28, 96);
        const tensionRing = new THREE.Mesh(tensionRingGeo, sMat);
        tensionRing.rotation.x = Math.PI / 2;
        tensionRing.position.y = -0.55;
        ringGroup.add(tensionRing);

        const upperRingGeo = new THREE.TorusGeometry(1.55, 0.05, 20, 80);
        const upperRing = new THREE.Mesh(upperRingGeo, pMat);
        upperRing.rotation.x = Math.PI / 2;
        upperRing.position.y = 0.95;
        ringGroup.add(upperRing);
        g2.add(ringGroup);

        // Part 3: Triaxial Pin-Jointed Buttress Base
        const g3 = refs.subGroups[3];
        const baseGroup = new THREE.Group();
        const foundationGeo = new THREE.CylinderGeometry(1.95, 2.15, 0.36, 6);
        const foundation = new THREE.Mesh(foundationGeo, sMat);
        foundation.position.y = -2.05;
        baseGroup.add(foundation);

        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const buttressGeo = new THREE.CylinderGeometry(0.055, 0.09, 1.55, 16);
          const buttress = new THREE.Mesh(buttressGeo, pMat);
          buttress.position.set(Math.cos(a) * 1.65, -1.28, Math.sin(a) * 1.65);
          buttress.rotation.z = Math.cos(a) * 0.24;
          buttress.rotation.x = -Math.sin(a) * 0.24;
          baseGroup.add(buttress);
        }
        g3.add(baseGroup);
      }
    },
    [activeMaterial.accentHex]
  );

  // Initialize Three.js WebGL stage
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 720;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // WebGL Context Loss & Restoration Safety
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsPlaying(false);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090a0f');
    scene.fog = new THREE.FogExp2('#090a0f', 0.042);

    const envMap = createStudioEnvironmentMap(renderer);
    scene.environment = envMap;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);

    // Three-Point Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight('#cbd5e1', 0.55);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#fff7ed', 2.8);
    keyLight.position.set(5.5, 8.0, 6.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#93c5fd', 1.35);
    fillLight.position.set(-6.5, 3.5, -4.0);
    scene.add(fillLight);

    const rimLight = new THREE.SpotLight('#f59e0b', 2.2);
    rimLight.position.set(0.0, 5.5, -7.5);
    rimLight.angle = Math.PI / 3;
    rimLight.penumbra = 0.8;
    scene.add(rimLight);

    // Studio Calibration Floor Grid & Shadow Receiver
    const floorGroup = new THREE.Group();
    floorGroup.position.y = -2.35;

    const shadowPlaneGeo = new THREE.PlaneGeometry(28, 28);
    const shadowPlaneMat = new THREE.MeshStandardMaterial({
      color: '#090a0f',
      roughness: 0.85,
      metalness: 0.1,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    floorGroup.add(shadowPlane);

    const polarGrid = new THREE.PolarGridHelper(6.5, 16, 6, 64, 0x1e293b, 0x1e293b);
    polarGrid.position.y = 0.01;
    floorGroup.add(polarGrid);
    scene.add(floorGroup);

    // Physically-Based Materials
    const primaryMat = new THREE.MeshPhysicalMaterial({
      color: stateRef.current.activeMaterial.colorHex,
      metalness: stateRef.current.activeMaterial.metalness,
      roughness: stateRef.current.activeMaterial.roughness,
      clearcoat: stateRef.current.activeMaterial.clearcoat,
      clearcoatRoughness: 0.12,
      transmission: stateRef.current.activeMaterial.transmission,
      ior: 1.52,
      thickness: 0.8,
    });

    const secondaryMat = new THREE.MeshPhysicalMaterial({
      color: stateRef.current.activeMaterial.secondaryHex,
      metalness: Math.min(1, stateRef.current.activeMaterial.metalness + 0.05),
      roughness: Math.min(1, stateRef.current.activeMaterial.roughness + 0.1),
      clearcoat: 0.25,
    });

    const accentMat = new THREE.MeshPhysicalMaterial({
      color: stateRef.current.activeMaterial.accentHex,
      metalness: 0.9,
      roughness: 0.18,
      clearcoat: 0.5,
    });

    const rootAssembly = new THREE.Group();
    scene.add(rootAssembly);

    threeRefs.current = {
      scene,
      camera,
      renderer,
      rootAssembly,
      subGroups: [],
      kineticNodes: [],
      primaryMat,
      secondaryMat,
      accentMat,
      keyLight,
      fillLight,
      rimLight,
    };

    buildStudyGeometry(stateRef.current.activeStudy);

    // Pointer Interaction Handlers (Orbit & Zoom)
    const domElem = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      cameraRigRef.current.isDragging = true;
      cameraRigRef.current.lastMouseX = e.clientX;
      cameraRigRef.current.lastMouseY = e.clientY;
      setActiveCameraPreset('custom');
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!cameraRigRef.current.isDragging) return;
      const dx = e.clientX - cameraRigRef.current.lastMouseX;
      const dy = e.clientY - cameraRigRef.current.lastMouseY;
      cameraRigRef.current.lastMouseX = e.clientX;
      cameraRigRef.current.lastMouseY = e.clientY;

      cameraRigRef.current.targetTheta -= dx * 0.0065;
      cameraRigRef.current.targetPhi = Math.max(
        0.15,
        Math.min(Math.PI * 0.52, cameraRigRef.current.targetPhi - dy * 0.0055)
      );
    };

    const onPointerUp = () => {
      cameraRigRef.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraRigRef.current.targetRadius = Math.max(
        3.6,
        Math.min(11.5, cameraRigRef.current.targetRadius + e.deltaY * 0.0035)
      );
    };

    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domElem.addEventListener('wheel', onWheel, { passive: false });

    // Resize Observer
    const handleResize = () => {
      if (!container || !threeRefs.current.renderer || !threeRefs.current.camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      threeRefs.current.camera.aspect = w / h;
      threeRefs.current.camera.updateProjectionMatrix();
      threeRefs.current.renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCounter = 0;

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const {
        activeStudy: currentStudy,
        explodeFactor: currentExplode,
        selectedPartId: currentSelectedPart,
        isPlaying: currentPlaying,
        rotationSpeed: currentSpeed,
      } = stateRef.current;

      const rig = cameraRigRef.current;
      // Smooth exponential damping for camera orbit & focus
      const damping = 1 - Math.exp(-8.5 * dt);
      rig.currentTheta += (rig.targetTheta - rig.currentTheta) * damping;
      rig.currentPhi += (rig.targetPhi - rig.currentPhi) * damping;
      rig.currentRadius += (rig.targetRadius - rig.currentRadius) * damping;
      rig.currentLookAt.lerp(rig.targetLookAt, damping);
      rig.currentFov += (rig.targetFov - rig.currentFov) * damping;

      if (Math.abs(camera.fov - rig.currentFov) > 0.05) {
        camera.fov = rig.currentFov;
        camera.updateProjectionMatrix();
      }

      // Slow orbital drift when playing and not dragging
      if (currentPlaying && !rig.isDragging && !currentSelectedPart) {
        rig.targetTheta += dt * 0.14 * currentSpeed;
      }

      const sinPhi = Math.sin(rig.currentPhi);
      camera.position.set(
        rig.currentLookAt.x + rig.currentRadius * sinPhi * Math.sin(rig.currentTheta),
        rig.currentLookAt.y + rig.currentRadius * Math.cos(rig.currentPhi),
        rig.currentLookAt.z + rig.currentRadius * sinPhi * Math.cos(rig.currentTheta)
      );
      camera.lookAt(rig.currentLookAt);

      // Update kinetic sub-assemblies
      if (currentPlaying) {
        for (const kNode of threeRefs.current.kineticNodes) {
          kNode.mesh.rotation[kNode.axis] += dt * kNode.speed * currentSpeed;
        }
      }

      // Smoothly interpolate Exploded Assembly vectors
      const subGroups = threeRefs.current.subGroups;
      for (let i = 0; i < subGroups.length; i++) {
        const partSpec = currentStudy.parts[i];
        if (!partSpec) continue;
        const targetPos = new THREE.Vector3(
          partSpec.explodeVector[0] * currentExplode,
          partSpec.explodeVector[1] * currentExplode,
          partSpec.explodeVector[2] * currentExplode
        );
        subGroups[i].position.lerp(targetPos, damping);
      }

      renderer.render(scene, camera);

      // Project 3D Hotspot Anchors to 2D Screen Coordinates every 2 frames
      frameCounter++;
      if (frameCounter % 2 === 0 && container) {
        const rectW = container.clientWidth;
        const rectH = container.clientHeight;
        const nextHotspots: ProjectedHotspot[] = currentStudy.parts.map((part) => {
          const worldVec = new THREE.Vector3(
            part.worldAnchor[0] + part.explodeVector[0] * currentExplode,
            part.worldAnchor[1] + part.explodeVector[1] * currentExplode,
            part.worldAnchor[2] + part.explodeVector[2] * currentExplode
          );
          worldVec.project(camera);
          const screenX = (worldVec.x * 0.5 + 0.5) * rectW;
          const screenY = (-(worldVec.y * 0.5) + 0.5) * rectH;
          const isVisible =
            worldVec.z < 1.0 &&
            screenX > 48 &&
            screenX < rectW - 48 &&
            screenY > 48 &&
            screenY < rectH - 48;
          return {
            id: part.id,
            index: part.index,
            name: part.name,
            x: screenX,
            y: screenY,
            visible: isVisible,
          };
        });
        setHotspots2D(nextHotspots);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domElem.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('webglcontextlost', handleContextLost);
      domElem.removeEventListener('webglcontextrestored', handleContextRestored);
      envMap.dispose();
      renderer.dispose();
    };
  }, [buildStudyGeometry]);

  // Rebuild 3D geometry when activeStudy changes
  useEffect(() => {
    buildStudyGeometry(activeStudy);
    // Reset camera target to center
    cameraRigRef.current.targetLookAt.set(0, 0.1, 0);
  }, [activeStudy, buildStudyGeometry]);

  // Update PBR material properties when activeMaterial or activeLighting wireframe changes
  useEffect(() => {
    const { primaryMat, secondaryMat, accentMat } = threeRefs.current;
    if (!primaryMat || !secondaryMat || !accentMat) return;

    primaryMat.color.set(activeMaterial.colorHex);
    primaryMat.metalness = activeMaterial.metalness;
    primaryMat.roughness = activeMaterial.roughness;
    primaryMat.clearcoat = activeMaterial.clearcoat;
    primaryMat.transmission = activeMaterial.transmission;
    primaryMat.wireframe = activeLighting.wireframeOverlay;
    primaryMat.needsUpdate = true;

    secondaryMat.color.set(activeMaterial.secondaryHex);
    secondaryMat.metalness = Math.min(1, activeMaterial.metalness + 0.05);
    secondaryMat.roughness = Math.min(1, activeMaterial.roughness + 0.1);
    secondaryMat.wireframe = activeLighting.wireframeOverlay;
    secondaryMat.needsUpdate = true;

    accentMat.color.set(activeMaterial.accentHex);
    accentMat.wireframe = activeLighting.wireframeOverlay;
    accentMat.needsUpdate = true;
  }, [activeMaterial, activeLighting]);

  // Update Studio Lighting Rig when activeLighting changes
  useEffect(() => {
    const { keyLight, fillLight, rimLight, scene } = threeRefs.current;
    if (!keyLight || !fillLight || !rimLight || !scene) return;

    keyLight.color.set(activeLighting.keyColor);
    keyLight.intensity = activeLighting.keyIntensity;
    fillLight.color.set(activeLighting.fillColor);
    fillLight.intensity = activeLighting.fillIntensity;
    rimLight.color.set(activeLighting.rimColor);
    rimLight.intensity = activeLighting.rimIntensity;
    scene.background = new THREE.Color(activeLighting.fogColor);
    scene.fog = new THREE.FogExp2(activeLighting.fogColor, 0.042);
  }, [activeLighting]);

  // Camera Preset Selection Handler
  const handleSelectCameraPreset = (preset: CameraPresetSpec) => {
    setActiveCameraPreset(preset.id);
    onSelectPart(null);
    cameraRigRef.current.targetTheta = preset.theta;
    cameraRigRef.current.targetPhi = preset.phi;
    cameraRigRef.current.targetRadius = preset.radius;
    cameraRigRef.current.targetLookAt.set(
      preset.target[0],
      preset.target[1],
      preset.target[2]
    );
    cameraRigRef.current.targetFov = preset.fov;
  };

  // Focus Camera on Specific 3D Sub-Assembly Part
  const handleFocusPart = (partId: string) => {
    if (selectedPartId === partId) {
      onSelectPart(null);
      cameraRigRef.current.targetLookAt.set(0, 0.1, 0);
      cameraRigRef.current.targetRadius = 7.4;
      return;
    }
    onSelectPart(partId);
    const part = activeStudy.parts.find((p) => p.id === partId);
    if (part) {
      const targetX = part.worldAnchor[0] * 0.4 + part.explodeVector[0] * explodeFactor;
      const targetY = part.worldAnchor[1] * 0.4 + part.explodeVector[1] * explodeFactor;
      const targetZ = part.worldAnchor[2] * 0.4 + part.explodeVector[2] * explodeFactor;
      cameraRigRef.current.targetLookAt.set(targetX, targetY, targetZ);
      cameraRigRef.current.targetRadius = 5.4;
    }
  };

  const handleResetViewport = () => {
    onChangeExplodeFactor(0);
    onSelectPart(null);
    setRotationSpeed(1.0);
    setIsPlaying(true);
    handleSelectCameraPreset(CAMERA_PRESETS[0]);
  };

  const activePartSpec =
    activeStudy.parts.find((p) => p.id === selectedPartId) || activeStudy.parts[0];

  return (
    <section
      id="viewport"
      aria-label="Interactive 3D Spatial Viewport"
      className="relative w-full h-[calc(100vh-4rem)] min-h-[680px] bg-[#090a0f] overflow-hidden select-none border-b border-white/10"
    >
      {/* WebGL Canvas Container or Fallback */}
      {webglError || contextLost ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090a0f] p-8 text-center">
          <img
            src={activeStudy.previewImage || STUDIO_BACKDROP_IMAGE}
            alt={activeStudy.title}
            referrerPolicy="no-referrer"
            className="w-full max-w-2xl h-80 object-cover rounded-xl opacity-75 mb-6 border border-white/10"
          />
          <h2 className="text-2xl font-display font-semibold text-white mb-2">
            {contextLost ? 'Restoring WebGL Studio Context' : activeStudy.title}
          </h2>
          <p className="text-sm text-slate-400 max-w-md">
            {activeStudy.description}
          </p>
        </div>
      ) : (
        <div
          ref={mountRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        />
      )}

      {/* Projected 3D Spatial Hotspots Overlay */}
      {showHotspots && !webglError && !contextLost && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {hotspots2D.map((spot) => {
            if (!spot.visible) return null;
            const isSelected = selectedPartId === spot.id;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => handleFocusPart(spot.id)}
                style={{
                  transform: `translate3d(${spot.x}px, ${spot.y}px, 0)`,
                }}
                className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 group flex items-center gap-2 px-2.5 py-1 rounded-md transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-lg'
                    : 'bg-black/65 backdrop-blur-md text-white border border-white/20 hover:border-amber-400/80'
                }`}
              >
                <span className="font-mono-tabular text-xs font-semibold">
                  {spot.index}
                </span>
                <span className="text-xs whitespace-nowrap hidden sm:inline">
                  {spot.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Semantic DOM Overlay Layer — Peripheral HUD Architecture */}
      <div className="relative z-20 w-full h-full pointer-events-none flex flex-col justify-between p-5 lg:p-8 max-w-[1600px] mx-auto">
        {/* Top Row: Left Identity & Study Switcher / Right Camera & Lighting Rig */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          {/* Left Panel: Active Sculpture Identity & Study Selector */}
          <div className="pointer-events-auto max-w-md bg-black/45 backdrop-blur-md border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <span className="font-mono-tabular text-amber-400 font-semibold">
                Study {activeStudy.index}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeStudy.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{activeStudy.boundingBoxMm}</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-display font-bold text-white tracking-tight mb-2">
              {activeStudy.title}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {activeStudy.subtitle}
            </p>

            {/* Interactive 3D Model Study Switcher Tabs */}
            <div
              role="tablist"
              aria-label="Select 3D Spatial Study"
              className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-3 border-t border-white/10"
            >
              {studies.map((study) => {
                const isActive = study.id === activeStudy.id;
                return (
                  <button
                    key={study.id}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => onSelectStudy(study)}
                    className={`px-2.5 py-2 rounded-lg text-left transition-colors whitespace-nowrap truncate focus-visible:outline-2 focus-visible:outline-amber-400 ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="block font-mono-tabular text-[11px] opacity-75">
                      {study.index}
                    </span>
                    <span className="block text-xs truncate">
                      {study.title.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Camera Choreography & Studio Lighting Switcher */}
          <div className="pointer-events-auto flex flex-col gap-3 bg-black/45 backdrop-blur-md border border-white/10 rounded-xl p-4 lg:w-80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Camera Elevation
              </span>
              <button
                type="button"
                onClick={handleResetViewport}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                Reset View
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectCameraPreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap truncate ${
                    activeCameraPreset === preset.id
                      ? 'bg-white text-slate-950 font-semibold'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10">
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Studio Illumination Rig
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {LIGHTING_PRESETS.map((light) => {
                  const isActive = activeLighting.id === light.id;
                  return (
                    <button
                      key={light.id}
                      type="button"
                      onClick={() => onSelectLighting(light)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap truncate flex items-center gap-2 ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: light.rimColor }}
                      />
                      <span className="truncate">{light.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Left Sub-Assembly Inspector / Right Material & Exploded View Kinematics */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {/* Bottom-Left: Sub-Assembly Component Tolerance Inspector */}
          <div className="pointer-events-auto bg-black/45 backdrop-blur-md border border-white/10 rounded-xl p-4 max-w-md w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                Sub-Assembly Node Inspector
              </span>
              <button
                type="button"
                onClick={() => setShowHotspots((prev) => !prev)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5" />
                {showHotspots ? 'Hide Pins' : 'Show Pins'}
              </button>
            </div>

            {/* Part Selector Strip */}
            <div className="flex items-center gap-1.5 mb-3">
              {activeStudy.parts.map((part) => {
                const isSelected = activePartSpec.id === part.id;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleFocusPart(part.id)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono-tabular transition-colors whitespace-nowrap truncate ${
                      isSelected
                        ? 'bg-white text-slate-950 font-semibold'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Node {part.index}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">
                {activePartSpec.index}. {activePartSpec.name}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{activePartSpec.role}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-slate-200">
                  {activePartSpec.dimensionsMm}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-amber-400">
                  {activePartSpec.tolerance}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom-Right: Material PBR Switcher & Exploded Assembly Kinematics */}
          <div className="pointer-events-auto bg-black/45 backdrop-blur-md border border-white/10 rounded-xl p-4 w-full lg:max-w-xl flex flex-col gap-3">
            {/* Material Finishes */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                PBR Surface Finish:
                <span className="text-white font-normal">{activeMaterial.name}</span>
              </span>
              <span className="text-xs font-mono-tabular text-slate-400">
                {activeMaterial.densityGcm3} g/cm³ · {activeMaterial.hardnessHv} HV
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {MATERIAL_FINISHES.map((mat) => {
                const isSelected = mat.id === activeMaterial.id;
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => onSelectMaterial(mat)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors whitespace-nowrap truncate ${
                      isSelected
                        ? 'bg-white text-slate-950 font-semibold'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                      style={{ backgroundColor: mat.colorHex }}
                    />
                    <span className="truncate">{mat.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Exploded View Kinematics & Motion Controls */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onChangeExplodeFactor(explodeFactor > 0.1 ? 0 : 0.85)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  {explodeFactor > 0.1 ? 'Collapse' : 'Explode 3D'}
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    aria-label="Exploded assembly separation"
                    min={0}
                    max={1}
                    step={0.01}
                    value={explodeFactor}
                    onChange={(e) => onChangeExplodeFactor(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg"
                  />
                  <span className="text-xs font-mono-tabular text-slate-300 w-10 text-right">
                    {Math.round(explodeFactor * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-amber-400" />
                      Animate
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenExportModal}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-slate-950 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  CAD Spec
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
