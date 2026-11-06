# AF Migration Lab

An interactive, browser-based simulator of a mobile anti-fog surfactant migrating through a multilayer polymer film. Built from the supplied mathematical brief; the implementation and its limits are described in [docs/MODEL.md](docs/MODEL.md). The original brief is retained in [docs/MATHEMATICAL_BRIEF.md](docs/MATHEMATICAL_BRIEF.md).

## Run

Requires Node.js **22.18+ or 24+** (native TypeScript stripping is used for the numerical tests) and npm. Development was verified with Node 24.22.1.

```sh
cd /workspace/Simulador_migraci-n_AF
npm ci
npm run dev
```

Vite prints the development server address; the default port is 5173. For a production build:

```sh
npm run build
npm run preview
```

No backend, API keys, external fonts or online services are needed to run the installed app. The simulation runs in a web worker. Dependencies are installed from the npm registry using the lockfile. Each cloud task is already isolated; use the existing checkout without creating a Git worktree unless explicitly requested.

## Use the simulator

1. Choose the polymer in each layer. Add, duplicate, remove or reorder up to eight layers. The list runs from face A to face B; physical thicknesses determine the visual widths.
2. Set thickness in µm and the **active mobile surfactant** concentration in wt% for each layer. For example, `0.5` means 0.5 wt%, not a mass fraction of 0.5.
3. Expand **HSP & transport** on each layer to edit its Hansen triplet, interaction radius R₀, density, log₁₀ D at 25°C and activation energy.
4. Choose an illustrative surfactant profile or enter its own δD, δP and δH. All HSP inputs use MPa½. **HSP compatibility** shows a two-axis projection; marker size indicates δH, and RED uses all three components. The layer list remains available to select coincident points.
5. Set temperature, duration and independent boundary conditions for faces A and B. Surface kinetics are available under **Test conditions → Surface kinetics**.
6. Click **Run simulation**. Play/pause, change playback speed, restart or scrub the timeline. The cross-section, concentration profile and inventory cards share the same time. Surface-history curves show the full run faintly, with the elapsed portion emphasized.
7. Export **Project settings (JSON)** to reproduce inputs, or **Simulation results (CSV)** for all 181 times and all spatial cells. Import a saved project to restore and simulate it. Valid settings also persist in browser local storage; no data is sent to a server.

Changing inputs marks existing results stale and disables their playback/CSV export until a new run completes. The HSP map and compatibility table show current input values immediately. Simulation views retain the last run's configuration until rerun.

## Interpreting HSP and outputs

**Every material preset is an illustrative starting point**, including polymer HSP, density, radius, D and activation energy. The surfactant profiles are explicitly synthetic examples; they do not represent a measured commercial product. The application does not include a validated material database.

Hansen parameters screen compatibility. They do **not** determine absolute solubility, the diffusion coefficient, surface capacity or anti-fog efficacy. The app uses a visible, editable heuristic to turn RED into relative affinity and interlayer partitioning. Supply material-specific measurements and calibrate that mapping before making quantitative decisions.

Surface inventory is reported in mg/m² of one film face. Film and removed inventories are normalized to the same planar film area. Surface occupancy is not an anti-fog efficacy score. Retained film percentage excludes both surface reservoirs and externally removed material.

The model has one mobile component, fixed layer properties and an isothermal 1D geometry. It does not model finite water baths, crystals, swelling, micelles, immobile reserves, multiple competing surfactants, or contact angles. See the model notes for the precise implemented equations and limitations.

## Validation

```sh
npm test          # Numerical/physical checks using node:test
npm run build    # TypeScript check and production bundle
npm run test:e2e # Chromium interaction tests
```

The browser tests use `/usr/bin/chromium` when available. Otherwise install Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing browser executable. Browser tests start their own Vite server or reuse one on port 5173; the cloud sandbox may require execution permission for local servers and Chromium.

Numerical checks cover the Hansen metric, Arrhenius scaling, sealed films, analytical slab solutions with one/two sink faces, equilibrium partitioning, saturated surfaces, continuous washing, zero loading, desorption, mesh/time convergence and invalid inputs. Browser checks cover configuration editing, layer operations, HSP projection, playback, input validation, import/export round trips, local persistence, modal access and mobile width.

Conservation is necessary but does not prove convergence. Default settings use 24 cells per layer and 4,320 time steps; the solver accepts optional numerical resolution arguments for convergence studies. Strong HSP contrasts, very fast kinetics and extrapolated temperatures need additional resolution and measured validation.

## Code map

- `src/solver.ts`: HSP metric, input validation, conservative finite volumes and bounded surface exchange.
- `src/simulation.worker.ts`: simulation off the UI thread.
- `src/materials.ts`: clearly labelled illustrative presets and the default scenario.
- `src/App.tsx`: editable experiment, timeline, persistence and exports.
- `src/visuals.tsx`: concentration cross-section, HSP map and time-dependent charts.
- `tests/solver.test.ts`: numerical validation against independent known solutions.
- `e2e/simulator.spec.ts`: functional browser checks.

Settings JSON has a `schemaVersion: 1` envelope and the complete `config`. The CSV contains one row per cell per recorded time; global inventories are repeated on those rows for convenient analysis and must not be summed over cells.
