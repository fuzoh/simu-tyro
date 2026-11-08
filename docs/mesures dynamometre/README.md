# Relevés du dynamomètre, essai du 2026-11-01

Trois enregistrements bruts (`*.CSV`) du dynamomètre posé sur la corde du bas, et un notebook
d'analyse. Contexte et notes de terrain : [constats de l'essai](https://github.com/fuzoh/simu-tyro/issues/1#issuecomment-6695729571).

## Format des CSV

En-tête de 13 lignes (adresse de l'appareil, date `jj.mm.aa`, heure de début, `LogNo`, `Unit=kN`,
`Mode=ABS`, `RelZero`, `Speed=10` échantillons/s, `Trig`, `Stop`, `Pre` secondes de pré-déclenchement,
`Catch` et `Total` en secondes), puis une valeur par ligne en kN, à 10 Hz. Fins de ligne CR LF.

L'heure de l'appareil est l'heure locale ([#68](https://github.com/fuzoh/simu-tyro/issues/68)).

| Fichier | Début (heure locale) | Durée | Contenu |
| --- | --- | --- | --- |
| `16_03_43.CSV` | 16:03:43 | 4 min 35 | un passager suspendu 2 min, pic 2,16 kN, pose 1,52 → 1,40 kN |
| `16_18_22.CSV` | 16:18:22 | 32 min 08 | un passager suspendu 17 min 32 (plateau ~2,1 kN), pic 2,38 kN, pose 1,26 → 1,13 kN |
| `16_50_30.CSV` | 16:50:30 | 6 min 26 | suite du précédent (coupé à 16:50:29) ; un passager, pic 2,09 kN, fichier coupé en charge |

Aucune retension n'apparaît dans les enregistrements : elles ont été faites hors enregistrement.

## Lancer le notebook

```sh
cd "docs/mesures dynamometre"
uv run jupyter lab analyse.ipynb
```

`uv` crée l'environnement (`.venv`, ignoré par git) à partir de `pyproject.toml`. Pour une
exécution sans interface :

```sh
uv run jupyter nbconvert --to notebook --execute --inplace analyse.ipynb
```

## Note de lecture

Ce que ces relevés valident, et ce qu'ils n'autorisent pas à conclure, a été tranché dans
[Lecture des relevés du dynamomètre : ce que l'essai valide](https://github.com/fuzoh/simu-tyro/issues/69),
à partir des faits de [Paramètres factuels de l'essai](https://github.com/fuzoh/simu-tyro/issues/68)
et de la météo de [#67](https://github.com/fuzoh/simu-tyro/issues/67).

- **Ce qui est mesuré.** Un LineScale 3i placé entre l'ancrage haut (départ) et le Maestro, sur la
  ligne du bas seulement : c'est la tension à l'ancrage de cette ligne, pas la tension totale de la
  tyrolienne. Deux lignes Courant Bandit 11 mm, passagers d'environ 95 kg.
- **Statique sous charge : cohérent, pas validé.** Pour la pose mesurée, le moteur prédit un pic de
  2,0 à 2,6 kN selon le partage entre lignes ; les pics mesurés (2,1 à 2,4 kN) tombent entre le
  partage 50/50 et le cas où la ligne du bas porte tout. Le moteur est donc cohérent en ordre de
  grandeur ; le partage 50/50 n'est pas validé, la ligne du bas a porté plus de la moitié.
- **Perte de pose : un ordre de grandeur, observé une fois.** 0,1 à 0,15 kN par passage, environ
  0,35 kN entre 16:04 et 16:57 sans retension. Rien n'en est calculé ; la Page Avancé le cite
  tel quel, en texte, sous « Pourquoi on retend » ([#104](https://github.com/fuzoh/simu-tyro/issues/104)).
- **L'arrêt vers 60 % n'est pas un fait de vent.** Le repos statique du passager sans vent est à
  55–57 % de la ligne : l'essai ne teste rien du modèle de vent. Le vent ressenti (de face, à
  droite) et la bise mesurée à La Frétaz (nord-est, droite-arrière) sont consignés sans arbitrage.
- **Statut.** Annexe de terrain, telle quelle. Ni source de formules (`docs/references/`), ni jeu de
  test du moteur : on figerait un partage entre lignes qui n'est pas validé.

Le tracé de la ligne cité dans l'introduction du notebook est le profil de cadrage (415,9 m) ; le
tracé vérifié (435,2 m, départ au point haut, point bas 1 368,1 m, azimut ≈312°) est
`trace-geoadmin-2026-11-08.csv` dans ce dossier, export map.geo.admin.ch du 2026-11-08 au format
d'import de l'application, aussi joint à [#68](https://github.com/fuzoh/simu-tyro/issues/68).
