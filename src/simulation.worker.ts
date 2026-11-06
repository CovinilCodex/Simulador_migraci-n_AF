import { simulate } from "./solver.ts";
import type { Config } from "./types.ts";
self.onmessage = (event: MessageEvent<[Config, Config]>) => {
  try {
    const results = event.data.map((config, i) => {
      try {
        return simulate(config);
      } catch (error) {
        throw new Error(
          `Formulation ${i === 0 ? "A" : "B"}: ${error instanceof Error ? error.message : "Simulation failed."}`,
        );
      }
    });
    self.postMessage({ results });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Simulation failed.",
    });
  }
};
