import studioBackdropImg from '../assets/images/studio_pavilion_backdrop_1791306107124.jpg';
import tourbillonMacroImg from '../assets/images/chronos_tourbillon_macro_1791306118477.jpg';
import acousticMacroImg from '../assets/images/acoustic_resonator_macro_1791306130472.jpg';

export type ModelId =
  | 'chronos-tourbillon'
  | 'aeroturbine-core'
  | 'acoustic-monolith'
  | 'geodesic-pavilion';

export type MaterialFinishId =
  | 'titanium-brushed'
  | 'architectural-bronze'
  | 'obsidian-anodized'
  | 'borosilicate-glass'
  | 'ceramic-matte';

export type LightingPresetId =
  | 'studio-daylight'
  | 'obsidian-rim'
  | 'golden-atelier'
  | 'blueprint-xray';

export type CameraPresetId = 'isometric' | 'elevation' | 'plan' | 'macro';

export interface SubAssemblyPart {
  id: string;
  index: string;
  name: string;
  role: string;
  tolerance: string;
  massGrams: number;
  dimensionsMm: string;
  worldAnchor: [number, number, number];
  explodeVector: [number, number, number];
}

export interface SpatialStudy {
  id: ModelId;
  index: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  boundingBoxMm: string;
  partCount: number;
  vertexCount: number;
  surfaceToleranceMm: number;
  resonantFrequencyHz: number;
  previewImage: string;
  description: string;
  engineeringNote: string;
  parts: SubAssemblyPart[];
}

export interface MaterialFinishSpec {
  id: MaterialFinishId;
  name: string;
  shortLabel: string;
  code: string;
  colorHex: string;
  secondaryHex: string;
  accentHex: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  transmission: number;
  densityGcm3: number;
  hardnessHv: number;
}

export interface LightingPresetSpec {
  id: LightingPresetId;
  name: string;
  shortLabel: string;
  keyColor: string;
  keyIntensity: number;
  fillColor: string;
  fillIntensity: number;
  rimColor: string;
  rimIntensity: number;
  fogColor: string;
  wireframeOverlay: boolean;
}

export interface CameraPresetSpec {
  id: CameraPresetId;
  label: string;
  theta: number;
  phi: number;
  radius: number;
  target: [number, number, number];
  fov: number;
}

export const STUDIO_BACKDROP_IMAGE = studioBackdropImg;

export const MATERIAL_FINISHES: MaterialFinishSpec[] = [
  {
    id: 'titanium-brushed',
    name: 'Grade 5 Brushed Titanium',
    shortLabel: 'Ti-6Al-4V',
    code: 'MAT-TI05',
    colorHex: '#cbd5e1',
    secondaryHex: '#64748b',
    accentHex: '#f59e0b',
    metalness: 0.88,
    roughness: 0.22,
    clearcoat: 0.35,
    transmission: 0.0,
    densityGcm3: 4.43,
    hardnessHv: 349,
  },
  {
    id: 'architectural-bronze',
    name: 'Patina Architectural Bronze',
    shortLabel: 'CuSn8 Bronze',
    code: 'MAT-BZ08',
    colorHex: '#d97706',
    secondaryHex: '#78350f',
    accentHex: '#fef08a',
    metalness: 0.92,
    roughness: 0.26,
    clearcoat: 0.4,
    transmission: 0.0,
    densityGcm3: 8.8,
    hardnessHv: 210,
  },
  {
    id: 'obsidian-anodized',
    name: 'Type III Anodized Obsidian',
    shortLabel: 'Obsidian Al',
    code: 'MAT-OB70',
    colorHex: '#1e293b',
    secondaryHex: '#0f172a',
    accentHex: '#38bdf8',
    metalness: 0.78,
    roughness: 0.18,
    clearcoat: 0.65,
    transmission: 0.0,
    densityGcm3: 2.81,
    hardnessHv: 420,
  },
  {
    id: 'borosilicate-glass',
    name: 'Optical Borosilicate & Rhodium',
    shortLabel: 'Borosilicate',
    code: 'MAT-GL33',
    colorHex: '#e0f2fe',
    secondaryHex: '#94a3b8',
    accentHex: '#38bdf8',
    metalness: 0.15,
    roughness: 0.08,
    clearcoat: 0.95,
    transmission: 0.72,
    densityGcm3: 2.23,
    hardnessHv: 580,
  },
  {
    id: 'ceramic-matte',
    name: 'Sintered Zirconia Ceramic',
    shortLabel: 'ZrO2 Ceramic',
    code: 'MAT-ZR94',
    colorHex: '#f1f5f9',
    secondaryHex: '#475569',
    accentHex: '#fb923c',
    metalness: 0.12,
    roughness: 0.48,
    clearcoat: 0.2,
    transmission: 0.0,
    densityGcm3: 6.05,
    hardnessHv: 1250,
  },
];

export const LIGHTING_PRESETS: LightingPresetSpec[] = [
  {
    id: 'studio-daylight',
    name: 'Three-Point Daylight Rig',
    shortLabel: 'Studio Rig',
    keyColor: '#fff7ed',
    keyIntensity: 2.8,
    fillColor: '#93c5fd',
    fillIntensity: 1.35,
    rimColor: '#f59e0b',
    rimIntensity: 2.2,
    fogColor: '#090a0f',
    wireframeOverlay: false,
  },
  {
    id: 'obsidian-rim',
    name: 'High-Contrast Rim Drama',
    shortLabel: 'Obsidian Rim',
    keyColor: '#e2e8f0',
    keyIntensity: 1.9,
    fillColor: '#1e3a8a',
    fillIntensity: 0.7,
    rimColor: '#38bdf8',
    rimIntensity: 3.4,
    fogColor: '#050609',
    wireframeOverlay: false,
  },
  {
    id: 'golden-atelier',
    name: 'Warm Atelier Tungsten',
    shortLabel: 'Warm Atelier',
    keyColor: '#fde68a',
    keyIntensity: 2.9,
    fillColor: '#fdba74',
    fillIntensity: 1.1,
    rimColor: '#fb7185',
    rimIntensity: 2.3,
    fogColor: '#0c0a09',
    wireframeOverlay: false,
  },
  {
    id: 'blueprint-xray',
    name: 'CAD Topology Wireframe',
    shortLabel: 'Topology Mesh',
    keyColor: '#38bdf8',
    keyIntensity: 2.4,
    fillColor: '#818cf8',
    fillIntensity: 1.6,
    rimColor: '#f59e0b',
    rimIntensity: 2.5,
    fogColor: '#070b14',
    wireframeOverlay: true,
  },
];

export const CAMERA_PRESETS: CameraPresetSpec[] = [
  {
    id: 'isometric',
    label: 'Isometric 3/4',
    theta: 0.72,
    phi: 1.15,
    radius: 7.4,
    target: [0, 0.1, 0],
    fov: 38,
  },
  {
    id: 'elevation',
    label: 'Front Elevation',
    theta: 0.0,
    phi: 1.52,
    radius: 7.0,
    target: [0, 0.1, 0],
    fov: 35,
  },
  {
    id: 'plan',
    label: 'Top Plan',
    theta: 0.0,
    phi: 0.18,
    radius: 8.2,
    target: [0, 0, 0],
    fov: 35,
  },
  {
    id: 'macro',
    label: 'Macro Core',
    theta: -0.48,
    phi: 1.28,
    radius: 4.3,
    target: [0, 0.25, 0],
    fov: 30,
  },
];

export const SPATIAL_STUDIES: SpatialStudy[] = [
  {
    id: 'chronos-tourbillon',
    index: '01',
    title: 'Chronos Coaxial Tourbillon',
    subtitle: 'Triple-axis horological gyroscope with counter-rotating titanium cages',
    category: 'Precision Horology & Kinematics',
    year: '2026',
    boundingBoxMm: '148 × 148 × 162 mm',
    partCount: 42,
    vertexCount: 28460,
    surfaceToleranceMm: 0.002,
    resonantFrequencyHz: 28.8,
    previewImage: tourbillonMacroImg,
    description:
      'Engineered to eliminate gravitational rate errors across all spatial orientations, the Chronos Coaxial Tourbillon suspends a high-inertia balance assembly within three concentric 5-axis milled gimbal rings.',
    engineeringNote:
      'Outer carriage completes one revolution every 60 seconds; intermediate orthogonal cage rotates every 24 seconds around a jewel-stabilized vertical axis.',
    parts: [
      {
        id: 'outer-gimbal',
        index: '01',
        name: 'Primary Zenith Gimbal Cage',
        role: 'Outer Biaxial Suspension Ring',
        tolerance: '±0.002 mm',
        massGrams: 184.5,
        dimensionsMm: 'Ø 142.0 × 18.0 mm',
        worldAnchor: [1.65, 0.65, 0.3],
        explodeVector: [0, 1.4, 0],
      },
      {
        id: 'inner-escapement',
        index: '02',
        name: 'Orthogonal Escapement Carriage',
        role: 'Counter-Rotating Secondary Gimbal',
        tolerance: '±0.0015 mm',
        massGrams: 92.0,
        dimensionsMm: 'Ø 104.0 × 14.5 mm',
        worldAnchor: [-1.15, 0.3, 0.9],
        explodeVector: [1.3, 0.5, 0],
      },
      {
        id: 'balance-core',
        index: '03',
        name: 'Variable-Inertia Balance & Hairspring',
        role: 'Isochronous Harmonic Oscillator',
        tolerance: '±0.0008 mm',
        massGrams: 38.2,
        dimensionsMm: 'Ø 68.0 × 9.2 mm',
        worldAnchor: [0.0, 0.15, 0.0],
        explodeVector: [0, 0.3, 1.5],
      },
      {
        id: 'monolith-plinth',
        index: '04',
        name: 'Seismic Isolation Base Plinth',
        role: 'Damped Kinematic Anchor Assembly',
        tolerance: '±0.005 mm',
        massGrams: 640.0,
        dimensionsMm: 'Ø 148.0 × 34.0 mm',
        worldAnchor: [0.0, -1.55, 0.8],
        explodeVector: [0, -1.5, 0],
      },
    ],
  },
  {
    id: 'aeroturbine-core',
    index: '02',
    title: 'AeroTurbine Axial Nacelle',
    subtitle: 'High-bypass swept fan assembly with acoustic chevron stator shroud',
    category: 'Aerospace Propulsion Geometry',
    year: '2026',
    boundingBoxMm: '210 × 210 × 195 mm',
    partCount: 64,
    vertexCount: 36920,
    surfaceToleranceMm: 0.004,
    resonantFrequencyHz: 142.0,
    previewImage: studioBackdropImg,
    description:
      'An aerodynamic study in boundary-layer compression and acoustic attenuation. Twenty-four compound-swept rotor blades interlock around a high-pressure diffuser cone inside a double-walled nacelle ring.',
    engineeringNote:
      'Blade twist profile transitions from 22 degrees at the hub root to 58 degrees at the supersonic tip shroud to equalize radial pressure loading.',
    parts: [
      {
        id: 'nacelle-shroud',
        index: '01',
        name: 'Acoustic Containment Cowl',
        role: 'Laminar Intake & Tip Clearance Ring',
        tolerance: '±0.004 mm',
        massGrams: 310.0,
        dimensionsMm: 'Ø 210.0 × 64.0 mm',
        worldAnchor: [1.85, 0.4, 0.2],
        explodeVector: [0, 0, 1.6],
      },
      {
        id: 'swept-rotor',
        index: '02',
        name: '24-Blade Swept Titanium Fan Stage',
        role: 'Primary Axial Compression Rotor',
        tolerance: '±0.0018 mm',
        massGrams: 225.4,
        dimensionsMm: 'Ø 182.0 × 38.0 mm',
        worldAnchor: [-0.95, 0.85, 0.65],
        explodeVector: [0, 1.2, 0.6],
      },
      {
        id: 'stator-diffuser',
        index: '03',
        name: 'Swirl-Recovery Stator Vane Ring',
        role: 'Secondary Flow Straightening Stage',
        tolerance: '±0.003 mm',
        massGrams: 178.0,
        dimensionsMm: 'Ø 154.0 × 42.0 mm',
        worldAnchor: [0.6, -0.45, -1.0],
        explodeVector: [0, 0.4, -1.4],
      },
      {
        id: 'exhaust-cone',
        index: '04',
        name: 'Thermal Nose & Exhaust Core Spindle',
        role: 'Central Axial Bearing Housing',
        tolerance: '±0.0012 mm',
        massGrams: 142.8,
        dimensionsMm: 'Ø 76.0 × 165.0 mm',
        worldAnchor: [0.0, 0.1, 1.35],
        explodeVector: [0, -1.3, 0],
      },
    ],
  },
  {
    id: 'acoustic-monolith',
    index: '03',
    title: 'Acoustic Monolith Resonator',
    subtitle: 'Parametric wave-fin omnidirectional chamber with suspended transducer',
    category: 'Architectural Acoustics & Sculpture',
    year: '2026',
    boundingBoxMm: '160 × 160 × 240 mm',
    partCount: 38,
    vertexCount: 31200,
    surfaceToleranceMm: 0.003,
    resonantFrequencyHz: 64.5,
    previewImage: acousticMacroImg,
    description:
      'Designed for spatial acoustic dispersion in reverberant gallery halls, eighteen CNC-milled radial louvers rotate in a golden-ratio helix around a suspended Helmholtz brass core.',
    engineeringNote:
      'Logarithmic louver spacing eliminates standing-wave coloration between 180 Hz and 14 kHz while maintaining 360-degree phase coherence.',
    parts: [
      {
        id: 'dispersion-crown',
        index: '01',
        name: 'Hyperbolic Acoustic Dispersion Lens',
        role: 'High-Frequency Omnidirectional Diffuser',
        tolerance: '±0.0025 mm',
        massGrams: 164.0,
        dimensionsMm: 'Ø 138.0 × 28.0 mm',
        worldAnchor: [0.0, 1.55, 0.4],
        explodeVector: [0, 1.6, 0],
      },
      {
        id: 'harmonic-louvers',
        index: '02',
        name: '18-Fin Helical Waveguide Array',
        role: 'Parametric Radial Diffraction Cage',
        tolerance: '±0.003 mm',
        massGrams: 412.0,
        dimensionsMm: 'Ø 160.0 × 150.0 mm',
        worldAnchor: [1.45, 0.15, 0.4],
        explodeVector: [1.3, 0.2, 0],
      },
      {
        id: 'helmholtz-core',
        index: '03',
        name: 'Suspended Brass Helmholtz Chamber',
        role: 'Low-Frequency Pressure Transducer',
        tolerance: '±0.0015 mm',
        massGrams: 520.0,
        dimensionsMm: 'Ø 74.0 × 128.0 mm',
        worldAnchor: [-0.4, 0.0, 0.6],
        explodeVector: [-1.1, 0.4, 0.9],
      },
      {
        id: 'acoustic-plinth',
        index: '04',
        name: 'Decoupled Mass-Loaded Base',
        role: 'Floor Resonance Termination Block',
        tolerance: '±0.005 mm',
        massGrams: 890.0,
        dimensionsMm: 'Ø 158.0 × 40.0 mm',
        worldAnchor: [0.0, -1.5, 0.7],
        explodeVector: [0, -1.5, 0],
      },
    ],
  },
  {
    id: 'geodesic-pavilion',
    index: '04',
    title: 'Geodesic Tensegrity Pavilion',
    subtitle: 'Self-tensioned spatial lattice dome with cantilevered refractive core',
    category: 'Spatial Structural Architecture',
    year: '2026',
    boundingBoxMm: '220 × 220 × 180 mm',
    partCount: 52,
    vertexCount: 24800,
    surfaceToleranceMm: 0.005,
    resonantFrequencyHz: 19.4,
    previewImage: studioBackdropImg,
    description:
      'A structural study in discontinuous compression and continuous tension. An icosahedral outer space-frame floats above a cantilevered ring terrace, enclosing a faceted optical glass core.',
    engineeringNote:
      'Zero internal columns are required; nodal preload distributes wind and seismic shear across 60 triangulated perimeter struts.',
    parts: [
      {
        id: 'geodesic-shell',
        index: '01',
        name: 'Triangulated Icosahedral Space-Frame',
        role: 'Primary Tensile-Compression Lattice',
        tolerance: '±0.005 mm',
        massGrams: 275.0,
        dimensionsMm: 'Ø 216.0 × 140.0 mm',
        worldAnchor: [1.55, 0.95, 0.3],
        explodeVector: [0, 1.55, 0],
      },
      {
        id: 'refractive-nucleus',
        index: '02',
        name: 'Faceted Acoustic Atrium Core',
        role: 'Suspended Climatic Envelope',
        tolerance: '±0.002 mm',
        massGrams: 195.0,
        dimensionsMm: 'Ø 108.0 × 108.0 mm',
        worldAnchor: [0.0, 0.25, 0.95],
        explodeVector: [0, 0.6, 1.4],
      },
      {
        id: 'cantilever-ring',
        index: '03',
        name: 'Pre-Stressed Perimeter Tension Ring',
        role: 'Horizontal Thrust Equilibrium Girder',
        tolerance: '±0.003 mm',
        massGrams: 340.0,
        dimensionsMm: 'Ø 220.0 × 18.0 mm',
        worldAnchor: [-1.6, -0.35, 0.5],
        explodeVector: [1.3, -0.3, 0],
      },
      {
        id: 'foundation-piers',
        index: '04',
        name: 'Triaxial Pin-Jointed Buttress Base',
        role: 'Subterranean Load Transfer Anchor',
        tolerance: '±0.006 mm',
        massGrams: 710.0,
        dimensionsMm: 'Ø 180.0 × 42.0 mm',
        worldAnchor: [0.0, -1.45, 0.8],
        explodeVector: [0, -1.5, 0],
      },
    ],
  },
];
