import React, { useState } from "react";
import {
  BookOpen,
  FileText,
  Download,
  Image,
  ExternalLink,
  Layers,
  CheckCircle2,
  Maximize2,
  X
} from "lucide-react";
import { DOCUMENTATION, WaveformDoc } from "../data/sourceData";

export const DocumentationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"readme" | "waveforms" | "pdf">("waveforms");
  const [selectedWaveform, setSelectedWaveform] = useState<WaveformDoc | null>(null);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>Project Documentation, Presentation &amp; Simulation Waveforms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("waveforms")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "waveforms"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Simulation Waveforms ({DOCUMENTATION.waveforms.length})
            </button>
            <button
              onClick={() => setActiveTab("readme")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "readme"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              README.md Specification
            </button>
            <button
              onClick={() => setActiveTab("pdf")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "pdf"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Project Report &amp; Slides (PDF)
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Access the project's actual documentation files preserved from the repository, including
          GTKWave simulation traces, the complete system specification, and the Stage 2 presentation report.
        </p>
      </div>

      {/* Waveforms Gallery */}
      {activeTab === "waveforms" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DOCUMENTATION.waveforms.map((wf, idx) => (
              <div
                key={idx}
                className="card space-y-3 cursor-pointer group hover:border-cyan-500/40 transition-all"
                onClick={() => setSelectedWaveform(wf)}
              >
                <div className="relative overflow-hidden rounded-md bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                  <img
                    src={`${import.meta.env.BASE_URL}${wf.path}`}
                    alt={wf.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-mono text-cyan-300 bg-backdrop">
                    <Maximize2 className="w-4 h-4" />
                    <span>Click to Enlarge</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="truncate">{wf.name}</span>
                    <span className="badge badge-purple text-[9px]">GTKWave</span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100">{wf.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {wf.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Image Viewer */}
          {selectedWaveform && (
            <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-5xl w-full p-4 space-y-3 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="font-semibold text-base text-white">
                      {selectedWaveform.title}
                    </h3>
                    <div className="text-xs text-cyan-400 font-mono">
                      {selectedWaveform.name}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedWaveform(null)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-950 rounded-lg p-2 border border-slate-800 flex items-center justify-center">
                  <img
                    src={`${import.meta.env.BASE_URL}${selectedWaveform.path}`}
                    alt={selectedWaveform.title}
                    className="max-h-[65vh] w-auto object-contain rounded"
                  />
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {selectedWaveform.description}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF Presentation View */}
      {activeTab === "pdf" && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-base text-white">
                  {DOCUMENTATION.reportPdf.title}
                </h3>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {DOCUMENTATION.reportPdf.filename} ({(DOCUMENTATION.reportPdf.sizeBytes / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>

            <a
              href={`${import.meta.env.BASE_URL}${DOCUMENTATION.reportPdf.path}`}
              download
              className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Original PDF</span>
            </a>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {DOCUMENTATION.reportPdf.description}
          </p>

          {/* Embedded PDF iframe / fallback */}
          <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950 h-[600px]">
            <iframe
              src={`${import.meta.env.BASE_URL}${DOCUMENTATION.reportPdf.path}`}
              title="Project Report PDF"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}

      {/* README.md View */}
      {activeTab === "readme" && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="card-title text-sm">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>README.md (Project Root Specification)</span>
            </div>
            <a
              href="https://github.com/Mshreyash07/UART_Messenger_DLD_G5/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="code-block p-4 max-h-[600px] overflow-y-auto text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
            {DOCUMENTATION.readme}
          </div>
        </div>
      )}
    </div>
  );
};
