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

The material menu names familiar polymer classes but all numerical presets are illustrative and source-unverified. Grade, crystallinity, additives and thermal history are not inferred from a polymer name. The surfactant menu consists of synthetic profiles, not chemical identity claims.

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

Temperature dependence uses an independent, supplied diffusion coefficient at 25°C:

```text
D(T) = D25 exp[−Ea/R (1/T − 1/298.15)]
R = 8.314462618 J/(mol K)
```

The input activation energy is converted from kJ/mol to J/mol. The app does not infer diffusion from HSP, nor infer crystallinity or morphology from density. Arrhenius extrapolation across phase or morphology transitions is not justified by this model.

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

The color scale is fixed over a run using the maximum computed wt% from all cells and frames (plus 5% headroom). Film geometry is to relative thickness, with a decorative perspective offset. Color is a concentration field, not individual molecule trajectories. The profile is wt% and may jump at interfaces due to partitioning and density. Surface bars represent Γ/Γmax; inventory cards report mass, not AF efficacy. The HSP plot is a δD–δP projection, with δH encoded by marker size; overlap does not imply the two materials share every property.

No calibrated relation to contact angle, condensation morphology, transparency or AF lifetime is implemented. No unmeasured parameters should be treated as known product properties. See the original brief for mechanisms that may be necessary in a future experimentally calibrated model.
