import type { Cell, Config, Frame, HSP, Layer, Result } from "./types.ts";

export type MigrationRegime = "Glassy" | "Above Tg" | "Rubbery" | "Molten";
export function migrationRegime(
  layer: Layer,
  temperature: number,
): MigrationRegime {
  if (layer.tm !== null && temperature >= layer.tm) return "Molten";
  if (temperature < layer.tg) return "Glassy";
  return layer.tm === null ? "Rubbery" : "Above Tg";
}
function regimeEnergy(layer: Layer, temperature: number) {
  return layer.tm !== null && temperature >= layer.tm
    ? layer.eaMelt
    : temperature >= layer.tg
      ? layer.eaRubbery
      : layer.ea;
}
/** Continuous, piecewise Arrhenius curve, always anchored to effective D at 25°C. */
export function layerTransport(
  layer: Layer,
  config: Pick<Config, "temperature">,
) {
  const temperature = config.temperature;
  const low = Math.min(25, temperature),
    high = Math.max(25, temperature);
  const boundaries = [
    low,
    ...[layer.tg, layer.tm].filter(
      (t): t is number => t !== null && t > low && t < high,
    ),
    high,
  ].sort((a, b) => a - b);
  let integral = 0;
  for (let i = 1; i < boundaries.length; i++) {
    const a = boundaries[i - 1],
      b = boundaries[i];
    integral +=
      ((-regimeEnergy(layer, (a + b) / 2) * 1000) / 8.314462618) *
      (1 / (b + 273.15) - 1 / (a + 273.15));
  }
  const diffusion =
    10 ** layer.logD * Math.exp((temperature >= 25 ? 1 : -1) * integral);
  return {
    diffusion,
    regime: migrationRegime(layer, temperature),
    activationEnergy: regimeEnergy(layer, temperature),
  };
}

export function hansenDistance(a: HSP, b: HSP): number {
  return Math.sqrt(4 * (a.d - b.d) ** 2 + (a.p - b.p) ** 2 + (a.h - b.h) ** 2);
}
export function compatibility(
  hsp: HSP,
  surfactant: HSP,
  radius: number,
  beta = 1,
) {
  const distance = hansenDistance(hsp, surfactant);
  const red = distance / radius;
  // A user-calibratable relative affinity. NOT a measured solubility or diffusion law.
  return { distance, red, affinity: Math.exp(-Math.min(14, beta * red ** 2)) };
}
export function diffusionAtTemperature(
  logD: number,
  ea: number,
  celsius: number,
) {
  return (
    10 ** logD *
    Math.exp(
      ((-ea * 1000) / 8.314462618) * (1 / (celsius + 273.15) - 1 / 298.15),
    )
  );
}
export function validateConfig(c: Config): string[] {
  const errors: string[] = [];
  const check = (v: unknown, lo: number, hi: number, label: string) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi)
      errors.push(`${label} must be between ${lo} and ${hi}.`);
  };
  if (!c || typeof c !== "object") return ["Invalid simulation file."];
  if (!Array.isArray(c.layers) || c.layers.length < 1 || c.layers.length > 8)
    return ["Choose between 1 and 8 layers."];
  const ids = new Set<string>();
  c.layers.forEach((l, i) => {
    if (!l || typeof l !== "object") {
      errors.push(`Invalid layer ${i + 1}.`);
      return;
    }
    if (typeof l.id !== "string" || ids.has(l.id))
      errors.push("Each layer needs a unique ID.");
    ids.add(l.id);
    if (
      typeof l.name !== "string" ||
      !l.name ||
      l.name.length > 80 ||
      typeof l.polymer !== "string"
    )
      errors.push(`Invalid material name in layer ${i + 1}.`);
    check(l.thickness, 1, 500, `Layer ${i + 1} thickness (µm)`);
    check(l.loading, 0, 10, `Layer ${i + 1} loading (wt%)`);
    check(l.density, 500, 2500, `Layer ${i + 1} density`);
    check(l.radius, 0.5, 30, `Layer ${i + 1} HSP radius`);
    check(l.logD, -30, -8, `Layer ${i + 1} log₁₀ D`);
    check(l.ea, 0, 150, `Layer ${i + 1} activation energy below Tg`);
    check(l.tg, -150, 250, `Layer ${i + 1} Tg (°C)`);
    if (l.tm !== null) {
      check(l.tm, -140, 400, `Layer ${i + 1} Tm (°C)`);
      if (l.tm <= l.tg)
        errors.push(`Layer ${i + 1}: Tm must be greater than Tg.`);
    }
    check(l.eaRubbery, 0, 150, `Layer ${i + 1} activation energy above Tg`);
    check(l.eaMelt, 0, 150, `Layer ${i + 1} melt activation energy`);
    for (const key of ["d", "p", "h"] as const)
      check(l.hsp?.[key], 0, 40, `Layer ${i + 1} HSP ${key}`);
  });
  if (
    typeof c.surfactant?.name !== "string" ||
    !c.surfactant.name ||
    c.surfactant.name.length > 80
  )
    errors.push("Invalid surfactant name.");
  for (const key of ["d", "p", "h"] as const)
    check(c.surfactant?.hsp?.[key], 0, 40, `Surfactant HSP ${key}`);
  for (const key of [
    "id",
    "commonName",
    "source",
    "formula",
    "assumptions",
  ] as const) {
    const value = c.surfactant?.[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.length > 2048)
    )
      errors.push(`Invalid surfactant ${key}.`);
  }
  if (c.surfactant?.molarVolume !== undefined)
    check(
      c.surfactant.molarVolume,
      1,
      10000,
      "Surfactant molar volume (cm³/mol)",
    );
  check(c.beta, 0, 5, "HSP sensitivity β");
  check(c.temperature, -150, 300, "Temperature (°C)");
  check(c.hours, 0.1, 720, "Duration (h)");
  check(c.surfaceCapacity, 0.01, 100, "Surface capacity (mg/m²)");
  check(c.logAdsorption, -16, -6, "log₁₀ adsorption velocity");
  check(c.desorption, 0, 100, "Desorption rate (h⁻¹)");
  check(c.washRate, 0, 100, "Wash rate (h⁻¹)");
  for (const side of [c.left, c.right])
    if (!["dry", "wash", "sealed", "sink"].includes(side))
      errors.push("Invalid surface condition.");
  return errors;
}

/** Conservative implicit local Langmuir exchange, in kg/m², including reverse flux. */
export function surfaceExchange(
  m: number,
  gamma: number,
  width: number,
  affinity: number,
  capacity: number,
  velocity: number,
  kd: number,
  dt: number,
) {
  let lo = -gamma;
  let hi = Math.min(m, capacity - gamma);
  for (let i = 0; i < 50; i++) {
    const x = (lo + hi) / 2;
    const g = gamma + x;
    const f =
      x -
      dt *
        (velocity * ((m - x) / (width * affinity)) * (1 - g / capacity) -
          kd * g);
    if (f > 0) hi = x;
    else lo = x;
  }
  return (lo + hi) / 2;
}

export function simulate(
  config: Config,
  options: { cellsPerLayer?: number; frames?: number; substeps?: number } = {},
): Result {
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join("\n"));
  const c = structuredClone(config);
  const count = options.cellsPerLayer ?? 24;
  const frameCount = options.frames ?? 181;
  const substeps = options.substeps ?? 24;
  if (
    !Number.isInteger(count) ||
    count < 2 ||
    !Number.isInteger(frameCount) ||
    frameCount < 2 ||
    !Number.isInteger(substeps) ||
    substeps < 1
  )
    throw new Error("Invalid solver resolution.");
  const cells: Cell[] = [];
  const initial: number[] = [];
  let x = 0;
  c.layers.forEach((layer, index) => {
    const width = (layer.thickness * 1e-6) / count;
    const affinity = compatibility(
      layer.hsp,
      c.surfactant.hsp,
      layer.radius,
      c.beta,
    ).affinity;
    const diffusion = layerTransport(layer, c).diffusion;
    for (let i = 0; i < count; i++) {
      cells.push({
        x: x + width / 2,
        width,
        layer: index,
        density: layer.density,
        affinity,
        diffusion,
      });
      initial.push((layer.density * layer.loading) / 100);
      x += width;
    }
  });
  const n = cells.length;
  let concentration = Float64Array.from(initial);
  const gamma: [number, number] = [0, 0];
  const lost: [number, number] = [0, 0];
  const initialMass = cells.reduce(
    (m, cell, i) => m + concentration[i] * cell.width,
    0,
  );
  const dt = (c.hours * 3600) / ((frameCount - 1) * substeps);
  const conductance = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    const l = cells[i],
      r = cells[i + 1];
    conductance[i] =
      1 /
      (l.width / (2 * l.diffusion * l.affinity) +
        r.width / (2 * r.diffusion * r.affinity));
  }
  const modes = [c.left, c.right];
  const sinks = modes.map((mode, side) => {
    const cell = cells[side === 0 ? 0 : n - 1];
    return mode === "sink"
      ? (2 * cell.diffusion * cell.affinity) / cell.width
      : 0;
  });
  const upper = new Float64Array(n - 1);
  const lower = new Float64Array(n - 1);
  const diagonal = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const gl = i > 0 ? conductance[i - 1] : sinks[0];
    const gr = i < n - 1 ? conductance[i] : sinks[1];
    diagonal[i] = cells[i].width * cells[i].affinity + dt * (gl + gr);
    if (i < n - 1) upper[i] = -dt * gr;
    if (i > 0) lower[i - 1] = -dt * gl;
  }
  // Factor the constant positive M-matrix once (Thomas LU).
  for (let i = 1; i < n; i++) {
    lower[i - 1] /= diagonal[i - 1];
    diagonal[i] -= lower[i - 1] * upper[i - 1];
  }
  const activity = new Float64Array(n);
  const capacity = c.surfaceCapacity * 1e-6;
  const kd = c.desorption / 3600;
  const velocity = 10 ** c.logAdsorption;
  const washFraction = -Math.expm1((-c.washRate / 3600) * dt);
  let maxError = 0;
  const frames: Frame[] = [];
  function capture(hours: number) {
    const filmMass = cells.reduce(
      (m, cell, i) => m + concentration[i] * cell.width,
      0,
    );
    const residual = Math.abs(
      filmMass + gamma[0] + gamma[1] + lost[0] + lost[1] - initialMass,
    );
    const massError = initialMass > 0 ? residual / initialMass : residual;
    maxError = Math.max(maxError, massError);
    if (
      !Number.isFinite(massError) ||
      massError > 1e-5 ||
      concentration.some((v) => !Number.isFinite(v) || v < 0)
    )
      throw new Error(
        "Numerical accuracy check failed. Reduce duration or extreme parameter contrasts.",
      );
    frames.push({
      hours,
      concentration: Array.from(concentration),
      surface: [...gamma],
      lost: [...lost],
      filmMass,
      massError,
    });
  }
  capture(0);
  for (let frame = 1; frame < frameCount; frame++) {
    for (let step = 0; step < substeps; step++) {
      for (let i = 0; i < n; i++)
        activity[i] = concentration[i] * cells[i].width;
      for (let i = 1; i < n; i++) activity[i] -= lower[i - 1] * activity[i - 1];
      activity[n - 1] /= diagonal[n - 1];
      for (let i = n - 2; i >= 0; i--)
        activity[i] = (activity[i] - upper[i] * activity[i + 1]) / diagonal[i];
      for (let i = 0; i < n; i++)
        concentration[i] = activity[i] * cells[i].affinity;
      lost[0] += dt * sinks[0] * activity[0];
      lost[1] += dt * sinks[1] * activity[n - 1];
      for (let side = 0; side < 2; side++) {
        if (modes[side] !== "dry" && modes[side] !== "wash") continue;
        const i = side === 0 ? 0 : n - 1;
        const cell = cells[i];
        const mass = concentration[i] * cell.width;
        const transfer = surfaceExchange(
          mass,
          gamma[side],
          cell.width,
          cell.affinity,
          capacity,
          velocity,
          kd,
          dt,
        );
        concentration[i] = (mass - transfer) / cell.width;
        gamma[side] += transfer;
        if (modes[side] === "wash") {
          const washed = gamma[side] * washFraction;
          gamma[side] -= washed;
          lost[side] += washed;
        }
      }
    }
    capture((c.hours * frame) / (frameCount - 1));
  }
  return { config: c, cells, frames, initialMass, maxError };
}
