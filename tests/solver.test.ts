import test from "node:test";
import assert from "node:assert/strict";
import {
  compatibility,
  diffusionAtTemperature,
  hansenDistance,
  simulate,
  surfaceExchange,
  validateConfig,
} from "../src/solver.ts";
import { defaultConfig, makeLayer } from "../src/materials.ts";
import type { Config } from "../src/types.ts";

function singleLayer(): Config {
  return {
    ...defaultConfig(),
    layers: [
      {
        ...makeLayer("LDPE", "single"),
        thickness: 50,
        loading: 0.5,
        logD: -14,
      },
    ],
    beta: 0,
    left: "sealed",
    right: "sealed",
    hours: 12,
  };
}
function analyticalRemaining(hours: number, oneFace = false) {
  const h = oneFace ? 100e-6 : 50e-6;
  let sum = 0;
  for (let n = 0; n < 1000; n++)
    sum +=
      Math.exp(
        (-((2 * n + 1) ** 2) * Math.PI ** 2 * 1e-14 * hours * 3600) / h ** 2,
      ) /
      (2 * n + 1) ** 2;
  return (8 / Math.PI ** 2) * sum;
}
test("Hansen distance has the fourfold dispersion weighting and RED uses radius", () => {
  assert.equal(
    hansenDistance({ d: 1, p: 2, h: 3 }, { d: 4, p: 6, h: 3 }),
    Math.sqrt(52),
  );
  const same = compatibility({ d: 16, p: 3, h: 4 }, { d: 16, p: 3, h: 4 }, 5);
  assert.equal(same.red, 0);
  assert.equal(same.affinity, 1);
  const c = compatibility({ d: 1, p: 0, h: 0 }, { d: 0, p: 0, h: 0 }, 2);
  assert.equal(c.red, 1);
  assert.equal(c.affinity, Math.exp(-1));
  assert.equal(
    compatibility({ d: 20, p: 20, h: 20 }, { d: 0, p: 0, h: 0 }, 1, 0).affinity,
    1,
  );
});
test("Arrhenius keeps the reference D and increases D with temperature for positive Ea", () => {
  assert.equal(diffusionAtTemperature(-14, 50, 25), 1e-14);
  assert.ok(diffusionAtTemperature(-14, 50, 40) > 1e-14);
  assert.equal(diffusionAtTemperature(-14, 0, 80), 1e-14);
});
test("sealed uniform film remains uniform with exact mass accounting", () => {
  const r = simulate(singleLayer(), { frames: 15, substeps: 4 });
  for (const f of r.frames)
    for (const c of f.concentration) assert.ok(Math.abs(c - 4.6) < 1e-10);
  assert.ok(r.maxError < 1e-10);
  assert.equal(r.frames.at(-1)!.surface[0], 0);
});
test("two-sided perfect sink matches the analytical slab release", () => {
  const c = { ...singleLayer(), left: "sink", right: "sink" } as Config;
  const r = simulate(c, { cellsPerLayer: 80, frames: 101, substeps: 30 });
  assert.ok(
    Math.abs(
      r.frames.at(-1)!.filmMass / r.initialMass - analyticalRemaining(c.hours),
    ) < 0.001,
  );
  assert.ok(r.maxError < 1e-9);
  assert.ok(r.frames.at(-1)!.lost[0] > 0);
  assert.ok(
    Math.abs(r.frames.at(-1)!.lost[0] - r.frames.at(-1)!.lost[1]) < 1e-12,
  );
});
test("one-sided perfect sink matches the analytical sealed-back slab", () => {
  const c = { ...singleLayer(), left: "sink" } as Config;
  const r = simulate(c, { cellsPerLayer: 80, frames: 101, substeps: 30 });
  assert.ok(
    Math.abs(
      r.frames.at(-1)!.filmMass / r.initialMass -
        analyticalRemaining(c.hours, true),
    ) < 0.001,
  );
  assert.equal(r.frames.at(-1)!.lost[1], 0);
});
test("closed multilayer equilibrium respects HSP partitioning, not equal concentrations", () => {
  const c = singleLayer();
  c.hours = 720;
  c.beta = 1;
  c.surfactant.hsp = { d: 0, p: 0, h: 0 };
  c.layers = [
    {
      ...c.layers[0],
      id: "a",
      hsp: { d: 0, p: 0, h: 0 },
      radius: 2,
      logD: -12,
    },
    {
      ...c.layers[0],
      id: "b",
      hsp: { d: 1, p: 0, h: 0 },
      radius: 2,
      logD: -12,
    },
  ];
  const r = simulate(c, { cellsPerLayer: 12, frames: 31, substeps: 20 });
  const end = r.frames.at(-1)!;
  assert.ok(
    Math.abs(end.concentration[12] / end.concentration[0] - Math.exp(-1)) <
      1e-7,
  );
  assert.ok(r.maxError < 1e-7);
});
test("dry surfaces saturate within bounds and conserve total mass", () => {
  const c = defaultConfig();
  c.logAdsorption = -8;
  c.desorption = 0;
  const r = simulate(c, { frames: 31, substeps: 12 });
  assert.ok(r.maxError < 1e-9);
  const capacity = c.surfaceCapacity * 1e-6;
  for (const f of r.frames) {
    for (const g of f.surface) assert.ok(g >= 0 && g <= capacity);
    for (const v of f.concentration) assert.ok(v >= 0);
  }
  assert.ok(r.frames.at(-1)!.surface[0] > 0.99 * capacity);
  assert.equal(r.frames.at(-1)!.lost[0], 0);
});
test("continuous washing removes material through surface reservoirs and closes mass balance", () => {
  const c = defaultConfig();
  c.left = "wash";
  c.right = "sealed";
  const r = simulate(c, { frames: 31, substeps: 24 });
  assert.ok(r.maxError < 1e-9);
  assert.ok(r.frames.at(-1)!.lost[0] > 0);
  assert.equal(r.frames.at(-1)!.lost[1], 0);
  assert.equal(r.frames.at(-1)!.surface[1], 0);
  for (let i = 1; i < r.frames.length; i++)
    assert.ok(r.frames[i].lost[0] >= r.frames[i - 1].lost[0]);
});
test("zero loading stays zero for every boundary condition", () => {
  for (const mode of ["dry", "wash", "sealed", "sink"] as const) {
    const c = singleLayer();
    c.layers[0].loading = 0;
    c.left = mode;
    c.right = mode;
    const r = simulate(c, { frames: 3, substeps: 2 });
    assert.equal(r.initialMass, 0);
    assert.equal(r.maxError, 0);
    assert.equal(r.frames.at(-1)!.filmMass, 0);
    assert.equal(r.frames.at(-1)!.surface[0], 0);
  }
});
test("reversible surface exchange returns material to the film and has the implicit desorption limit", () => {
  const gamma = 1e-6;
  const x = surfaceExchange(0, gamma, 1e-6, 1, 2e-6, 0, 0.01, 100);
  assert.ok(x < 0);
  assert.ok(Math.abs(gamma + x - gamma / 2) < 1e-18);
});
test("spatial and temporal refinement approach the analytical solution", () => {
  const c = { ...singleLayer(), left: "sink", right: "sink" } as Config;
  const exact = analyticalRemaining(c.hours);
  const spatial = [8, 16, 32].map((cellsPerLayer) => {
    const r = simulate(c, { cellsPerLayer, frames: 101, substeps: 100 });
    return Math.abs(r.frames.at(-1)!.filmMass / r.initialMass - exact);
  });
  assert.ok(
    spatial[1] < spatial[0] && spatial[2] < spatial[1],
    `Spatial errors: ${spatial}`,
  );
  const temporal = [1, 4, 16].map((substeps) => {
    const r = simulate(c, { cellsPerLayer: 160, frames: 21, substeps });
    return Math.abs(r.frames.at(-1)!.filmMass / r.initialMass - exact);
  });
  assert.ok(
    temporal[1] < temporal[0] && temporal[2] < temporal[1],
    `Temporal errors: ${temporal}`,
  );
});
test("invalid and malformed imports are rejected rather than silently repaired", () => {
  for (const bad of [
    null,
    {},
    { ...singleLayer(), layers: null },
    { ...singleLayer(), surfactant: null },
  ])
    assert.ok(validateConfig(bad as Config).length > 0);
  const c = singleLayer();
  c.layers[0].thickness = NaN;
  assert.ok(validateConfig(c).length > 0);
  assert.throws(() => simulate(c), /thickness/);
});
