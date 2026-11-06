import type { Config, Layer, Surfactant } from "./types.ts";

import researchedSurfactants from "./data/surfactants.json" with { type: "json" };

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
    ea: 60,
    eaRubbery: 45,
    eaMelt: 30,
    tg: -110,
    tm: 110,
  },
  LLDPE: {
    name: "LLDPE",
    density: 925,
    hsp: { d: 16.2, p: 0.2, h: 0.5 },
    radius: 6,
    logD: -14.2,
    ea: 60,
    eaRubbery: 45,
    eaMelt: 30,
    tg: -110,
    tm: 122,
  },
  HDPE: {
    name: "HDPE",
    density: 960,
    hsp: { d: 16.5, p: 0, h: 0 },
    radius: 6,
    logD: -15,
    ea: 65,
    eaRubbery: 50,
    eaMelt: 30,
    tg: -110,
    tm: 133,
  },
  PP: {
    name: "Polypropylene",
    density: 905,
    hsp: { d: 16.5, p: 0, h: 0 },
    radius: 6,
    logD: -14.6,
    ea: 65,
    eaRubbery: 50,
    eaMelt: 30,
    tg: -10,
    tm: 165,
  },
  EVA: {
    name: "EVA",
    density: 940,
    hsp: { d: 16.8, p: 3, h: 5.5 },
    radius: 7,
    logD: -13.7,
    ea: 55,
    eaRubbery: 40,
    eaMelt: 25,
    tg: -25,
    tm: 90,
  },
  PET: {
    name: "PET",
    density: 1380,
    hsp: { d: 18.2, p: 6.4, h: 6.6 },
    radius: 6,
    logD: -16,
    ea: 60,
    eaRubbery: 50,
    eaMelt: 30,
    tg: 75,
    tm: 255,
  },
  PA6: {
    name: "PA6",
    density: 1130,
    hsp: { d: 17.4, p: 8.5, h: 10.5 },
    radius: 7,
    logD: -15,
    ea: 55,
    eaRubbery: 45,
    eaMelt: 30,
    tg: 50,
    tm: 220,
  },
  Custom: {
    name: "Custom polymer",
    density: 1000,
    hsp: { d: 17, p: 4, h: 5 },
    radius: 6,
    logD: -14,
    ea: 60,
    eaRubbery: 45,
    eaMelt: 30,
    tg: 20,
    tm: null,
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
    surfactant: structuredClone(SURFACTANTS[2]),
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

/** Convert v1/v2 files explicitly; current v3 files are validated without repair. */
export function migrateLegacyConfig(input: Config): Config {
  if (!input || !Array.isArray(input.layers)) return input;
  const { transportModel, freeVolumeB, tortuosity, ...rest } = input as any;
  return {
    ...rest,
    layers: input.layers.map((raw: any) => {
      if (!raw || typeof raw !== "object") return raw;
      const {
        freeVolume25,
        alphaGlassy,
        alphaRubbery,
        crystallinity,
        ...layer
      } = raw;
      const defaults =
        POLYMERS[
          Object.hasOwn(POLYMERS, layer.polymer) ? layer.polymer : "Custom"
        ];
      let logD = layer.logD;
      if (transportModel === "freeVolume") {
        if (
          ![freeVolume25, crystallinity, freeVolumeB, tortuosity, logD].every(
            (v) => typeof v === "number" && Number.isFinite(v),
          ) ||
          freeVolume25 <= 0 ||
          crystallinity < 0 ||
          crystallinity >= 1
        )
          throw new Error(
            "Legacy free-volume inputs are incomplete. Supply a calibrated D25 before importing.",
          );
        // Preserve the former model's effective diffusivity at 25°C, not its hypothetical prefactor.
        logD +=
          (-freeVolumeB * (1 / freeVolume25 - 10) +
            tortuosity * Math.log(1 - crystallinity)) /
          Math.LN10;
      }
      return {
        ...layer,
        logD,
        tg: layer.tg === undefined ? defaults.tg : layer.tg,
        tm: layer.tm === undefined ? defaults.tm : layer.tm,
        ea: transportModel === "freeVolume" ? defaults.ea : layer.ea,
        eaRubbery:
          layer.eaRubbery ??
          (transportModel === "freeVolume" ? defaults.eaRubbery : layer.ea),
        eaMelt:
          layer.eaMelt ??
          (transportModel === "freeVolume" ? defaults.eaMelt : layer.ea),
      };
    }),
  };
}
