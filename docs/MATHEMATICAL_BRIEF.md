# Base matemática de migración de surfactantes para Sol

## Alcance y grado de certeza

Hipótesis de trabajo pendiente de confirmar: migración de aditivos surfactantes incorporados a una película polimérica con función antivaho (AF). El repositorio `CovinilCodex/Simulador_migraci-n_AF` estaba vacío durante su preparación: no se han observado formulaciones, materiales, datos ni un modelo existente. No atribuir al usuario ningún polímero, surfactante o parámetro concreto.

El objetivo físico sería predecir cuánto aditivo móvil permanece en el film, cuánto llega a cada superficie, cuánto se pierde durante el contacto con agua y cómo evoluciona una propiedad antivaho medida. Estas son variables diferentes. Si AF significa otra cosa, o el sistema es una disolución, una espuma o una emulsión, hay que revisar geometría, fases y mecanismos antes de implementar.

Las ecuaciones de conservación son generales. Fick, Langmuir, Arrhenius y las correlaciones de eficacia son modelos constitutivos con hipótesis y límites; no son leyes universales aplicables sin calibración. No se han consultado fuentes web ni datos específicos del producto para este documento.

## 1. Variables, unidades y geometría

Usar internamente SI y una única base de cantidad para cada especie:

| Símbolo | Significado                                                        | Unidad         |
| ------- | ------------------------------------------------------------------ | -------------- |
| x, h, A | Coordenada transversal, espesor total, área de una cara            | m, m, m²       |
| c(x,t)  | Concentración volumétrica de surfactante móvil en el polímero      | mol/m³ de film |
| b(x,t)  | Concentración inmovilizada o agregada, en equivalentes de monómero | mol/m³ de film |
| D       | Coeficiente de difusión efectivo                                   | m²/s           |
| J       | Flujo molar                                                        | mol/(m²·s)     |
| Γ, Γmax | Inventario superficial y capacidad superficial                     | mol/m²         |
| cw, Vw  | Concentración en agua e inventario volumétrico de agua             | mol/m³, m³     |
| kℓ      | Coeficiente de transferencia a través de una resistencia externa   | m/s            |
| Kpw     | Cociente de equilibrio cp/cw, con ambas concentraciones en mol/m³  | adimensional   |
| T, R    | Temperatura absoluta, constante de los gases                       | K, J/(mol·K)   |

También puede trabajarse en kg/m³ y kg/m², pero deben convertirse consistentemente las ecuaciones de actividad, energía y estequiometría. Para una fracción másica w, densidad del film ρ y masa molar Ms en kg/mol, ctotal ≈ ρw/Ms. Un 1 % es w=0,01; 1 ppm en masa es w=10⁻⁶. Si el aditivo comercial es una mezcla, hacen falta su fracción activa y composición, o definir explícitamente un pseudocomponente másico.

Para una lámina extensa: x∈[0,h]. Es razonable un modelo 1D si los cambios laterales, bordes, gotas y heterogeneidad son despreciables en la escala considerada. Cada cara puede tener condiciones distintas. Una bobina, un film sobre soporte, una laminación o dos caras en contacto requieren condiciones propias; no representan automáticamente dos superficies libres equivalentes.

## 2. Conservación de masa y difusión

Para un dominio fijo, sin movimiento macroscópico:

    ∂c/∂t = −∂J/∂x + r
    J = −D ∂c/∂x

Si D depende de concentración, temperatura o posición:

    ∂c/∂t = ∂x[D(c,T,x,…) ∂xc] + r

No sustituir esa expresión por D∂xxc cuando D no sea constante. Para representar intercambio con una reserva inmóvil:

    ∂c/∂t = −∂xJ − rb
    ∂b/∂t = rb
    rb = kon c(Bmax−b) − koff b

Aquí kon tiene unidades m³/(mol·s) y koff s⁻¹; rb es una hipótesis de unión reversible a sitios, no una descripción universal de agregación. c+b se conserva salvo flujos de frontera o reacciones químicas verdaderas. Si b representa agregados móviles, añadir su propio transporte; contar sus concentraciones en equivalentes de monómero para cerrar la masa. Una degradación real requiere productos o un inventario explícito de material transformado.

La concentración total incorporada no tiene por qué ser la concentración móvil. Solubilidad limitada, cristalización, afinidad por cargas, agregación y envejecimiento pueden separar ambas. La exudación o bloom superficial puede necesitar una fase superficial adicional con espesor o inventario propio; una monocapa de Langmuir no permite almacenar arbitrariamente todo ese exceso.

Condición inicial mínima: c(x,0)=c0(x), b(x,0)=b0(x), Γj(0)=Γj,0 y cw(0)=cw,0. No asumir uniformidad después de extrusión, enfriamiento o almacenamiento sin justificación. Definir el origen temporal y el historial previo.

## 3. Fuerza impulsora termodinámica

La difusión responde al gradiente de potencial químico, no siempre al de concentración:

    μ = μ° + RT ln(a)
    a = γ c/cref
    J = −(Dmob c/RT) ∂xμ

En una fase isoterma con μ° espacialmente constante:

    J = −Dmob[1 + ∂lnγ/∂lnc] ∂xc

El término entre corchetes es el factor termodinámico; el D ajustado a datos de Fick puede incorporar movilidad y no idealidad. Una discontinuidad de μ° entre fases origina partición: no imponer igualdad de concentraciones entre materiales distintos. Con gradientes térmicos o hinchamiento apreciables, esta forma simplificada requiere términos adicionales y una definición consistente del volumen.

En mezclas concentradas, varios surfactantes pueden presentar flujos acoplados. Una formulación general es Ji=−Σj Lij∇(μj/RT), con matriz de movilidad compatible con disipación positiva. No dar a todos los componentes un D independiente y constante si hay evidencia de interacción. Usar Maxwell–Stefan u otra formulación multicomponente solo cuando existan datos que permitan parametrizarla. La separación de fases no se corrige recortando un D negativo: requiere otra descripción termodinámica.

## 4. Fronteras: elegir el mecanismo y fijar los signos

Sea q=J·n el flujo que sale del polímero. En x=0, q=−J(0); en x=h, q=J(h). q puede ser negativo durante la reabsorción.

Casos básicos:

- Cara impermeable o plano de simetría: q=0.
- Sumidero perfecto: cs=0. Solo es una aproximación si la resistencia externa y la acumulación en el receptor son despreciables.
- Transferencia finita sin inventario superficial: q=kℓ(cs−Kpw cw). Aquí kℓ está definido con fuerza impulsora en concentración del polímero. Si se usa q=kw(cs/Kpw−cw), entonces kℓ=kw/Kpw.
- Receptor finito bien mezclado, sin pérdidas: Vw dcw/dt=Σj Aj qj. La concentración aumenta, disminuye la fuerza impulsora y puede detener la extracción.

Si Vw cambia, conservar d(Vw cw)/dt, no Vw dcw/dt. Para flujo continuo con caudal Q, añadir Q(cin−cw). Si hay varios líquidos o caras, usar receptores separados salvo que compartan físicamente el mismo baño. Para resistencia difusiva importante en el agua, resolver también su campo de concentración o justificar un coeficiente de transferencia.

## 5. Superficie con almacenamiento y lavado: modelo recomendado para empezar

En cada cara j introducir Γj y una cinética reversible polímero–superficie:

    qps,j = ka,j cs,j(Γmax,j−Γj) − kd,j Γj
    J·nj = qps,j
    dΓj/dt = qps,j − qsw,j

ka tiene unidades m³/(mol·s), kd s⁻¹. Estas expresiones suponen sitios equivalentes, una especie y capacidad finita. Sin lavado, en equilibrio:

    Γeq = Γmax KL cs / (1 + KL cs),    KL = ka/kd

KL tiene unidades m³/mol. Es distinto de Kpw, la partición polímero–agua.

Durante un lavado diluido con readsorción despreciable puede ensayarse:

    qsw = kwash Γ
    d(Vw cw)/dt = Σj Aj qsw,j + Q(cin−cw)

kwash tiene unidades s⁻¹ y resume una desorción/extracción efectiva bajo condiciones concretas. Para un baño finito cercano al equilibrio, una opción reversible es:

    qsw = kdw Γ − kaw cw(Γmax−Γ)

con kdw en s⁻¹ y kaw en m³/(mol·s). Los parámetros de los dos intercambios reversibles deben ser compatibles con el mismo equilibrio: si comparten sitios y las actividades se aproximan por concentraciones, (ka/kd)cp=(kaw/kdw)cw en equilibrio. No ajustar esas constantes y Kpw como restricciones independientes incompatibles.

En seco se puede comenzar por qsw=0. La pérdida al aire no debe añadirse como extracción arbitraria si el compuesto es prácticamente no volátil. Durante condensación puede ser necesario modelar área mojada, volumen de gotas, crecimiento, escurrido y renovación del agua. Un baño homogéneo solo aproxima esas condiciones.

No aplicar simultáneamente una frontera de extracción directa y atribuir todo ese mismo flujo al inventario superficial: contaría dos veces la misma transferencia. Si existen rutas directas y rutas a través de Γ, definirlas como flujos distintos y conservar la masa de ambas.

Para una cara con varias especies que compiten por una capacidad común, un primer modelo puede usar θi=Γi/Γmax,i y disponibilidad 1−Σiθi. Esa competencia debe respetar las áreas moleculares; la suma de concentraciones molares sin ponderación no siempre representa ocupación superficial.

## 6. Balance global obligatorio

Para área constante A y dos caras con esa misma área:

    Mfilm = A ∫₀ʰ(c+b) dx
    Msuperficie = A(Γ0+Γh)
    Magua = Vw cw

En un sistema cerrado sin transformación:

    Mfilm + Msuperficie + Magua = Mtotal,0

En un sistema con entradas y salidas, añadir los inventarios acumulados: Mfilm+Msuperficie+Magua+Msalido−Mentrado debe permanecer constante. Al desechar un baño, transferir su contenido a Msalido antes de reiniciar cw. En multicapa, sumar la integral de cada capa. No sumar mol/m² a mol sin multiplicar por área.

Controlar el residuo de este balance en cada paso temporal. La tolerancia debe justificarse con la escala física y la convergencia; un valor pequeño por cancelación no demuestra precisión en perfiles o picos de flujo.

## 7. Temperatura, polímero y estructura

Una primera dependencia térmica frecuente es:

    D(T) = Dref exp[−Ea/R (1/T−1/Tref)]

Ea se expresa en J/mol y las temperaturas en kelvin. Ea>0 implica D creciente con T. Dref y Ea deben estimarse en un intervalo con mecanismo y morfología comparables. Transiciones vítreas, fusión, recristalización, plastificación por agua o cambios de solubilidad pueden invalidar la extrapolación. WLF o volumen libre pueden ser alternativas cerca de determinadas transiciones, pero necesitan calibración propia.

La cristalinidad, orientación, densidad, tortuosidad, tamaño molecular, interacción aditivo–polímero y humedad afectan a D y/o a la concentración móvil. Si la concentración está definida por volumen amorfo en vez de volumen total, incorporar esa fracción en almacenamiento y flujos. No usar una corrección universal D∝1−cristalinidad sin validación. Si D ya es efectivo para una morfología, evitar corregir dos veces el mismo efecto.

En multicapa resolver una ecuación por capa. En una interfaz ideal sin almacenamiento:

    Jizq = Jder
    cder = Kder/izq cizq

Las concentraciones pueden saltar; el flujo se conserva. Si hay resistencia interfacial finita, sustituir el equilibrio instantáneo por una relación cinética. No imponer ambos como condiciones independientes. Un promedio aritmético de D entre capas no reproduce, en general, ni las resistencias en serie ni la partición.

## 8. Escalas y grupos adimensionales

Para una distancia característica ℓ:

    tD ≈ ℓ²/D
    Fo = Dt/ℓ²
    Bi = kℓ ℓ/D

En una lámina simétrica con dos caras expuestas puede tomarse ℓ=h/2; con una sola cara expuesta y la otra sellada, ℓ=h. tD es una escala, no el tiempo exacto para un porcentaje dado. Bi≫1 favorece control por difusión interna; Bi≪1 favorece control por transferencia externa, bajo la frontera lineal indicada.

Para relajación superficial a cs aproximadamente constante:

    τs = 1/(ka cs + kd)
    razón de escalas = tD/τs

Esa razón es un diagnóstico local; puede cambiar al agotarse cs. Otras razones útiles:

    capacidad superficial / carga inicial = Ncaras Γmax/(c0 h)
    capacidad del baño / capacidad del film = Vw/(Kpw Vp)

La segunda presupone partición lineal, un único receptor y almacenamiento superficial despreciable. Ayuda a decidir si el baño puede aproximarse como sumidero.

Ejemplo exclusivamente ilustrativo: h=50 μm, dos caras expuestas, D=10⁻¹⁴ m²/s. Entonces ℓ=25 μm y tD≈62 500 s≈17,4 h. No es un valor recomendado de D. Multiplicar h por 2 multiplica esa escala por 4 si el resto no cambia.

## 9. Soluciones de referencia para validar la implementación

Caso A: lámina de espesor TOTAL h, c(x,0)=c0 uniforme, D constante, sumidero perfecto en ambas caras, sin Γ, reacciones ni partición:

    M(t)/M0 = (8/π²) Σ[n=0..∞] exp[−(2n+1)²π²Dt/h²]/(2n+1)²
    F(t) = 1 − M(t)/M0

M(t) es la masa remanente dentro del film y F la fracción liberada. A tiempos cortos:

    F(t) ≈ (4/h) √(Dt/π)

Esta aproximación es válida mientras no se solapen significativamente las zonas de agotamiento de ambas caras. No usarla hasta F≈1. A tiempos largos domina n=0. Una serie truncada puede representar mal t=0: establecer el estado inicial exactamente o usar una referencia suficientemente convergida.

Caso B: una cara sumidero y otra impermeable, mismo espesor h. La expresión de masa es la anterior con h reemplazado por 2h. El tiempo característico del modo lento es cuatro veces mayor.

Caso C: lámina sellada con c0 uniforme: c debe permanecer uniforme y la masa constante. Si el perfil inicial no es uniforme, debe relajarse conservando masa.

Caso D: film y baño finitos cerrados, sin almacenamiento superficial, partición lineal y equilibrio completo:

    cw,∞ = Mtotal,0/(Vw + Kpw Vp)
    cp,∞ = Kpw cw,∞

Con adsorción superficial, añadir Σj Aj Γeq,j a la ecuación de masa y resolver el equilibrio, normalmente no lineal. Verificar tanto el equilibrio como el transitorio de los modelos implementados.

## 10. Migración no equivale directamente a eficacia antivaho

La función antivaho depende de la humectación y de la morfología del agua condensada, además de la presencia del surfactante. Para una superficie ideal en equilibrio, la relación de Young es:

    γSV − γSL = γLV cosθ

No determina θ a partir de Γ sin conocer cómo cambian las tensiones interfaciales. El surfactante puede modificar varias de ellas, disolverse en la gota y causar histéresis o humectación dinámica. La relación de adsorción de Gibbs, bajo sus hipótesis y a T constante,

    dγ = −Σi Γi dμi

ayuda a relacionar actividad y tensión interfacial, pero no es una equivalencia universal entre carga superficial y rendimiento óptico.

Definir una salida observable: ángulo de contacto bajo protocolo fijo, cobertura por película continua de agua, transmitancia, haze, puntuación antivaho o tiempo hasta fallo. Si se propone un umbral Γcrit o una curva E=f(Γ,…), debe ajustarse a ensayos. No presentar Γmax ni Γcrit como constantes del surfactante independientes del polímero y del protocolo.

Considerar tres escalas de desempeño: activación inicial, persistencia durante exposición húmeda y recuperación durante secado. El reabastecimiento desde el interior puede restaurar Γ después del lavado, pero reduce la reserva total; una Γ temporalmente alta no garantiza vida útil larga. El exceso superficial también puede empeorar transparencia, tacto, adhesión u otras propiedades: no presuponer eficacia monótona con la dosis.

## 11. Si el sistema principal es acuoso

La CMC corresponde a un medio, temperatura y composición concretos. No trasladar automáticamente una CMC acuosa a un polímero. Por encima de la CMC, distinguir concentración total, monómero y micelas; la actividad del monómero no aumenta necesariamente de forma proporcional a la concentración total.

Un modelo acuoso puede necesitar advección–difusión de monómeros y agregados, cinéticas de micelización y adsorción, y transporte superficial. Con velocidad v en una fase incomprensible:

    ∂tc + v·∇c = ∇·(D∇c) + r

En una interfaz fija, la ecuación superficial incluye ∂tΓ+∇s·(Γvs)=Ds∇s²Γ+jads−jdes. Para interfaces móviles incorporar los términos geométricos correspondientes. Gradientes de tensión superficial producen esfuerzos de Marangoni y pueden acoplar el transporte al flujo; el signo del balance de esfuerzos depende de la convención de normales. Ninguno de estos efectos debe añadirse al film sólido sin una necesidad física demostrada.

## 12. Estrategia numérica y controles

Recomendación inicial: volúmenes finitos 1D, conservativos, y método de líneas con integrador implícito BDF o Radau para las ecuaciones acopladas del film, superficie y agua. La adsorción rápida y la difusión lenta pueden crear rigidez. En una misma fase con D discontinuo positivo, calcular flujos mediante resistencias de las medias celdas; para celdas iguales esto conduce al promedio armónico. Si además hay partición, incluirla explícitamente en el flujo interfacial.

Usar el MISMO flujo de frontera, con signo opuesto, en el balance del film y en la ecuación de la superficie o del receptor. No recalcular dos versiones inconsistentes. Mantener c≥0, cw≥0 y 0≤Γ≤Γmax. La integración implícita genérica no garantiza por sí sola estas cotas. Evitar corregir resultados recortando concentraciones, porque eso puede crear o destruir masa; investigar discretización, tolerancias y tamaño de paso.

Para Euler explícito con difusión 1D uniforme y D constante, Δt≤Δx²/(2D) es el límite clásico de estabilidad; la cinética y las fronteras pueden exigir más. Ser estable no equivale a ser preciso. Crank–Nicolson puede oscilar con pasos grandes cerca de transitorios abruptos.

Validaciones necesarias antes de confiar en resultados:

1. Balance de masa y unidades de todos los términos.
2. Casos analíticos aplicables del apartado 9.
3. Convergencia al refinar malla y tolerancias/paso temporal; comparar masa, Γ, flujo y tiempo hasta umbral.
4. Límites físicos: D pequeño, frontera impermeable, transferencia rápida, baño finito, adsorción reversible y saturación.
5. Ciclos húmedo–seco con balance explícito de cada baño retirado.
6. Sensibilidad e incertidumbre en parámetros; separación entre fallo del solver y mala concordancia experimental.

## 13. Datos y estimación de parámetros

Datos mínimos que Sol debe solicitar o localizar antes de dar predicciones cuantitativas:

- Estructura y espesor de cada capa, densidad, área y caras expuestas.
- Polímero, historia térmica, cristalinidad u otra información morfológica disponible.
- Surfactante o composición de la mezcla, carga activa, masa molar si se usa base molar y fracción móvil cuando se conozca.
- Temperatura, humedad, duración y secuencia de almacenamiento y exposición.
- Medio receptor, volumen, agitación/caudal, pH, sales y renovación.
- Medidas de masa extraída frente a tiempo y, si existen, concentración superficial, perfiles de profundidad y ensayos de humectación/óptica con protocolo.

Una única curva de extracción suele no identificar D, partición, resistencia externa, capacidad superficial y cinética simultáneamente. Diseñar contrastes: varios espesores para comprobar la escala h²; varias temperaturas para Ea; cargas iniciales para detectar saturación/no idealidad; volúmenes y agitación para separar partición de transferencia; medidas superficiales para distinguir acumulación de pérdida. La dependencia con espesor es diagnóstica, no una prueba aislada, porque la fabricación también puede cambiar la morfología.

Una función objetivo básica es Σk[(yk,modelo−yk,obs)/σk]², con σk consistente con la incertidumbre de cada medición. Ajustar parámetros positivos en escala logarítmica; emplear límites físicos y comprobar identificabilidad mediante perfiles de verosimilitud, bootstrap o inferencia bayesiana según los datos. No mezclar mediciones de distinta unidad sin escalarlas ni tratar datos correlacionados como réplicas independientes. Validar con condiciones reservadas, fuera del ajuste.

No usar energías de activación, coeficientes de difusión o umbrales inventados como datos del material. Si faltan medidas, mostrar escenarios claramente etiquetados y rangos de sensibilidad. Las bandas de incertidumbre no compensan un mecanismo incorrecto ni justifican extrapolación fuera del dominio calibrado.

## 14. Orden de implementación recomendado

1. Difusión 1D con D constante; fronteras selladas y sumideros; verificar soluciones y conservación.
2. Transferencia finita y baño finito; verificar el equilibrio de partición.
3. Sustituir o ampliar la frontera con almacenamiento superficial conservativo cuando haya evidencia o se necesite modelar AF.
4. Añadir ciclos húmedo–seco y la salida experimental de eficacia.
5. Introducir temperatura, multicapa, reserva inmóvil o mezclas solo cuando el caso físico y los datos lo requieran.

No activar todos los mecanismos a la vez con parámetros libres. La primera versión útil debe explicar qué hipótesis usa, conservar masa, reproducir casos de referencia y mostrar claramente qué parámetros se midieron, ajustaron o asumieron. No presentar su salida como certificación de aptitud para contacto alimentario; si ese es un objetivo, requiere simulantes, protocolos, límites y condiciones normativas específicos.

## Bibliografía de base para contrastar el modelo

Referencias generales conocidas, no una revisión bibliográfica específica del producto ni fuentes consultadas en esta sesión:

- J. Crank, _The Mathematics of Diffusion_, 2.ª edición, 1975: soluciones de difusión y geometrías de referencia.
- R. B. Bird, W. E. Stewart y E. N. Lightfoot, _Transport Phenomena_, 2.ª edición, 2002: balances, transporte y resistencias.
- M. J. Rosen y J. T. Kunjappu, _Surfactants and Interfacial Phenomena_, 4.ª edición, 2012: adsorción, actividad, micelización y tensiones interfaciales.
- J. N. Israelachvili, _Intermolecular and Surface Forces_, 3.ª edición, 2011: interacciones y fenómenos superficiales.
- A. F. H. Ward y L. Tordai, “Time-Dependence of Boundary Tensions of Solutions I. The Role of Diffusion in Time-Effects”, 1946: adsorción dinámica limitada por difusión en sistemas acuosos; no trasladar directamente al film polimérico.
