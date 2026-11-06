import type { Config, HSP, Layer } from "./types.ts";

// Illustrative starting values, not a measured material database. See docs/MODEL.md.
export const POLYMERS: Record<
  string,
  Omit<Layer, "id" | "polymer" | "thickness" | "loading">
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
export const SURFACTANTS: { name: string; hsp: HSP }[] = [
  { name: "Balanced AF · demo", hsp: { d: 16.5, p: 3.5, h: 6.5 } },
  { name: "Polar AF · demo", hsp: { d: 17, p: 8, h: 12 } },
  { name: "Low-polarity AF · demo", hsp: { d: 16, p: 1, h: 2 } },
  { name: "Custom surfactant", hsp: { d: 17, p: 4, h: 6 } },
];
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
    surfactant: structuredClone(SURFACTANTS[0]),
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
