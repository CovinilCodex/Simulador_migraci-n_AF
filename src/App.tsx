import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Beaker,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  FlaskConical,
  Info,
  Layers3,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Waves,
  X,
} from "lucide-react";
import {
  COLORS,
  defaultConfig,
  makeLayer,
  POLYMERS,
  SURFACTANTS,
} from "./materials.ts";
import { compatibility, validateConfig } from "./solver.ts";
import {
  boundaryLabel,
  FilmView,
  formatNumber,
  HansenView,
  ProfileChart,
  SurfaceChart,
} from "./visuals.tsx";
import type { Boundary, Config, HSP, Layer, Result } from "./types.ts";

const STORAGE = "af-migration-lab-v1";
function readConfig(): Config {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (stored && validateConfig(stored).length === 0) return stored;
  } catch {
    /* Local storage may be disabled; the app still works. */
  }
  return defaultConfig();
}
function saveFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Field({
  label,
  value,
  onChange,
  min,
  max,
  step = "any",
  unit,
  title,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: string | number;
  unit?: string;
  title?: string;
}) {
  const invalid = !Number.isFinite(value) || value < min || value > max;
  return (
    <label className={`field ${invalid ? "invalid" : ""}`} title={title}>
      <span className="field-label">{label}</span>
      <span className="input-wrap">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
          min={min}
          max={max}
          step={step}
          required
          aria-invalid={invalid}
        />
        <span className="input-unit">{unit}</span>
      </span>
      {invalid && (
        <span className="field-error">
          Enter {min}–{max}
        </span>
      )}
    </label>
  );
}
function HspFields({
  value,
  onChange,
}: {
  value: HSP;
  onChange: (hsp: HSP) => void;
}) {
  return (
    <div className="hsp-fields">
      {(["d", "p", "h"] as const).map((key, i) => (
        <Field
          key={key}
          label={["δD · dispersion", "δP · polarity", "δH · H-bonding"][i]}
          value={value[key]}
          min={0}
          max={40}
          onChange={(v) => onChange({ ...value, [key]: v })}
        />
      ))}
    </div>
  );
}
function SectionTitle({
  icon,
  title,
  number,
  children,
}: {
  icon: ReactNode;
  title: string;
  number: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div className="section-heading">
        {icon}
        <h2>{title}</h2>
      </div>
      {children || <span className="section-index">{number}</span>}
    </div>
  );
}
function LayerCard({
  layer,
  index,
  total,
  selected,
  surfactant,
  beta,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
}: {
  layer: Layer;
  index: number;
  total: number;
  selected: boolean;
  surfactant: HSP;
  beta: number;
  onSelect: () => void;
  onChange: (l: Layer) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (offset: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const match = compatibility(layer.hsp, surfactant, layer.radius, beta);
  const change = (patch: Partial<Layer>) => onChange({ ...layer, ...patch });
  const loadPolymer = (polymer: string) =>
    change({ ...structuredClone(POLYMERS[polymer]), polymer });
  return (
    <article
      className={`layer-card ${selected ? "selected" : ""}`}
      style={{ "--layer-color": COLORS[index] } as React.CSSProperties}
      onFocus={onSelect}
    >
      <div className="layer-top">
        <button
          type="button"
          className="layer-number"
          onClick={onSelect}
          aria-label={`Select layer ${index + 1}`}
        >
          {String(index + 1).padStart(2, "0")}
        </button>
        <label className="polymer-select">
          <span className="sr-only">Polymer for layer {index + 1}</span>
          <select
            value={layer.polymer in POLYMERS ? layer.polymer : "Custom"}
            onChange={(e) => loadPolymer(e.target.value)}
          >
            {Object.entries(POLYMERS).map(([key, p]) => (
              <option key={key} value={key}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </label>
        <div className="layer-actions">
          <button
            type="button"
            className="icon-button"
            onClick={onDuplicate}
            disabled={total >= 8}
            title="Duplicate layer"
            aria-label={`Duplicate layer ${index + 1}`}
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onDelete}
            disabled={total === 1}
            title="Remove layer"
            aria-label={`Remove layer ${index + 1}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="two-fields">
        <Field
          label="Thickness"
          value={layer.thickness}
          min={1}
          max={500}
          unit="µm"
          onChange={(v) => change({ thickness: v })}
        />
        <Field
          label="AF concentration"
          value={layer.loading}
          min={0}
          max={10}
          unit="wt%"
          onChange={(v) => change({ loading: v })}
        />
      </div>
      <div className="layer-bottom">
        <button
          type="button"
          className="text-button small"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <SlidersHorizontal size={12} /> HSP & transport{" "}
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <span
          className={`red-tag ${match.red <= 1 ? "compatible" : ""}`}
          title={`Hansen distance / polymer interaction radius. ${match.red <= 1 ? "Inside" : "Outside"} the illustrative compatibility sphere.`}
        >
          RED {Number.isFinite(match.red) ? match.red.toFixed(2) : "—"}
        </span>
      </div>
      {expanded && (
        <div className="layer-expanded">
          <p className="control-note">Hansen parameters · MPa½</p>
          <HspFields value={layer.hsp} onChange={(hsp) => change({ hsp })} />
          <div className="two-fields">
            <Field
              label="Interaction radius R₀"
              value={layer.radius}
              min={0.5}
              max={30}
              unit="MPa½"
              onChange={(radius) => change({ radius })}
            />
            <Field
              label="Density"
              value={layer.density}
              min={500}
              max={2500}
              unit="kg/m³"
              onChange={(density) => change({ density })}
            />
          </div>
          <div className="two-fields">
            <Field
              label="log₁₀ D at 25°C"
              title="Diffusion coefficient D in m²/s. −14 means 10⁻¹⁴ m²/s. Independent of the HSP affinity."
              value={layer.logD}
              min={-20}
              max={-10}
              onChange={(logD) => change({ logD })}
            />
            <Field
              label="Activation energy"
              value={layer.ea}
              min={0}
              max={150}
              unit="kJ/mol"
              onChange={(ea) => change({ ea })}
            />
          </div>
          <div className="reorder">
            <span>Position in film</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              aria-label={`Move layer ${index + 1} up`}
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              aria-label={`Move layer ${index + 1} down`}
            >
              <ArrowDown size={13} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function App() {
  const [config, setConfig] = useState<Config>(readConfig);
  const [result, setResult] = useState<Result | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<"film" | "hsp">("film");
  const [showModel, setShowModel] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const worker = useRef<Worker | null>(null);
  const importer = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const errors = validateConfig(config);
  const dirty =
    !!result && JSON.stringify(result.config) !== JSON.stringify(config);
  const frame = result?.frames[index];
  const totalThickness = config.layers.reduce((v, l) => v + l.thickness, 0);
  const inputMass = config.layers.reduce(
    (v, l) => v + (l.thickness * 1e-6 * l.density * l.loading) / 100,
    0,
  );
  const run = (next: Config, autoplay = true) => {
    if (validateConfig(next).length) return;
    worker.current?.terminate();
    setBusy(true);
    setPlaying(false);
    setError("");
    setShowExport(false);
    const instance = new Worker(
      new URL("./simulation.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = instance;
    instance.onmessage = (
      e: MessageEvent<{ result?: Result; error?: string }>,
    ) => {
      if (e.data.result) {
        setResult(e.data.result);
        setIndex(0);
        setPlaying(autoplay);
      } else setError(e.data.error || "The simulation could not be completed.");
      setBusy(false);
      instance.terminate();
      worker.current = null;
    };
    instance.onerror = () => {
      setError(
        "The simulation worker could not start. Reload the page and try again.",
      );
      setBusy(false);
      instance.terminate();
      worker.current = null;
    };
    instance.postMessage(next);
  };
  useEffect(() => {
    run(config, false);
    return () => worker.current?.terminate();
  }, []); // Initial, validated local scenario.
  useEffect(() => {
    if (!errors.length) {
      try {
        localStorage.setItem(STORAGE, JSON.stringify(config));
      } catch {
        /* Optional persistence. */
      }
    }
    setPlaying(false);
  }, [config]);
  useEffect(() => {
    if (!playing || !result || dirty || busy) return;
    const timer = window.setInterval(
      () =>
        setIndex((i) => {
          if (i >= result.frames.length - 1) {
            setPlaying(false);
            return i;
          }
          return Math.min(result.frames.length - 1, i + speed);
        }),
      90,
    );
    return () => window.clearInterval(timer);
  }, [playing, result, speed, dirty, busy]);
  useEffect(() => {
    if (showModel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [showModel]);
  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(""), 4200);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const update = (patch: Partial<Config>) =>
    setConfig((c) => ({ ...c, ...patch }));
  const changeLayer = (i: number, layer: Layer) =>
    update({ layers: config.layers.map((l, j) => (j === i ? layer : l)) });
  function moveLayer(i: number, offset: number) {
    const layers = [...config.layers];
    [layers[i], layers[i + offset]] = [layers[i + offset], layers[i]];
    update({ layers });
    setSelected(i + offset);
  }
  function loadExample() {
    const next = defaultConfig();
    setConfig(next);
    setSelected(0);
    run(next, false);
    setToast("Three-layer example loaded. All preset values are illustrative.");
  }
  async function importProject(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1_000_000)
        throw new Error("Choose a project file smaller than 1 MB.");
      const data = JSON.parse(await file.text());
      if (data.schemaVersion !== 1)
        throw new Error("This is not an AF Migration Lab v1 project.");
      const problems = validateConfig(data.config);
      if (problems.length) throw new Error(problems[0]);
      setConfig(data.config);
      setSelected(0);
      run(data.config, false);
      setToast("Project imported and simulated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid project file.");
    }
    if (importer.current) importer.current.value = "";
  }
  function exportCsv() {
    if (!result || dirty) return;
    const header =
      "time_h,depth_um,layer,polymer,concentration_kg_m3,concentration_wt_pct,surface_A_mg_m2,surface_B_mg_m2,lost_A_mg_m2,lost_B_mg_m2,film_mg_m2,mass_balance_relative_error";
    const csvText = (s: string) =>
      `"${(/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
    const rows = result.frames.flatMap((f) =>
      result.cells.map((cell, j) =>
        [
          f.hours,
          cell.x * 1e6,
          cell.layer + 1,
          csvText(result.config.layers[cell.layer].name),
          f.concentration[j],
          (f.concentration[j] / cell.density) * 100,
          ...f.surface.map((v) => v * 1e6),
          ...f.lost.map((v) => v * 1e6),
          f.filmMass * 1e6,
          f.massError,
        ].join(","),
      ),
    );
    saveFile(
      "af-migration-results.csv",
      [header, ...rows].join("\n"),
      "text/csv;charset=utf-8",
    );
    setShowExport(false);
    setToast("Concentration profiles and mass inventories exported.");
  }
  const activeConfig = result?.config || config;
  const scale = result
    ? Math.max(
        0.01,
        ...result.frames.flatMap((f) =>
          f.concentration.map((v, i) => (v / result.cells[i].density) * 100),
        ),
      ) * 1.05
    : 1;
  const totalLost = frame ? (frame.lost[0] + frame.lost[1]) * 1e6 : 0;
  const remaining =
    result && frame && result.initialMass > 0
      ? (frame.filmMass / result.initialMass) * 100
      : 0;

  return (
    <>
      <header className="app-header">
        <a className="brand" href="./" aria-label="AF Migration Lab home">
          <span className="brand-mark">
            <Layers3 size={23} strokeWidth={1.6} />
          </span>
          <span>
            AF Migration<span className="brand-light"> Lab</span>
            <span className="brand-caption">MATERIALS, IN MOTION</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <span className="nav-active">
            <Activity size={15} /> Simulator
          </span>
          <button onClick={() => setShowModel(true)}>
            <BookOpen size={15} /> Model & assumptions
          </button>
        </nav>
        <div className="workspace-status">
          <span className="status-dot" /> Local workspace
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="tiny-line" /> MULTILAYER FILM EXPLORER
            </div>
            <h1>Understand what moves.</h1>
            <p>
              Explore how your film structure and material affinity shape
              anti-fog migration.
            </p>
          </div>
          <div className="heading-actions">
            <button
              className="button secondary"
              onClick={() => importer.current?.click()}
            >
              <Upload size={15} />
              <span>Import</span>
            </button>
            <div className="export-control">
              <button
                className="button secondary"
                onClick={() => setShowExport(!showExport)}
                aria-expanded={showExport}
              >
                <Download size={15} /> Export <ChevronDown size={13} />
              </button>
              {showExport && (
                <>
                  <button
                    className="menu-scrim"
                    aria-label="Close export menu"
                    onClick={() => setShowExport(false)}
                  />
                  <div className="export-menu">
                    <button
                      onClick={() => {
                        if (!errors.length) {
                          saveFile(
                            "af-migration-project.json",
                            JSON.stringify(
                              { schemaVersion: 1, config },
                              null,
                              2,
                            ),
                            "application/json",
                          );
                          setShowExport(false);
                        }
                      }}
                      disabled={errors.length > 0}
                    >
                      <Settings2 size={15} /> Project settings <span>JSON</span>
                    </button>
                    <button
                      onClick={exportCsv}
                      disabled={!result || dirty || busy}
                    >
                      <ArrowDownToLine size={15} /> Simulation results{" "}
                      <span>CSV</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <input
          type="file"
          ref={importer}
          className="sr-only"
          accept=".json,application/json"
          onChange={(e) => void importProject(e.target.files?.[0])}
          aria-label="Import AF project JSON"
        />
        <div className="workspace-layout">
          <aside
            className="configuration"
            aria-label="Simulation configuration"
          >
            <section className="config-section architecture">
              <SectionTitle
                icon={<Layers3 size={17} />}
                title="Film structure"
                number="01"
              >
                <span className="count-tag">{config.layers.length} layers</span>
              </SectionTitle>
              <div className="stack-direction">
                <span>FACE A</span>
                <span className="direction-line" />
                <span>FACE B</span>
              </div>
              <div className="layer-list">
                {config.layers.map((layer, i) => (
                  <LayerCard
                    key={layer.id}
                    layer={layer}
                    index={i}
                    total={config.layers.length}
                    selected={i === selected}
                    surfactant={config.surfactant.hsp}
                    beta={config.beta}
                    onSelect={() => setSelected(i)}
                    onChange={(l) => changeLayer(i, l)}
                    onDelete={() => {
                      update({
                        layers: config.layers.filter((_, j) => i !== j),
                      });
                      setSelected(0);
                    }}
                    onDuplicate={() => {
                      const layers = [...config.layers];
                      layers.splice(i + 1, 0, {
                        ...structuredClone(layer),
                        id: crypto.randomUUID(),
                      });
                      update({ layers });
                      setSelected(i + 1);
                    }}
                    onMove={(offset) => moveLayer(i, offset)}
                  />
                ))}
              </div>
              <button
                className="add-layer"
                disabled={config.layers.length >= 8}
                onClick={() => {
                  update({ layers: [...config.layers, makeLayer()] });
                  setSelected(config.layers.length);
                }}
              >
                <Plus size={15} />{" "}
                {config.layers.length >= 8
                  ? "Maximum 8 layers"
                  : "Add polymer layer"}
              </button>
              <div className="stack-summary">
                <span>Total film thickness</span>
                <strong>
                  {Number.isFinite(totalThickness)
                    ? formatNumber(totalThickness, 0)
                    : "—"}{" "}
                  <span>µm</span>
                </strong>
              </div>
            </section>
            <section className="config-section">
              <SectionTitle
                icon={<FlaskConical size={17} />}
                title="Surfactant & affinity"
                number="02"
              />
              <label className="field">
                <span className="field-label">AF surfactant</span>
                <select
                  className="full-select"
                  value={
                    SURFACTANTS.some((s) => s.name === config.surfactant.name)
                      ? config.surfactant.name
                      : "Custom surfactant"
                  }
                  onChange={(e) =>
                    update({
                      surfactant: structuredClone(
                        SURFACTANTS.find((s) => s.name === e.target.value)!,
                      ),
                    })
                  }
                >
                  {SURFACTANTS.map((s) => (
                    <option key={s.name}>{s.name}</option>
                  ))}
                </select>
              </label>
              <p className="control-note spaced">Hansen parameters · MPa½</p>
              <HspFields
                value={config.surfactant.hsp}
                onChange={(hsp) =>
                  update({ surfactant: { name: "Custom surfactant", hsp } })
                }
              />
              <div className="assumption-note">
                <Info size={14} />
                <span>
                  Presets are illustrative. Use measured HSP and transport
                  values for your materials.
                </span>
              </div>
              <details className="advanced">
                <summary>
                  <span>Affinity model</span>
                  <ChevronDown size={13} />
                </summary>
                <Field
                  label="HSP sensitivity β"
                  value={config.beta}
                  min={0}
                  max={5}
                  onChange={(beta) => update({ beta })}
                />
                <p className="control-note">
                  Relative affinity S = exp(−β · RED²). This is a tunable
                  partitioning assumption, not absolute solubility.
                </p>
              </details>
            </section>
            <section className="config-section">
              <SectionTitle
                icon={<Settings2 size={17} />}
                title="Test conditions"
                number="03"
              />
              <div className="two-fields">
                <Field
                  label="Temperature"
                  value={config.temperature}
                  min={0}
                  max={80}
                  unit="°C"
                  onChange={(temperature) => update({ temperature })}
                />
                <Field
                  label="Duration"
                  value={config.hours}
                  min={0.1}
                  max={720}
                  unit="hours"
                  onChange={(hours) => update({ hours })}
                />
              </div>
              {(["left", "right"] as const).map((side, i) => (
                <label className="field boundary-field" key={side}>
                  <span className="field-label">
                    Face {i === 0 ? "A" : "B"} boundary
                  </span>
                  <select
                    className="full-select"
                    value={config[side]}
                    onChange={(e) =>
                      update({ [side]: e.target.value as Boundary })
                    }
                  >
                    {(["dry", "wash", "sealed", "sink"] as const).map(
                      (mode) => (
                        <option key={mode} value={mode}>
                          {boundaryLabel(mode)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ))}
              <details className="advanced">
                <summary>
                  <span>Surface kinetics</span>
                  <ChevronDown size={13} />
                </summary>
                <div className="two-fields">
                  <Field
                    label="Capacity / face"
                    value={config.surfaceCapacity}
                    min={0.01}
                    max={100}
                    unit="mg/m²"
                    onChange={(surfaceCapacity) => update({ surfaceCapacity })}
                  />
                  <Field
                    label="log₁₀ adsorption"
                    title="Adsorption velocity in m/s, expressed against relative activity c/S."
                    value={config.logAdsorption}
                    min={-16}
                    max={-6}
                    onChange={(logAdsorption) => update({ logAdsorption })}
                  />
                </div>
                <div className="two-fields">
                  <Field
                    label="Desorption rate"
                    value={config.desorption}
                    min={0}
                    max={100}
                    unit="h⁻¹"
                    onChange={(desorption) => update({ desorption })}
                  />
                  <Field
                    label="Wash rate"
                    value={config.washRate}
                    min={0}
                    max={100}
                    unit="h⁻¹"
                    onChange={(washRate) => update({ washRate })}
                  />
                </div>
              </details>
            </section>
            <button
              className="text-button example-button"
              onClick={loadExample}
            >
              <RotateCcw size={13} /> Load three-layer example
            </button>
          </aside>
          <div className="simulation-workspace" id="simulation-workspace">
            <section className="run-bar">
              <div>
                <span className="eyebrow">YOUR EXPERIMENT</span>
                <div className="experiment-description">
                  <span>{config.layers.length}-layer film</span>
                  <span className="divider-dot">·</span>
                  <span>
                    {Number.isFinite(inputMass)
                      ? formatNumber(inputMass * 1e6, 1)
                      : "—"}{" "}
                    mg/m² initial AF
                  </span>
                </div>
              </div>
              <button
                className="button primary run-button"
                onClick={() => run(config)}
                disabled={busy || errors.length > 0}
              >
                <Play size={15} fill="currentColor" />
                {busy ? "Calculating…" : "Run simulation"}
                <ArrowUpRight size={16} />
              </button>
            </section>
            {errors.length > 0 && (
              <div className="error-banner" role="alert">
                <Info size={16} />
                <span>
                  {errors[0]}
                  {errors.length > 1
                    ? ` (${errors.length} fields need attention.)`
                    : ""}
                </span>
              </div>
            )}
            {error && (
              <div className="error-banner" role="alert">
                <Info size={16} />
                <span>{error}</span>
                <button
                  className="icon-button"
                  onClick={() => setError("")}
                  aria-label="Dismiss error"
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <section
              className={`panel visualization ${dirty ? "stale" : ""}`}
              aria-label="Migration visualization"
            >
              <div className="panel-heading">
                <div>
                  <div className="panel-title">
                    <span className="panel-icon">
                      <Layers3 size={17} />
                    </span>
                    <h2>Inside the film</h2>
                  </div>
                  <p>
                    A closer look at surfactant distribution across your layers.
                  </p>
                </div>
                <span className="model-badge">
                  <span className="status-dot" /> HSP-guided model
                </span>
              </div>
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
                <span className="time-badge">
                  <span className={playing ? "pulse-dot" : "status-dot"} />
                  {frame ? formatNumber(frame.hours, 1) : "0.0"}{" "}
                  <span>hours</span>
                </span>
              </div>
              {dirty && (
                <div className="stale-banner">
                  <Info size={14} /> Inputs changed. Run the simulation to
                  update these results.
                </div>
              )}
              <div className="visual-canvas">
                {tab === "hsp" ? (
                  <HansenView
                    config={errors.length ? activeConfig : config}
                    selected={selected}
                    onSelect={setSelected}
                  />
                ) : result && frame ? (
                  <FilmView
                    result={result}
                    frame={frame}
                    selected={selected}
                    onSelect={setSelected}
                    scale={scale}
                  />
                ) : (
                  <div className="calculating">
                    <Activity size={28} />
                    <span>
                      {busy
                        ? "Preparing your film…"
                        : "Run a valid scenario to visualize migration."}
                    </span>
                  </div>
                )}
              </div>
              <div className="visual-legend">
                {tab === "film" ? (
                  <>
                    <span className="legend-label">AF concentration</span>
                    <span>0</span>
                    <span className="color-scale" />
                    <span>{formatNumber(scale, 2)} wt%</span>
                    <span className="surface-key">
                      <span /> Surface inventory
                    </span>
                  </>
                ) : (
                  <>
                    <span className="legend-label">
                      Relative energy difference
                    </span>
                    <span className="hsp-key inside" />{" "}
                    <span>RED ≤ 1 · closer match</span>
                    <span className="hsp-key outside" />
                    <span>RED &gt; 1 · weaker match</span>
                  </>
                )}
              </div>
              <div className="playback">
                <div className="timeline-labels">
                  <span>SIMULATION TIMELINE</span>
                  <span>{formatNumber(activeConfig.hours, 0)} h total</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={(result?.frames.length || 181) - 1}
                  value={index}
                  onChange={(e) => {
                    setPlaying(false);
                    setIndex(Number(e.target.value));
                  }}
                  disabled={!result || busy || dirty}
                  aria-label="Simulation time"
                  style={
                    {
                      "--progress": `${result ? (index / (result.frames.length - 1)) * 100 : 0}%`,
                    } as React.CSSProperties
                  }
                />
                <div className="playback-bottom">
                  <div className="player-buttons">
                    <button
                      className="icon-button restart"
                      disabled={!result || busy || dirty}
                      onClick={() => {
                        setIndex(0);
                        setPlaying(false);
                      }}
                      aria-label="Restart timeline"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      className="play-control"
                      disabled={!result || busy || dirty}
                      onClick={() => {
                        if (result && index === result.frames.length - 1)
                          setIndex(0);
                        setPlaying(!playing);
                      }}
                      aria-label={
                        playing ? "Pause animation" : "Play animation"
                      }
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
                      aria-label={`Playback speed ${speed} times. Click to change.`}
                    >
                      {speed}×
                    </button>
                    <span className="player-status">
                      {busy
                        ? "Solving mass balance"
                        : dirty
                          ? "Awaiting new run"
                          : playing
                            ? "Playing migration"
                            : index === 0
                              ? "Initial distribution"
                              : "Paused"}
                    </span>
                  </div>
                  <span className="playback-time">
                    {frame ? formatNumber(frame.hours, 1) : "0.0"}{" "}
                    <span>/ {formatNumber(activeConfig.hours, 0)} h</span>
                  </span>
                </div>
              </div>
            </section>
            <div className="metric-grid">
              <section className="metric-card">
                <div className="metric-top">
                  <span>Surface A inventory</span>
                  <Sparkles size={16} />
                </div>
                <div className="metric-value">
                  {frame ? formatNumber(frame.surface[0] * 1e6, 2) : "—"}
                  <span>mg/m²</span>
                </div>
                <div className="metric-caption">
                  <span className="mini-dot green" />{" "}
                  {frame
                    ? formatNumber(
                        ((frame.surface[0] * 1e6) /
                          activeConfig.surfaceCapacity) *
                          100,
                        1,
                      )
                    : "0"}
                  % of surface capacity
                </div>
              </section>
              <section className="metric-card">
                <div className="metric-top">
                  <span>Surface B inventory</span>
                  <Sparkles size={16} />
                </div>
                <div className="metric-value">
                  {frame ? formatNumber(frame.surface[1] * 1e6, 2) : "—"}
                  <span>mg/m²</span>
                </div>
                <div className="metric-caption">
                  <span className="mini-dot gold" />{" "}
                  {frame
                    ? formatNumber(
                        ((frame.surface[1] * 1e6) /
                          activeConfig.surfaceCapacity) *
                          100,
                        1,
                      )
                    : "0"}
                  % of surface capacity
                </div>
              </section>
              <section className="metric-card">
                <div className="metric-top">
                  <span>Retained in film</span>
                  <ShieldCheck size={16} />
                </div>
                <div className="metric-value">
                  {formatNumber(remaining, 1)}
                  <span>%</span>
                </div>
                <div className="metric-caption">
                  {formatNumber(totalLost, 2)} mg/m² removed externally
                </div>
              </section>
            </div>
            <div className="chart-grid">
              <section className="panel chart-panel">
                <div className="chart-heading">
                  <h2>Concentration profile</h2>
                  <span className="chart-corner">
                    AT {frame ? formatNumber(frame.hours, 1) : "0"} H
                  </span>
                </div>
                <p>From face A to face B, through the film.</p>
                {result && frame && (
                  <ProfileChart result={result} frame={frame} scale={scale} />
                )}
                <div className="chart-legend">
                  <span>
                    <i className="line-key" /> Current
                  </span>
                  <span>
                    <i className="line-key dashed" /> Initial
                  </span>
                </div>
              </section>
              <section className="panel chart-panel">
                <div className="chart-heading">
                  <h2>Surface accumulation</h2>
                  <Waves size={16} />
                </div>
                <p>Surfactant reaching each exposed surface.</p>
                {result && <SurfaceChart result={result} index={index} />}
                <div className="chart-legend">
                  <span>
                    <i className="line-key" /> Face A
                  </span>
                  <span>
                    <i className="line-key gold dashed" /> Face B
                  </span>
                </div>
              </section>
            </div>
            <section className="panel affinity-panel">
              <div className="chart-heading">
                <div className="panel-title">
                  <Beaker size={17} />
                  <h2>Material compatibility</h2>
                </div>
                <span className="chart-corner">HANSEN · RED</span>
              </div>
              <p>
                Lower RED indicates closer HSP matching. This is an affinity
                screen, not measured solubility.
              </p>
              <div className="affinity-list">
                {config.layers.map((l, i) => {
                  const m = compatibility(
                    l.hsp,
                    config.surfactant.hsp,
                    l.radius,
                    config.beta,
                  );
                  return (
                    <button
                      className={`affinity-row ${selected === i ? "active" : ""}`}
                      key={l.id}
                      onClick={() => {
                        setSelected(i);
                        setTab("hsp");
                      }}
                    >
                      <span
                        className="material-dot"
                        style={{ background: COLORS[i] }}
                      />
                      <span className="affinity-name">
                        {String(i + 1).padStart(2, "0")}{" "}
                        <strong>{l.name}</strong>
                      </span>
                      <span className="affinity-track">
                        <span
                          style={{
                            width: `${Math.min(100, Math.max(0, (1 - m.red / 3) * 100))}%`,
                            background: COLORS[i],
                          }}
                        />
                        <i />
                      </span>
                      <span className="affinity-number">
                        {Number.isFinite(m.red) ? m.red.toFixed(2) : "—"}
                      </span>
                      <span
                        className={`affinity-status ${m.red <= 1 ? "good" : ""}`}
                      >
                        {m.red <= 1 ? "Closer match" : "Weaker match"}
                      </span>
                      <ArrowUpRight size={13} />
                    </button>
                  );
                })}
              </div>
              <div className="affinity-footnote">
                <Info size={13} /> HSP guides partitioning. Diffusion
                coefficients set the migration timescale.
              </div>
            </section>
            <div className="validation-strip">
              <div>
                <CheckCheck size={16} />
                <span>
                  Mass balance{" "}
                  {result
                    ? `${(result.maxError * 100).toExponential(1)}% relative error`
                    : "pending"}
                </span>
              </div>
              <button
                className="text-button small"
                onClick={() => setShowModel(true)}
              >
                Explore the model <ArrowRight size={13} />
              </button>
            </div>
            <div className="science-note">
              <CircleHelp size={15} />
              <p>
                An exploratory migration model. Surface inventory is not a
                calibrated prediction of anti-fog performance. Material presets
                and HSP partitioning require experimental calibration.
              </p>
            </div>
          </div>
        </div>
        <footer className="app-footer">
          <span>
            <Layers3 size={14} /> AF Migration Lab{" "}
            <span className="footer-version">v1.0</span>
          </span>
          <span>Built for curiosity. Grounded in conservation.</span>
          <button
            className="text-button small"
            onClick={() => setShowModel(true)}
          >
            Model notes <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} /> {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="model-dialog"
        onCancel={() => setShowModel(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowModel(false);
        }}
        aria-labelledby="model-title"
      >
        <div className="modal-top">
          <span className="eyebrow">THE SCIENCE BEHIND THE VIEW</span>
          <button
            className="icon-button"
            onClick={() => setShowModel(false)}
            aria-label="Close model notes"
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="model-title">A model you can inspect.</h2>
        <p className="modal-intro">
          A one-dimensional, isothermal model for a single mobile AF surfactant
          across up to eight polymer layers. All calculations run in your
          browser.
        </p>
        <ModelNotes />
        <div className="modal-bottom">
          <span>
            <ShieldCheck size={16} /> Every transfer is included in the mass
            balance.
          </span>
          <button
            className="button primary"
            onClick={() => setShowModel(false)}
          >
            Back to the experiment <ArrowRight size={15} />
          </button>
        </div>
      </dialog>
    </>
  );
}

function ModelNotes() {
  return (
    <div className="model-notes">
      <section>
        <h3>01 / HSP is a compatibility scale</h3>
        <p>
          Hansen distance uses dispersion (δD), polarity (δP) and hydrogen
          bonding (δH), all in MPa½. The polymer interaction radius R₀ gives RED
          = Rₐ/R₀. RED ≤ 1 is a conventional compatibility screen; it does not
          establish a material’s actual dissolved concentration.
        </p>
        <code>Rₐ² = 4(ΔδD)² + (ΔδP)² + (ΔδH)²</code>
        <p>
          We assume relative affinity S = exp(−β·RED²), with β editable and the
          exponent capped at 14 for numerical conditioning. Between layers,
          equilibrium obeys c₂/c₁ = S₂/S₁. This mapping is illustrative, not a
          universal HSP-to-solubility law. β = 0 disables HSP-driven
          partitioning.
        </p>
      </section>
      <section>
        <h3>02 / Diffusion through the layers</h3>
        <p>
          Each layer has an independent D at 25°C, density, initial AF mass
          fraction and activation energy. Concentration c is in kg/m³. Activity
          proxy a = c/S. Within a uniform layer, the model reduces to Fick’s
          law.
        </p>
        <code>∂c/∂t = −∂J/∂x ··· J = −D S ∂(c/S)/∂x</code>
        <code>D(T) = D₂₅ exp[−Eₐ/R (1/T − 1/298.15)]</code>
        <p>
          Interfacial fluxes use the two adjacent half-cell resistances,
          preserving partitioning and mass. Temperature is in kelvin in the
          Arrhenius calculation. D is not inferred from HSP.
        </p>
      </section>
      <section>
        <h3>03 / Two independently controlled faces</h3>
        <p>
          <strong>Dry AF surface:</strong> reversible, saturating adsorption.{" "}
          <strong>Continuous wash:</strong> the same surface kinetics plus
          irreversible removal to a renewed dilute receiver.{" "}
          <strong>Sealed:</strong> zero flux. <strong>Perfect sink:</strong>{" "}
          zero boundary concentration; all extracted material enters the removed
          inventory.
        </p>
        <code>q = kads (c/S)(1 − Γ/Γmax) − kdes Γ</code>
        <code>dΓ/dt = q − kwash Γ</code>
        <p>
          Γ is mass per unit area. Wash is active only on faces set to
          continuous wash. Surface capacity and rate constants are shared by the
          two faces and editable under Surface kinetics. Initial surface
          inventories are zero. The wash model assumes negligible readsorption;
          it is not a finite stagnant bath.
        </p>
      </section>
      <section>
        <h3>04 / Conservation and numerical accuracy</h3>
        <p>
          Finite volumes with backward Euler diffusion and conservative,
          implicit bounded surface exchange; wash removal is integrated
          exponentially. Default resolution is 24 cells per layer and 4,320 time
          steps. The split method is first-order accurate. The simulation checks
          positivity and reports its maximum relative mass residual.
        </p>
        <code>Mfilm + ΓA + ΓB + Mremoved = Minitial</code>
        <p>
          Inventories are reported per m² of film. A small mass error is not a
          guarantee of temporal or spatial convergence. Extreme inputs and large
          HSP contrasts need refinement and experimental checks; see the
          documented numerical tests and model limitations.
        </p>
      </section>
      <section>
        <h3>05 / What this version leaves for calibration</h3>
        <p>
          All presets are illustrative starting values, including polymer HSP,
          radius, D and surfactant profiles. Editing an HSP value does not make
          it measured data. There is no crystallization, immobile reserve,
          finite water bath, micellization, swelling, multiple-surfactant
          competition or contact-angle prediction in this version. Anti-fog
          efficacy requires its own measured correlation with surface inventory
          and test conditions.
        </p>
        <p>
          The implementation follows the supplied mathematical brief. Detailed
          equations, units, reproducibility instructions and validation are
          included in the repository’s <strong>docs/MODEL.md</strong> and{" "}
          <strong>README.md</strong>.
        </p>
      </section>
    </div>
  );
}
