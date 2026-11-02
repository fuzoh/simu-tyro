# Swisstopo et geo.admin : profil, fond, 3D

Accès : 2026-11-02. Question : depuis un navigateur, à partir de deux points GPS en Suisse, que fournissent officiellement swisstopo et geo.admin — profil altimétrique, fond de carte, terrain 3D ?

Sources lues : docs techniques [docs.geo.admin.ch](https://docs.geo.admin.ch/) (sitemap du 2026-10-28), dépôts de doc [geoadmin/doc-tech](https://github.com/geoadmin/doc-tech) aux mêmes pages, conditions FSDI et OGD, fiche swissALTI3D, fiche STAC de la collection, enregistrement geocat cité par cette fiche. Les en-têtes HTTP cités plus bas sont des observations du jour, pas une garantie documentée. Aucune politique réseau n'est choisie.

## Synthèse

Deux points GPS ne suffisent pas tels quels. Le profil officiel refuse le WGS84. Une fois les points en LV95 ou LV03, un seul appel `profile.json` / `profile.csv` échantillonne la ligne. Le CSV déjà importé par l'app couvre ce besoin pour une ligne fixe, sans appel. Le fond et le terrain 3D sont des tuiles : appel réseau à l'affichage, ou téléchargement préalable. Les lectures documentées ne demandent pas de compte. L'usage est gratuit avec attribution, sous des plafonds chiffrés. Le hors-ligne du v1 et un fond ou une 3D en direct se contredisent ; le téléchargement est la voie que les conditions indiquent pour un usage hors service.

## Profil altimétrique

Doc : [Get Elevation Profile](https://docs.geo.admin.ch/access-data/get-elevation-profile.html), source [get-elevation-profile.md](https://github.com/geoadmin/doc-tech/blob/master/access-data/get-elevation-profile.md).

| | |
| --- | --- |
| URL | `GET` ou `POST` `https://api3.geo.admin.ch/rest/services/profile.json` et `profile.csv` |
| Entrée | GeoJSON `LineString` dans `geom`. `sr` optionnel mais conseillé : **2056 (LV95)** ou **21781 (LV03)** seulement. |
| Découpage | `nb_points`, défaut **200**. `distinct_points` pour forcer les sommets donnés. `offset` pour une moyenne mobile. |
| Plafond d'entrée | pas plus de `PROFILE_MAX_AMOUNT_POINTS`, « generally 5'000 » coordonnées. |
| Auth | non documentée sur cette page. Les conditions FSDI disent que l'usage des géoservices ne demande pas d'enregistrement. |
| Réponse JSON documentée | tableau d'objets `dist`, `easting`, `northing`, `alts.COMB`, `alts.DTM2`, `alts.DTM25`. |
| Données | la page renvoie vers les [modèles de hauteur / swissALTI3D](https://www.swisstopo.admin.ch/en/height-model-swissalti3d). Elle ne définit pas COMB, DTM2, DTM25. |

Observation du 2026-11-02, requête de l'exemple documenté (`sr=2056`, `nb_points=3`) : le CSV renvoyé a l'en-tête `"Distance";"Altitude";"Easting";"Northing"`. Une seule colonne d'altitude. La doc ne dit pas laquelle des trois clés JSON elle reprend. Le même jour, `sr=4326` avec les deux bouts GPS de l'essai répond 400 : `Please provide a valid number for the spatial reference system model: 21781, 2056`.

Hauteur d'un point, doc séparée : [Get Point Height](https://docs.geo.admin.ch/access-data/get-point-height.html). `GET https://api3.geo.admin.ch/rest/services/height?easting=&northing=&sr=`. Même restriction de système. Réponse documentée : `{"height": "553.6"}`. Hors Suisse, un MNT 10 m combiné, emprise LV95 indiquée sur la page.

Le KML de l'essai n'a que les deux extrémités. Ce n'est pas un profil. Deux points en LV95 sont une `LineString` valide : le service découpe. Les points GPS doivent être transformés avant.

Transformation officielle trouvée : l'application [REFRAME](https://geodesy.geo.admin.ch/reframe/). Le texte d'interface (fichier `js/localization.en.js` servi par cette app, lu le 2026-11-02) dit que WGS84 peut être tenu pour égal à ETRF93 pour la plupart des usages en Suisse, et que LV95 est un cadre de sortie. C'est un envoi de fichier (25 Mo, compression zip au-delà), pas un contrat REST documenté pour deux points. Les fichiers partent sur une infra cloud et sont effacés après 5 jours. Aucune page de [docs.geo.admin.ch](https://docs.geo.admin.ch/) ne décrit un endpoint navigateur WGS84 vers LV95. Le tableau de fair use des conditions FSDI nomme pourtant `geodesy.geo.admin.ch/reframe` comme géoservice.

## Fond de carte

Docs : [WMTS](https://docs.geo.admin.ch/visualize-data/wmts.html), [XYZ](https://docs.geo.admin.ch/visualize-data/xyz.html), [WMS](https://docs.geo.admin.ch/visualize-data/wms.html), [Vector tiles](https://docs.geo.admin.ch/visualize-data/vector-tiles.html).

WMTS REST seulement (`GetCapabilities`, `GetTile`). Pas de KVP ni SOAP. Projections : 2056, 21781, 4326 (ordre lat/lon), 3857. Sans EPSG dans l'URL, le service retombe sur LV03. Tuiles générées à la volée puis mises en cache. Un service [cacheUpdate](https://docs.geo.admin.ch/visualize-data/wmts.html) dit quand invalider un cache local. Exemple documenté : `ch.swisstopo.pixelkarte-farbe`.

Le GetCapabilities EPSG:3857 lu le 2026-11-02 publie notamment `ch.swisstopo.pixelkarte-farbe`, `ch.swisstopo.swissimage`, `ch.swisstopo.swissimage-product`, `ch.swisstopo.landeskarte-farbe-10`, `ch.swisstopo.swissalti3d-reliefschattierung`. Ce sont des identifiants du capabilities, pas une liste fermée par la page tutoriel.

XYZ : même tuiles, **seulement EPSG:3857**. La doc recommande WMTS plutôt que XYZ. URL documentée : `https://wmts.geo.admin.ch/1.0.0/{Layer}/{Style}/{Time}/3857/{z}/{x}/{y}.{ext}`.

Tuiles vecteur : `https://vectortiles.geo.admin.ch/styles/{layer}/style.json` et tuiles `.pbf`. Style d'exemple : `ch.swisstopo.lightbasemap.vt`. Spec Mapbox Vector Tile / style MapLibre, citées par la doc. Pas de recommandation de librairie au-delà de ce que la page nomme (MapLibre, et pour WMTS Leaflet ou OpenLayers comme exemples). L'API JavaScript geo.admin est [décommissionnée](https://docs.geo.admin.ch/map-viewer/javascript-api.html) (OpenLayers 3.6.0 de 2015).

WMS : `https://wms.geo.admin.ch/`, GetCapabilities / GetMap. Moins adapté à un fond tuilé ; plafonds plus bas (ci-dessous).

Alternative documentée qui n'est pas une API de données : iframe de `map.geo.admin.ch`. Les conditions FSDI, section 4.2, autorisent l'intégration ; la mise en page et les fonctions ne doivent pas être changées. Ça reste un chargement réseau du visualiseur.

Aucun de ces fonds n'est un fichier que deux points GPS renvoient. Chaque tuile est un GET.

## Terrain 3D

Doc : [Terrain Service](https://docs.geo.admin.ch/visualize-data/terrain-service.html).

Tuiles quantized-mesh 1.0 (spec Cesium, liée par la doc), schéma TMS, profil géodésique.

`GET https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/<Version>/<Time>/<Zoom>/<X>/<Y>.terrain`

Métadonnées : `https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/<Time>/layer.json`. L'exemple documenté annonce `format: quantized-mesh-1.0`, `projection: EPSG:4326`, `scheme: tms`. Observation du 2026-11-02 sur `.../v1/20250101/layer.json` : corps JSON avec `maxzoom` 18, mêmes champs de format et de projection. L'en-tête `Content-Type` observé était `application/vnd.quantized-mesh` alors que le corps est du JSON. Un client qui se fie au type peut se tromper. La doc ne le dit pas.

Ce service ne prend pas deux points. Il sert une pyramide mondiale. Un client demande les tuiles de la vue.

Bâtiments et objets, doc séparée : [3D Tiles](https://docs.geo.admin.ch/visualize-data/3d-tiles.html). Couches documentées : `ch.swisstopo.swissbuildings3d.3d`, `ch.swisstopo.swisstlm3d.3d`, `ch.swisstopo.swissnames3d.3d`, `ch.swisstopo.vegetation.3d`. Manifeste `tileset.json`, contenu B3DM ou GLB selon le jeu. Ce n'est pas le terrain nu.

Modèle fichier, si l'on ne veut pas de tuiles : [swissALTI3D](https://www.swisstopo.admin.ch/en/height-model-swissalti3d), page publiée le 2024-01-08. MNT sans végétation ni constructions, cycle 6 ans, dalles de 1 km², LV95 / LN02. COG 0,5 m ~26 Mo/dalle (770 Go couverture complète) ou 2 m ~1 Mo/dalle (44 Go). Précision annoncée : 0,3 m LiDAR nouvelle génération, 0,5 m ancienne sous 2000 m, 1 à 3 m en corrélation stéréo au-dessus. La page le donne comme base de visualisations 3D. Livraison par téléchargement, pas par deux points GPS.

Découverte des fichiers : [STAC v1](https://docs.geo.admin.ch/download-data/stac-api/overview.html), racine `https://data.geo.admin.ch/api/stac/v1/`, OpenAPI `https://data.geo.admin.ch/api/stac/static/spec/v1/openapi.yaml`. Collection lue le 2026-11-02 : `ch.swisstopo.swissalti3d`. Les GET de lecture sont le parcours « regular users ». L'[authentification](https://docs.geo.admin.ch/download-data/stac-api/authentication.html) vise les écritures (session ou JWT Cognito). Le GET de la collection a répondu 200 sans jeton.

Le champ STAC `license` de cette collection vaut `proprietary`. L'enregistrement geocat lié (`describedby`, identifiant `691cb471-c3b5-48ec-a107-d0ad612fa70b`) dit autre chose : « Opendata BY: Open use. Must provide the source. », ancre `https://www.swisstopo.admin.ch/ogd-conditions`. Le texte de licence lu est celui des conditions OGD, pas le mot `proprietary`.

DSM distinct, non appelé par le profil : [swissSURFACE3D Raster](https://www.swisstopo.admin.ch/en/height-models) inclut le couvert et les constructions. Utile à connaître pour une tyrolienne. Le service `profile` ne dit pas s'il renvoie le sol nu ou la surface.

## Auth, plafonds, licence, CORS

**Auth lectures.** [Conditions générales FSDI](https://www.geo.admin.ch/en/general-terms-of-use-fsdi), publiées le 2022-05-30, version de pied `swisstopo COSIG / 01.01.2025`. Section 2.2 : pas d'enregistrement, gratuit. Les écritures STAC sont l'exception documentée.

**Licence données swisstopo.** [Terms of use for free geodata and geoservices (OGD)](https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices), publiées le 2022-08-26, version 1.3.2021. Usage, diffusion, traitement, usage commercial autorisés. Source obligatoire : une des formes listées, dont `Federal Office of Topography swisstopo` et `©swisstopo`. `swissALTIRegio` et `swissEO` ont une mention à part ; swissALTI3D n'y figure pas. La page [mention de la source](https://www.swisstopo.admin.ch/fr/source-ogd-swisstopo) (2022-07-18) précise : à côté des données dans une carte dynamique, ou une page de sources liée depuis l'app ; pour un service altimétrique sans image, dans la documentation qui l'accompagne.

**Plafonds.** Même page FSDI, section 2.3, tableau « Fair Use » tel que servi dans la page le 2026-11-02 :

| Service | Hôte | Année | Minute |
| --- | --- | --- | --- |
| API REST (général) | `*.geo.admin.ch` | 21 millions de requêtes | 40 |
| WMTS | `wmts.geo.admin.ch` | 631 millions | 1 200 |
| WMS | `wms.geo.admin.ch` | 10,5 millions pour 1,7 To | 20, image de 360 000 pixels |
| REST géodésique | `geodesy.geo.admin.ch/reframe` | mêmes chiffres que la ligne REST (cellules réutilisées par la page) | idem |

Au-delà : écrire à `info@geo.admin.ch` avant. Le scraping intensif est à éviter ; pour un usage hors ligne, la page dit d'utiliser le téléchargement. Une web app d'environ 20 000 utilisateurs par jour, ou une application desktop, est citée comme correspondant au fair use. Dépassement : restriction ou refus, contrat possible (art. 44 al. 2 OGéo). Les conditions OGD, section 3, répètent la restriction en cas d'usage excessif des géoservices.

Disponibilité documentée : 98 % sur les heures de bureau (lun–ven 7 h 30–12 h et 13 h–17 h). Exploitation 24/7 au mieux, sans droit à la performance. Statut : `status.geo.admin.ch`.

**CORS.** Aucune des pages tutoriel lues ne documente CORS. Observations du 2026-11-02, en-tête `Access-Control-Allow-Origin: *` :

- `api3.geo.admin.ch` profil, y compris la réponse 400 et un `OPTIONS`
- `wmts.geo.admin.ch` capabilities
- `3d.geo.admin.ch` `layer.json` et `tileset.json` des bâtiments, avec en-tête `Origin`
- `vectortiles.geo.admin.ch` style light base map

Ce n'est pas une promesse. Un changement d'en-tête casserait un appel navigateur direct.

## Ce que le CSV couvre déjà

L'export de l'essai (`map.geo.admin.ch`, 200 lignes de données) a `Distance;Altitude;Easting;Northing;Longitude;Latitude`. L'app n'exige que `Distance` et `Altitude` par nom (`src/lib/terrain/csv.ts`). Le CSV du service `profile.csv`, observé, a déjà ces deux colonnes plus Easting et Northing. Il n'a pas Longitude ni Latitude.

Donc :

- Une ligne déjà exportée : le profil n'a pas besoin d'appel. Le KML à deux points, si.
- Deux points qui bougent : le service profil remplace l'export, après transformation LV95/LV03. Défaut 200 points, le même ordre de grandeur que l'export. Le plafond documenté sur la polyligne d'entrée est ~5 000 sommets, pas un plafond documenté sur `nb_points`.
- Le CSV, viewer ou API, n'est pas un fond, ni un mesh 3D, ni une rose des vents.

Le commentaire de code qui parle d'un « 200-point cap » du géoportail est une lecture de l'app. La doc officielle dit « default 200 », pas un maximum du visualiseur.

## Conflit avec le hors-ligne

Le v1 n'appelle aucun service après le chargement. Tout fond WMTS/XYZ/vecteur et toute tuile `*.terrain` ou 3D Tiles est un GET au moment de l'affichage. Le profil depuis deux points GPS l'est aussi, plus une transformation que le service profil ne fait pas.

Les conditions FSDI disent explicitement que le téléchargement, pas le moissonnage des géoservices, est le chemin pour un usage hors ligne. swissALTI3D se télécharge par dalles de 1 km via STAC. Un extrait local couvrirait le terrain d'une portée sans appel ensuite. Un fond carte équivalent demanderait un cache de tuiles, que la doc WMTS prévoit (et qu'il faut invalider via `cacheUpdate`). Rien de cela n'est gratuit en volume disque : la couverture nationale 0,5 m est annoncée à 770 Go. Une dalle 2 m est annoncée à ~1 Mo.

Ce conflit est un fait. Le choix — appel runtime, cache embarqué, export CSV seulement, iframe — n'est pas fait ici.
