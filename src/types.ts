export type HSP = { d: number; p: number; h: number };
export type Surfactant = {
  name: string;
  hsp: HSP;
  id?: string;
  commonName?: string;
  source?: string;
  formula?: string;
  molarVolume?: number;
  assumptions?: string;
};
export type Layer = {
  id: string;
  polymer: string;
  name: string;
  thickness: number;
  loading: number;
  density: number;
  hsp: HSP;
  radius: number;
  logD: number;
  ea: number;
  freeVolume25: number;
  tg: number;
  alphaGlassy: number;
  alphaRubbery: number;
  crystallinity: number;
};
export type Boundary = "dry" | "wash" | "sealed" | "sink";
export type Config = {
  layers: Layer[];
  surfactant: Surfactant;
  transportModel: "arrhenius" | "freeVolume";
  freeVolumeB: number;
  tortuosity: number;
  beta: number;
  temperature: number;
  hours: number;
  left: Boundary;
  right: Boundary;
  surfaceCapacity: number;
  logAdsorption: number;
  desorption: number;
  washRate: number;
};
export type Cell = {
  x: number;
  width: number;
  layer: number;
  density: number;
  affinity: number;
  diffusion: number;
};
export type Frame = {
  hours: number;
  concentration: number[];
  surface: [number, number];
  lost: [number, number];
  filmMass: number;
  massError: number;
};
export type Result = {
  config: Config;
  cells: Cell[];
  frames: Frame[];
  initialMass: number;
  maxError: number;
};
