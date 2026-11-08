# Relevés du dynamomètre, essai du 2026-11-01

Trois enregistrements bruts (`*.CSV`) du dynamomètre posé sur la corde du bas, et un notebook
d'analyse. Contexte et notes de terrain : [constats de l'essai](https://github.com/fuzoh/simu-tyro/issues/1#issuecomment-6695729571).

## Format des CSV

En-tête de 13 lignes (adresse de l'appareil, date `jj.mm.aa`, heure de début, `LogNo`, `Unit=kN`,
`Mode=ABS`, `RelZero`, `Speed=10` échantillons/s, `Trig`, `Stop`, `Pre` secondes de pré-déclenchement,
`Catch` et `Total` en secondes), puis une valeur par ligne en kN, à 10 Hz. Fins de ligne CR LF.

| Fichier | Début (heure appareil) | Durée | Contenu |
| --- | --- | --- | --- |
| `16_03_43.CSV` | 16:03:43 | 4 min 35 | deux passages |
| `16_18_22.CSV` | 16:18:22 | 32 min 08 | deux passages, un plateau d'environ 2,1 kN pendant ~12 min |
| `16_50_30.CSV` | 16:50:30 | 6 min 26 | un passage, puis la rampe d'une retension |

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
