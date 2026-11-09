# Vérification — vent en vallée (issue #120)

Date d’accès : 2026-11-09. Rapport automatique relu intégralement : `/tmp/simu-vent-vallee.md` (interaction `ChA0MjE4OWQ0ZDM4MjUzYzY0EAgaAjJjKgRtYWlu`, agent `deep-research-preview-04-2026`, backend vertex, horodaté 2026-11-09T19:01:34+01:00).

Décision servie : issue GitHub #120, « Ecoulement du vent le long de la corde » — le vent est aujourd’hui uniforme le long de la corde ; faut-il une grandeur type facteur Q, centrée sur la portée, pour moduler l’effort ? Texte d’issue lu via `gh issue view 120` (lecture seule). Moteur actuel : `src/lib/sim/wind.ts` projette un vent unique sur A→B ; aucune variation le long de la portée.

Aucun fichier du dépôt n’a été modifié.

## Sources lues (texte intégral ou page primaire)

| Source | URL exacte consultée | Ce qui a été lu |
| --- | --- | --- |
| Fernando et al., 2019, *Bull. Amer. Meteor. Soc.*, 100(5) | PDF éditeur via DTU Orbit : https://backend.orbit.dtu.dk/ws/portalfiles/portal/183625409/bams_d_17_0227.1.pdf — DOI https://doi.org/10.1175/BAMS-D-17-0227.1 | `pdftotext` intégral (`/tmp/simu-src/perdigao.txt`). Version of record. Couverture DTU : pages 799–820 ; Crossref : 799–819. |
| Menke et al., 2019, *Atmos. Chem. Phys.*, 19, 2713–2723 | https://acp.copernicus.org/articles/19/2713/2019/acp-19-2713-2019.pdf — DOI https://doi.org/10.5194/acp-19-2713-2019 | PDF intégral. |
| Rotach et al., 2015, *Front. Earth Sci.*, 3:76 | https://www.frontiersin.org/articles/10.3389/feart.2015.00076/pdf — DOI https://doi.org/10.3389/feart.2015.00076 | PDF intégral. Revue, pas la campagne Riviera 2004. |
| Weigel et Rotach, 2004, *Q. J. R. Meteorol. Soc.*, 130, 2605–2627 | DOI https://doi.org/10.1256/qj.03.214 — résumé Crossref uniquement | Résumé intégral. **Pas le PDF.** |
| Rotach et al., 2004, *Bull. Amer. Meteor. Soc.*, 85(9), 1367–1386 | DOI https://doi.org/10.1175/BAMS-85-9-1367 | Bibliographie Crossref + résumé Semantic Scholar. **Pas le PDF** (mur AMS ; UBC `http://hdl.handle.net/2429/33855` bloqué par un challenge bot). |
| Doran, Fast et Horel, 2002, *Bull. Amer. Meteor. Soc.*, 83(4), 537–551 | DOI qui résout : https://doi.org/10.1175/1520-0477(2002)083%3C0537:TVC%3E2.3.CO;2 | Bibliographie Crossref seulement. **PDF non obtenu** (accès fermé, Semantic Scholar `CLOSED`). |
| AMS Glossary | https://glossary.ametsoc.org/wiki/Froude_number ; https://glossary.ametsoc.org/wiki/Dividing_streamline ; https://glossary.ametsoc.org/wiki/Valley_wind ; https://glossary.ametsoc.org/wiki/Katabatic_wind | Définitions HTML, 2026-11-09. Copyright AMS : ne pas republier le texte au-delà de la citation nécessaire. |
| NASA Glenn, Drag Equation | https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/ | Équation et phrase sur l’aire de référence. Pédagogique, pas un essai de câble. |

Accès refusé ou inutile : `journals.ametsoc.org` (WAF 403/202), `orbit.dtu.dk/files/...` (challenge Cloudflare ; le miroir `backend.orbit.dtu.dk/ws/portalfiles/portal/...` a fonctionné), MDPI et DORA (403), elib DLR 124216 (entrée retirée / 401), OpenSky et ADS (405/302 vides).

## Erreurs factuelles du rapport automatique

1. **DOI VTMX faux.** Le rapport donne `10.1175/1520-0477(2002)083<0537:TVTAMX>2.3.CO;2`. Crossref : 404. Le DOI qui résout est `...0537:TVC>2.3.CO;2`, Doran, Fast, Horel, BAMS 83(4), 537–551, avril 2002. Les affirmations « pp. 539–541 », « découplage hermétique », inversion de plusieurs centaines de mètres : **non vérifiées** (texte non lu). Ne pas les citer comme établies.
2. **Riviera 2004, pages et preuve MOST.** Crossref : 1367–**1386**, pas 1367–1383. Le résumé Semantic Scholar décrit une campagne et des questions ouvertes sur les paramétrisations d’échange, pas une réfutation définitive de Monin–Obukhov à la p. 1373. Les renvois p. 1373 et p. 1375 sont **non vérifiés**.
3. **Perdigão, Figure 11.** Faux. Dans le PDF éditeur, la Fig. 11 (page de revue 811, mai 2019) montre des nuages bas et une couche de brouillard, pas une inversion de direction. La recirculation observée est la **Fig. 7**, pages 808–809 : zone de recirculation sous le vent de la première crête, cisaillement surélevé, puis (Fig. 7d) poche d’air quasi stagnant dans la vallée. DLR et DTU sont bien dans la campagne (légende Fig. 8 : lidars OU/CLAMPS, DTU, DLR). Ce point-là du rapport est correct ; la figure et les pages ne le sont pas.
4. **±30° « rigoureusement » observé à Perdigão.** Absent du PDF. La seule occurrence de « 30° » pertinente est « exceeding 30°C » (température). Ne pas utiliser 30° comme angle d’incidence de calcul.
5. **Seuil de décollement 15–20°.** Aucune source dans le rapport. Absent de Fernando 2019 et de Menke 2019. Menke cite Wood (1995) pour une « certaine pente », sans chiffre. **Non établi.**
6. **I_u = 30–40 % « très souvent », et sous-estimation 40–60 %.** Contradiction interne : la formule écrite par le rapport, `1 + I_u²`, donne +9 % à I_u = 0,30 et +16 % à I_u = 0,40, pas 40–60 %. Menke, cas du 5 mai 2017, 16:30–16:40 UTC : intensité turbulente **12 %** sur la crête au vent et **31 %** sur la crête sous le vent (soniques à 100 m), pas une constante de rotor de vallée. Hausse moyenne annoncée de 7,8 points de pourcentage en flux de sud-ouest avec recirculation (crête sous le vent vs crête au vent) — ce n’est pas 40 %.
7. **« Scénario Q / Bell » comme famille de modèles masse-consistants.** Aucun modèle de ce nom dans les sources lues. T. M. Bell est un coauteur de Fernando et al. 2019. Le « Q » vient de l’issue (analogie EQ). Nomenclature **non fondée**.
8. **Coûts** (anémomètre 5–10 k€, LiDAR 20–50 k€/mois, 6–12 mois, 10–50 millions de cellules) : aucun devis ni source. Ne pas reprendre.
9. **Inégalités strictes toujours vraies.** Faux. `⟨Ū⟩² ≤ moyenne de Ū² ≤ moyenne de (Ū²+σ²)`, avec égalité si le profil est spatialement constant, puis si σ = 0. Cauchy–Schwarz / Jensen, pas une découverte de campagne.
10. **Fr < 1 = abri parfait, Fr > 1 = plongée.** Trop binaire. Voir ci-dessous.

## Ce que les sources lues disent vraiment

### Perdigão — Fernando et al. 2019 (observé)

- Site : deux crêtes quasi parallèles, vent climatologique plutôt perpendiculaire. Menke : dénivelé vallée–crête **environ 200 m**, distance crête–crête **1,4 km**. Fernando : espacement inter-crêtes cité **1 500 m** pour un cas d’onde. Ce n’est pas l’échelle d’une portée de 50 m.
- Deux familles : circulation thermique (anabatique / catabatique, up-valley / down-valley ; renvoi à Whiteman 1990, non relu) et écoulement forcé par le synoptique. Le synoptique **n’a pas à suivre** la circulation thermique. La circulation thermique n’apparaît que si le synoptique est faible. Ce n’est pas « la direction en vallée est toujours l’axe, indépendamment du synoptique ».
- Paramètre utilisé : **G = N h / U** (Baines 1998), inverse du Fr du rapport. G > 1 : non-linéarité. G < 1 : ondes de relief et bulle de séparation allongée — **pas un abri calme**. G ≈ 1 : ondes résonantes. G > 1 : rotors près de la surface et déferlement possibles. Blocage amont pour **G > 2**, présenté comme analogue 2D de la dividing streamline. Aucune valeur critique unique : pour la ventilation de crête, la fourchette citée est **0,5–2,3**, et « a consistent critical value has not emerged ».
- MOST : « the flow and fluxes were strongly horizontally inhomogeneous, and thus the use of Monin–Obukhov framework could not be justified. » Phrase locale à Perdigão, pas une preuve page 1373 de Rotach 2004.
- Askervein est le cas de colline plus simple que Perdigão prolonge. Bolund est dans la bibliographie (Berg et al., 2011) et discuté par Menke comme escarpement, pas comme vallée. Ne pas transposer un speed-up de crête au creux : cette limite est juste dans son principe, et elle est appuyée par ces textes. Elle n’autorise pas un profil de remplacement.

### Perdigão — Menke et al. 2019 (chiffres)

- Recirculation = écoulement inverse **> 0,5 m s⁻¹**. Pour un vent perpendiculaire aux crêtes : **52 %** des scans (55 % SO, 49 % NE). Plus fréquent au-dessus de **8 m s⁻¹** à 100 m au-dessus des crêtes, **moins** fréquent en stable. Ce n’est pas « stable ⇒ rotor, instable ⇒ plongée ».
- Même vallée, transects différents : **69 %** vs **32 %** de probabilité. Un profil transversal unique n’existe pas sur ce site.
- Cas fort, 5 mai 2017 : vent 10,4 m s⁻¹ de 254°. Zone de recirculation longue de **807 m**, jusqu’à **192 m** au-dessus du fond, au-delà du centre de vallée. Inverse jusqu’à **1,8 m s⁻¹**, soit **17 %** du vent incident — pas un vent égal et opposé. Vitesse à 100 m sur la crête sous le vent réduite de **50 %** ; I de 12 % à 31°.
- WAsP / modèles linéarisés : Menke dit qu’ils ne capturent pas bien ces effets en terrain complexe. Ce n’est pas « seule la CFD LES couplée LiDAR est opérationnellement valide pour une poignée de simulateur ».

### Riviera — ce qui est lu, et seulement cela

- Weigel et Rotach 2004, résumé : jours convectifs, système de vent de vallée marqué ; dans la moitié sud, le jet up-valley est **décalé vers le versant est**, pas centré. Circulation secondaire liée à la **courbure** de l’axe. Flux de surface très variables d’un site à l’autre ; le TKE se met à l’échelle avec les flux **de pente**, pas avec ceux situés à l’aplomb du profil. Cisaillement cross-valley fort. Donc un « creux ou bosse au centre » symétrique n’est pas le profil observé de cette vallée.
- Rotach et al. 2015 (lu) : le cadre linéarisé Jackson et Hunt (1975), Hunt et al. (1988) vise des **collines basses** (épaisseur de couche limite ≪ demi-largeur). Les vents de vallée thermiques sont d’échelle méso-β (20–200 km), up-valley le jour / down-valley la nuit. Les vents de pente sont une couche de pente. La circulation cross-valley n’est symétrique que dans les simulations idéalisées ; **pas nécessairement en réalité** (citation explicite de Weigel et Rotach, 2004). Sous très stable, en bassin ou dépression, le cadre de similarité turbulent « no longer holds » (discussion de Mahrt, 2014) — affirmation qualifiée, pas « les profils log n’existent tout simplement pas dans toute vallée raide ».

### Glossaire AMS (définitions institutionnelles, pas des mesures de tyrolienne)

- Fr classique : V / √(g L), ou sa racine selon les auteurs. Pour un obstacle stratifié, **U / (N h)** est parfois appelé Fr. Le glossaire dit que cet usage n’est pas cohérent avec la définition classique ; certains préfèrent **N h / U**.
- Dividing streamline : si ce Fr < 1, H_c = H (1 − Fr). L’air sous H_c contourne ; l’air au-dessus passe. Ce n’est pas un couvercle qui isole toute la vallée dès que Fr < 1. Perdigão, sur le terrain, refuse un seuil unique.
- Valley wind (glossaire) : seulement la brise **montante de jour** le long de la vallée. Pas un profil transversal.
- Katabatique : couche souvent de l’ordre de 10–100 m, maximum à quelques mètres ou dizaines de mètres au-dessus de la pente, épaisseur typique citée ≈ 0,05 fois la dénivelée de la pente ; vitesses souvent 3–4 m s⁻¹, parfois > 8 m s⁻¹ sur longues pentes. Une corde haute au-dessus du versant peut être **hors** de cette couche.

### Traînée — NASA Glenn, lu

`D = Cd · ρ · V² · A / 2`. Le coefficient et l’aire de référence sont inséparables. La page dit que Cd dépend de la forme, de l’incidence, de la viscosité et de la compressibilité. Elle ne donne ni Cd de câble toronné, ni ρ alpin, ni la forme vectorielle `|u_n| u_n`.

## Équations retenues (dérivation, pas un résultat de campagne)

Hypothèses à écrire dans le code si on les utilise : ρ, Cd et le diamètre de référence constants ; U composante **normale** qui ne change pas de signe ; fluctuation de moyenne temporelle nulle. Sinon, ne pas développer U².

```text
f = (1/2) ρ Cd d |u_n| u_n          # N par mètre de corde exposée ; hypothèse de traînée normale
# si U > 0 partout et u_n = U e :
F_moyen_temps(x) = (1/2) ρ Cd d [ Ū(x)² + σ_u(x)² ]
                 = (1/2) ρ Cd d Ū(x)² (1 + I_u(x)²)    # I_u = σ_u/Ū, Ū ≠ 0
⟨Ū⟩ = (1/L) ∫_0^L Ū(x) dx
⟨Ū⟩²  ≤  (1/L) ∫ Ū² dx  ≤  (1/L) ∫ (Ū² + σ²) dx
```

Le premier écart est la variance spatiale de Ū. Le second est la moyenne spatiale de σ². Les deux sont nuls si le vent est uniforme et non turbulent. **Aucun pourcentage universel.**

Exemples numériques (4 chiffres significatifs), pour un test, pas pour un site :

- Ū = 10,00 m s⁻¹ partout, I_u = 0,3000, σ² = 9,000 m² s⁻². Charge moyenne / charge de la moyenne = 1,090. Écart +9,000 %, pas +40 %.
- I_u = 0,4000 → rapport 1,160 (+16,00 %).
- Moitié de portée à 0, moitié à 20,00 m s⁻¹, sans turbulence : ⟨Ū⟩ = 10,00, moyenne de Ū² = 200,0, rapport 2,000. Scénario imposé, pas une loi de vallée.
- Moitié à +10, moitié à −10 : moyenne signée nulle, moyenne de U² = 100,0, et l’intégrale de |U|U peut s’annuler tout en laissant des charges locales opposées. Un scalaire moyen masque le cisaillement.

ρ = 1,225 kg m⁻³ est l’air standard au niveau de la mer. Ne pas le figer pour une vallée alpine.

## Profil de vallée : justifiable ou non

**Non justifiable comme loi, même par défaut :**

- plus calme au centre, ou plus fort au centre, déduit du seul MNT ou d’un z(x) le long de A–B ;
- transfert du speed-up de crête (Askervein, Jackson–Hunt) au creux ;
- interpolation vectorielle entre les deux ancrages (peut fabriquer un zéro au milieu d’un cisaillement ou d’un rotor) ;
- commutateur Fr < 1 / Fr > 1 sans N, U et H mesurés, et même avec eux le seuil n’est pas unique ;
- facteur correctif 1,4–1,6, I_u = 0,40, incidence ±30°, rafale de crête imposée au fond, moitié de portée inversée « parce que Perdigão ».

**Justifiable comme scénario déclaré, sans pouvoir prédictif :**

- vent uniforme : scénario de saisie, **pas** une enveloppe conservative (déjà la position de `docs/references/equilibre spatial vent.md`, confirmée ici) ;
- si une poignée est voulue pour l’issue : amplitude **signée** A et largeur Q, multiplicateur le long de l’abscisse réduite ξ = x/L, **défaut A = 0**. Le signe de A n’est pas donné par la littérature. La charge doit être calculée avec le vent **local** (`|u|u`), jamais avec le carré de la moyenne spatiale ;
- une telle poignée décrit un scénario utilisateur. Elle n’acquiert pas de valeur physique parce qu’elle ressemble à un Q d’égaliseur.

Échelle : à Perdigão la recirculation mesurée fait des centaines de mètres de long et ~200 m de haut. Une portée de 50 m peut être entièrement dans un seul régime ; une portée de l’ordre du kilomètre peut en traverser plusieurs, sans forme universelle. Le terrain du moteur (`z` le long de A–B seulement) ne suffit pas à choisir.

CFD micro-échelle + LiDAR + profils thermiques : voie de **prévision de site** décrite par Fernando et Menke, coûteuse, et encore conditionnelle à la stabilité et au type de temps. Ce n’est pas le livrable de la poignée #120, et ce n’est pas « la seule voie » pour un scénario déclaré.
