# Revue — bilan énergétique quasi-statique (commit 6bada50)

Revue READ-ONLY de `docs/references/equilibre spatial vent.md` §§2, 5 et 7, recoupée sur `src/lib/sim/dynamics.ts`, `sweep.ts`, `catenary.ts`, `loads.ts`, `src/lib/scenario/dynamics.ts`, Mungan & Lipscombe 2011 (PDF USNA, note 1 lue sur la page) et Jojić, Vladić & Đokić 2025 (PDF, éq. 8–18 et §3 ADAMS). `/tmp/simu-dynamique-validation.md` n’est pas une source. Aucun changement du dépôt.

**Aucun défaut mathématique démontré** dans les affirmations contrôlées. Détail et limites ci-dessous. Ne pas ajouter `−dV_ligne/ds` à l’EDO actuelle : ce terme n’est la bonne réduction que si la ligne est esclave de l’équilibre statique, hypothèse précisément caduque quand le quasi-statique est inadéquat.

## Ce qui a été vérifié

### Énergie élastique, `EA` constant, coordonnée matérielle

Loi codée (`catenary.ts`, `dx/dS = H/T + H/EA`, `dz/dS = V/T + V/EA`) : `λ = |dr/dS| = 1 + T/EA`, déformation d’ingénieur `ε = λ − 1`, tension conjuguée `T = EA ε`. Le travail virtuel interne d’un élément matériel est `T δλ dS` (`dS` non étiré). La densité dont la dérivée en `λ` est `T` est

```text
W = ∫ T dλ = (EA/2)(λ − 1)² = T²/(2 EA)
```

donc `U_él = ∫_0^{L₀} T(S)²/(2 EA) dS`, y compris avec charge ponctuelle (saut de `V`, `T` bornée, intégrale coupée en `S_P`). Ce n’est pas une énergie de Green-Lagrange. La formule du §5, `∫ T²/(2EA) dS`, est celle de la loi actuelle. Intégrer en longueur étirée `λ dS` serait faux pour cette conjugaison.

### Énergie gravitationnelle de la ligne

`S` non étiré, `w` poids par mètre non étiré (`V(S) = V₀ + w S` dans `catenary.ts`). Avec `z` vers le haut, `μ₀ = w/g` et `U_g = ∫ μ₀ g z(S) dS = ∫ w z dS`. Le §2 pose `μ = μ₀/λ` par conservation de masse : le couple correct est `μ₀` avec `dS`, pas `μ` avec `dS`. Le passager reste hors de cette intégrale (`m g z` séparé). Les signes `+mgz` et `+∫ μ₀ g z dS` sont cohérents ; le mélange `−MgZ` / `+μgZ` du rapport automatique n’est pas repris.

Cohérence locale du §2, relue sur le code : `q₀ = (0,0,−w)` donne `dV/dS = w` ; `P_ext = (0,0,−P)` donne le saut `F_z(S_P⁺) − F_z(S_P⁻) = +P`, comme `verticalTensionAt` (`s > s_P`). Une composante horizontale ponctuelle saute `H` ; Mungan ne couvre que le poids vertical (éq. 1 : `T cos θ` continu).

### Rail fixe

`s` abscisse curviligne du lieu, `sin θ = dz/ds`, `z` vers le haut, sans dissipation : `m dv/dt = −m g sin θ` implique `d/dt(½mv² + mgz) = 0`. L’intégrateur (`dynamics.ts`, `sin[i] = dz/length` de la polyligne `ridePath`, `a = −g sin`) conserve cette quantité du **passager sur chemin figé**. Le test `dynamics.test.ts` (« ½mv² at the arrival is m·g·Δz ») encode le cas départ au repos ; il n’a pas été relancé ici.

### `v/c` et ce qu’il ne garantit pas

Note 1 de Mungan, lue sur le PDF : « slowly » = accélération négligeable **et** `v ≪ √(T_min L / m)`, `T_min` là où l’angle avec l’horizontale est le plus petit (éq. 2 : `T cos θ` constant, donc `T` minimal quand `|θ|` est minimal). Avec `μ = m/L` (câble inextensible), cela s’écrit `√(T_min/μ)`. Aucun coefficient 0,2 ni 0,3 dans les 4 pages. Le §5 reprend les deux conditions et le refus du seuil. Le `0,2` de `DYNAMICS.quasiStaticLimit` est une convention interne (`dynamics.ts`, commentaire : erreur au-dessus non publiée).

Un petit `v/c` ne garantit pas :

- l’absence de transitoires (pose de charge, freinage, temps de vent contre période propre) — le §5 le dit ;
- que l’EDO figée conserve l’énergie de la ligne — paragraphe suivant et ligne « EDO sans pertes » du tableau §7 ;
- le critère de Mungan tel quel dans le moteur : `quasiStaticRatio` utilise `T = H/cos θ` **locale au chariot**, `θ` pente de corde **côté aval** (`sweep.ts`, `atan2(V, H)` avec `s = sD`, saut non inclus), et `μ = w/g = μ₀` (`scenario/dynamics.ts`). Comme `T_locale ≥ T_min`, `max|v|/c_locale ≤ max|v|/√(T_min/μ₀)`. Le rapport moteur peut donc être **plus petit** que le rapport de Mungan. Pour la loi extensible, la célérité de corde tendue est `√(T/μ)` avec `μ = μ₀/λ`, soit `√(T λ/μ₀)`, pas `√(T/μ₀)`. Le §5 ne prétend pas que le moteur calcule `T_min` ni la correction en `λ` : ce n’est pas une erreur de la note, c’est une limite de ce que `v/c` affiché ne dit pas.

### Lieu du chariot et tangente de corde

Jojić 2025 : `γ` pente du **lieu** (continue ; éq. 9, dérivée de la trajectoire statique), `α` pentes de **corde** discontinues au chariot ; éq. 10 propose `γ = (α_l + α_r)/2`, qui n’est la tangente d’aucun des deux brins. L’EDO (18) utilise `sin γ`, pas `sin α`. ADAMS : trajectoire **imposée** (« predetermined trajectory », expression (1) importée), conclusion limitée aux **faibles inclinaisons**. Pas une validation du câble déformable. Le §5 est exact.

Dans le moteur, l’EDO lit la polyligne `(xD, zD)` ; `step.theta` ne sert qu’à `T = H/cos θ` pour `v/c`. Les trois angles diffèrent dès qu’il y a un coude. Contrôle fermé, limite lourde de Mungan (deux segments droits, ancrages de niveau, `L = 100`, `S = 102`, milieu) : pentes de corde `±11,36°`, pente du lieu `0`, moyenne de Jojić `0`. La moyenne peut approcher le lieu ; elle n’est pas une tangente de segment. Remplacer `θ` de l’EDO par `step.theta` serait une autre erreur.

### Diagnostic `ΔV_ligne` et formulation réduite

Sur le chemin figé, l’EDO conserve `½mv² + mgz`, pas `½mv² + mgz + V_ligne`. `V_ligne(s) = ∫ μ₀ g z(S;s) dS + ∫ T²/(2EA) dS` évalué sur les équilibres du balayage n’y entre pas. Le §5 et la ligne §7 « ne valide pas : énergie du câble mobile » sont cohérents. La hauteur du passager sur le lieu capte le fait qu’il roule plus bas ; elle ne capte pas l’énergie stockée ou rendue par la ligne. Comparer `|ΔV_ligne|` à `m g |Δz|` mesure l’écart entre l’EDO figée et le modèle réduit quasi-statique, pas l’écart au câble dynamique.

Réduction lagrangienne, **seulement** si la forme est l’équilibre à la position `s`, ancrages fixes, énergie cinétique de ligne négligée, `s` abscisse du lieu :

```text
m dv/dt = −dΠ/ds = −m g sin θ_lieu − dV_ligne/ds
Π = m g z_passager + V_ligne
```

Théorème de l’enveloppe : à l’équilibre, `dΠ/dS_P = m g (∂z/∂S)_corde`, donc

```text
dV_ligne/ds = m g [(∂z/∂S)_corde · dS_P/ds − sin θ_lieu]
```

Le terme manquant n’est **pas** le remplacement de `θ_lieu` par la tangente de corde (`dS_P/ds ≠ 1/λ`, et le coude a deux tangentes). Il est nul pour une ligne sans masse et inextensible (`V_ligne → 0` si `T²/(2EA) → 0`). Il ne restaure ni l’inertie de ligne, ni les ondes, ni le freinage, ni une rafale : dès que `v` n’est pas `≪ c` ou qu’un transitoire est excité, la forme n’est plus l’équilibre du balayage, et `−dV_ligne/ds` calculé sur ce balayage est une force fausse. Le §5 refuse la correction silencieuse. C’est la position cohérente. Ne pas l’imposer.

Contrôles arithmétiques du §7 : `52,7 sin(27,8°) = 24,579` (pas `26,7`) ; `85,9 sin(41,1°) = 56,469`. Transformation d’ancrages du §2 pour `Δr = (L,0,h)`, `q₀ = (0, q_h, −w)` : `h_∥ = h w/√(w²+q_h²)`, `L_⊥ = √(L² + h² q_h²/(w²+q_h²))`, recalculée, exacte. Hors du bilan d’énergie, non contredite.

## Constats

Aucun défaut démontré (critique, haut, moyen, bas) sur les points demandés.

## Not verified

- Tests `dynamics.test.ts` / `sweep.test.ts` non relancés (écriture d’artefacts interdite). La conservation est lue sur l’intégrateur et le test, pas ré-exécutée.
- Irvine 1981, Bersani 2016 (PDF 403 dans la note dynamique), Wang & Rega, Jojić 2023 *Arch. Appl. Mech.* : non ouverts. Aucune équation n’en est reprise comme preuve.
- Célérité d’une chaînette avec flèche (Irvine) : non dérivée. Le `√(T/μ)` cité est celui de Mungan (corde, `T cos θ` constant), pas une formule d’onde de câble pesant extensible.
- `ΔV_ligne` n’a pas été chiffré sur un balayage du dépôt : la note demande de le quantifier avant de réutiliser l’EDO comme modèle couplé, elle ne donne pas de seuil. Pas de lacune démontrée, pas de nombre inventé ici.
- Le rapport `/tmp/simu-dynamique-validation.md` n’a pas été utilisé. La note dynamique `/tmp/simu-dynamique-verification.md` a servi de piste, chaque formule retenue a été re-dérivée ou lue sur PDF/code.
