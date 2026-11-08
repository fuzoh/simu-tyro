# Petzl MAESTRO S (et L) : seuil de glissement, charge de travail, rupture

Accès : 2026-11-08. Question ([#64](https://github.com/fuzoh/simu-tyro/issues/64)) : que publie Petzl, pour le MAESTRO S, comme seuil de glissement du bloqueur, charge de travail, charge de rupture, diamètres de corde admis et conditions ? Idem pour le MAESTRO L si publié.

Sources lues, toutes de Petzl :

- fiche produit [MAESTRO S](https://www.petzl.com/INT/en/Professional/Descenders/MAESTRO-S) et [MAESTRO L](https://www.petzl.com/INT/en/Professional/Descenders/MAESTRO-L) (version INT/en, lue le 2026-11-08) ;
- [notice technique MAESTRO](https://www.petzl.com/on/demandware.static/-/Sites-petzl-master-catalog/default/dw40b8ec5e/media/product/technical-notice-MAESTRO-2_068bK00000r4gmvQAA.pdf), référence D0003200K (280725), 29 pages, une seule notice pour S et L, lue avec `pdftotext` ; les planches (pages 1 à 6) sont des images, lues à l'écran ;
- astuce technique [Static and dynamic tests on the MAESTRO](https://www.petzl.com/US/en/Professional/Static-and-dynamic-tests-on-the-MAESTRO) ; le tableau est une image SVG de la page, lue à l'écran ;
- astuce technique [Tensioning a tyrolean with MAESTRO, I'D, RIG](https://www.petzl.com/us/en/professional/tech-tips/basic-techniques/tensioning-a-tyrolean-with-maestro-id-rig/MAESTRO-Pe12-TensionTyrolienne_PRO_a775I0000008OIyQAM.html).

## Synthèse

Le « 250 kg » n'est **pas un seuil de glissement**. C'est la **charge de travail** (working load limit) du MAESTRO S avec une corde de 10,5 à 11,5 mm, soit une masse portée (une ou deux personnes). Petzl publie un seuil de glissement distinct, mesuré en laboratoire, en **kN** : de **8,5 kN à plus de 11 kN** selon la corde, **10,7 kN** sur AXIS 11 mm. Ce seuil est donné « à titre d'information », pour appareil et corde neufs.

Le MAESTRO est un **descendeur** avec poulie bloqueuse intégrée (« Descender with integrated progress-capture pulley », notice §1), type C selon EN 12841. Ce n'est pas une poulie bloqueuse seule.

## MAESTRO S : chiffres publiés

| Grandeur | Valeur | Nature, condition | Source |
| --- | --- | --- | --- |
| Charge avant glissement, Petzl AXIS 11 mm | **10,7 kN** | essai statique, traction lente, mesure = charge à laquelle la corde commence à glisser dans l'appareil | astuce « tests », tableau MAESTRO S |
| idem, Petzl PARALLEL 10,5 mm | 9,5 kN | idem | idem |
| idem, Sterling HTP 3/8" 10 mm | 8,5 kN | idem | idem |
| idem, Teufelberger KMIII 11,5 mm | 10,3 kN | idem | idem |
| idem, Bluewater Specstat 7/16" 11,5 mm | > 11 kN | idem, borne inférieure seulement | idem |
| Charge de travail | 250 kg | corde 10,5 à 11,5 mm | fiche produit ; notice p. 2 (pictogramme « 250 kg max », deux personnages) |
| Charge de travail | 150 kg | corde de 10 mm ; la fiche écrit « 10 to 11.5 mm rope », la notice p. 2 écrit « ∅ 10 mm » (un personnage) | fiche produit ; notice p. 2 |
| Charge de travail | 272 kg | corde 11 mm NFPA General Use certifiée | fiche produit seulement |
| Charge d'utilisation maxi (EN 341) | 180 kg | Petzl DURALINE 10,5 mm et Petzl AXIS 11 mm, descente maxi 200 m | notice p. 2 |
| Charge de rupture | « 18 kN x 2 = 36 kN » | libellé tel quel sur la fiche ; la fiche ne dit pas à quoi se rapportent les deux 18 kN | fiche produit |
| Diamètres de corde admis | 10,5 mm min, 11,5 mm max | plage de la fiche ; corde EN 1891 type A au pictogramme de la notice | fiche produit ; notice p. 2 |
| Charge minimale | 30 kg | | notice, liste EN 341 de la section « Field of application » |
| Rendement, rendement de hissage | 86 % ; F = 1,16 M | mesuré avec la corde de plus petit diamètre admise | notice §7 |
| Normes | CE EN 12841 type C, CE EN 341, NFPA 2500 General Use et Technical Use, ANSI Z359.9, ANSI Z459.1 | | fiche produit |
| Masse | 1100 g | | fiche produit |

## MAESTRO L : chiffres publiés

| Grandeur | Valeur | Source |
| --- | --- | --- |
| Charge avant glissement, Petzl VECTOR 12,5 mm | > 11 kN | astuce « tests », tableau MAESTRO L |
| idem, Teufelberger KMIII 13 mm | > 11 kN | idem |
| Charge de travail | 280 kg, corde 12,5 à 13 mm | fiche produit ; notice p. 2 |
| Charge d'utilisation maxi (EN 341) | 200 kg, Petzl VECTOR 12,5 mm, descente maxi 200 m | notice p. 2 |
| Charge de rupture | « 18 kN x 2 = 36 kN » | fiche produit |
| Rendement | 81 % ; F = 1,24 M | notice §7 |
| Diamètres admis | 12,5 mm min, 13 mm max | fiche produit |
| Normes | CE EN 12841 type C, EN 341, NFPA 2500 General Use | fiche produit |

Pour le L, aucune valeur exacte de seuil de glissement : seulement « > 11 kN ».

## Conditions et réserves publiées par Petzl

- Essais « en laboratoire, avec des appareils neufs et des cordes neuves certifiées aux normes en vigueur ». Les résultats sont « donnés à titre d'information » et peuvent différer avec des appareils ou cordes usés, ou d'autres types de corde (astuce « tests »).
- La notice dit que le blocage et le freinage « vary depending on the condition of the rope and the conditions of usage (e.g. diameter, wear, dirt, moisture, rain, ice) » (§3, « During use ») et que les cordes neuves sont souvent glissantes (§9). Aucun chiffre de seuil de glissement corde mouillée, gelée, sale ou usée n'est publié dans les sources lues.
- Pictogramme B de la notice : un temps humide (pluie, embruns, condensation) combiné au froid (sous 0 °C) peut gêner le bon fonctionnement. Pas de valeur associée.
- La notice dit que le MAESTRO ne convient pas à un système antichute et que toute surcharge dynamique peut endommager la corde (§10).
- Aucun diamètre ou matériau de corde hors des plages ci-dessus n'est donné comme admis. Le S est annoncé avec une corde de 10 mm uniquement pour 150 kg.

## Ce que Petzl dit de la tyrolienne

Astuce « Tensioning a tyrolean with MAESTRO, I'D, RIG » :

- Les descendeurs sont conçus pour une charge d'une ou deux personnes ; les tensions atteignables en tyrolienne dépassent souvent leurs charges de travail normales. Aucune norme ne couvre la tyrolienne, donc elle n'est pas dans la notice.
- Les charges mesurées restent sous les seuils d'endommagement des ancrages, de la corde et des descendeurs, mais « dans certains cas » les descendeurs sont devenus impossibles à débloquer. Petzl conseille d'éviter la sur-tension : une tension de moins de 2 kN (une personne sur un mouflage 3:1) dans la plupart des cas.
- Pour I'D et RIG, le déblocage devient difficile au-delà de 5 kN. Cette phrase ne nomme pas le MAESTRO.
- Essais de chute sur tyrolienne de 14 m, corde AXIS 11 mm et VECTOR 12,5 mm : « During lab tests on the MAESTRO, slippage was measured starting at 10.7 kN on AXIS and more than 11 kN on VECTOR. » Toutes les chutes ont été retenues. Pas de glissement observé avec des valeurs inférieures à 10 kN ; Petzl écrit qu'avec une chute plus dure ou une corde plus statique, il y aurait aussi glissement dans le MAESTRO.
- Avertissement de Petzl : le glissement de la corde dans l'appareil ne doit pas être considéré comme un moyen d'absorber l'énergie d'une chute ; il n'est pas calibrable et varie avec l'appareil ou la corde usés, mouillés, sales. Les éléments du système utilisés lors de ces chutes sont à retirer.
- Un nœud d'arrêt n'est pas nécessaire au bon fonctionnement si le descendeur est bien installé ; Petzl le présente comme précaution supplémentaire.

## Réponse à la question

- **Seuil de glissement publié** : oui, pour S et L, mais dans l'astuce technique « Static and dynamic tests on the MAESTRO », pas dans la notice ni sur la fiche produit. S : 8,5 à plus de 11 kN selon corde, 10,7 kN sur AXIS 11 mm. L : plus de 11 kN. Conversion arithmétique, non publiée par Petzl : 10,7 kN vaut environ 1090 kgf.
- **La valeur « 250 kg »** est une charge de travail, pas un glissement. Elle borne la masse suspendue, non la tension de corde. La notice ne la relie à aucune tension de corde.
- **Non publié** : seuil de glissement corde mouillée, gelée ou usée ; seuil du S sur AXIS en conditions autres que neuf ; sens exact de « 18 kN x 2 ».
- **Pour l'étiquette de provenance de #5** : chaque chiffre ci-dessus se rattache à une source précise (fiche produit, notice D0003200K, astuce « tests »). Les trois natures sont distinctes : charge de travail en kg, charge avant glissement en kN, charge de rupture en kN.
