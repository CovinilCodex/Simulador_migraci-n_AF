import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  FlaskConical,
  Info,
  Layers3,
  Plus,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  COLORS,
  defaultConfig,
  makeLayer,
  POLYMERS,
  SURFACTANTS,
} from "./materials.ts";
import { compatibility } from "./solver.ts";
import { boundaryLabel, formatNumber } from "./visuals.tsx";
import type { Boundary, Config, HSP, Layer } from "./types.ts";
export function Field({
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
          value={
            Number.isFinite(value[key])
              ? Math.round(value[key] * 100) / 100
              : value[key]
          }
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
              label="log₁₀ diffusion baseline"
              title="In Arrhenius mode: measured effective D25. In free-volume mode: baseline at f=0.10 in fully amorphous material. Units m²/s."
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
          <p className="control-note">
            Theoretical amorphous free volume & morphology
          </p>
          <div className="two-fields">
            <Field
              label="Free volume f₂₅"
              value={layer.freeVolume25}
              min={0.01}
              max={0.4}
              onChange={(freeVolume25) => change({ freeVolume25 })}
            />
            <Field
              label="Crystalline fraction Xc"
              value={layer.crystallinity}
              min={0}
              max={0.95}
              onChange={(crystallinity) => change({ crystallinity })}
            />
          </div>
          <div className="two-fields">
            <Field
              label="Glass transition Tg"
              value={layer.tg}
              min={-150}
              max={200}
              unit="°C"
              onChange={(tg) => change({ tg })}
            />
            <Field
              label="Glassy expansion"
              value={layer.alphaGlassy}
              min={0}
              max={0.002}
              unit="K⁻¹"
              onChange={(alphaGlassy) => change({ alphaGlassy })}
            />
          </div>
          <Field
            label="Rubbery expansion"
            value={layer.alphaRubbery}
            min={0}
            max={0.002}
            unit="K⁻¹"
            onChange={(alphaRubbery) => change({ alphaRubbery })}
          />
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

export function ConfigurationEditor({
  config,
  onChange,
  selected,
  onSelect,
}: {
  config: Config;
  onChange: (c: Config) => void;
  selected: number;
  onSelect: (n: number) => void;
}) {
  const setSelected = onSelect;
  const update = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  const changeLayer = (i: number, layer: Layer) =>
    update({ layers: config.layers.map((l, j) => (j === i ? layer : l)) });
  const moveLayer = (i: number, offset: number) => {
    const layers = [...config.layers];
    [layers[i], layers[i + offset]] = [layers[i + offset], layers[i]];
    update({ layers });
    setSelected(i + offset);
  };
  const loadExample = () => {
    onChange({ ...defaultConfig(), hours: config.hours });
    setSelected(0);
  };
  const totalThickness = config.layers.reduce((sum, l) => sum + l.thickness, 0);
  return (
    <aside className="configuration" aria-label="Simulation configuration">
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
          {config.layers.length >= 8 ? "Maximum 8 layers" : "Add polymer layer"}
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
            aria-label="AF surfactant"
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
              <option key={s.name} value={s.name}>
                {s.commonName ? `${s.commonName} · ${s.name}` : s.name}
              </option>
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
            {config.surfactant.source || "User-defined HSP"}. Estimates
            represent ideal molecules, not measured commercial grades.
          </span>
        </div>
        {config.surfactant.formula && (
          <details className="advanced">
            <summary>
              <span>Research & structure</span>
              <ChevronDown size={13} />
            </summary>
            <p className="control-note">
              {config.surfactant.formula} · estimated V ={" "}
              {config.surfactant.molarVolume?.toFixed(1)} cm³/mol.{" "}
              {config.surfactant.assumptions}
            </p>
          </details>
        )}
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
            Relative affinity S = exp(−β · RED²). This is a tunable partitioning
            assumption, not absolute solubility.
          </p>
        </details>
      </section>
      <section className="config-section">
        <SectionTitle
          icon={<Settings2 size={17} />}
          title="Test conditions"
          number="03"
        />
        <label className="field">
          <span className="field-label">Transport model</span>
          <select
            className="full-select"
            value={config.transportModel}
            onChange={(e) =>
              update({
                transportModel: e.target.value as Config["transportModel"],
              })
            }
          >
            <option value="freeVolume">Free volume + crystallinity</option>
            <option value="arrhenius">Calibrated D₂₅ + Arrhenius</option>
          </select>
        </label>
        {config.transportModel === "freeVolume" && (
          <>
            <div className="two-fields spaced">
              <Field
                label="Free-volume B"
                value={config.freeVolumeB}
                min={0}
                max={1}
                onChange={(freeVolumeB) => update({ freeVolumeB })}
              />
              <Field
                label="Morphology exponent τ"
                value={config.tortuosity}
                min={0}
                max={4}
                onChange={(tortuosity) => update({ tortuosity })}
              />
            </div>
            <p className="control-note">
              Dbase is referenced to f = 0.10, fully amorphous. Ea is unused in
              this mode. Free-volume presets are theoretical scenarios, not
              resin-grade measurements.
            </p>
          </>
        )}
        <div className="two-fields spaced">
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
              onChange={(e) => update({ [side]: e.target.value as Boundary })}
            >
              {(["dry", "wash", "sealed", "sink"] as const).map((mode) => (
                <option key={mode} value={mode}>
                  {boundaryLabel(mode)}
                </option>
              ))}
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
      <button className="text-button example-button" onClick={loadExample}>
        <RotateCcw size={13} /> Load three-layer example
      </button>
    </aside>
  );
}
