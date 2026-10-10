import React, { useState } from 'react';
import {
  SPATIAL_STUDIES,
  MATERIAL_FINISHES,
  LIGHTING_PRESETS,
  STUDIO_BACKDROP_IMAGE,
  SpatialStudy,
  MaterialFinishSpec,
  LightingPresetSpec,
} from './data/spatialCatalog';
import { SpatialViewport3D } from './components/SpatialViewport3D';
import { SpecModal } from './components/SpecModal';
import { ArrowUpRight, Layers, Sliders, Compass, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeStudy, setActiveStudy] = useState<SpatialStudy>(SPATIAL_STUDIES[0]);
  const [activeMaterial, setActiveMaterial] = useState<MaterialFinishSpec>(
    MATERIAL_FINISHES[0]
  );
  const [activeLighting, setActiveLighting] = useState<LightingPresetSpec>(
    LIGHTING_PRESETS[0]
  );
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    tab: 'export' | 'commission';
  }>({
    isOpen: false,
    tab: 'export',
  });
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const filteredStudies = SPATIAL_STUDIES.filter((study) => {
    if (collectionFilter === 'all') return true;
    if (collectionFilter === 'kinematics') {
      return (
        study.id === 'chronos-tourbillon' || study.id === 'aeroturbine-core'
      );
    }
    if (collectionFilter === 'acoustics') {
      return (
        study.id === 'acoustic-monolith' || study.id === 'geodesic-pavilion'
      );
    }
    return true;
  });

  const handleLoadStudyIntoStage = (
    study: SpatialStudy,
    customExplode?: number
  ) => {
    setActiveStudy(study);
    setSelectedPartId(null);
    if (typeof customExplode === 'number') {
      setExplodeFactor(customExplode);
    }
    const viewportEl = document.getElementById('viewport');
    if (viewportEl) {
      viewportEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col">
      {/* Top Bar Contract: Strictly 1 row, 3 zones (Brand Wordmark — 4 Nav Links — Primary Action) */}
      <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 lg:px-10 bg-[#090a0f]/90 backdrop-blur-md border-b border-white/10">
        {/* Zone 1: Single text element wordmark in the display face */}
        <a
          href="#viewport"
          className="text-lg font-display font-bold tracking-tight text-white whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          Kronos Atelier
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300"
        >
          <a
            href="#viewport"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Viewport
          </a>
          <a
            href="#collections"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Collections
          </a>
          <a
            href="#specifications"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Specifications
          </a>
          <a
            href="#atelier"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Atelier
          </a>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setModalState({ isOpen: true, tab: 'commission' })}
            className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
          >
            Commission Study
          </button>
          <button
            type="button"
            onClick={() => setModalState({ isOpen: true, tab: 'export' })}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap"
          >
            Export CAD Spec
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Section 1: Full-Viewport Interactive Three.js 3D Spatial Stage */}
        <SpatialViewport3D
          activeStudy={activeStudy}
          studies={SPATIAL_STUDIES}
          onSelectStudy={(study) => {
            setActiveStudy(study);
            setSelectedPartId(null);
          }}
          activeMaterial={activeMaterial}
          onSelectMaterial={setActiveMaterial}
          activeLighting={activeLighting}
          onSelectLighting={setActiveLighting}
          explodeFactor={explodeFactor}
          onChangeExplodeFactor={setExplodeFactor}
          selectedPartId={selectedPartId}
          onSelectPart={setSelectedPartId}
          onOpenExportModal={() =>
            setModalState({ isOpen: true, tab: 'export' })
          }
        />

        {/* Section 2: Curated Spatial Studies & Architectural Collection */}
        <section
          id="collections"
          className="py-20 lg:py-28 px-6 lg:px-10 max-w-[1440px] mx-auto border-b border-white/10"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                <span>Zurich & Kyoto Spatial Fabrication</span>
                <span aria-hidden="true">·</span>
                <span>2026 Archive</span>
                <span aria-hidden="true">·</span>
                <span>Real-Time WebGL Inspection</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-display font-bold text-white tracking-tight max-w-2xl">
                01. Sculptural Kinematics & Precision Spatial Assemblies
              </h2>
            </div>

            {/* Interactive Filter Controls */}
            <div
              role="group"
              aria-label="Filter spatial studies"
              className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg w-fit"
            >
              <button
                type="button"
                onClick={() => setCollectionFilter('all')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  collectionFilter === 'all'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                All Studies (4)
              </button>
              <button
                type="button"
                onClick={() => setCollectionFilter('kinematics')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  collectionFilter === 'kinematics'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Horology & Propulsion
              </button>
              <button
                type="button"
                onClick={() => setCollectionFilter('acoustics')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  collectionFilter === 'acoustics'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Acoustics & Tensegrity
              </button>
            </div>
          </div>

          {/* Study Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredStudies.map((study) => {
              const isLoaded = activeStudy.id === study.id;
              const imgFailed = failedImages[study.id];
              return (
                <article
                  key={study.id}
                  className={`group rounded-2xl bg-[#11141d] border transition-colors p-6 sm:p-8 flex flex-col justify-between ${
                    isLoaded
                      ? 'border-amber-500/70'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div>
                    {/* Visual Preview Frame with Zero-Broken-Image Fallback */}
                    <div className="relative h-64 w-full rounded-xl overflow-hidden mb-6 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/30 border border-white/10">
                      {!imgFailed ? (
                        <img
                          src={study.previewImage}
                          alt={`${study.title} studio rendering`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({
                              ...prev,
                              [study.id]: true,
                            }))
                          }
                          className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                          <Compass className="w-10 h-10 text-amber-400 mb-2" />
                          <span className="text-sm font-display font-semibold text-white">
                            {study.title}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
                        <span className="font-mono-tabular font-semibold text-amber-400">
                          Study {study.index}
                        </span>
                        <span className="font-mono-tabular">
                          {study.vertexCount.toLocaleString()} Vertices ·{' '}
                          {study.partCount} Parts
                        </span>
                      </div>
                    </div>

                    {/* Clean Unboxed Metadata Line (Zero-Pill Discipline) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
                      <span>{study.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {study.boundingBoxMm}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        ±{study.surfaceToleranceMm} mm Tolerance
                      </span>
                    </div>

                    <h3 className="text-2xl font-display font-bold text-white mb-3">
                      {study.index}. {study.title}
                    </h3>

                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                      {study.description}
                    </p>

                    <p className="text-xs text-slate-400 leading-relaxed pb-6 border-b border-white/10">
                      {study.engineeringNote}
                    </p>
                  </div>

                  {/* Interactive Actions */}
                  <div className="pt-5 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleLoadStudyIntoStage(study, 0)}
                      className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                        isLoaded
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-white text-slate-950 hover:bg-slate-200'
                      }`}
                    >
                      <span>
                        {isLoaded
                          ? 'Active in 3D Stage'
                          : 'Inspect in 3D Stage'}
                      </span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadStudyIntoStage(study, 0.85)}
                      className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Launch Exploded View</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Section 3: Dimensional Engineering & Material Specifications Matrix */}
        <section
          id="specifications"
          className="py-20 lg:py-28 px-6 lg:px-10 max-w-[1440px] mx-auto border-b border-white/10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Explanatory Prose & Quick Exploded Stage Triggers */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Physical Metallurgy</span>
                <span aria-hidden="true">·</span>
                <span>5-Axis Sub-Micron Machining</span>
              </div>

              <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                02. Material Calibration & Kinematic Tolerances
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                Every spatial assembly in the Kronos archive is calibrated for both
                real-time physically-based WebGL shading and 5-axis CNC fabrication.
                Select any surface alloy below to update the live 3D shader parameters
                and recalculate total assembly mass.
              </p>

              {/* Interactive Exploded-State Calibration Presets */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Live 3D Assembly Separation Presets
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '0% Locked Coaxial', val: 0 },
                    { label: '35% Clearance Check', val: 0.35 },
                    { label: '70% Sub-Node Access', val: 0.7 },
                    { label: '100% Full Axial Split', val: 1.0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setExplodeFactor(preset.val);
                        const el = document.getElementById('viewport');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`px-3.5 py-2.5 rounded-lg text-xs font-mono-tabular text-left transition-colors whitespace-nowrap truncate ${
                        Math.abs(explodeFactor - preset.val) < 0.05
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'bg-[#11141d] border border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Tabular PBR Alloy & Tolerance Matrix */}
            <div className="lg:col-span-7 bg-[#11141d] border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 mb-5 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-display font-bold text-white">
                    Surface Alloy & Optical Refraction Matrix
                  </h3>
                  <p className="text-xs text-slate-400">
                    Click any row to apply finish to{' '}
                    <span className="text-white">{activeStudy.title}</span> in the
                    3D stage
                  </p>
                </div>
                <span className="text-xs font-mono-tabular text-amber-400">
                  Active: {activeMaterial.code}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-slate-400">
                      <th className="py-3 pr-4 font-medium">Alloy / Finish</th>
                      <th className="py-3 px-4 font-medium">Code</th>
                      <th className="py-3 px-4 font-medium text-right">
                        Density
                      </th>
                      <th className="py-3 px-4 font-medium text-right">
                        Vickers Hardness
                      </th>
                      <th className="py-3 pl-4 font-medium text-right">
                        Roughness
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {MATERIAL_FINISHES.map((mat) => {
                      const isCurrent = mat.id === activeMaterial.id;
                      return (
                        <tr
                          key={mat.id}
                          onClick={() => {
                            setActiveMaterial(mat);
                            const el = document.getElementById('viewport');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`cursor-pointer transition-colors ${
                            isCurrent
                              ? 'bg-amber-500/10 text-white'
                              : 'text-slate-300 hover:bg-white/[0.03] hover:text-white'
                          }`}
                        >
                          <td className="py-3.5 pr-4 font-medium flex items-center gap-2.5 whitespace-nowrap">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 border border-white/25"
                              style={{ backgroundColor: mat.colorHex }}
                            />
                            <span>{mat.name}</span>
                            {isCurrent && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono-tabular text-slate-400 whitespace-nowrap">
                            {mat.code}
                          </td>
                          <td className="py-3.5 px-4 font-mono-tabular text-right whitespace-nowrap">
                            {mat.densityGcm3.toFixed(2)} g/cm³
                          </td>
                          <td className="py-3.5 px-4 font-mono-tabular text-right whitespace-nowrap">
                            {mat.hardnessHv} HV
                          </td>
                          <td className="py-3.5 pl-4 font-mono-tabular text-right whitespace-nowrap">
                            {mat.roughness.toFixed(2)} Ra
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Atelier Proof, Quantitative Outcomes & Custom Commissioning */}
        <section
          id="atelier"
          className="py-20 lg:py-28 px-6 lg:px-10 max-w-[1440px] mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Verified Fabrication & Spatial Twin Benchmark</span>
                <span aria-hidden="true">·</span>
                <span>ISO 2768-mK Certified</span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-display font-bold text-white tracking-tight">
                03. From Interactive WebGL Topology to Physical Monolith
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                Kronos Atelier bridges real-time browser-based 3D inspection and
                sub-micron metal fabrication. Architects, acoustic engineers, and
                horological collectors inspect full kinematic assemblies in 3D before
                authorizing 5-axis milling in Grade 5 Titanium or CuSn8 Architectural
                Bronze.
              </p>

              {/* Quantitative Rigor Metrics (Claim-to-Proof Adjacency) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                <div>
                  <div className="text-2xl font-display font-bold text-amber-400 font-mono-tabular">
                    -64% Design Iteration Latency
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Measured across 18 architectural hardware commissions in 12
                    months by replacing static 2D CAD sheets with interactive
                    exploded WebGL assemblies.
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-display font-bold text-white font-mono-tabular">
                    ±0.002 mm Machining Fidelity
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Direct coordinate parity between our real-time Three.js node
                    inspector and 5-axis CNC toolpaths at our Zurich facility.
                  </p>
                </div>
              </div>

              {/* Attributable Testimonial */}
              <blockquote className="p-6 rounded-2xl bg-[#11141d] border border-white/10 space-y-3">
                <p className="text-sm text-slate-200 leading-relaxed">
                  “Before adopting Kronos Atelier’s interactive 3D exploded stage,
                  verifying acoustic louver clearances required three physical
                  aluminum prototypes over nine weeks. Inspecting the live WebGL
                  tolerance nodes allowed our structural team to sign off on the
                  240 mm Helmholtz assembly in four days.”
                </p>
                <footer className="text-xs text-slate-400">
                  <strong className="text-white font-semibold">
                    Dr. Lukas Vance
                  </strong>{' '}
                  · Principal Acoustic Architect, Vance & Lindqvist Konzerthaus
                  Zurich
                </footer>
              </blockquote>
            </div>

            {/* Right Visual Showcase & Direct Action Card */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden bg-[#11141d] border border-white/10">
                <div className="relative h-80 sm:h-96 w-full">
                  <img
                    src={STUDIO_BACKDROP_IMAGE}
                    alt="Kronos Atelier Architectural Showcase Pavilion"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#11141d] via-black/40 to-transparent" />
                </div>

                <div className="p-6 sm:p-8 -mt-16 relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-mono-tabular">
                    <span>Bespoke Spatial Engineering</span>
                    <span aria-hidden="true">·</span>
                    <span>Direct .OBJ & .JSON CAD Export</span>
                  </div>

                  <h3 className="text-2xl font-display font-bold text-white">
                    Configure Your Spatial Prototype or Export 3D Mesh Data
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    Download the current Wavefront .OBJ reference geometry and JSON
                    tolerance manifest for{' '}
                    <span className="text-white font-semibold">
                      {activeStudy.title}
                    </span>
                    , or register a custom architectural fabrication brief.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setModalState({ isOpen: true, tab: 'export' })
                      }
                      className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-slate-950 transition-colors whitespace-nowrap"
                    >
                      Export Current 3D Spec
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModalState({ isOpen: true, tab: 'commission' })
                      }
                      className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors whitespace-nowrap"
                    >
                      Request Custom Fabrication
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-white/10 py-8 px-6 lg:px-10 text-xs text-slate-400">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © 2026 Kronos Atelier Spatial Engineering. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#viewport"
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              3D Stage
            </a>
            <a
              href="#collections"
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Archive
            </a>
            <a
              href="#specifications"
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Metallurgy
            </a>
            <button
              type="button"
              onClick={() => setModalState({ isOpen: true, tab: 'export' })}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Export CAD
            </button>
          </div>
        </div>
      </footer>

      {/* CAD Export & Commission Modal */}
      <SpecModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        study={activeStudy}
        material={activeMaterial}
        lighting={activeLighting}
        explodeFactor={explodeFactor}
        initialTab={modalState.tab}
      />
    </div>
  );
}
