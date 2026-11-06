import { simulate } from "./solver.ts";
import type { Config } from "./types.ts";

self.onmessage = (event: MessageEvent<Config>) => {
  try {
    self.postMessage({ result: simulate(event.data) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Simulation failed.",
    });
  }
};
