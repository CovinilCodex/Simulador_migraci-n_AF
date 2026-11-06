# Implemented physical and numerical model

This is a deliberately limited implementation of the supplied [mathematical brief](MATHEMATICAL_BRIEF.md), for a single mobile AF surfactant in a fixed-area multilayer film. It is a scenario explorer, with user-editable illustrative material data. It does not predict anti-fog optical performance.

## 1. Units and initial state

Internal distance is m, time s, temperature K, bulk mass concentration c is kg/m³ of film, and surface inventory Γ is kg/m². Display units are µm, h, °C, wt% and mg/m². Each cell initially contains c = ρ·loading/100. The two surfaces and removed inventories start empty. Inventories are calculated per 1 m² of planar film area, so each cell holds c·Δx kg/m².

Layers share a single mobile pseudocomponent on a mass basis; molar masses are therefore unnecessary. Commercial-product loading must first be converted to active mobile surfactant loading. Immobile material is not represented by the initial concentration.

## 2. Hansen compatibility and assumed partitioning

For polymer p and surfactant s:

```text
Ra² = 4(δD,p − δD,s)² + (δP,p − δP,s)² + (δH,p − δH,s)²
RED = Ra / R0,p
S = exp[−min(14, β RED²)]
```

All HSP components and R₀ use MPa½. RED is dimensionless. RED ≤ 1 is a conventional qualitative compatibility screen. β is a user-adjustable nonnegative parameter; β = 0 sets every S to 1 and removes affinity-driven partitioning. The cap at 14 limits coefficient contrast for numerical conditioning; behavior beyond this cap is intentionally not resolved.

**S is a relative affinity, not an absolute solubility or a dissolved fraction.** It does not cap c, immobilize the excess or change D. The mapping from HSP to S is a heuristic and must be calibrated from partition or migration data. At interlayer equilibrium the activity proxy a = c/S is equal, hence c₂/c₁ = S₂/S₁. An incompatible layer can still be initialized at any allowed loading; precipitation would require an additional model and experimental inputs.

The material menu names familiar polymer classes but resin numerical presets remain illustrative and source-unverified. Grade properties, additives and thermal history are not inferred from a polymer name. The surfactant menu now contains 19 explicit HVK/Fedors estimates plus a custom entry, replacing the original synthetic profiles. Full group counts and source references are in [surfactant-screening/REPORT.md](surfactant-screening/REPORT.md). These are estimates for ideal representative structures, not measured commercial-grade values.

## 3. Diffusion and interlayer interfaces

The flux is written in terms of relative activity:

```text
∂c/∂t = −∂J/∂x
J = −D S ∂(c/S)/∂x
```

Within one uniform layer S is constant, so J = −D∂c/∂x. Across an interface, concentrations may jump while flux is conserved. No artificial equality of concentrations is imposed. For neighboring finite-volume cells i and j:

```text
gij = 1 / [Δxi/(2 Di Si) + Δxj/(2 Dj Sj)]
Jij = gij (ai − aj)
ai = ci/Si
```

Temperature is represented by a **continuous, piecewise Arrhenius curve** anchored to effective D25 in the actual host. This replaces the former free-volume option. There is no extra crystalline obstruction applied to an effective reference coefficient.

### 3.1 Polymer transition temperatures and regimes

Each layer supplies Tg and optionally Tm (°C), plus three effective activation energies (kJ/mol):

- T < Tg: **Glassy**, using `ea`.
- Tg ≤ T < Tm: **Above Tg**, using `eaRubbery`. For semicrystalline resins this refers to increased mobility of the amorphous phase; it does not mean that the whole film is molten.
- T ≥ Tm: **Molten**, using `eaMelt`.
- If Tm is null, no melting transition is introduced; T ≥ Tg is labeled **Rubbery**, with `eaRubbery` throughout that upper range.

Thresholds are taken literally for classification: a temperature exactly equal to Tg enters the upper regime; one equal to Tm enters the molten regime. Tm must be greater than Tg when present.

### 3.2 Continuous Arrhenius integration

For any interval within one regime:

```text
ln[D(Tb)/D(Ta)] = −Ea,regime/R · (1/Tb − 1/Ta)
R = 8.314462618 J/(mol K)
```

All temperatures in this equation are kelvin and energies are converted from kJ/mol to J/mol. To evaluate the selected temperature, subdivide the path from 25°C at any intervening Tg or Tm, add the logarithmic increments, and multiply D25 by the exponential of the sum. For cooling, integrate the same segments in reverse. Using the anchor correctly matters when 25°C is already above Tg, or even above a user-defined Tm.

D(T) is continuous at Tg and Tm; its Arrhenius slope changes according to the chosen energies. Setting all energies equal exactly reproduces the previous single Arrhenius relationship. There is no universal jump factor at melting. A discontinuous measured change would require its own calibrated model; transition temperatures alone do not determine diffusion constants.

The initial resin scenarios are:

| Resin  | Tg °C | Tm °C | Ea below Tg | Ea above Tg | Ea above Tm |
| ------ | ----: | ----: | ----------: | ----------: | ----------: |
| LDPE   |  −110 |   110 |          60 |          45 |          30 |
| LLDPE  |  −110 |   122 |          60 |          45 |          30 |
| HDPE   |  −110 |   133 |          65 |          50 |          30 |
| PP     |   −10 |   165 |          65 |          50 |          30 |
| EVA    |   −25 |    90 |          55 |          40 |          25 |
| PET    |    75 |   255 |          60 |          50 |          30 |
| PA6    |    50 |   220 |          55 |          45 |          30 |
| Custom |    20 |  none |          60 |          45 |      unused |

Energies are in kJ/mol. Transition temperatures are approximate family-level starting values and activation energies are illustrative calibration parameters, **not measured grade-specific values or a universal ordering of diffusion barriers**. Density, HSP and estimated surfactant volume do not supply these activation energies. The original logD values remain illustrative effective reference coefficients.

Selected temperatures from −150 to 300°C are supported to explore the listed transitions; this is not a validation of material stability over that entire interval. The calculation is isothermal, with no thermal ramp, latent heat, melting fraction, recrystallization, humidity plasticization, degradation or variable geometry. At/above Tm it is only a diffusion estimate for a hypothetical fixed-geometry molten layer; the interface displays that limitation. HSP and surface kinetics remain at their reference values. Equal final concentration profiles at different temperatures may reflect the same equilibrium reached at different rates.

## 4. Boundary and surface inventories

Each face independently selects one of four conditions:

- **Sealed:** zero mass flux; no surface exchange or wash.
- **Perfect sink:** zero concentration at the boundary. Flux from the adjacent cell uses the half-cell conductance g = 2DS/Δx; extracted mass enters the removed inventory directly. It does not also enter Γ.
- **Dry AF surface:** reversible finite-capacity adsorption, with no external loss.
- **AF surface with continuous wash:** the same adsorption plus irreversible first-order removal from Γ to an externally removed inventory.

For dry/wash boundaries, with outward flux q positive:

```text
q = kads (cs/S)(1 − Γ/Γmax) − kdes Γ
J·n = q
dΓ/dt = q − kwash Γ
```

`kads` is an adsorption velocity in m/s expressed against c/S; `kdes` and `kwash` are s⁻¹ after converting the h⁻¹ inputs. Γmax is kg/m² after converting mg/m². This is the mass-basis Langmuir form, with ka = kads/(SΓmax) when written as ka cs(Γmax−Γ). Surface rates are shared by both faces in this version. During local numerical exchange, cs is approximated by the adjoining cell concentration; this boundary approximation and the time splitting require refinement for accurate fast-kinetics transients.

At fixed cs with no washing:

```text
Γeq/Γmax = [kads cs/(S Γmax)] / [kads cs/(S Γmax) + kdes]
```

The wash boundary approximates a renewed dilute receiver with negligible readsorption. Removed material never returns. It is not a finite water bath or a model of droplet formation/condensate hydrodynamics. Changing boundary conditions and rerunning starts a new simulation at t = 0; this is not a sequential wet/dry protocol editor.

## 5. Conservative numerical integration

Default discretization: 24 equal-width cells **within each layer**, 181 output frames, and 24 substeps between frames (4,320 substeps). Each layer therefore has the same cell count regardless of its thickness. Thick layers may need more cells for convergence; thin-layer interfaces are explicitly represented.

1. Advance diffusion using backward Euler in a = c/S. Storage coefficient is Δx·S. Half-cell interface resistances enforce partitioning. The tridiagonal matrix is factored once using Thomas LU; it is a positive M-matrix in exact arithmetic. Sink extraction uses the same implicit flux as the bulk update.
2. For each dry/wash face, solve a local implicit exchange between the adjoining cell mass m and Γ. If x is the mass transferred to the surface, solve:

   ```text
   x = Δt [kads (m−x)/(Δx S) (1−(Γ+x)/Γmax) − kdes(Γ+x)]
   −Γ ≤ x ≤ min(m, Γmax−Γ)
   ```

   The residual is monotone on this physical bracket. Fifty bisection iterations solve the bounded root without clipping a computed concentration or inventing mass. The same x is removed from the cell and added to Γ, allowing negative x for desorption.

3. On washed faces, remove Γ·[1−exp(−kwash Δt)] and add exactly that amount to the removed inventory. This wash-only substep is exact.

The split scheme is **first-order in time**, not BDF/Radau and not a simultaneous nonlinear implicit solver. Positivity and conservation do not prove time accuracy. Refinement is especially important for fast adsorption, washing or very large D. The pure homogeneous diffusion interior has second-order spatial approximation; mixed interfaces and surface approximations can reduce the observed global order.

At each saved frame check:

```text
Minitial = Σi ci Δxi + ΓA + ΓB + Mremoved,A + Mremoved,B
relative residual = |Mcomputed − Minitial| / Minitial
```

For zero initial mass the absolute residual is used instead. Nonfinite/negative concentrations or relative residual above 10⁻⁵ terminate the run with a visible error. The app reports the maximum residual over recorded frames. It never reports a failed solve as a valid trajectory. Surface exchange is bounded by construction; no post-solve negative-value clipping is used.

Optional `simulate(config, {cellsPerLayer, frames, substeps})` arguments support convergence studies. Changing the number of frames without adjusting substeps also changes the time step; vary resolutions deliberately.

## 6. Validation and interpretation

Numerical tests compare the single-layer sink solution with the analytical series, with h the **full** film thickness:

```text
M(t)/M0 = (8/π²) Σn≥0 exp[−(2n+1)²π²Dt/h²]/(2n+1)²
```

For one sink face and one sealed face, replace h by 2h. Other checks verify uniform sealed storage, closed interlayer equilibrium ratios, HSP weighting, Arrhenius scaling, saturation, monotonic removed inventory, zero loading, reverse desorption, input validation and spatial/time convergence.

The comparison uses one color scale, fixed from the maximum computed wt% over **both formulations**, all cells and all frames (plus 5% headroom). The selectable hue is shared between both concentration fields. Changing hue does not rerun or invalidate the solution. Film geometry is to relative thickness, with a decorative perspective offset. Color is a concentration field, not individual molecule trajectories. The profile is wt% and may jump at interfaces due to partitioning and density. Surface bars represent Γ/Γmax; inventory cards report mass, not AF efficacy. The HSP plot is a δD–δP projection, with δH encoded by marker size; overlap does not imply the two materials share every property.

No calibrated relation to contact angle, condensation morphology, transparency or AF lifetime is implemented. No unmeasured parameters should be treated as known product properties. See the original brief for mechanisms that may be necessary in a future experimentally calibrated model.

## 7. Comparison semantics and persistence

Both cases have independent configurations and initial inventories, but a common time horizon and 181 synchronized output times. Each runs the same solver independently. The pair is accepted atomically only if both solves succeed; changing either configuration marks existing outputs stale. Copying A to B makes an independent deep copy, not a live link. Temperature defaults differ (25°C/45°C) while the initial recipes otherwise agree. Different physical film thicknesses retain their own depth axes/relative geometry.

Concentration axes and HSP projection bounds are shared across the pair. Surface-history inventory axes use the larger surface capacity, so two different capacities do not silently generate different plot scales. Face bars show each face's own Γ/Γmax; numeric inventories permit absolute comparison. The difference summary uses B−A, never an efficacy claim. Regions of strong partition preference may produce similar final profiles at different temperatures even when transient rates differ; equilibrium similarity should not be mistaken for a broken temperature dependence.

Version-3 project files store `configs: [A,B]` and a shared `hue`. They are validated without filling missing current-model fields. Explicit v1 imports and older saved Arrhenius projects are upgraded with their original activation energy in every regime, retaining the original curve; new Tg/Tm defaults only classify those regimes until their energies are edited.

Former v2 free-volume projects are converted by evaluating their original coefficient at 25°C:

```text
log10(D25,new) = log10(Dbase,old)
 + [−B(1/f25 − 10) + τ ln(1−Xc)]/ln(10)
```

This conversion is used **only to recover the old effective reference value**. No free-volume law remains in new simulation runs. Tg is retained, Tm and regime energies use the resin transition defaults, and a visible conversion note states that the off-reference temperature response has changed and must be reviewed. Removed legacy fields are stripped from the exported current configuration. Incomplete legacy coefficients are rejected instead of silently converted. The old v2 storage key is preserved; valid converted settings are saved under the new v3 key.

Unknown project versions, invalid configurations and unequal comparison durations are rejected. The research audit JSON remains separate from the application project schema.
