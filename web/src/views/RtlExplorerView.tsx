import React, { useState } from "react";
import {
  FileCode2,
  Search,
  ExternalLink,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Cpu,
  FileCheck
} from "lucide-react";
import { RTL_MODULES, RTLModule } from "../data/sourceData";

interface RtlExplorerViewProps {
  initialFile?: string;
}

export const RtlExplorerView: React.FC<RtlExplorerViewProps> = ({ initialFile }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<string>(initialFile || "uart_top.v");
  const [copied, setCopied] = useState<boolean>(false);

  const activeModule: RTLModule =
    RTL_MODULES.find((m) => m.file === selectedFile) || RTL_MODULES[0];

  const filteredModules = RTL_MODULES.filter(
    (m) =>
      m.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeModule.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const githubUrl = `https://github.com/Mshreyash07/UART_Messenger_DLD_G5/blob/main/rtl/${activeModule.file}`;

  return (
    <div className="space-y-6">
      {/* Search and Overview Header */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title">
            <FileCode2 className="w-5 h-5 text-cyan-400" />
            <span>Verilog RTL Source Explorer (12 Modules)</span>
          </div>
          <span className="badge badge-cyan font-mono text-xs">
            Single Top: uart_top.v
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Explore the actual, unmodified Verilog hardware source code from the repository. Each file
          contains complete port descriptions, hardware registers, and state machine declarations.
        </p>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search module name, category, or port..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 text-xs"
          />
        </div>
      </div>

      {/* Main Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Module Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-xs font-mono font-semibold text-slate-400 px-1">
            VERILOG MODULES ({filteredModules.length})
          </div>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredModules.map((m) => {
              const isSelected = activeModule.file === m.file;
              return (
                <button
                  key={m.file}
                  onClick={() => setSelectedFile(m.file)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 ring-1 ring-cyan-500/40"
                      : "border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-white">{m.file}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {m.lineCount}L
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                    module {m.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    <span className="badge badge-purple py-0 px-1.5 text-[9px] font-mono">
                      {m.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code & Specification Viewer */}
        <div className="lg:col-span-3 space-y-4">
          {/* Module Banner */}
          <div className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-mono text-lg font-bold text-cyan-400">
                    rtl/{activeModule.file}
                  </h2>
                  <span className="text-xs font-mono text-slate-400">
                    (module {activeModule.name})
                  </span>
                  <span className="badge badge-purple">{activeModule.category}</span>
                </div>
                <div className="text-sm text-slate-300 font-semibold mt-1">
                  {activeModule.title}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Code"}</span>
                </button>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {activeModule.summary}
            </p>

            {/* Sub-module Dependencies */}
            {activeModule.dependencies.length > 0 && (
              <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Instantiates:</span>
                {activeModule.dependencies.map((dep) => (
                  <button
                    key={dep}
                    onClick={() => setSelectedFile(dep)}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 hover:border-cyan-500 text-[11px]"
                  >
                    {dep}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ports & Signal Interface Table */}
          {activeModule.ports && activeModule.ports.length > 0 && (
            <div className="card space-y-3">
              <div className="card-header">
                <div className="card-title text-sm">
                  <span>Port Declarations ({activeModule.ports.length})</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Width &amp; Signal Direction
                </span>
              </div>
              <div className="overflow-x-auto max-h-56">
                <table className="tech-table">
                  <thead>
                    <tr>
                      <th>Port Name</th>
                      <th>Direction</th>
                      <th>Width</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeModule.ports.map((p) => (
                      <tr key={p.name}>
                        <td className="font-mono text-cyan-300 font-bold">{p.name}</td>
                        <td>
                          <span
                            className={`badge ${
                              p.dir === "input"
                                ? "badge-cyan"
                                : p.dir === "output"
                                ? "badge-emerald"
                                : "badge-amber"
                            }`}
                          >
                            {p.dir.toUpperCase()}
                          </span>
                        </td>
                        <td className="font-mono text-slate-300 text-xs">
                          {p.width === "1" ? "1 bit" : `[${p.width}-1:0]`}
                        </td>
                        <td className="text-xs text-slate-300">{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Syntax-Highlighted Code Viewer */}
          <div className="card space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-2 border-b border-slate-900">
              <span>{activeModule.file} (Verilog HDL)</span>
              <span>{activeModule.lineCount} Lines | {activeModule.charCount} Bytes</span>
            </div>

            <div className="code-block max-h-[600px]">
              {activeModule.code.split("\n").map((line, idx) => (
                <div key={idx} className="code-line">
                  <span className="line-number">{idx + 1}</span>
                  <span className="line-text">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
