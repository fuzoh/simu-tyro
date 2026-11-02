# Déplacement latéral d'une ligne sous vent de travers

Ticket : [Déplacement latéral de la ligne sous le vent](../issues/08-deplacement-lateral.md)
Branche : `research/deplacement-lateral`
Accès aux sources : 2026-11-02
Périmètre : banane statique d'un brin tendu. Pas la traînée du passager, pas la vitesse.

## Décision

Une spec peut affirmer la **forme** du déplacement latéral d'un brin à vide, acier ou textile, sous vent uniforme : la ligne souple bascule dans le plan de la charge résultante (poids + vent), et le déport horizontal est la projection de la flèche de ce plan. Elle ne peut pas affirmer un nombre de mètres, un `Cd` de corde textile, un couloir EN 15567, ni la garde au sol avec passager. Ces trois-là restent qualitatifs, ou des entrées étiquetées.

Le moteur vertical actuel suffit pour la banane **à vide**, en réutilisant la chaînette dans le plan incliné puis en projetant. Il ne suffit pas dès qu'un passager pend sous la ligne : la charge ponctuelle est verticale, le vent est latéral, le brin n'est plus dans un seul plan.

## Ce que le dépôt dit déjà

`docs/simulation-theory.md` §8.4 : la traînée sur le câble et le blow-out latéral sont **hors v1** (modèle plan vertical). §16 point 13 les laisse ouverts, « needed for EN compliance ». Le couloir latéral et la vitesse de vent de calcul EN 15567 sont `[PAYWALLED]`. Les chiffres de [R1 B12] (« ≥ 2,0 m, couloir 1,0 → 1,5 m à 28,3 m/s ») sont `[UNVERIFIED:R1]` : research-two ne les a pas trouvés dans le texte primaire (§11). Ne pas les shipper.

`docs/references/algo simulation tyrolienne.md` le dit en une ligne : le rapport couvre le plan vertical 2D ; le vent latéral n'est qu'une extension. `docs/references/tyrolienne sur cable.md` mentionne un tirant d'air latéral, sans formule.

## Modèle que les sources portent

### Plan de la charge résultante

Un conducteur tendu, sous poids et vent, **pivote dans un plan** autour de la corde entre appuis. Wang et al. (2026), *J. Phys.: Conf. Ser.* 3328 012004, §2.1 : « the conductor performs an overall planar swing around the connecting line of two suspension points during wind deflection ». Le calcul statique usuel est l'équilibre vent / poids ; à tension plus haute, le déport diminue (même article, conclusion 2). Ce n'est pas une mesure de tyrolienne. C'est le mécanisme des lignes aériennes, écrit pour un conducteur.

Đokić, Vladić et Jojić (2026), *Engineering TODAY*, DOI `10.46793/ET26.A11DJ`, l'appliquent à une tyrolienne acier longue (Fruška Gora, corde Fatzer Integra 16 mm). Ils calculent l'angle de balancement et le déport :

- charge résultante `q_r = sqrt(q_kv² + q_kh²)`
- `tan α_r = q_kh / q_kv`
- déport max `b_u = f_max · sin α_r`

Exemples chiffrés du papier, hors service, portée dont la longueur de pente est 1430 m : 26,7 m sans glace (`f_max = 52,7 m`, `α_r = 27,8°`) et 56,5 m avec glace (`f_max = 85,9 m`, `α_r = 41,1°`). Ce sont des résultats **de leur cas**, pas des constantes.

La flèche parabolique sous charge uniforme est la forme classique des lignes aériennes. Kampik, Kubek, Krupanek et Bogacz (2024), *Energies* 17, 2967, DOI `10.3390/en17122967`, éq. (6) : `f_i = a_i² w_2 / (8 A_c σ_2)`, soit `f = w L² / (8 H)` si `H = A_c σ`. Le vent entre comme un changement de charge linéique dans l'équation d'état, pas comme un module séparé.

**Identité déduite** de ces deux relations, pas une clause de norme : si `f_max` est la flèche dans le plan résultant et `sin α = q_h / q_r`, alors, parabole, `H` constant, portée de niveau,

`b_milieu = q_h L² / (8 H)`.

Le poids disparaît du déport horizontal. Il ne disparaît pas de l'angle, ni de la flèche verticale. Hypothèses : brin parfaitement souple, vent uniforme le long de la portée, charge de vent horizontale et perpendiculaire au plan des ancrages, ancrages fixes en latéral, pas de rigidité de flexion, pas de charge ponctuelle hors de ce plan.

La chaînette élastique du moteur actuel est le même problème dans ce plan, avec `w` remplacé par `q_r` et une projection. La parabole de Kampik sous-estime moins bien les longues portées inclinées : leur texte dit que l'erreur devient trop grande et qu'il faut alors la chaînette. Pour 416 m, préférer la chaînette déjà codée, et garder `b = f sin α` comme lecture du résultat, pas comme formule à coder à part.

### D'où vient `q_h`

Force linéique = pression dynamique × coefficient × diamètre. Trois textes, trois jeux de coefficients. Aucun n'est une mesure sur corde textile.

| Source | Ce qui est écrit | Statut |
| --- | --- | --- |
| Đokić et al. 2026, citant EN 12930:2015 | `F_w = q · c_f · A_ref`. En service, `q` minimum 0,25 kN/m² ; hors service, 1,20 kN/m², réduit avec la longueur de pente (`β` de 1,00 à 0 m jusqu'à 0,50 au-delà de 2000 m). Ils posent `c_f = 1,2` et `q_v = 250 · 1,2 · 0,016 = 4,8 N/m` en service. | **Citation secondaire d'une norme payante.** Le PDF de la norme n'a pas été lu. `c_f = 1,2` n'a pas de numéro d'article dans leur texte. Ne pas figer 1,2. |
| Đokić et al. 2026, citant EN 12929-1:2015+A1 | Le déport latéral se calcule avec une pression réduite `q'`. En service `q = 0,20 kN/m²`, hors service `1,20 kN/m²`, puis `(l*'/l*)²`. | Même réserve : extrait rapporté, clause non relue. |
| Dua, Clobes, Höbbel et Matsagar (2015), *Open J. Civ. Eng.*, DOI via SCIRP `ojce_2015112416175946` | EN 50341, charge conducteur `F_c = q_c G C_c d L cos² θ`. `G = 0,75` si portée < 200 m, `0,45 + 60/L` si > 200 m. `θ` : angle entre le vent et les consoles, selon leur paraphrase. `C_t = 2,8` est donné pour les pylônes treillis, **pas** pour le conducteur. | Secondaire. Le `cos² θ` dit qu'un vent à 45° de la normale ne pousse pas comme un vent de travers plein. La définition exacte de `θ` est celle de la norme, non relue. |
| Wang et al. 2026, éq. (6) | `F_dw = 0,625 α μ_sc d (v_r)² × 10⁻³`, `d` en mm. `μ_sc` est un coefficient de forme laissé en paramètre. `0,625 v² × 10⁻³` est la pression `v²/1600` du code chinois, pas une mesure. | Primaire pour la forme « pression × forme × diamètre ». `μ_sc` non chiffré dans l'article. |

EN 1991-1-4 est la base que Đokić attribue à EN 12930 pour `F_w = q c_f A_ref`. Le tableau des `c_f` de cylindre n'a pas été retrouvé en texte ouvert ici. Reynolds d'une corde de 11 mm à 50 km/h est bas (`V d / ν ~ 10⁴`) : on est dans la zone où un cylindre lisse a un `c_f` d'ordre 1, pas 0,1. Ce n'est pas une valeur à coder.

### Acier et textile

La géométrie (plan incliné, `b = f sin α`) ne dépend pas de la famille. Elle dépend de `H`, de `q_h` et du poids linéique.

- **Acier.** Le seul cas tyrolienne lu de bout en bout est Đokić et al. 2026 : corde clos ou compactée, normes téléphériques EN 12930 et EN 12929, pas EN 15567. Eux-mêmes écrivent qu'EN 15567 vise les tyroliennes courtes de parcours acrobatique, et qu'une longue portée se rapproche plutôt d'un téléphérique — en prévenant que coller le téléphérique donne des charges de glace et de vent trop dures pour une tyrolienne d'été. Leur déport de 26,7 m est un hors-service sur 1430 m, pas le week-end.
- **Textile.** Aucune source primaire lue ne donne un `Cd` ou un `μ_sc` de corde gainée (EN 1891, Bandit, ou autre). Le diamètre extérieur n'est pas le diamètre d'un cylindre lisse. Un `c_f` acier ne se transfère pas. Pour une spec textile, `q_h` ou `c_f` est une **entrée étiquetée** `[CONVENTION]` ou `[UNVERIFIED]`, jamais un défaut silencieux.

Deux brins porteurs : rien dans ces sources sur le masquage aérodynamique ni sur le couplage par le chariot. Le modèle lu est **un brin**. Une paire exposée n'est pas « le même calcul avec `2d` ».

## Ce qui casse le plan unique

1. **Passager.** Poids vertical ponctuel + vent latéral réparti : le brin quitte le plan. Impollonia, Ricciardi et Saitta (2011), *Int. J. Solids Struct.* 48, 1268–1276, DOI `10.1016/j.ijsolstr.2011.01.007`, traite des charges ponctuelles 3D sur une chaînette élastique. Le PDF n'a pas été lu (accès Elsevier). On ne cite que le sujet, via Crossref. Ce n'est pas un modèle de vent réparti. La garde sous passager par vent de travers n'est pas une projection de la banane à vide.
2. **Ancres fixes.** Si `H` n'est pas tenu par un contrepoids, le vent allonge le brin et `H` monte. Il faut résoudre, pas appliquer `L²/8H` avec le `H` sans vent. Đokić distingue les deux (éq. 6–7 contrepoids, éq. 8–10 ancres fixes).
3. **Vent non perpendiculaire.** L'essai dit « côté / avant à 45° », sans azimut par rapport à la corde. Dua et al. rapportent un facteur `cos² θ` dans EN 50341. Sans direction relative à la portée, le déport n'est pas calculable. La spec doit prendre un vecteur vent, et n'utiliser pour la banane que la composante normale à la corde.
4. **Rafale, turbulence, galop.** Wang et al. opposent le statique (équilibre) au dynamique (spectre, amortissement). Dua et al. comparent EN 50341 statique et un vent turbulent : le statique ne borne pas toujours la dynamique. Une banane « de calcul » est un équilibre sous charge uniforme, pas le maximum d'une rafale de 50 km/h.
5. **Glace.** Dans les normes téléphériques citées par Đokić, glace et vent se combinent et dominent le hors-service. Hors sujet pour un essai d'été, à ne pas mélanger avec la banane constatée.

## Ordre de grandeur, pas un calage

Arithmétique de l'identité `b = q_h L² / (8 H)`, `L = 415,9 m`, `V = 50/3,6 m/s`, `q_h = ½ ρ C_d d V²`, `ρ = 1,225 kg/m³` (niveau de la mer, convention ISA, pas une mesure du site), `C_d = 1,2` **uniquement comme le `c_f` posé par Đokić, non vérifié**, `d = 11 mm`.

| `H` | `b` milieu, vent de travers plein |
| --- | --- |
| 2 kN | 17 m |
| 4 kN | 8 m |
| 8 kN | 4 m |
| 20 kN | 1,7 m |

« Plusieurs mètres » est l'ordre de grandeur d'une corde fine peu tendue. Ce n'est pas une prédiction : `H`, `C_d`, la densité à ~1400 m, et l'angle réel du vent manquent. Un câble acier très tendu sur la même portée tombe vers 1–2 m dans ce tableau, ou moins si `H` est plus haut. Le constat de terrain ne discrimine pas le modèle. Il dit seulement qu'un résultat de quelques mètres n'est pas absurde.

## Ce qu'une spec peut écrire

**Affirmable, avec les hypothèses au-dessus, brin unique, ligne à vide :**

- déport latéral `b(x) = f_plan(x) · sin α`, `tan α = q_h / q_v` ;
- `q_h` calculé depuis une pression ou un `½ ρ C_d d V_n²`, `C_d` saisi et étiqueté ;
- direction du vent relative à la corde obligatoire ; seule la composante normale entre dans `q_h` ;
- acier et textile partagent la géométrie ; ils ne partagent pas `C_d` ;
- si les ancres sont fixes, recalculer `H` dans le plan incliné (chaînette déjà là) avant de projeter ;
- afficher le déport comme indicateur, pas comme verdict. Le couloir EN 15567 n'est pas connu.

**Interdit tant qu'une source primaire n'est pas lue :**

- 1,0 m / 1,5 m / 28,3 m/s, et tout numéro d'article EN 15567 sur le vent ;
- `c_f = 1,2` ou `q = 0,25 kN/m²` comme défaut normatif (extraits non relus) ;
- un `C_d` Bandit ou EN 1891 ;
- la garde passager, le déraillement de poulie, le ballant, comme sortie de ce modèle ;
- deux brins, masquage, rafale.

**Qualitatif, à dire dans l'UI si le modèle tourne :** vent uniforme, brin souple, pas de passager dans le plan, `C_d` non confirmé, pas une attestation de couloir.

## Sources lues

- Đokić, R., Vladić, J., Jojić, T. (2026). Analysis of zipline systems with large spans and low inclination angles. *Engineering TODAY*, DOI 10.46793/ET26.A11DJ. PDF : `https://www.et.kg.ac.rs/wp-content/uploads/2026/09/et2026-a11.pdf`, lu le 2026-11-02.
- Kampik, M., Kubek, P., Krupanek, B., Bogacz, R. (2024). Sag and Tension Calculations for High-Voltage Overhead Line Conductors. *Energies* 17(12), 2967. DOI 10.3390/en17122967. PDF MDPI lu le 2026-11-02. Éq. (6).
- Wang, L., Yue, Y., Li, Y., Zhang, S. (2026). Equivalent dynamic model for wind deflection of transmission lines under wind-sand loads. *J. Phys.: Conf. Ser.* 3328, 012004. DOI 10.1088/1742-6596/3328/1/012004. PDF IOP lu le 2026-11-02.
- Dua, A., Clobes, M., Höbbel, T., Matsagar, V. (2015). Dynamic Analysis of Overhead Transmission Lines under Turbulent Wind Loading. *Open Journal of Civil Engineering*. PDF SCIRP `ojce_2015112416175946` lu le 2026-11-02. Éq. (4), paraphrase d'EN 50341.
- Contrat local : `docs/simulation-theory.md` §8.4, §11, §16.13. Pas une source du modèle.

## Non lu, donc non utilisé comme preuve

- EN 15567-1, EN 12929-1, EN 12930, EN 50341, EN 1991-1-4 : payants ou non récupérés. Les nombres qui en viennent ci-dessus sont des citations de Đokić ou de Dua.
- Impollonia et al. 2011 : titre et DOI seulement (Crossref).
- Irvine, *Cable Structures* (1981) : cité par le dépôt, livre non ouvert ici.
- Aucune fiche Cordeau / Bandit, aucun essai en soufflerie de corde gainée.
