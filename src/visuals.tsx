import { useId } from "react";
import { COLORS } from "./materials.ts";
import { compatibility } from "./solver.ts";
import type { Config, Frame, Result } from "./types.ts";

export function formatNumber(n: number, digits = 2) {
  return n.toLocaleString("en", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}
export function concentrationColor(fraction: number, hue = 280) {
  const t = Math.max(0, Math.min(1, fraction));
  return `hsl(${hue}, ${30 + 45 * t}%, ${98 - 66 * t}%)`;
}
export function FilmView({
  result,
  frame,
  selected,
  onSelect,
  scale,
  hue = 280,
}: {
  result: Result;
  frame: Frame;
  selected: number;
  onSelect: (i: number) => void;
  scale: number;
  hue?: number;
}) {
  const uid = useId().replaceAll(":", "");
  const total = result.cells.reduce((sum, cell) => sum + cell.width, 0);
  const origin = 100,
    width = 600;
  let left = origin;
  const bounds = result.config.layers.map((l) => {
    const w = (width * l.thickness * 1e-6) / total;
    const b = { left, width: w };
    left += w;
    return b;
  });
  const surfaceModes = [result.config.left, result.config.right];
  return (
    <svg
      className="film-svg"
      viewBox="0 0 800 340"
      role="img"
      aria-label={`Film cross-section at ${formatNumber(frame.hours, 1)} hours. Color shows surfactant weight concentration.`}
    >
      <defs>
        <pattern
          id={`${uid}-grid`}
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="0.75" fill="#dfe5df" />
        </pattern>
        <clipPath id={`${uid}-front`}>
          <rect x="100" y="107" width="600" height="138" rx="2" />
        </clipPath>
      </defs>
      <rect width="800" height="340" fill={`url(#${uid}-grid)`} />
      <text x="38" y="43" className="svg-overline">
        FACE A
      </text>
      <text x="762" y="43" textAnchor="end" className="svg-overline">
        FACE B
      </text>
      <text x="38" y="61" className="svg-caption">
        {boundaryLabel(surfaceModes[0])}
      </text>
      <text x="762" y="61" textAnchor="end" className="svg-caption">
        {boundaryLabel(surfaceModes[1])}
      </text>
      <path d="M84 72v29M716 72v29" stroke="#a0b2aa" strokeDasharray="3 4" />
      {bounds.map((b, i) => (
        <g
          key={result.config.layers[i].id}
          className="film-layer"
          tabIndex={0}
          role="button"
          aria-label={`Select layer ${i + 1}, ${result.config.layers[i].name}`}
          onClick={() => onSelect(i)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(i);
            }
          }}
        >
          <polygon
            points={`${b.left},107 ${b.left + 23},81 ${b.left + b.width + 23},81 ${b.left + b.width},107`}
            fill={COLORS[i]}
            opacity="0.23"
          />
          <polygon
            points={`${b.left + b.width},107 ${b.left + b.width + 23},81 ${b.left + b.width + 23},219 ${b.left + b.width},245`}
            fill={COLORS[i]}
            opacity="0.32"
          />
          <rect
            x={b.left}
            y="107"
            width={b.width}
            height="138"
            fill="#e6ede1"
          />
          <g clipPath={`url(#${uid}-front)`} shapeRendering="crispEdges">
            {result.cells.map(
              (cell, j) =>
                cell.layer === i && (
                  <rect
                    key={j}
                    x={origin + ((cell.x - cell.width / 2) / total) * width}
                    y="107"
                    width={(cell.width / total) * width + 0.2}
                    height="138"
                    fill={concentrationColor(
                      ((frame.concentration[j] / cell.density) * 100) / scale,
                      hue,
                    )}
                  />
                ),
            )}
          </g>
          <rect
            x={b.left + 1}
            y="108"
            width={Math.max(0, b.width - 2)}
            height="136"
            fill="transparent"
            stroke={i === selected ? "#183f39" : "#ffffff"}
            strokeWidth={i === selected ? 2 : 1.5}
          />
          {b.width > 36 && (
            <>
              <rect
                x={b.left + 12}
                y="120"
                width="24"
                height="23"
                rx="5"
                fill="white"
                opacity="0.88"
              />
              <text
                x={b.left + 24}
                y="136"
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#25473f"
              >
                {String(i + 1).padStart(2, "0")}
              </text>
            </>
          )}
          <line
            x1={b.left + 4}
            y1="268"
            x2={b.left + b.width - 4}
            y2="268"
            stroke="#82998c"
          />
          <path
            d={`M${b.left + 4} 264v8M${b.left + b.width - 4} 264v8`}
            stroke="#82998c"
          />
          {b.width > 42 && (
            <>
              <text
                x={b.left + b.width / 2}
                y="289"
                textAnchor="middle"
                className="svg-material"
              >
                {result.config.layers[i].polymer === "Custom"
                  ? "Custom"
                  : result.config.layers[i].polymer}
              </text>
              <text
                x={b.left + b.width / 2}
                y="307"
                textAnchor="middle"
                className="svg-caption"
              >
                {result.config.layers[i].thickness} µm
              </text>
            </>
          )}
        </g>
      ))}
      {[0, 1].map((side) => {
        const x = side === 0 ? 79 : 713;
        const occupancy =
          (frame.surface[side] * 1e6) / result.config.surfaceCapacity;
        return (
          <g key={side}>
            <rect x={x} y="107" width="8" height="138" rx="4" fill="#e0e8e5" />
            <rect
              x={x}
              y={245 - 138 * occupancy}
              width="8"
              height={138 * occupancy}
              rx="4"
              fill="#d39b43"
            />
            <text
              x={side === 0 ? 75 : 729}
              y="255"
              textAnchor={side === 0 ? "end" : "start"}
              className="svg-caption"
            >
              Γ{side === 0 ? "A" : "B"}
            </text>
          </g>
        );
      })}
      <text x="400" y="40" textAnchor="middle" className="svg-overline">
        MULTILAYER CROSS-SECTION · {formatNumber(total * 1e6, 0)} µm
      </text>
    </svg>
  );
}
export function boundaryLabel(mode: string) {
  return (
    (
      {
        dry: "Dry · AF surface",
        wash: "Wet · continuous wash",
        sealed: "Sealed · no flux",
        sink: "Perfect sink",
      } as Record<string, string>
    )[mode] || mode
  );
}

export function HansenView({
  config,
  referenceConfigs,
  selected,
  onSelect,
}: {
  config: Config;
  referenceConfigs?: Config[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  const all = (referenceConfigs || [config]).flatMap((c) => [
    ...c.layers.map((l) => l.hsp),
    c.surfactant.hsp,
  ]);
  const minD = Math.min(12, ...all.map((v) => v.d - 2));
  const maxD = Math.max(22, ...all.map((v) => v.d + 2));
  const maxP = Math.max(14, ...all.map((v) => v.p + 2));
  const maxH = Math.max(14, ...all.map((v) => v.h + 2));
  const x = (d: number) => 75 + ((d - minD) / (maxD - minD)) * 560;
  const y = (p: number) => 280 - (p / maxP) * 222;
  const s = config.surfactant.hsp;
  return (
    <svg
      className="hansen-svg"
      viewBox="0 0 800 340"
      role="img"
      aria-label="Hansen parameter projection. Horizontal axis dispersion, vertical axis polarity; marker size represents hydrogen bonding. RED uses all three parameters."
    >
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i}>
          <line
            x1="75"
            y1={280 - i * 55.5}
            x2="635"
            y2={280 - i * 55.5}
            stroke="#e5e9e3"
          />
          <text
            x="60"
            y={284 - i * 55.5}
            textAnchor="end"
            className="svg-caption"
          >
            {formatNumber((i * maxP) / 4, 1)}
          </text>
          <line
            x1={75 + i * 140}
            y1="58"
            x2={75 + i * 140}
            y2="280"
            stroke="#e5e9e3"
          />
          <text
            x={75 + i * 140}
            y="302"
            textAnchor="middle"
            className="svg-caption"
          >
            {formatNumber(minD + (i * (maxD - minD)) / 4, 1)}
          </text>
        </g>
      ))}
      <text x="355" y="329" textAnchor="middle" className="svg-material">
        Dispersion δD · MPa½
      </text>
      <text
        transform="translate(19 170) rotate(-90)"
        textAnchor="middle"
        className="svg-material"
      >
        Polarity δP · MPa½
      </text>
      {config.layers.map((l, i) => (
        <g
          key={l.id}
          tabIndex={0}
          role="button"
          aria-label={`Layer ${i + 1}, ${l.name}, RED ${compatibility(l.hsp, s, l.radius, config.beta).red.toFixed(2)}`}
          onClick={() => onSelect(i)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(i);
            }
          }}
          className="hansen-marker"
        >
          <title>{`Layer ${i + 1}: ${l.name} · δD ${l.hsp.d}, δP ${l.hsp.p}, δH ${l.hsp.h} · RED ${compatibility(l.hsp, s, l.radius, config.beta).red.toFixed(2)}`}</title>
          <line
            x1={x(l.hsp.d)}
            y1={y(l.hsp.p)}
            x2={x(s.d)}
            y2={y(s.p)}
            stroke={COLORS[i]}
            strokeDasharray="4 5"
            opacity="0.4"
          />
          <circle
            cx={x(l.hsp.d)}
            cy={y(l.hsp.p)}
            r={9 + (11 * l.hsp.h) / maxH}
            fill={COLORS[i]}
            fillOpacity="0.2"
            stroke={COLORS[i]}
            strokeWidth={i === selected ? 3 : 1.5}
          />
          <text
            x={x(l.hsp.d)}
            y={y(l.hsp.p) + 4}
            textAnchor="middle"
            fontSize="10"
            fill={COLORS[i]}
            fontWeight="700"
          >
            {i + 1}
          </text>
          <text
            x={x(l.hsp.d) + 19}
            y={y(l.hsp.p) - 10 - (i % 2) * 13}
            className="svg-material"
          >
            {l.polymer}
          </text>
        </g>
      ))}
      <path
        d={`M${x(s.d)} ${y(s.p) - 9}l9 9-9 9-9-9Z`}
        fill="#172d29"
        stroke="white"
        strokeWidth="2"
      />
      <text
        x={x(s.d) - 16}
        y={y(s.p) - 10}
        textAnchor="end"
        className="svg-material"
      >
        AF
      </text>
      <text x="669" y="74" className="svg-overline">
        READING THE MAP
      </text>
      <circle cx="679" cy="102" r="8" fill="#dfe8da" stroke="#648476" />
      <text x="698" y="106" className="svg-caption">
        Polymer
      </text>
      <path d="M679 125l6 6-6 6-6-6Z" fill="#172d29" />
      <text x="698" y="135" className="svg-caption">
        Surfactant
      </text>
      <text x="670" y="177" className="svg-caption">
        Marker size: δH
      </text>
      <text x="670" y="198" className="svg-caption">
        2D projection only.
      </text>
      <text x="670" y="215" className="svg-caption">
        RED includes δH.
      </text>
    </svg>
  );
}

export function ProfileChart({
  result,
  frame,
  scale,
}: {
  result: Result;
  frame: Frame;
  scale: number;
}) {
  const { cells } = result;
  const total = cells.reduce((sum, c) => sum + c.width, 0);
  const px = (x: number) => 44 + (x / total) * 366;
  const py = (c: number) => 162 - (c / scale) * 128;
  const points = cells
    .map(
      (cell, i) =>
        `${px(cell.x)},${py((frame.concentration[i] / cell.density) * 100)}`,
    )
    .join(" ");
  let layerLeft = 0;
  return (
    <svg
      viewBox="0 0 440 210"
      className="chart-svg"
      role="img"
      aria-label="Concentration profile across film depth, in weight percent"
    >
      {result.config.layers.map((l, i) => {
        const start = layerLeft;
        layerLeft += l.thickness * 1e-6;
        return (
          <rect
            key={l.id}
            x={px(start)}
            y="26"
            width={((l.thickness * 1e-6) / total) * 366}
            height="136"
            fill={COLORS[i]}
            opacity="0.065"
          />
        );
      })}
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1="44"
            y1={py(f * scale)}
            x2="410"
            y2={py(f * scale)}
            stroke="#e6eae4"
            strokeDasharray="3 3"
          />
          <text
            x="34"
            y={py(f * scale) + 4}
            textAnchor="end"
            className="svg-caption"
          >
            {formatNumber(f * scale, 1)}
          </text>
        </g>
      ))}
      <polyline
        points={cells
          .map(
            (cell) =>
              `${px(cell.x)},${py(result.config.layers[cell.layer].loading)}`,
          )
          .join(" ")}
        fill="none"
        stroke="#aab8b0"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#2b7061"
        strokeWidth="2.5"
      />
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <text
          key={f}
          x={44 + 366 * f}
          y="183"
          textAnchor="middle"
          className="svg-caption"
        >
          {formatNumber(total * 1e6 * f, 0)}
        </text>
      ))}
      <text x="227" y="204" textAnchor="middle" className="svg-caption">
        Film depth (µm)
      </text>
      <text x="44" y="15" className="svg-caption">
        Concentration (wt%)
      </text>
    </svg>
  );
}

export function SurfaceChart({
  result,
  index,
  sharedCapacity,
}: {
  result: Result;
  index: number;
  sharedCapacity?: number;
}) {
  const yMax =
    Math.max(
      sharedCapacity ?? result.config.surfaceCapacity,
      ...result.frames.map((f) => Math.max(...f.surface) * 1e6),
    ) * 1.05;
  const px = (hours: number) => 44 + (hours / result.config.hours) * 366;
  const py = (mass: number) => 162 - (mass / yMax) * 128;
  const frames = result.frames.slice(0, index + 1);
  return (
    <svg
      viewBox="0 0 440 210"
      className="chart-svg"
      role="img"
      aria-label="Surface accumulation over simulation time in milligrams per square metre"
    >
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1="44"
            y1={py(yMax * f)}
            x2="410"
            y2={py(yMax * f)}
            stroke="#e6eae4"
            strokeDasharray="3 3"
          />
          <text
            x="34"
            y={py(yMax * f) + 4}
            textAnchor="end"
            className="svg-caption"
          >
            {formatNumber(yMax * f, 1)}
          </text>
        </g>
      ))}
      {[0, 1].map((side) => (
        <g key={side}>
          <polyline
            points={result.frames
              .map((f) => `${px(f.hours)},${py(f.surface[side] * 1e6)}`)
              .join(" ")}
            fill="none"
            stroke={side === 0 ? "#2b7061" : "#ce994b"}
            opacity="0.15"
            strokeWidth="2"
          />
          <polyline
            points={frames
              .map((f) => `${px(f.hours)},${py(f.surface[side] * 1e6)}`)
              .join(" ")}
            fill="none"
            stroke={side === 0 ? "#2b7061" : "#ce994b"}
            strokeWidth="2.5"
            strokeDasharray={side === 1 ? "6 3" : undefined}
          />
          <circle
            cx={px(frames[frames.length - 1].hours)}
            cy={py(frames[frames.length - 1].surface[side] * 1e6)}
            r="3.5"
            fill={side === 0 ? "#2b7061" : "#ce994b"}
          />
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <text
          key={f}
          x={44 + 366 * f}
          y="183"
          textAnchor="middle"
          className="svg-caption"
        >
          {formatNumber(result.config.hours * f, 0)}
        </text>
      ))}
      <text x="227" y="204" textAnchor="middle" className="svg-caption">
        Elapsed time (hours)
      </text>
      <text x="44" y="15" className="svg-caption">
        Surface inventory (mg/m²)
      </text>
    </svg>
  );
}
