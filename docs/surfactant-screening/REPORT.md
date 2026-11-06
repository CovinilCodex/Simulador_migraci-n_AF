# Commercial surfactant screening for polymer AF migration

## Scope and evidence

This screening covers **19 ideal representative molecules from commercially known nonionic surfactant families**. It is intended to select experiments for internally added polymer anti-fog surfactants, with ethoxylated materials included as exploratory comparisons. It is not a list of 19 experimentally proven AF additives for every polymer.

The source is the uploaded *Properties of Polymers*, D. W. van Krevelen, revised by K. te Nijenhuis, fourth edition, Elsevier, 2009. No numerical HSP values below were copied from supplier data or measured. All were calculated from the specified molecular structures. Commercial family/trade names are identity pointers, not confirmation of present availability, supplier specification, pure composition, processing suitability or permitted application. Current vendor catalogues were not verified in this screening.

## Method and exact references

Use the Hoftyzer–Van Krevelen (HVK) group-contribution component method, section 7.3.4.1, Eqs. 7.22–7.24, printed pp. 213–214 (**PDF pages 240–241**), and Table 7.10, printed p. 215 (**PDF page 242**):

- δD = Σ nᵢFdᵢ / V
- δP = sqrt(Σ nᵢFpᵢ²) / V
- δH = sqrt(Σ nᵢEhᵢ / V)
- δtotal,HVK = sqrt(δD² + δP² + δH²)

The polar contribution sums **nᵢ × Fpᵢ²**, not (nᵢ × Fpᵢ)². For volume, use the Fedors contributions in Table 7.3, printed p. 195 (**PDF page 222**): V = Σ nᵢVᵢ, in cm³/mol. This is a combined HVK/Fedors-volume estimate. A separately calculated Fedors total, sqrt(Σ nᵢEcohᵢ / V), provides a method comparison; it is not forced to equal the norm of the HVK components.

All reported δ values are in **MPa½**, numerically equal to (J/cm³)½. The calculation uses the book's ambient-reference volume framework, approximately 298 K. It does not include a temperature extrapolation or crystalline fusion free energy. For a material solid at ambient temperature, treat this as a structural cohesion screen, not a measured solid-state dissolution parameter. Do not substitute an arbitrary solid density into a liquid-state model without assessing the reference state.

The table headings for attraction constants in the PDF are dimensionally abbreviated. Here the numerical constants are used with V in cm³/mol; Fd and Fp carry the corresponding MPa½·cm³/mol units, while Eh is J/mol. No additional 2.045 conversion is applied: that factor is only needed when converting values originally in (cal/cm³)½.

The group lookup used for the calculations, atom counts, structure assumptions, unrounded intermediate sums and results are all in `screening.json`. `calculate.py` regenerates the CSV, JSON and numerical table using Python's standard library.

### Structure conventions

- A whole ester is counted once as –COO–. Its carbonyl carbon and ester oxygen are not counted again as CH/ether groups.
- Each –CH=CH– contains two `alkene_CH` groups. The model does not itself distinguish cis and trans energetics.
- For Fedors, free OH groups on adjacent carbon atoms use V = 13.0 cm³/mol and Ecoh = 21,850 J/mol **per affected OH**. Isolated OH groups use 10.0 and 29,800, respectively. Both use the same OH component contributions in HVK.
- Glycerol monoesters are primary 1-monoesters. Secondary monoester and di-/triglyceride content are not folded into these numbers.
- Sorbitan monoesters are a specified 1,4-sorbitan 6-monoester: one five-membered ring, one ring ether, and remaining OH at C2/C3/C5. The C2/C3 pair receives the adjacent-OH Fedors correction. The ring adds the Table 7.10 dispersion correction and the Table 7.3 ring volume/energy corrections. Blank ring entries for polar/hydrogen-bond increments are treated as zero correction, not as measured zero interaction.
- Diglyceryl monostearate is one linear alpha,alpha-prime diglycerol primary monoester. Branched/cyclic polyglycerols and other esterification states need separate counts.
- PEG and alcohol ethoxylates have exactly the stated number of EO units. In PEG monoesters, the terminal ester oxygen is already in –COO–; only n−1 ether groups remain.
- Polysorbate representatives contain one sorbitan ring, one fatty ester and exactly 20 added EO units, distributed so all three free OH arms terminate in isolated OH. Actual commercial distributions are substantially more complicated.
- No molecular-symmetry reduction is applied (factor 1). The book's symmetry corrections refer to equivalent polar groups in a symmetric molecular arrangement. Repeated groups in flexible ethoxylates are not automatically treated as globally symmetric. A rigid symmetric structure would require reassessment.

## Numerical screening

Values are rounded to one decimal for screening. Extra digits in the data files preserve reproducibility, not empirical precision.

| Representative molecule | Commercial family / common name | δD | δP | δH | δ total (HVK) | δ total (Fedors) |
|---|---|---:|---:|---:|---:|---:|
| Glyceryl monolaurate | GML / monolaurin | 16.9 | 3.2 | 13.2 | 21.7 | 21.9 |
| Glyceryl monopalmitate | GMP / monopalmitin | 16.9 | 2.6 | 11.9 | 20.8 | 21.1 |
| Glyceryl monostearate | GMS / monostearin | 16.8 | 2.3 | 11.3 | 20.4 | 20.8 |
| Glyceryl monooleate | GMO / monoolein | 16.7 | 2.4 | 11.4 | 20.4 | 20.9 |
| Propylene glycol monostearate | PGMS | 16.6 | 1.9 | 8.6 | 18.8 | 19.8 |
| Diglyceryl monostearate | Polyglyceryl-2 stearate family | 17.3 | 2.6 | 13.0 | 21.8 | 22.3 |
| Sorbitan monolaurate | Span 20-type family | 17.8 | 3.6 | 15.4 | 23.8 | 24.2 |
| Sorbitan monopalmitate | Span 40-type family | 17.7 | 3.0 | 13.9 | 22.7 | 23.1 |
| Sorbitan monostearate | Span 60-type family | 17.6 | 2.7 | 13.3 | 22.2 | 22.7 |
| Sorbitan monooleate | Span 80-type family | 17.5 | 2.8 | 13.4 | 22.2 | 22.8 |
| PEG-2 monostearate | PEG-2 stearate family | 16.8 | 2.1 | 8.8 | 19.1 | 20.0 |
| PEG-8 monostearate | PEG-8 stearate family | 17.2 | 2.1 | 8.9 | 19.5 | 19.7 |
| Laureth-2 | Laureth-2 family | 16.7 | 2.6 | 9.4 | 19.3 | 19.9 |
| Laureth-4 | Laureth-4 family | 16.9 | 2.6 | 9.4 | 19.5 | 19.7 |
| Laureth-7 | Laureth-7 family | 17.1 | 2.5 | 9.3 | 19.6 | 19.6 |
| Steareth-2 | Steareth-2 family | 16.7 | 1.9 | 8.2 | 18.7 | 19.3 |
| Sorbitan monolaurate + 20 EO | Polysorbate 20 / Tween 20-type family | 17.9 | 2.1 | 11.3 | 21.3 | 21.2 |
| Sorbitan monostearate + 20 EO | Polysorbate 60 / Tween 60-type family | 17.8 | 1.9 | 10.8 | 20.9 | 20.9 |
| Sorbitan monooleate + 20 EO | Polysorbate 80 / Tween 80-type family | 17.8 | 1.9 | 10.9 | 20.9 | 20.9 |

## Worked example: glyceryl monostearate

Representative structure: CH3–(CH2)16–COO–CH2–CH(OH)–CH2OH, formula C21H42O4.

Counts: 1 CH3, 18 CH2, 1 CH, 1 ester and 2 adjacent OH.

- V = 33.5 + 18×16.1 − 1.0 + 18.0 + 2×13.0 = **366.3 cm³/mol**.
- ΣFd = 420 + 18×270 + 80 + 390 + 2×210 = **6,170**.
- ΣFp² = 490² + 2×500² = **740,100**.
- ΣEh = 7,000 + 2×20,000 = **47,000 J/mol**.
- Hence (δD, δP, δH) ≈ **(16.8, 2.3, 11.3) MPa½** and δtotal,HVK ≈ **20.4 MPa½**.
- Fedors cohesive energy = **158,760 J/mol**, giving the separate total δFedors ≈ **20.8 MPa½**.

The molecular-weight/estimated-volume ratio is only an implied density for checking plausibility; it is not a density measurement.

## Suggested experimental shortlist

**First matrix: six families with clearly contrasting structures.**

1. **GMS:** baseline long saturated monoester; request a high-monoester specification and actual C16/C18 distribution. Its melting/crystallization behaviour matters independently of HSP.
2. **GMO:** compare against GMS to isolate a saturation/physical-state change at nearly unchanged estimated HSP. Do not conclude equal D or AF lifetime from the similar triplets.
3. **GML:** shorter fatty tail at a larger estimated hydrogen-bond component. Compare activation and wash losses against GMS; molecular size and cohesion change together.
4. **PGMS:** lower estimated hydrogen-bond component than GMS. A useful lower-cohesive-polarity comparator; whether it wets sufficiently at the surface requires an AF test.
5. **Sorbitan monostearate / Span 60-type:** larger polyol head and higher estimated hydrogen-bond component than GMS.
6. **Sorbitan monooleate / Span 80-type:** the unsaturated counterpart to the previous candidate; useful for comparing physical state and processing response.

This is a mechanistic design matrix, not a ranked claim of six proven best performers. For a second round consider **PEG-2/PEG-8 stearate** and a composition-defined **polyglyceryl-2 stearate**. Laureth/Steareth and polysorbates are comparison families to consider only after confirming processing stability, incorporation and the intended delivery route. Being commercially used as a surfactant does not establish suitability for melt incorporation.

### Reading the trends

- δD changes relatively little across these aliphatic families; differences in headgroup density dominate much of the estimated δH variation.
- On the specific selected representations, PGMS, Steareth-2 and PEG-2 stearate are lower-δH comparators. Sorbitan monoesters and GML are higher-δH comparators.
- More EO does not necessarily increase every estimated HSP component monotonically: molar volume also increases, terminal groups are diluted, and the HVK polar term grows as a square root of the sum of squared group increments. **HSP is not HLB**, CMC or a water-solubility measurement.
- GMS/GMO and Span 60/80 have similar estimated triplets. This method is poorly suited to ranking their kinetic differences.
- Good polymer compatibility can improve retention while reducing migration drive; weak compatibility can increase exudation or phase separation. Neither extreme guarantees a useful or durable AF surface.

## Uncertainty and commercial-grade handling

Do not attach a fabricated ± confidence interval. Distinguish three sources:

1. **Method uncertainty:** compare the independent Fedors total with the HVK total, but do not treat their difference as a statistical error bar or their agreement as validation. The methods share group assumptions and the same volume estimate.
2. **Volume uncertainty:** if V is multiplied by f, δD and δP divide by f, while δH divides by sqrt(f). As a sensitivity scenario, +10% in V reduces δD/δP by 9.1% and δH by 4.7%; −10% raises them by 11.1% and 5.4%. These are sensitivity changes, not a claimed uncertainty bound.
3. **Composition uncertainty:** mixed glycerides, sorbitan isomers, polyglycerol oligomers, fatty-chain distributions and EO distributions must be represented as separate structures. Ask the supplier for composition or bounded distributions. A mean EO value is not a unique molecule.

A first approximation for a blend with known composition is volume-fraction weighting of component HSP vectors, using φi = (wi/ρi)/Σ(wj/ρj). The book discusses volume-based mixture parameters in section 7.3.2.1, printed p. 210/PDF p. 237. Extending this to idealized commercial amphiphile blends is only a screening approximation; association, micellization and nonideal mixing can invalidate it. Do not average HLB numbers to manufacture HSP or average the group counts of an unknown proprietary formulation.

For each shortlisted grade request: producer/product identifier; active fraction; chain-length and unsaturation distribution; mono-/di-/triester content; EO or polyglycerol distribution; residual polyol/water; hydroxyl, acid and saponification values; density with temperature and physical state; melting/DSC data; processing-temperature stability; and AF data at the intended layer loadings and exposure conditions. Unknown-composition proprietary AF masterbatches cannot receive a defensible unique molecular HSP from this PDF alone.

Ionic surfactants, ionic salts, silicone-polyethers and chemically unspecified blends are not assigned numerical estimates here: the selected group model/structural information does not support a reliable common treatment of those systems. This exclusion is methodological, not a blanket statement that such families cannot be useful.

## Use in AF Migration Lab

Enter the **HVK triplet**, not the Fedors scalar, in the custom surfactant HSP fields. The JSON accompanying this report is an audit dataset, **not** the app's project-import schema. No presets have been silently replaced.

R₀, the polymer Hansen interaction radius, is not obtained from these surfactant group contributions. Likewise no measured partition coefficient, maximum soluble loading, diffusion coefficient, surface capacity or efficacy threshold is established. The simulator's exp(−β RED²) partition mapping remains an assumption to calibrate with real polymer–surfactant data.

To compare layers use Ra² = 4(δD,p−δD,s)² + (δP,p−δP,s)² + (δH,p−δH,s)² and RED = Ra/R₀,p, with independently supported polymer parameters. Do not interpret a RED computed with the app's illustrative polymer defaults as a verified commercial-grade compatibility result.
