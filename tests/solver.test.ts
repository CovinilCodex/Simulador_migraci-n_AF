import test from "node:test";
import assert from "node:assert/strict";
import {
  migrationRegime,
  layerTransport,
  compatibility,
  diffusionAtTemperature,
  hansenDistance,
  simulate,
  surfaceExchange,
  validateConfig,
} from "../src/solver.ts";
import {
  defaultConfig,
  makeLayer,
  migrateLegacyConfig,
  SURFACTANTS,
} from "../src/materials.ts";
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

test("researched library contains 19 traceable group estimates and a custom entry", () => {
  const research = SURFACTANTS.filter((s) => s.id);
  assert.equal(research.length, 19);
  assert.equal(new Set(research.map((s) => s.name)).size, 19);
  for (const s of research) {
    assert.ok(s.formula && s.assumptions && s.source);
    assert.ok(s.molarVolume! > 0);
    const c = defaultConfig();
    c.surfactant = s;
    assert.deepEqual(validateConfig(c), []);
    const r = simulate(c, { frames: 11, substeps: 8 });
    assert.ok(r.maxError < 1e-9);
  }
  const gms = research.find((s) => s.name === "Glyceryl monostearate")!;
  assert.ok(Math.abs(gms.hsp.d - 6170 / 366.3) < 1e-10);
  assert.ok(Math.abs(gms.hsp.p - Math.sqrt(740100) / 366.3) < 1e-10);
  assert.ok(Math.abs(gms.hsp.h - Math.sqrt(47000 / 366.3)) < 1e-10);
});
test("regimes distinguish glass, supported solid, melt and amorphous rubber", () => {
  const l = { ...makeLayer("PET"), tg: 40, tm: 100 };
  assert.equal(migrationRegime(l, 39), "Glassy");
  assert.equal(migrationRegime(l, 40), "Above Tg");
  assert.equal(migrationRegime(l, 99), "Above Tg");
  assert.equal(migrationRegime(l, 100), "Molten");
  assert.equal(migrationRegime({ ...l, tm: null }, 100), "Rubbery");
});
test("diffusion is continuous at both transitions with a calibrated D25 anchor", () => {
  const l = {
    ...makeLayer("Custom"),
    tg: 40,
    tm: 100,
    ea: 70,
    eaRubbery: 45,
    eaMelt: 25,
    logD: -14,
  };
  assert.equal(layerTransport(l, { temperature: 25 }).diffusion, 1e-14);
  for (const t of [40, 100]) {
    const left = layerTransport(l, { temperature: t - 1e-6 }).diffusion;
    const right = layerTransport(l, { temperature: t + 1e-6 }).diffusion;
    assert.ok(Math.abs(left / right - 1) < 1e-6);
  }
  for (const anchor of [
    { tg: 10, tm: 20 },
    { tg: 10, tm: 100 },
    { tg: 40, tm: 100 },
  ])
    assert.equal(
      layerTransport({ ...l, ...anchor }, { temperature: 25 }).diffusion,
      1e-14,
    );
});
test("crossing multiple regimes adds independent analytical Arrhenius increments", () => {
  const l = {
    ...makeLayer("PET"),
    tg: 50,
    tm: 100,
    ea: 80,
    eaRubbery: 40,
    eaMelt: 20,
    logD: -14,
  };
  const R = 8.314462618;
  const step = (e: number, a: number, b: number) =>
    ((-e * 1000) / R) * (1 / (b + 273.15) - 1 / (a + 273.15));
  const expected =
    1e-14 * Math.exp(step(80, 25, 50) + step(40, 50, 100) + step(20, 100, 150));
  assert.ok(
    Math.abs(layerTransport(l, { temperature: 150 }).diffusion / expected - 1) <
      1e-12,
  );
  const inverse = { ...l, tg: 0, tm: 10 };
  const coldExpected =
    1e-14 * Math.exp(step(20, 25, 10) + step(40, 10, 0) + step(80, 0, -50));
  assert.ok(
    Math.abs(
      layerTransport(inverse, { temperature: -50 }).diffusion / coldExpected -
        1,
    ) < 1e-12,
  );
});
test("equal regime energies reproduce the original Arrhenius law in both temperature directions", () => {
  const l = {
    ...makeLayer("Custom"),
    tg: 40,
    tm: 100,
    ea: 50,
    eaRubbery: 50,
    eaMelt: 50,
  };
  for (const temperature of [-100, 0, 25, 40, 80, 100, 150, 300])
    assert.ok(
      Math.abs(
        layerTransport(l, { temperature }).diffusion /
          diffusionAtTemperature(l.logD, 50, temperature) -
          1,
      ) < 1e-12,
    );
});
test("each regime energy changes only its temperature segment", () => {
  const l = { ...makeLayer("Custom"), tg: 50, tm: 100 };
  assert.equal(
    layerTransport({ ...l, eaMelt: 150 }, { temperature: 80 }).diffusion,
    layerTransport(l, { temperature: 80 }).diffusion,
  );
  const hotter = layerTransport(
    { ...l, eaMelt: 150 },
    { temperature: 150 },
  ).diffusion;
  assert.ok(hotter > layerTransport(l, { temperature: 150 }).diffusion);
});
test("warmer scenarios increase diffusion and sink extraction while conserving mass", () => {
  const c = defaultConfig();
  c.left = "sink";
  c.right = "sink";
  c.hours = 24;
  const cold = simulate(
    { ...c, temperature: 10 },
    { frames: 61, substeps: 24 },
  );
  const warm = simulate(
    { ...c, temperature: 55 },
    { frames: 61, substeps: 24 },
  );
  assert.ok(
    warm.cells.every((cell, i) => cell.diffusion > cold.cells[i].diffusion),
  );
  assert.ok(warm.frames.at(-1)!.filmMass < cold.frames.at(-1)!.filmMass);
  assert.ok(warm.maxError < 1e-9 && cold.maxError < 1e-9);
});
test("invalid transition order, absent Tm, energies and temperatures are validated", () => {
  const c = defaultConfig();
  c.layers[0].tg = 100;
  c.layers[0].tm = 50;
  assert.ok(validateConfig(c).some((e) => e.includes("Tm must be greater")));
  c.layers[0].tm = null;
  assert.deepEqual(validateConfig(c), []);
  c.layers[0].eaMelt = -1;
  assert.ok(validateConfig(c).length > 0);
  c.layers[0].eaMelt = 30;
  c.temperature = -274;
  assert.ok(validateConfig(c).length > 0);
  c.temperature = 301;
  assert.ok(validateConfig(c).length > 0);
});
test("old Arrhenius projects retain the exact original response after conversion", () => {
  const raw: any = structuredClone(defaultConfig());
  raw.transportModel = "arrhenius";
  for (const l of raw.layers) {
    delete l.tg;
    delete l.tm;
    delete l.eaRubbery;
    delete l.eaMelt;
  }
  const converted = migrateLegacyConfig(raw);
  assert.equal(converted.layers[1].loading, raw.layers[1].loading);
  assert.deepEqual(converted.surfactant, raw.surfactant);
  assert.deepEqual(validateConfig(converted), []);
  assert.ok(!("transportModel" in converted));
  for (const temperature of [0, 25, 80, 150])
    assert.ok(
      Math.abs(
        layerTransport(converted.layers[0], { temperature }).diffusion /
          diffusionAtTemperature(
            raw.layers[0].logD,
            raw.layers[0].ea,
            temperature,
          ) -
          1,
      ) < 1e-12,
    );
});
test("v2 free-volume reference coefficients are converted to effective D25 and removed", () => {
  const raw: any = structuredClone(defaultConfig());
  raw.transportModel = "freeVolume";
  raw.freeVolumeB = 0.15;
  raw.tortuosity = 1.5;
  for (const l of raw.layers) {
    l.freeVolume25 = 0.12;
    l.crystallinity = 0.4;
    l.alphaGlassy = 0.0001;
    l.alphaRubbery = 0.0004;
    delete l.eaRubbery;
    delete l.eaMelt;
    delete l.tm;
  }
  const expected =
    10 ** raw.layers[0].logD * Math.exp(-0.15 * (1 / 0.12 - 10)) * 0.6 ** 1.5;
  const converted = migrateLegacyConfig(raw);
  assert.ok(
    Math.abs(
      layerTransport(converted.layers[0], { temperature: 25 }).diffusion /
        expected -
        1,
    ) < 1e-12,
  );
  assert.ok(
    !("freeVolumeB" in converted) && !("freeVolume25" in converted.layers[0]),
  );
  assert.equal(converted.layers[0].tm, 110);
  assert.deepEqual(validateConfig(converted), []);
});
test("diffusion-only runs conserve material below Tg, above Tg and above Tm", () => {
  const c = defaultConfig();
  c.layers = [
    { ...makeLayer("Custom"), tg: 35, tm: 70, logD: -16, loading: 0.5 },
  ];
  for (const temperature of [20, 50, 90]) {
    const r = simulate({ ...c, temperature }, { frames: 21, substeps: 20 });
    assert.ok(r.maxError < 1e-8);
    assert.ok(r.frames.every((f) => f.concentration.every((v) => v >= 0)));
  }
});

test("malformed research metadata cannot enter the editor via project import", () => {
  const c = defaultConfig();
  for (const [key, value] of [
    ["source", {}],
    ["molarVolume", "invalid"],
    ["assumptions", []],
  ]) {
    const bad = {
      ...c,
      surfactant: { ...c.surfactant, [key as string]: value },
    } as Config;
    assert.ok(validateConfig(bad).length > 0);
  }
});
