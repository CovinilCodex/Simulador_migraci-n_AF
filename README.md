# AF Migration Lab · Comparison Studio

Compare two multilayer anti-fog formulations at the same physical time, with one absolute concentration color scale. Includes 19 surfactant HSP estimates from the supplied Van Krevelen / te Nijenhuis research, independent temperatures, and an editable free-volume/crystallinity transport model.

## Run

Requires Node.js **22.18+ or 24+** and npm. Verified with Node 24.22.1.

```sh
npm ci
npm run dev
```

Open the address Vite prints (default port 5173). On Windows, file watching uses polling for mapped/network drives. If the drive still fails, copy to a local folder such as `C:\Projects\AF-Migration-Lab` and run the commands there. Production build:

```sh
npm run build
npm run preview
```

No API keys or backend are required. Calculations run locally in a web worker. Each cloud task is isolated: use the existing checkout rather than creating a worktree unless requested.

## Compare formulations

1. **Edit formulation A / B** selects which recipe the left editor modifies. Each recipe independently holds its layers, surfactant, initial loading, temperature, boundary conditions and transport assumptions. **A → B** copies A into B without linking subsequent edits.
2. Select, add, duplicate, remove or reorder up to eight polymer layers per recipe. Initial concentrations are active **mobile surfactant wt%**; `0.5` means 0.5 wt%. Layer thicknesses are µm.
3. The surfactant menu contains **19 researched representative structures + Custom**. It includes glycerol esters, PGMS, diglyceryl stearate, sorbitan esters, PEG stearates, alcohol ethoxylates and polysorbates. HSP inputs use MPa½. **Research & structure** shows formula, estimated volume and composition assumptions. Editing HSP switches to Custom.
4. Expand a layer's **HSP & transport** to change its HSP, radius, density, diffusion baseline and free-volume/morphology parameters. Polymer properties remain illustrative starting scenarios.
5. Set temperature independently in the cards or active editor. Select **Free volume + crystallinity** or **Calibrated D₂₅ + Arrhenius**. The effective-transport tables show the actual D used for each layer. These two modes interpret the diffusion baseline differently; read the model notes before transferring a calibrated value.
6. Choose dry reversible adsorption, washed adsorption, sealed or perfect-sink boundaries for each face. The two faces of a film are labeled Face A and Face B, separately from the formulation labels A and B.
7. **Run both simulations**, then play/pause or scrub the shared timeline. Duration is deliberately shared: editing it changes both formulations, so a frame always represents the same physical time. The default comparison holds the formula fixed and compares 25°C with 45°C.
8. Violet, cyan, rose or amber is the surfactant concentration hue. The two films use the **same absolute wt% scale**, fixed across all frames and both results. Layer-edge colors identify resins. Surface bars separately show fractional surface occupancy Γ/Γmax, not bulk wt%.

Changing model inputs marks results stale and disables playback/results export until rerun. Card inputs show the edited temperature; the result caption explicitly states the temperature used in the last run. Switching hue does not invalidate the numerical result. On mobile the two result cards stack; on desktop they are adjacent.

The concentration profiles have a shared concentration axis; their depth axes reflect each film's own thickness. Surface-history charts have shared time and inventory axes. Faint history curves show the complete run; the elapsed part is emphasized. The difference panel reports B−A at the selected time. Equal initial mass and controlled changes are needed to attribute differences to a particular mechanism.

## Research and model limitations

The 19 surfactant triplets are **Hoftyzer–Van Krevelen component estimates with Fedors-estimated molar volume**, based on explicit representative molecules. They are not measured HSP of commercial grades or a procurement-verified supplier database. Mixed esters, fatty-chain distributions, EO distributions and isomers require composition-specific treatment. The source calculations and full assumptions are in [docs/surfactant-screening/REPORT.md](docs/surfactant-screening/REPORT.md), with a reproducible Python calculation script and CSV/JSON audit data.

The free-volume option is a **Doolittle-style phenomenological diffusion model**, not a direct calculation of each commercial resin's free volume from its name. Resin f₂₅, Tg, expansion slopes, crystalline fraction, B and the morphology exponent are editable assumptions. B and the baseline must be calibrated for the actual resin–surfactant pair. Molecular HSP or molar volume alone does not determine D. Arrhenius and free-volume temperature factors are alternatives, not multiplied together. No crystalline obstruction is reapplied to an already calibrated effective D₂₅ in Arrhenius mode.

Surface inventory is **not** an AF efficacy score. There is no calibrated optical/contact-angle model, precipitation, melting/recrystallization, finite stagnant water bath, immobile reserve, swelling, or multicomponent competition. Surface kinetics and HSP are held fixed when temperature changes. Detailed equations, units and limits are in [docs/MODEL.md](docs/MODEL.md); the original brief is in [docs/MATHEMATICAL_BRIEF.md](docs/MATHEMATICAL_BRIEF.md).

## Save and export

**Export → Project settings** saves a version-2 JSON containing both configurations and the hue. Import restores and simulates the pair. Version-1 single-formulation files import into the active case with legacy Arrhenius semantics and default values only for the new transport fields. The other case adopts the same duration. Valid older local settings are similarly migrated; their HSP values are preserved even if they came from an old demo.

**Export → Simulation results** saves one CSV with a `formulation` A/B column, temperatures, concentrations, effective D, surface inventories, removed mass and conservation residuals at all recorded times and cells. Global inventories repeat on each cell row and **must not be summed over cells**. CSV exports are disabled while inputs are stale. Valid pair settings persist in browser local storage; no project data is uploaded.

The research `screening.json` is an audit dataset, not a project file.

## Validation

```sh
npm test
npm run build
npm run test:e2e
```

Numerical tests cover independent analytical slab release, interlayer partition equilibrium, conservation, adsorption/desorption bounds, wash extraction, zero loading, spatial/time convergence, the researched library, free-volume thermal slopes, morphology limits, temperature-dependent extraction and legacy migration. Browser tests exercise the two independent cases, all library choices, common hue/time, recipe editing/copying, invalid inputs, JSON/CSV, local persistence and mobile layout.

Browser tests use `/usr/bin/chromium` when available; otherwise run `npx playwright install chromium` or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The cloud sandbox may require execution permission for servers/Chromium.

Default numerical resolution is 24 cells per layer and 4,320 steps. Conservation alone does not guarantee temporal/spatial accuracy. Use optional `simulate(config, {cellsPerLayer, frames, substeps})` arguments for additional convergence studies, especially for extreme affinities and rapid kinetics.

## Source map

- `src/App.tsx`: pair configuration, synchronized playback, comparison output and project I/O.
- `src/Editor.tsx`: active formulation's layer, HSP, temperature and transport editor.
- `src/materials.ts`: researched surfactant library, illustrative resin parameters, legacy migration.
- `src/data/surfactants.json`: full-precision screened HSP and structure metadata.
- `src/solver.ts`: transport coefficients and conservative migration solver.
- `src/visuals.tsx`: independent SVG fields with unique resources and shared plot scales.
- `tests/solver.test.ts`, `e2e/simulator.spec.ts`: physical and functional verification.
