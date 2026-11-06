import type { Config, Layer, Surfactant } from "./types.ts";

import researchedSurfactants from "./data/surfactants.json" with { type: "json" };

// Illustrative starting values, not a measured material database. See docs/MODEL.md.
export const POLYMERS: Record<
  string,
  Omit<
    Layer,
    | "id"
    | "polymer"
    | "thickness"
    | "loading"
    | "freeVolume25"
    | "tg"
    | "alphaGlassy"
    | "alphaRubbery"
    | "crystallinity"
  > &
    Partial<
      Pick<
        Layer,
        "freeVolume25" | "tg" | "alphaGlassy" | "alphaRubbery" | "crystallinity"
      >
    >
> = {
  LDPE: {
    name: "LDPE",
    density: 920,
    hsp: { d: 16, p: 0, h: 0 },
    radius: 6,
    logD: -14,
    ea: 45,
  },
  LLDPE: {
    name: "LLDPE",
    density: 925,
    hsp: { d: 16.2, p: 0.2, h: 0.5 },
    radius: 6,
    logD: -14.2,
    ea: 45,
  },
  HDPE: {
    name: "HDPE",
    density: 960,
    hsp: { d: 16.5, p: 0, h: 0 },
    radius: 6,
    logD: -15,
    ea: 50,
  },
  PP: {
    name: "Polypropylene",
    density: 905,
    hsp: { d: 16.5, p: 0, h: 0 },
    radius: 6,
    logD: -14.6,
    ea: 50,
  },
  EVA: {
    name: "EVA",
    density: 940,
    hsp: { d: 16.8, p: 3, h: 5.5 },
    radius: 7,
    logD: -13.7,
    ea: 40,
  },
  PET: {
    name: "PET",
    density: 1380,
    hsp: { d: 18.2, p: 6.4, h: 6.6 },
    radius: 6,
    logD: -16,
    ea: 60,
  },
  PA6: {
    name: "PA6",
    density: 1130,
    hsp: { d: 17.4, p: 8.5, h: 10.5 },
    radius: 7,
    logD: -15,
    ea: 55,
  },
  Custom: {
    name: "Custom polymer",
    density: 1000,
    hsp: { d: 17, p: 4, h: 5 },
    radius: 6,
    logD: -14,
    ea: 45,
  },
};
export const SURFACTANTS: Surfactant[] = [
  ...researchedSurfactants,
  {
    name: "Custom surfactant",
    hsp: { d: 17, p: 4, h: 6 },
    source: "User-defined HSP",
  },
];
// Phenomenological amorphous fractional-free-volume estimates. Not grade measurements.
export const RESIN_FREE_VOLUME: Record<
  string,
  Pick<
    Layer,
    "freeVolume25" | "tg" | "alphaGlassy" | "alphaRubbery" | "crystallinity"
  >
> = {
  LDPE: {
    freeVolume25: 0.12,
    tg: -110,
    alphaGlassy: 0.0001,
    alphaRubbery: 0.0004,
    crystallinity: 0.4,
  },
  LLDPE: {
    freeVolume25: 0.11,
    tg: -110,
    alphaGlassy: 0.0001,
    alphaRubbery: 0.0004,
    crystallinity: 0.45,
  },
  HDPE: {
    freeVolume25: 0.08,
    tg: -110,
    alphaGlassy: 0.0001,
    alphaRubbery: 0.0004,
    crystallinity: 0.7,
  },
  PP: {
    freeVolume25: 0.1,
    tg: -10,
    alphaGlassy: 0.0001,
    alphaRubbery: 0.0004,
    crystallinity: 0.5,
  },
  EVA: {
    freeVolume25: 0.14,
    tg: -25,
    alphaGlassy: 0.0001,
    alphaRubbery: 0.0004,
    crystallinity: 0.2,
  },
  PET: {
    freeVolume25: 0.045,
    tg: 75,
    alphaGlassy: 0.0001,
    alphaRubbery: 0.0004,
    crystallinity: 0.3,
  },
  PA6: {
    freeVolume25: 0.06,
    tg: 50,
    alphaGlassy: 0.0001,
    alphaRubbery: 0.0004,
    crystallinity: 0.35,
  },
  Custom: {
    freeVolume25: 0.1,
    tg: 20,
    alphaGlassy: 0.0001,
    alphaRubbery: 0.0004,
    crystallinity: 0,
  },
};
for (const [key, values] of Object.entries(RESIN_FREE_VOLUME))
  Object.assign(POLYMERS[key], values);
export const COLORS = [
  "#28645c",
  "#ce994b",
  "#7983b2",
  "#bc7d83",
  "#72a29f",
  "#a38763",
  "#7d9270",
  "#927ead",
];
export function makeLayer(
  polymer = "LDPE",
  id: string = crypto.randomUUID(),
): Layer {
  return {
    ...structuredClone(POLYMERS[polymer]),
    ...RESIN_FREE_VOLUME[polymer],
    id,
    polymer,
    thickness: 15,
    loading: 0.15,
  };
}
export function defaultConfig(): Config {
  return {
    layers: [
      makeLayer("LDPE", "layer-a"),
      { ...makeLayer("EVA", "layer-b"), thickness: 30, loading: 1 },
      makeLayer("LDPE", "layer-c"),
    ],
    surfactant: structuredClone(SURFACTANTS[2]),
    transportModel: "freeVolume",
    freeVolumeB: 0.15,
    tortuosity: 1.5,
    beta: 1,
    temperature: 25,
    hours: 72,
    left: "dry",
    right: "dry",
    surfaceCapacity: 2,
    logAdsorption: -11,
    desorption: 0.02,
    washRate: 0.15,
  };
}

/** Upgrade only the new transport fields of a legacy single-formulation project. */
export function migrateLegacyConfig(input: Config): Config {
  if (!input || !Array.isArray(input.layers)) return input;
  return {
    ...input,
    transportModel: input.transportModel ?? "arrhenius",
    freeVolumeB: input.freeVolumeB ?? 0.15,
    tortuosity: input.tortuosity ?? 1.5,
    layers: input.layers.map(
      (l) =>
        l && {
          ...RESIN_FREE_VOLUME[
            l.polymer in RESIN_FREE_VOLUME ? l.polymer : "Custom"
          ],
          ...l,
        },
    ),
  };
}
