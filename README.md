# AF Migration Lab · Comparison Studio

Compare two multilayer anti-fog formulations at the same physical time, with one absolute concentration color scale. Includes 19 surfactant HSP estimates from the supplied Van Krevelen / te Nijenhuis research, independent temperatures, and transition-aware Arrhenius diffusion using each polymer’s Tg and optional Tm.

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
4. Expand a layer's **HSP & transport** to change its HSP, radius, density, effective reference D₂₅, Tg, optional Tm and regime activation energies. Polymer properties remain illustrative starting scenarios.
5. Set temperature independently in the cards or active editor (−150 to 300°C). The transport tables show each layer’s Tg/Tm, active regime and effective D. Diffusion is anchored to D₂₅ and follows continuous Arrhenius segments below Tg, above Tg, and above Tm.
6. Choose dry reversible adsorption, washed adsorption, sealed or perfect-sink boundaries for each face. The two faces of a film are labeled Face A and Face B, separately from the formulation labels A and B.
7. **Run both simulations**, then play/pause or scrub the shared timeline. Duration is deliberately shared: editing it changes both formulations, so a frame always represents the same physical time. The default comparison holds the formula fixed and compares 25°C with 45°C.
8. Violet, cyan, rose or amber is the surfactant concentration hue. The two films use the **same absolute wt% scale**, fixed across all frames and both results. Layer-edge colors identify resins. Surface bars separately show fractional surface occupancy Γ/Γmax, not bulk wt%.

Changing model inputs marks results stale and disables playback/results export until rerun. Card inputs show the edited temperature; the result caption explicitly states the temperature used in the last run. Switching hue does not invalidate the numerical result. On mobile the two result cards stack; on desktop they are adjacent.

The concentration profiles have a shared concentration axis; their depth axes reflect each film's own thickness. Surface-history charts have shared time and inventory axes. Faint history curves show the complete run; the elapsed part is emphasized. The difference panel reports B−A at the selected time. Equal initial mass and controlled changes are needed to attribute differences to a particular mechanism.

## Research and model limitations

The 19 surfactant triplets are **Hoftyzer–Van Krevelen component estimates with Fedors-estimated molar volume**, based on explicit representative molecules. They are not measured HSP of commercial grades or a procurement-verified supplier database. Mixed esters, fatty-chain distributions, EO distributions and isomers require composition-specific treatment. The source calculations and full assumptions are in [docs/surfactant-screening/REPORT.md](docs/surfactant-screening/REPORT.md), with a reproducible Python calculation script and CSV/JSON audit data.

The temperature model uses **effective D at 25°C** and editable activation energies for the glassy, above-Tg and molten regimes. Each polymer has an editable glass transition **Tg** and optional melting transition **Tm**. Below Tg the layer is labeled **Glassy**; at/above Tg and below Tm, **Above Tg** refers to a mobile amorphous phase within a solid semicrystalline film. An amorphous layer with no Tm is **Rubbery** above Tg. At/above Tm it is **Molten**.

The solver splits the path from 25°C to the selected temperature at the transitions and accumulates Arrhenius increments. D is continuous at both transitions: there is no invented universal melting multiplier. If the three energies are equal, this reduces exactly to the original single Arrhenius model. Transition temperatures alone cannot determine diffusion; the grade-dependent Tg/Tm and resin–surfactant diffusion parameters need calibration. No free-volume, thermal-expansion, crystalline-fraction or tortuosity controls remain in the model.

Typical starting transition values (°C, Tg / Tm) are LDPE −110/110, LLDPE −110/122, HDPE −110/133, PP −10/165, EVA −25/90, PET 75/255, PA6 50/220 and Custom 20/no Tm. They are approximate resin-family values, not measurements of your grade. Click **HSP & transport** to adjust them and the activation energies. The temperature range permits examining these transitions but does not establish processing stability or AF validity across that range.

Surface inventory is **not** an AF efficacy score. There is no calibrated optical/contact-angle model, precipitation, melting thermodynamics or recrystallization, finite stagnant water bath, immobile reserve, swelling, or multicomponent competition. Surface kinetics and HSP are held fixed when temperature changes. At/above Tm, a visible note explains that this is a diffusion-only calculation: geometry remains fixed and melt flow, film deformation and degradation are not simulated. Detailed equations, units and limits are in [docs/MODEL.md](docs/MODEL.md); the original brief is in [docs/MATHEMATICAL_BRIEF.md](docs/MATHEMATICAL_BRIEF.md).

## Save and export

**Export → Project settings** saves a version-3 JSON containing both configurations and the hue. Import restores and simulates the pair. Version-1 single-case and version-2 comparison files remain supported. Older Arrhenius projects use their original Ea in every regime, preserving their original temperature response until you change the energies. For former v2 free-volume projects, the old coefficient is first evaluated at 25°C and converted to an effective D₂₅; Tg is retained, and new melting temperatures/regime energies are initialized from resin defaults. Their old temperature curve is intentionally replaced by the transition model. A visible conversion note asks you to review these parameters. Removed fields are discarded, never reinterpreted as calibrated D₂₅ prefactors.

**Export → Simulation results** saves one CSV with a `formulation` A/B column, temperatures, concentrations, effective D, surface inventories, removed mass and conservation residuals at all recorded times and cells. Global inventories repeat on each cell row and **must not be summed over cells**. CSV exports are disabled while inputs are stale. Valid pair settings persist in browser local storage; no project data is uploaded.

The research `screening.json` is an audit dataset, not a project file.

## Validation

```sh
npm test
npm run build
npm run test:e2e
```

Numerical tests cover independent analytical slab release, interlayer partition equilibrium, conservation, adsorption/desorption bounds, wash extraction, zero loading, spatial/time convergence, the researched library, regime classification, analytical multi-transition Arrhenius increments, continuity at Tg/Tm, reference anchoring, temperature-dependent extraction and legacy conversion. Browser tests exercise the two independent cases, all library choices, common hue/time, transition editing, recipe copying, invalid inputs, JSON/CSV, local persistence, transition crossings and mobile layout.

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
