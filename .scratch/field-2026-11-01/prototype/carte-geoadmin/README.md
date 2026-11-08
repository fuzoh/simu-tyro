# PROTOTYPE jetable — carte geo.admin, ancrages, profil, rose des vents, 3D

Répond au ticket [Prototype carte geo.admin et rose des vents (#63)](https://github.com/fuzoh/simu-tyro/issues/63).
Hors de l'application, aucune dépendance au code de `src/`. À ne jamais fusionner dans `main`.

## Lancer

```sh
cd .scratch/field-2026-11-01/prototype/carte-geoadmin
bunx serve .          # ou : python3 -m http.server 3000
```

Puis ouvrir `http://localhost:3000/` (carte 2D) ; le lien « vue 3D → » ouvre `3d.html` avec les mêmes ancrages.
Les librairies (MapLibre GL JS 5, CesiumJS 1.130) sont chargées depuis un CDN : il faut le réseau, de toute façon
indispensable pour les tuiles.

## Ce que ça montre

| Question du ticket | Où | Service geo.admin |
| --- | --- | --- |
| Fond de carte dans une SPA | `index.html`, sélecteur | tuiles vecteur `vectortiles.geo.admin.ch/styles/*.vt/style.json` (MapLibre natif) et WMTS raster XYZ 3857 |
| Placer / déplacer les deux ancrages | marqueurs A et B glissables | — (état local, hash d'URL) |
| Profil altimétrique depuis deux points GPS | glisser-déposer → profil redessiné | REFRAME REST `wgs84tolv95` puis `api3.geo.admin.ch/rest/services/profile.json` (`sr=2056`, 200 pts) |
| Rose des vents orientable sur le tracé | SVG centré au milieu de la ligne, poignée bleue | — ; calcule l'angle vent/ligne et les composantes le long / travers |
| Vue 3D sur fond swisstopo | `3d.html` | terrain quantized-mesh `3d.geo.admin.ch`, imagerie WMTS drapée, bâtiments 3D Tiles en option |

Tout l'état (A, B, direction et vitesse du vent) est dans le hash d'URL, partagé entre les deux pages.

## Observations (2026-11-08)

Voir le commentaire de résolution sur le ticket #63.

## Suite : glisser un ancrage dans la Vue 3D (#74)

`3d-drag.html` répond au ticket [Prototype : glisser un ancrage dans la Vue 3D (#74)](https://github.com/fuzoh/simu-tyro/issues/74) :
saisir A ou B dans la scène Cesium, le déplacer sur le relief, fil à plomb en pointillé, profil geo.admin relancé au lâcher.

| Mécanisme | Cesium |
| --- | --- |
| Saisie | `ScreenSpaceEventHandler` `LEFT_DOWN` + `scene.pick` : on ne capture que si l'entité touchée est un ancrage |
| Gel de la caméra pendant le glissement | `scene.screenSpaceCameraController.enableInputs = false`, rendu au `LEFT_UP` |
| Position sous le curseur | mode libre : `globe.pick(camera.getPickRay(pos))` (surface rendue) ; mode plan : `IntersectionTests.rayPlane` sur le plan tangent à la position de saisie, altitude par `globe.getHeight` |
| Mise à jour sans ré-ajout d'entités | `CallbackProperty` sur ancrage, fil à plomb (`PolylineDashMaterialProperty`) et ligne |
| Lâcher | `sampleTerrainMostDetailed` pour l'altitude exacte, puis REFRAME + `profile.json` (200 pts), identique à `index.html` |

Captures : `captures/3d-drag-*.png`. Résultat et verdict : commentaire de résolution sur #74.

## Sources

- Capacités API : recherche [Swisstopo et geo.admin : profil, fond de carte et 3D (#11)](https://github.com/fuzoh/simu-tyro/issues/11).
- Formule approchée WGS84 → LV95 (repli si REFRAME échoue) : swisstopo, « Formules et constantes pour le calcul de la
  projection cylindrique conforme suisse et pour la transformation entre systèmes de coordonnées », précision ~1 m.
- REFRAME REST `https://geodesy.geo.admin.ch/reframe/wgs84tolv95?easting=&northing=&format=json` : observé le
  2026-11-08 avec `Access-Control-Allow-Origin: *`, non décrit sur docs.geo.admin.ch.
