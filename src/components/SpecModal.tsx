import React, { useState } from 'react';
import {
  SpatialStudy,
  MaterialFinishSpec,
  LightingPresetSpec,
} from '../data/spatialCatalog';
import { X, Download, Check, FileCode, Box } from 'lucide-react';

interface SpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  study: SpatialStudy;
  material: MaterialFinishSpec;
  lighting: LightingPresetSpec;
  explodeFactor: number;
  initialTab?: 'export' | 'commission';
}

export const SpecModal: React.FC<SpecModalProps> = ({
  isOpen,
  onClose,
  study,
  material,
  lighting,
  explodeFactor,
  initialTab = 'export',
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'commission'>(initialTab);
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [organization, setOrganization] = useState('');
  const [projectScale, setProjectScale] = useState('1:1 Architectural Prototype');
  const [notes, setNotes] = useState('');
  const [submittedCommission, setSubmittedCommission] = useState(false);

  if (!isOpen) return null;

  const totalMassGrams = study.parts.reduce((acc, p) => acc + p.massGrams, 0);
  const scaledMassGrams = Math.round(totalMassGrams * (material.densityGcm3 / 4.43));

  const handleDownloadSpec = (format: 'json' | 'obj') => {
    if (format === 'json') {
      const payload = {
        atelier: 'Kronos Atelier Spatial Engineering',
        timestamp: new Date().toISOString(),
        study: {
          id: study.id,
          index: study.index,
          title: study.title,
          category: study.category,
          boundingBoxMm: study.boundingBoxMm,
          vertexCount: study.vertexCount,
          surfaceToleranceMm: study.surfaceToleranceMm,
          explodedSeparationRatio: Number(explodeFactor.toFixed(2)),
        },
        materialFinish: {
          code: material.code,
          name: material.name,
          densityGcm3: material.densityGcm3,
          hardnessHv: material.hardnessHv,
          estimatedAssemblyMassGrams: scaledMassGrams,
        },
        lightingCalibration: {
          preset: lighting.name,
          wireframeTopology: lighting.wireframeOverlay,
        },
        subAssemblies: study.parts,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${study.id}-${material.code.toLowerCase()}-spec.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Generate a clean Wavefront OBJ reference mesh representing the study's sub-assembly anchor nodes & bounding cage
      const lines: string[] = [
        `# Kronos Atelier — Wavefront OBJ Spatial Reference Mesh`,
        `# Study: ${study.index}. ${study.title}`,
        `# Material: ${material.name} (${material.code})`,
        `# Explode Factor: ${Math.round(explodeFactor * 100)}%`,
        `o ${study.id.replace(/-/g, '_')}`,
      ];
      study.parts.forEach((p, idx) => {
        const ox = (p.worldAnchor[0] + p.explodeVector[0] * explodeFactor).toFixed(4);
        const oy = (p.worldAnchor[1] + p.explodeVector[1] * explodeFactor).toFixed(4);
        const oz = (p.worldAnchor[2] + p.explodeVector[2] * explodeFactor).toFixed(4);
        lines.push(`# Sub-Assembly ${p.index}: ${p.name}`);
        lines.push(`v ${ox} ${oy} ${oz}`);
        lines.push(`v ${(Number(ox) + 0.5).toFixed(4)} ${oy} ${oz}`);
        lines.push(`v ${ox} ${(Number(oy) + 0.5).toFixed(4)} ${oz}`);
        lines.push(`v ${ox} ${oy} ${(Number(oz) + 0.5).toFixed(4)}`);
        const base = idx * 4 + 1;
        lines.push(`f ${base} ${base + 1} ${base + 2}`);
        lines.push(`f ${base} ${base + 2} ${base + 3}`);
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${study.id}-assembly.obj`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloadedFormat(format);
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  const handleCommissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    setSubmittedCommission(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
    >
      <div className="relative w-full max-w-2xl bg-[#10131c] border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span className="font-mono-tabular text-amber-400">
                Study {study.index}
              </span>
              <span aria-hidden="true">·</span>
              <span>{material.code}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{study.boundingBoxMm}</span>
            </div>
            <h2
              id="modal-title"
              className="text-xl sm:text-2xl font-display font-bold text-white"
            >
              {study.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2 my-5 p-1 bg-white/5 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'export'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            CAD & Telemetry Export
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('commission')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'commission'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Commission Custom Fabrication
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-white/10">
              <div>
                <div className="text-xs text-slate-400 mb-1">Surface Alloy</div>
                <div className="text-sm font-semibold text-white">
                  {material.shortLabel}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Computed Mass</div>
                <div className="text-sm font-mono-tabular font-semibold text-white">
                  {scaledMassGrams} g
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Mesh Vertices</div>
                <div className="text-sm font-mono-tabular font-semibold text-white">
                  {study.vertexCount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Explode State</div>
                <div className="text-sm font-mono-tabular font-semibold text-amber-400">
                  {Math.round(explodeFactor * 100)}% Axial
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-200">
                Sub-Assembly Kinematic Coordinates
              </h3>
              <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
                {study.parts.map((part) => (
                  <div
                    key={part.id}
                    className="flex items-center justify-between px-4 py-2.5 text-xs bg-white/[0.02]"
                  >
                    <div>
                      <span className="font-mono-tabular text-amber-400 mr-2">
                        {part.index}.
                      </span>
                      <span className="font-medium text-white">{part.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 font-mono-tabular">
                      <span>{part.dimensionsMm}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-200">{part.tolerance}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadSpec('obj')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                {downloadedFormat === 'obj' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Downloaded .OBJ Mesh
                  </>
                ) : (
                  <>
                    <Box className="w-4 h-4 text-amber-400" />
                    Download Wavefront (.OBJ)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadSpec('json')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-slate-950 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                {downloadedFormat === 'json' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Downloaded CAD Spec (.JSON)
                  </>
                ) : (
                  <>
                    <FileCode className="w-4 h-4" />
                    Export Spatial Spec (.JSON)
                  </>
                )}
              </button>
            </div>
          </div>
        ) : submittedCommission ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-display font-bold text-white">
              Architectural Commission Dossier Registered
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Thank you, <span className="text-white font-semibold">{clientName}</span>.
              Our Zurich fabrication engineers have logged your configuration for{' '}
              <span className="text-amber-400">{study.title}</span> in{' '}
              <span className="text-white">{material.name}</span>.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmittedCommission(false);
                onClose();
              }}
              className="px-5 py-2.5 rounded-lg bg-white text-slate-950 text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              Return to 3D Studio
            </button>
          </div>
        ) : (
          <form onSubmit={handleCommissionSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Principal Architect / Lead Engineer *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Studio or Institution
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Herzog Spatial Lab"
                  className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                Fabrication Scale & Tolerance Tier
              </label>
              <select
                value={projectScale}
                onChange={(e) => setProjectScale(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#161a26] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                <option value="1:1 Architectural Prototype">
                  1:1 Architectural Prototype (±0.002 mm 5-Axis CNC)
                </option>
                <option value="Gallery Exhibition Monolith">
                  Gallery Exhibition Monolith (2.4m Full-Scale Installation)
                </option>
                <option value="Digital Twin & WebGL Shader License">
                  Digital Twin & Custom WebGL Shader Integration
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                Dimensional or Acoustic Requirements
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specify structural load constraints, alloy treatments, or gallery lighting conditions..."
                className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-slate-950 flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Submit Fabrication Brief
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
