import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Download,
  Info,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  Thermometer,
  Upload,
  X,
} from "lucide-react";
import { ConfigurationEditor, Field } from "./Editor.tsx";
import { defaultConfig, migrateLegacyConfig } from "./materials.ts";
import { layerTransport, validateConfig } from "./solver.ts";
import {
  concentrationColor,
  FilmView,
  formatNumber,
  HansenView,
  ProfileChart,
  SurfaceChart,
} from "./visuals.tsx";
import type { Config, Result } from "./types.ts";

const STORAGE = "af-migration-comparison-v2";
type Pair = [Config, Config];
type Workspace = { configs: Pair; hue: number };
function freshWorkspace(): Workspace {
  const a = defaultConfig();
  const b = structuredClone(a);
  b.temperature = 45;
  return { configs: [a, b], hue: 280 };
}
function workspaceErrors(w: Workspace): string[] {
  if (!w || !Array.isArray(w.configs) || w.configs.length !== 2)
    return ["A comparison needs two formulations."];
  const errors = w.configs.flatMap((c, i) =>
    validateConfig(c).map((e) => `Formulation ${i === 0 ? "A" : "B"}: ${e}`),
  );
  if (w.configs[0]?.hours !== w.configs[1]?.hours)
    errors.push("Use the same duration for both formulations.");
  if (!Number.isFinite(w.hue) || w.hue < 0 || w.hue > 360)
    errors.push("Invalid concentration hue.");
  return errors;
}
function readWorkspace(): Workspace {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (saved && !workspaceErrors(saved).length) return saved;
    const old = JSON.parse(
      localStorage.getItem("af-migration-lab-v1") || "null",
    );
    if (old) {
      const a = migrateLegacyConfig(old);
      if (!validateConfig(a).length) {
        const b = structuredClone(a);
        b.temperature = Math.min(80, a.temperature + 20);
        return { configs: [a, b], hue: 280 };
      }
    }
  } catch {
    /* Storage is optional. */
  }
  return freshWorkspace();
}
function saveFile(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(readWorkspace);
  const [results, setResults] = useState<[Result, Result] | null>(null);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<"film" | "hsp">("film");
  const [notes, setNotes] = useState(false);
  const [menu, setMenu] = useState(false);
  const worker = useRef<Worker | null>(null);
  const importer = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const errors = workspaceErrors(workspace);
  const dirty =
    !!results &&
    JSON.stringify(results.map((r) => r.config)) !==
      JSON.stringify(workspace.configs);
  const frames = results?.[0].frames.length || 181;
  const scale = useMemo(() => {
    let max = 0.01;
    results?.forEach((r) =>
      r.frames.forEach((f) =>
        f.concentration.forEach((c, i) => {
          max = Math.max(max, (c / r.cells[i].density) * 100);
        }),
      ),
    );
    return max * 1.05;
  }, [results]);
  const elapsed = results?.[0].frames[index]?.hours || 0;
  const horizon = results?.[0].config.hours || workspace.configs[0].hours;
  function updateConfig(i: number, next: Config) {
    setWorkspace((w) => {
      const configs = [...w.configs] as Pair;
      configs[i] = next;
      if (next.hours !== w.configs[i].hours)
        configs[1 - i] = { ...configs[1 - i], hours: next.hours };
      return { ...w, configs };
    });
  }
  function run(next: Workspace = workspace, autoplay = true) {
    if (workspaceErrors(next).length) return;
    worker.current?.terminate();
    setBusy(true);
    setPlaying(false);
    setError("");
    setMenu(false);
    const instance = new Worker(
      new URL("./simulation.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = instance;
    instance.onmessage = (
      e: MessageEvent<{ results?: [Result, Result]; error?: string }>,
    ) => {
      if (e.data.results) {
        setResults(e.data.results);
        setIndex(0);
        setPlaying(autoplay);
      } else setError(e.data.error || "Simulation failed.");
      setBusy(false);
      instance.terminate();
      worker.current = null;
    };
    instance.onerror = () => {
      setError("Simulation worker could not start. Reload and try again.");
      setBusy(false);
      instance.terminate();
      worker.current = null;
    };
    instance.postMessage(next.configs);
  }
  useEffect(() => {
    run(workspace, false);
    return () => worker.current?.terminate();
  }, []);
  useEffect(() => {
    setPlaying(false);
    if (!workspaceErrors(workspace).length) {
      try {
        localStorage.setItem(STORAGE, JSON.stringify(workspace));
      } catch {
        /* optional */
      }
    }
  }, [workspace.configs]);
  useEffect(() => {
    try {
      if (!workspaceErrors(workspace).length)
        localStorage.setItem(STORAGE, JSON.stringify(workspace));
    } catch {
      /* optional */
    }
  }, [workspace.hue]);
  useEffect(() => {
    if (!playing || busy || dirty || !results) return;
    const timer = setInterval(
      () => setIndex((i) => Math.min(frames - 1, i + speed)),
      100,
    );
    return () => clearInterval(timer);
  }, [playing, busy, dirty, results, speed, frames]);
  useEffect(() => {
    if (index === frames - 1) setPlaying(false);
  }, [index, frames]);
  useEffect(() => {
    if (notes) dialog.current?.showModal();
    else dialog.current?.close();
  }, [notes]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1000000)
        throw new Error("Choose a project smaller than 1 MB.");
      const data = JSON.parse(await file.text());
      let next: Workspace;
      if (data.schemaVersion === 2)
        next = { configs: data.configs, hue: data.hue };
      else if (data.schemaVersion === 1) {
        const c = migrateLegacyConfig(data.config);
        const configs = [...workspace.configs] as Pair;
        configs[active] = c;
        configs[1 - active] = { ...configs[1 - active], hours: c?.hours };
        next = { ...workspace, configs };
      } else throw new Error("Choose an AF Migration Lab v1 or v2 project.");
      const problems = workspaceErrors(next);
      if (problems.length) throw new Error(problems[0]);
      setWorkspace(next);
      setSelected(0);
      run(next, false);
      setToast("Project imported and both formulations simulated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid project.");
    }
    if (importer.current) importer.current.value = "";
  }
  function exportCsv() {
    if (!results || dirty) return;
    const header =
      "formulation,temperature_C,time_h,depth_um,layer,polymer,concentration_kg_m3,concentration_wt_pct,D_effective_m2_s,surface_A_mg_m2,surface_B_mg_m2,lost_A_mg_m2,lost_B_mg_m2,film_mg_m2,mass_balance_relative_error";
    const quote = (s: string) =>
      `"${(/^[=+@\-\t\r\n]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
    const rows = results.flatMap((r, caseIndex) =>
      r.frames.flatMap((f) =>
        r.cells.map((cell, i) =>
          [
            caseIndex === 0 ? "A" : "B",
            r.config.temperature,
            f.hours,
            cell.x * 1e6,
            cell.layer + 1,
            quote(r.config.layers[cell.layer].name),
            f.concentration[i],
            (f.concentration[i] / cell.density) * 100,
            cell.diffusion,
            ...f.surface.map((v) => v * 1e6),
            ...f.lost.map((v) => v * 1e6),
            f.filmMass * 1e6,
            f.massError,
          ].join(","),
        ),
      ),
    );
    saveFile(
      "af-comparison-results.csv",
      [header, ...rows].join("\n"),
      "text/csv;charset=utf-8",
    );
    setMenu(false);
  }
  return (
    <>
      <header className="app-header">
        <a className="brand" href="./">
          <span className="brand-mark">
            <Layers3 size={23} />
          </span>
          <span>
            AF Migration<span className="brand-light"> Lab</span>
            <span className="brand-caption">MATERIALS, IN MOTION</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <span className="nav-active">
            <Activity size={15} /> Compare formulations
          </span>
          <button onClick={() => setNotes(true)}>
            <BookOpen size={15} /> Model & research
          </button>
        </nav>
        <span className="workspace-status">
          <span className="status-dot" /> Local workspace · v2
        </span>
      </header>
      <main className="comparison-app">
        <div className="page-heading">
          <div>
            <div className="eyebrow">MULTILAYER AF · FORMULATION STUDIO</div>
            <h1>Two formulations. One clear comparison.</h1>
            <p>
              Research-based surfactant estimates, resin free volume and
              temperature-dependent migration.
            </p>
          </div>
          <div className="heading-actions">
            <button
              className="button secondary"
              onClick={() => importer.current?.click()}
            >
              <Upload size={15} /> Import
            </button>
            <div className="export-control">
              <button
                className="button secondary"
                onClick={() => setMenu(!menu)}
                aria-expanded={menu}
              >
                <Download size={15} /> Export <ChevronDown size={12} />
              </button>
              {menu && (
                <>
                  <button
                    className="menu-scrim"
                    aria-label="Close export menu"
                    onClick={() => setMenu(false)}
                  />
                  <div className="export-menu">
                    <button
                      disabled={!!errors.length}
                      onClick={() => {
                        saveFile(
                          "af-comparison-project.json",
                          JSON.stringify(
                            { schemaVersion: 2, ...workspace },
                            null,
                            2,
                          ),
                          "application/json",
                        );
                        setMenu(false);
                      }}
                    >
                      Project settings <span>JSON · A + B</span>
                    </button>
                    <button
                      disabled={!results || dirty || busy}
                      onClick={exportCsv}
                    >
                      <ArrowDownToLine size={14} /> Simulation results{" "}
                      <span>CSV · A + B</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <input
          ref={importer}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="Import AF project JSON"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
        <div className="comparison-layout">
          <div className="editor-column">
            <div
              className="editor-switch"
              role="group"
              aria-label="Choose formulation to edit"
            >
              {["A", "B"].map((label, i) => (
                <button
                  key={label}
                  className={active === i ? "active" : ""}
                  onClick={() => {
                    setActive(i);
                    setSelected(0);
                  }}
                  aria-pressed={active === i}
                >
                  Edit formulation {label}
                </button>
              ))}
            </div>
            <div className="editor-caption">
              Editing{" "}
              <strong>
                {active === 0 ? "A · Reference" : "B · Comparison"}
              </strong>
              <button
                className="text-button small"
                onClick={() => {
                  updateConfig(1, structuredClone(workspace.configs[0]));
                  setToast(
                    "A copied to B. Change B to explore another formulation.",
                  );
                }}
              >
                <Copy size={12} /> A → B
              </button>
            </div>
            <ConfigurationEditor
              key={active}
              config={workspace.configs[active]}
              selected={selected}
              onSelect={setSelected}
              onChange={(next) => updateConfig(active, next)}
            />
          </div>
          <div className="comparison-workspace" id="simulation-workspace">
            <section className="run-bar">
              <div>
                <span className="eyebrow">A CONTROLLED COMPARISON</span>
                <div className="experiment-description">
                  Independent inputs · synchronized time · identical color scale
                </div>
              </div>
              <button
                className="button primary run-button"
                disabled={busy || !!errors.length}
                onClick={() => run()}
              >
                <Play size={14} fill="currentColor" />
                {busy ? "Calculating both…" : "Run both simulations"}
              </button>
            </section>
            {errors.length > 0 && (
              <div className="error-banner" role="alert">
                <Info size={16} />
                {errors[0]}
              </div>
            )}
            {error && (
              <div className="error-banner" role="alert">
                <Info size={16} />
                {error}
                <button
                  className="icon-button"
                  aria-label="Dismiss error"
                  onClick={() => setError("")}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {dirty && (
              <div className="stale-banner">
                <Info size={14} /> Inputs changed. The views show the last run;
                run both simulations to update.
              </div>
            )}
            <section className="panel comparison-controls">
              <div className="view-toolbar">
                <div
                  className="segmented"
                  role="tablist"
                  aria-label="Visualization"
                >
                  <button
                    role="tab"
                    aria-selected={tab === "film"}
                    className={tab === "film" ? "active" : ""}
                    onClick={() => setTab("film")}
                  >
                    Concentration
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === "hsp"}
                    className={tab === "hsp" ? "active" : ""}
                    onClick={() => setTab("hsp")}
                  >
                    HSP compatibility
                  </button>
                </div>
                <label className="hue-select">
                  Surfactant hue
                  <select
                    aria-label="Surfactant hue"
                    value={workspace.hue}
                    onChange={(e) =>
                      setWorkspace((w) => ({
                        ...w,
                        hue: Number(e.target.value),
                      }))
                    }
                  >
                    <option value={280}>Violet</option>
                    <option value={195}>Cyan</option>
                    <option value={335}>Rose</option>
                    <option value={35}>Amber</option>
                  </select>
                </label>
              </div>
              <div className="shared-legend">
                <span>0 wt%</span>
                <span
                  className="shared-color-scale"
                  style={{
                    background: `linear-gradient(90deg,${concentrationColor(0, workspace.hue)},${concentrationColor(0.5, workspace.hue)},${concentrationColor(1, workspace.hue)})`,
                  }}
                />
                <strong>{formatNumber(scale, 2)} wt%</strong>
                <span>
                  Same hue and absolute concentration scale in both films.
                </span>
              </div>
              <div className="playback">
                <div className="timeline-labels">
                  <span>SHARED SIMULATION TIMELINE</span>
                  <span>Both films at {formatNumber(elapsed, 1)} h</span>
                </div>
                <input
                  type="range"
                  aria-label="Simulation time"
                  min={0}
                  max={frames - 1}
                  value={index}
                  disabled={!results || busy || dirty}
                  style={
                    {
                      "--progress": `${(index / (frames - 1)) * 100}%`,
                    } as React.CSSProperties
                  }
                  onChange={(e) => {
                    setPlaying(false);
                    setIndex(Number(e.target.value));
                  }}
                />
                <div className="playback-bottom">
                  <div className="player-buttons">
                    <button
                      className="icon-button"
                      aria-label="Restart timeline"
                      disabled={!results || dirty || busy}
                      onClick={() => {
                        setIndex(0);
                        setPlaying(false);
                      }}
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      className="play-control"
                      aria-label={
                        playing ? "Pause animation" : "Play animation"
                      }
                      disabled={!results || dirty || busy}
                      onClick={() => {
                        if (index === frames - 1) setIndex(0);
                        setPlaying(!playing);
                      }}
                    >
                      {playing ? (
                        <Pause size={14} fill="currentColor" />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                    </button>
                    <button
                      className="speed-button"
                      onClick={() => setSpeed(speed === 4 ? 1 : speed * 2)}
                    >
                      {speed}×
                    </button>
                    <span className="player-status">
                      {index === 0
                        ? "Initial distribution"
                        : playing
                          ? "Playing both films"
                          : "Paused"}
                    </span>
                  </div>
                  <span className="playback-time">
                    {formatNumber(elapsed, 1)} / {formatNumber(horizon, 1)} h
                  </span>
                </div>
              </div>
            </section>
            <div className="case-grid">
              {workspace.configs.map((c, i) => (
                <ScenarioView
                  key={i}
                  label={i === 0 ? "A" : "B"}
                  config={c}
                  result={results?.[i]}
                  index={index}
                  scale={scale}
                  hue={workspace.hue}
                  referenceConfigs={
                    results?.map((r) => r.config) || workspace.configs
                  }
                  sharedCapacity={Math.max(
                    ...(results?.map((r) => r.config.surfaceCapacity) ||
                      workspace.configs.map((c) => c.surfaceCapacity)),
                  )}
                  tab={tab}
                  active={active === i}
                  selected={active === i ? selected : -1}
                  onSelect={(n) => {
                    setActive(i);
                    setSelected(n);
                  }}
                  onEdit={() => {
                    setActive(i);
                    setSelected(0);
                  }}
                  onTemperature={(temperature) =>
                    updateConfig(i, { ...c, temperature })
                  }
                />
              ))}
            </div>
            {results && <ComparisonSummary results={results} index={index} />}
            <div className="validation-strip">
              {results?.map((r, i) => (
                <span key={i}>
                  {i === 0 ? "A" : "B"} mass residual:{" "}
                  {(r.maxError * 100).toExponential(1)}%
                </span>
              ))}
              <button
                className="text-button small"
                onClick={() => setNotes(true)}
              >
                Read the assumptions <ArrowRight size={13} />
              </button>
            </div>
            <div className="science-note">
              <Info size={16} />
              <p>
                Surfactant HSP values are group-contribution estimates for ideal
                representative molecules. Resin free-volume and transport
                presets are editable theoretical scenarios. Surface inventory is
                not a calibrated anti-fog efficacy score.
              </p>
            </div>
          </div>
        </div>
        <footer className="app-footer">
          <span>
            <Layers3 size={14} /> AF Migration Lab · Comparison studio
          </span>
          <button
            className="text-button"
            onClick={() => {
              const next = freshWorkspace();
              setWorkspace(next);
              setActive(0);
              setSelected(0);
              run(next, false);
            }}
          >
            Reset comparison example
          </button>
          <span>HVK / Fedors · Conservative transport</span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      <dialog
        ref={dialog}
        className="model-dialog"
        aria-labelledby="model-title"
        onCancel={() => setNotes(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setNotes(false);
        }}
      >
        <div className="modal-top">
          <span className="eyebrow">MODEL & RESEARCH</span>
          <button
            className="icon-button"
            aria-label="Close model notes"
            onClick={() => setNotes(false)}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="model-title">Trace the assumptions.</h2>
        <ModelNotes />
        <button className="button primary" onClick={() => setNotes(false)}>
          Back to comparison
        </button>
      </dialog>
    </>
  );
}

function ScenarioView({
  label,
  config,
  result,
  index,
  scale,
  hue,
  tab,
  active,
  selected,
  onSelect,
  onEdit,
  onTemperature,
  sharedCapacity,
  referenceConfigs,
}: {
  label: string;
  config: Config;
  result?: Result;
  index: number;
  scale: number;
  hue: number;
  sharedCapacity: number;
  referenceConfigs: Config[];
  tab: "film" | "hsp";
  active: boolean;
  selected: number;
  onSelect: (n: number) => void;
  onEdit: () => void;
  onTemperature: (t: number) => void;
}) {
  const f = result?.frames[index];
  const c = result?.config || config;
  const retained =
    result && f && result.initialMass > 0
      ? (f.filmMass / result.initialMass) * 100
      : 0;
  const loaded =
    c.layers.reduce(
      (s, l) => s + (l.thickness * 1e-6 * l.density * l.loading) / 100,
      0,
    ) * 1e6;
  return (
    <section
      className={`scenario-panel ${active ? "editing" : ""}`}
      aria-label={`Formulation ${label}`}
    >
      <div className="scenario-header">
        <div>
          <span className="scenario-letter">{label}</span>
          <h2>
            {label === "A" ? "Reference formulation" : "Comparison formulation"}
          </h2>
        </div>
        <button className="text-button" onClick={onEdit}>
          Edit {label} <ArrowRight size={12} />
        </button>
      </div>
      <div className="case-temperature">
        <Thermometer size={18} />
        <Field
          label={`Temperature ${label}`}
          value={config.temperature}
          min={0}
          max={80}
          unit="°C"
          onChange={onTemperature}
        />
        <span className="time-badge">{formatNumber(f?.hours || 0, 1)} h</span>
      </div>
      <div className="case-material">
        <strong>{c.surfactant.commonName || c.surfactant.name}</strong>
        <span>
          {c.layers.length} layers · {formatNumber(loaded, 1)} mg/m² initial AF
          · results at {c.temperature}°C
        </span>
      </div>
      <div className="visual-canvas">
        {result && f ? (
          tab === "film" ? (
            <FilmView
              result={result}
              frame={f}
              selected={selected}
              onSelect={onSelect}
              scale={scale}
              hue={hue}
            />
          ) : (
            <HansenView
              config={c}
              referenceConfigs={referenceConfigs}
              selected={selected}
              onSelect={onSelect}
            />
          )
        ) : (
          <div className="calculating">
            <Activity size={26} />
            Preparing formulation {label}…
          </div>
        )}
      </div>
      <div className="case-inventories">
        <div>
          <span>Face A · surface</span>
          <strong>
            {formatNumber((f?.surface[0] || 0) * 1e6, 2)}
            <small> mg/m²</small>
          </strong>
        </div>
        <div>
          <span>Face B · surface</span>
          <strong>
            {formatNumber((f?.surface[1] || 0) * 1e6, 2)}
            <small> mg/m²</small>
          </strong>
        </div>
        <div>
          <span>Retained in film</span>
          <strong>
            {formatNumber(retained, 1)}
            <small> %</small>
          </strong>
        </div>
      </div>
      <p className="case-loss">
        Removed externally:{" "}
        {formatNumber(((f?.lost[0] || 0) + (f?.lost[1] || 0)) * 1e6, 2)} mg/m² ·
        surface bars show Γ/Γmax
      </p>
      <div className="case-charts">
        <div>
          <h3>Concentration through film</h3>
          {result && f && (
            <ProfileChart result={result} frame={f} scale={scale} />
          )}
          <div className="chart-legend">
            <span>
              <i className="line-key" />
              Current
            </span>
            <span>
              <i className="line-key dashed" />
              Initial
            </span>
          </div>
        </div>
        <div>
          <h3>Surface accumulation</h3>
          {result && (
            <SurfaceChart
              result={result}
              index={index}
              sharedCapacity={sharedCapacity}
            />
          )}
          <div className="chart-legend">
            <span>
              <i className="line-key" />
              Face A
            </span>
            <span>
              <i className="line-key gold dashed" />
              Face B
            </span>
          </div>
        </div>
      </div>
      <div className="transport-readout">
        <div>
          <h3>Effective layer transport</h3>
          <span>
            {c.transportModel === "freeVolume"
              ? "Free-volume model"
              : "Arrhenius model"}
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Resin</th>
              <th>f(T)</th>
              <th>Xc</th>
              <th>D (m²/s)</th>
            </tr>
          </thead>
          <tbody>
            {c.layers.map((l, i) => {
              const t = layerTransport(l, c);
              return (
                <tr key={l.id}>
                  <td>
                    {i + 1} · {l.name}
                  </td>
                  <td>{formatNumber(t.freeVolume, 3)}</td>
                  <td>{formatNumber(l.crystallinity, 2)}</td>
                  <td>{t.diffusion.toExponential(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p>
          {c.transportModel === "freeVolume"
            ? "Theoretical f(T) and crystalline obstruction modify the common-reference baseline."
            : "Uses effective D₂₅ and Ea; no additional morphology correction applied."}
        </p>
      </div>
    </section>
  );
}
function ComparisonSummary({
  results,
  index,
}: {
  results: [Result, Result];
  index: number;
}) {
  const a = results[0].frames[index],
    b = results[1].frames[index];
  const surface = (f: typeof a) => (f.surface[0] + f.surface[1]) * 1e6;
  const removed = (f: typeof a) => (f.lost[0] + f.lost[1]) * 1e6;
  return (
    <section className="panel comparison-summary">
      <h2>
        Difference at {formatNumber(a.hours, 1)} h{" "}
        <span>Comparison B − Reference A</span>
      </h2>
      <div>
        <p>
          Combined surface inventory
          <strong>
            {formatNumber(surface(b) - surface(a), 3)} <small>mg/m²</small>
          </strong>
        </p>
        <p>
          Externally removed
          <strong>
            {formatNumber(removed(b) - removed(a), 3)} <small>mg/m²</small>
          </strong>
        </p>
      </div>
      <p className="control-note">
        Compare equal initial loadings to isolate temperature or resin effects.
        Inventory differences alone do not measure anti-fog efficacy.
      </p>
    </section>
  );
}
function ModelNotes() {
  return (
    <div className="model-notes">
      <section>
        <h3>19 researched surfactants, with provenance</h3>
        <p>
          The library uses Astra’s screening based on Van Krevelen / te
          Nijenhuis, Properties of Polymers (2009), Tables 7.3 and 7.10, Eqs.
          7.22–7.24. Values are HVK component estimates using Fedors molar
          volumes for explicit ideal structures, not measured commercial-grade
          properties. Commercial grades may contain isomers, mixed esters and EO
          distributions. Editing an HSP component switches to a custom estimate.
        </p>
        <code>δD = ΣFd / V · δP = √(ΣFp²) / V · δH = √(ΣEh / V)</code>
        <p>
          The complete group counts, assumptions and calculation script are
          retained in docs/surfactant-screening. No diffusion coefficient is
          inferred from HSP or molecular volume alone.
        </p>
      </section>
      <section>
        <h3>Temperature and resin free volume</h3>
        <p>
          Free volume is an assumed fractional free volume of the amorphous
          phase, not porosity or simply 1−crystallinity. Each resin has editable
          f₂₅, Tg, slopes below/above Tg and crystalline fraction Xc. Values are
          illustrative theoretical scenarios, not grade-specific measured data.
        </p>
        <code>
          f(T) = f₂₅ + αg[min(T,Tg)−min(25,Tg)] + αr[max(T,Tg)−max(25,Tg)]
        </code>
        <code>D(T) = Dbase · exp[−B(1/f(T)−1/0.10)] · (1−Xc)^τ</code>
        <p>
          This Doolittle-style model references Dbase to f=0.10 in a fully
          amorphous host. B and τ require calibration for the selected
          resin–surfactant pair; they are not predicted by the PDF. Temperature
          acts through f(T) in this mode, with no additional Arrhenius
          multiplier. Xc is held constant; melting, recrystallization and
          temperature-dependent phase changes are not modeled. Out-of-range free
          volume is rejected, not silently clipped.
        </p>
        <p>
          Alternatively choose Calibrated D₂₅ + Arrhenius: D(T)=D₂₅
          exp[−Ea/R(1/T−1/298.15)]. Here D₂₅ already includes morphology, and
          f/Xc corrections are not applied. The diffusion baseline has a
          different reference meaning in the two modes; do not reuse a
          calibrated effective D₂₅ as Dbase without refitting.
        </p>
      </section>
      <section>
        <h3>Conservative multilayer migration</h3>
        <code>J = −D S ∇(c/S) · S = exp[−min(14, β RED²)]</code>
        <p>
          Hansen distance uses all three HSP components, Ra²=4ΔδD²+ΔδP²+ΔδH².
          RED=Ra/R₀. S is a tunable relative affinity, not absolute solubility;
          equilibrium concentration ratios follow S ratios. HSP is held at its
          reference value as temperature changes. Finite-volume fluxes include
          half-cell resistances and preserve interlayer partitioning.
        </p>
        <p>
          Dry faces exchange reversibly with a finite Langmuir surface
          inventory. Washed faces additionally lose material to a renewed dilute
          receiver. Sealed faces have zero flux; perfect sinks directly extract
          to the removed inventory. No double-counted flux or post-hoc
          concentration clipping.
        </p>
        <code>q = kads(c/S)(1−Γ/Γmax)−kdesΓ · dΓ/dt=q−kwashΓ</code>
        <code>Mfilm + ΓA + ΓB + Mremoved = Minitial</code>
        <p>
          The split solver uses backward Euler diffusion, bounded implicit
          exchange and exponential washing; default resolution is 24 cells/layer
          and 4,320 steps. Mass conservation is checked but is not a guarantee
          of mesh/time convergence. Surface rates are held fixed with
          temperature.
        </p>
      </section>
      <section>
        <h3>A fair visual comparison</h3>
        <p>
          Both formulations use the same physical elapsed time and one duration.
          A shared absolute wt% color scale is fixed using the maximum across
          both complete runs; the same concentration always has the same color
          in either film. Hue identifies the surfactant concentration field, not
          moving molecular trajectories. Each geometry and depth axis uses its
          own layer thicknesses. Output is a single mobile component, not a
          mixture of multiple surfactants.
        </p>
        <p>
          Initial surface inventories are zero. There is no finite stagnant
          water bath, immobile reserve, aggregation, crystal phase equilibrium,
          humidity swelling or calibrated optical AF prediction. Compare these
          scenarios with measured migration and AF data before quantitative use.
        </p>
      </section>
    </div>
  );
}
