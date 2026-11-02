# Retension : fluage, mise en place, passages et temps

Ticket : [Retension : fluage, mise en place, passages et temps](../../issues/09-retension-modeles.md).
Recherche lue le 2026-11-02. Branche `research/retension-modeles`. Pas un calage.

Question : quels modèles publiés estiment la longueur à ravaler après N passages et après un temps sans passage, pour le textile (polyamide, Bandit seulement si une fiche réelle existe) et pour l'acier là où le matériau se met en place ou flue.

## Décision

Aucune équation publiée, lue ici, ne donne les mètres à ravaler en fonction de N passages ou d'un temps d'inactivité, ni pour une corde EN 1891, ni pour un câble de tyrolienne. La spec peut nommer la décomposition déjà dans la théorie locale, puis re-résoudre. Elle ne peut pas calculer le ravalement.

Forme que les sources soutiennent, sans chiffres :

`L₀(t) = L₀,init + ΔL₀,construction + ΔL₀,creep(t)`

puis re-solve. L'allongement élastique n'entre pas dans `L₀` : à tension dynamomètre égale, il est déjà dans `T/EA`. Ce qu'on ravaler pour retrouver la même tension mesure le raccourcissement du système, pas le fluage du matériau seul.

Les constantes restent ouvertes. Les taux HMPE des deux fabricants se contredisent. Les taux polyamide lus valent pour des sous-cordages de mouillage immergés à 25–45 % de la charge de rupture, pas pour un Bandit de tyrolienne. L'acier n'a pas, dans les documents lus, de taux de fluage à température ambiante : seulement une mise en place permanente, sans formule en nombre de cycles.

Les ~4 m de l'essai ne prouvent aucun de ces taux. Voir plus bas.

## Ce qui a été lu, et ce qui ne l'a pas été

Lu, texte ou PDF :

- `docs/simulation-theory.md` §9.2 et les passages B10 de `docs/references/research-one.md` et `research-two.md` (consolidations locales, pas des sources primaires).
- Cablecraft, note « Constructional Stretch and Elastic Stretch », PDF daté de dépôt 2024-03-08. Fabricant de câbles (1×19, 7×7, 7×19).
- Wirerope Works, Technical Bulletin 5, « Elevator Rope Stretch », ©2008. Fabricant, câbles d'ascenseur Bethlehem.
- Samson Rope, Technical Bulletin « Understanding Creep », révisé février 2019 (document d'origine mars 2012).
- Avient, CIS YA104 « Creep Resistance of Dyneema fiber », émis le 2 avril 2024.
- Vlasblom et Bosman, « Predicting the Creep Lifetime of HMPE Mooring Rope Applications », OCEANS 2006, DOI `10.1109/OCEANS.2006.307013`. Résumé IEEE seulement. Le PDF est payant. Les équations n'ont pas été lues.
- Civier et al., « Short and long term creep behaviour of polyamide ropes for mooring applications », *Ocean Engineering* 259 (2022) 111800, DOI `10.1016/j.oceaneng.2022.111800`. Version auteur sur Archimer : `https://archimer.ifremer.fr/doc/00786/89841/95786.pdf`.
- Fiche produit Courant Bandit 11 mm sur `vertical-living.mycourant.com` (page lue le 2026-11-02) et PDF distributeur `EN-COURANT-TDS-BANDITROPE-11MM.pdf` (Felix Safety, fichier publié le 2023-11-22).
- Aresta Safety, page « EN 1891 Low stretch Kernmantle ropes » (2021-11-01). Résumé fabricant du protocole d'essai, pas le texte de la norme.

Pas lu, donc non affirmé :

- Le corps de Vlasblom et Bosman 2006, Smeets et al. 2001, Jacobs 1999. La théorie locale les cite. Cette passe ne confirme pas leurs coefficients (`n`, `Q`, 0,3 %/an).
- NF EN 1891, EN 12385, ISO 12076, ISO 2307, Wire Rope Users Manual. Payants ou non trouvés en texte intégral.
- Le TDS Courant daté 21/11/2024 annoncé sur la page produit. Non téléchargé.
- Toute trace dynamomètre. Elle n'est pas dans le dépôt.

`docs/references/simulation tyrolienne.md` donne un tableau d'allongement de construction (0,30 %, 0,40 %, 1,50 %, 1,00 %) sans source dans le fichier. Ces cellules ne sont pas adoptées.

## Trois mécanismes, pas un

Les documents fabricant séparent des choses que l'essai mélange.

| Mécanisme | Réversible à la même tension ? | Horloge | Dans `L₀` ? |
| --- | --- | --- | --- |
| Élastique | Oui | Instantané | Non. Déjà dans le solve via `EA`. |
| Mise en place / allongement de construction | Non | Premières charges, puis ça s'arrête | Oui, un cran, pas une fonction du temps |
| Fluage | Primaire souvent récupérable ; secondaire non | Temps sous charge constante, et température | Oui, `ΔL₀,creep(t)` |

Samson : le fluage est l'allongement irréversible des fibres sous charge statique longue. Il ne faut pas le confondre avec l'allongement de construction, qui est le compactage des fibres et des torons. Tout l'allongement irréversible d'une corde neuve n'est pas du fluage (mise en place, glissement d'épissure). Cablecraft et Wirerope Works disent la même coupure pour l'acier : constructionnel permanent, élastique récupérable par `ΔL = ΔCharge × L / (A × E)`.

Aucun de ces textes n'a le nombre de passages comme variable. « Après N passages » n'est pas un modèle trouvé. C'est au mieux une mise en place sur les premières charges, sans loi `f(N)` publiée dans ce qui a été lu.

## Acier

Cablecraft, câbles de commande (pas un câble de tyrolienne EN 12385) : sous charge, l'allongement de construction vaut typiquement 0,0025 à 0,01 fois la longueur (0,25 % à 1 %). Sous charge légère, plutôt 0,25 % ou moins. Permanent. Réduit par pré-étirage. L'élastique se calcule ; le constructionnel non, au-delà de cette fourchette.

Wirerope Works, câbles d'ascenseur, bulletin 5 : une valeur finie universelle n'existe pas. Elle dépend de l'âme, de la nuance, de la construction, du préformage, du pas. Leurs mesures (essai interne et terrain, cordes d'ascenseur) : constructionnel non pré-étiré, 6 torons, 4 à 6 pouces pour 100 pieds, soit 0,33 % à 0,50 % ; pré-étiré, environ la moitié (1,5 à 3 pouces / 100 pieds, 0,125 % à 0,25 %). Huit torons et âme fibreuse : davantage. Âme acier : moins qu'une âme fibreuse, parce que l'âme se comprime moins. La mise en place cesse tôt, sauf âme fibreuse peu chargée. Ces pouces ne se transportent pas à un 7×19 ou 6×36 de tyrolienne.

Conséquence pour la spec : un pourcentage d'acier saisi par l'utilisateur, étiqueté convention, avec l'avertissement que la fourchette vient de câbles de commande et d'ascenseur. Pas une fonction de N. Pas un taux horaire. Aucun taux de fluage de l'acier à température ambiante n'a été lu. Dire « négligeable » serait une invention. Les bulletins traitent l'allongement après mise en place comme élastique. Ce n'est pas une mesure de fluage nul.

## HMPE

Utile seulement si la spec couvre l'acier et le HMPE. Le Bandit n'est pas du HMPE. Le garder à part, pour ne pas recycler les taux Dyneema sur une corde polyamide.

Vlasblom et Bosman 2006, résumé seulement : sous charge constante, fibres et cordages HMPE fluent de façon fortement dépendante de la charge et de la température. Le papier annonce un modèle de taux et de durée de vie, au niveau fibre, et dit qu'il semble valoir pour les cordages quelle que soit la construction. Les équations ne sont pas dans le résumé. Le PDF IEEE n'a pas été ouvert. Les coefficients `n ≈ 3,2–3,8` et `Q ≈ 120 kJ/mol` de `research-one.md` restent `[UNVERIFIED:R1]`. Cette passe ne les confirme pas.

Avient, CIS YA104, 2 avril 2024, fabricant de la fibre Dyneema. Le fluage dépend du grade, du temps, de la tension, de la température, et pour un cordage aussi de la masse linéique. Le « Fatigue Performance Model » a des équations qualifiées par DNV. Elles ne sont pas dans la note. Pour toute autre combinaison que le tableau, Avient demande d'être consulté. Tableau indicatif, cordage de rupture 1 000 kN, charge 200 kN (20 % de cette rupture), 20 °C :

| Grade | Taux indiqué | Durée de vie indiquée |
| --- | --- | --- |
| DM20 | 0,0 %/an | 250 ans |
| SK78 | 0,9 %/an | 15 ans |
| SK75 | 2,6 %/an | 7 ans |

Samson, même bulletin, exemple à 20 % de la charge de rupture, charge continue : SK75 environ 0,1 %/mois (ordre 1,2 %/an), SK78 environ un tiers, 0,033 %/mois (ordre 0,4 %/an). Primaire : quelques pourcents en quelques minutes à quelques heures, que Samson dit réversible, en plus de la mise en place. Secondaire : quelques pourcents par an. Tertiaire : rupture. Le fluage ne compte, dit Samson, que si la charge est statique et longue, et si la durée de service est du même ordre que la vie de fluage.

Les deux tableaux fabricant, à 20 % de rupture et 20 °C, ne donnent pas le même taux (SK78 : 0,9 %/an chez Avient en 2024, environ 0,4 %/an chez Samson en 2019). `research-one.md` en donne un troisième (SK78 ≈ 0,3 %/an). Aucun des trois ne se shippe. Le seuil « au-dessus de 30 % MBL le fluage secondaire monte fort », dans la théorie locale via R2, n'est pas dans le résumé Vlasblom lu, ni dans le tableau Avient (qui est à 20 %). Civier cite, d'autres références, une rupture de fluage HMPE en une centaine de jours vers 30 % MBL. Ce n'est pas une mesure de cette passe. Le seuil 30 % reste non confirmé ici.

Pas de formule en nombre de passages.

## Polyamide

### Bandit 11 mm, fiches réelles, en conflit

Les deux documents Courant lus disent polyamide, EN 1891 type A, diamètre 11 mm, masse 73 g/m. Ils ne disent pas la même chose sur l'allongement.

| Grandeur | Page MyCourant, lue le 2026-11-02 | PDF TDS distributeur, fichier 2023-11-22 |
| --- | --- | --- |
| Résistance statique | 3000 daN | 31 kN |
| Couture | 2600 daN | 26 kN |
| Nœud de huit | 2300 daN | 23 kN |
| Gaine | 41 % (âme 59 %) | 34 % |
| Glissement de gaine | 0,1 % | 0 % |
| Allongement 50/150 kg | 3,5 % | 2,5 % |
| Nouabilité | 0,6 | 1,0 |
| Rétraction à l'eau | 2,5 % | 3,5 % |

La page produit annonce un TDS du 21/11/2024 qui n'a pas été ouvert. Tant qu'il n'est pas lu, la spec ne retient aucun de ces pourcentages comme valeur Bandit. Aucune des deux fiches ne donne un fluage, un allongement de construction, ni un ravalement après passages ou après temps.

L'allongement 50/150 kg est l'essai court EN 1891, pas un `ΔL₀(t)`. Aresta, résumé fabricant et non la norme, décrit le protocole : 50 kg pendant 5 minutes, puis 150 kg pendant 5 minutes, allongement qui ne doit pas dépasser 5 %. La norme elle-même n'a pas été ouverte. Un autre fabricant (English Braids, extrait de recherche) parle de 10 % pour un autre plafond. Ce conflit n'est pas tranché. Ne pas coder 5 % ni 10 % comme limite normative.

La rétraction à l'eau est un raccourcissement si la corde mouille. Signe opposé au ravalement. Elle ne s'ajoute pas au fluage.

### Loi logarithmique, domaine mouillage, pas tyrolienne

Civier et al. 2022, sous-cordages PA6 immergés, trois torons, diamètre extérieur ~12 mm, charge de rupture mesurée 42 kN, éprouvettes de laboratoire (BEXCO / Nexis), pas un kernmantel EN 1891. Essais à 25 %, 39 % et 45 % MBL, jusqu'à environ deux ans, eau ~20 °C. Un essai à 45 % a une mise en place préalable (5,58 kN pendant 1 h puis 1,8 kN pendant 1 h), choisie pour un mouillage éolien vers 15 % MBL, et les auteurs disent qu'elle ne suit pas la recommandation ISO.

Loi qu'ils identifient, pour `t > t₀`, à partir de 10⁻² jour (environ 15 minutes) :

`ε_c = A · log10(t − t₀) + ε₀`

`A` est le taux en déformation par décade. `ε₀` est la déformation après un jour. Ils concluent qu'un essai de 3 heures, extrapolé par cette droite, prédit correctement le fluage jusqu'à environ deux ans sur leurs éprouvettes. Le modèle de Weibull (Fancey) décrit mieux la recouvrance que le fluage. Un modèle ressort-amortisseur de Chevillotte saturait au bout de 30 minutes et a été jugé trop pauvre en temps de relaxation.

Taux lus sur la phase secondaire, après 100 jours : environ 0,2 %/décade à 25 % MBL, 0,3 %/décade à 39 %, 0,35 %/décade à 45 %. Tableau des essais courts, même papier : 0,16 à 0,29 %/décade selon la charge. La déformation instantanée est 85 % à 90 % de la déformation totale. Le fluage proprement dit en est 10 % à 15 %. Environ un tiers de la déformation totale n'est pas recouvré après décharge, sur les essais longs à 25 % et 45 %.

Ce que ça autorise à nommer : la forme `A log10(t)` pour un polyamide 6 sous charge constante, si un essai futur fournit `A` au `%MBL` et à l'humidité de la ligne. Ce que ça n'autorise pas : un `A` par défaut pour un Bandit, un `A` à 10 % MBL (pratique secours, bien sous les 25 % du papier), un `A` à sec, un `A` pour un kernmantel, une dépendance aux passages.

Ordre de grandeur, inférence, pas une prédiction. Sur 416 m, 0,2 %/décade fait 0,83 m par décade de temps. De 15 minutes à 40 minutes il y a `log10(40/15) ≈ 0,43` décade, soit environ 0,35 m au taux de 25 % MBL. Les 4 m ravalés sont environ dix fois cela. Le fluage secondaire publié ne porte pas le constat, même avant de noter que la construction n'est pas la même.

Le primaire, lui, a la bonne horloge : Samson parle de quelques pourcents en minutes à heures, et le dit réversible. Civier place la fin du primaire vers 15 minutes. Un ravalement d'environ 1 % en 30–40 minutes peut être de la mise en place ou du fluage primaire, ou autre chose. Il ne donne pas le `A` de la droite logarithmique.

## Les 4 m : ce qu'ils peuvent et ne peuvent pas trancher

Constat des notes, qualitatif : trois retensions, environ 4 m ravalés à chaque fois, le dynamomètre retrouvait la tension initiale, 2 à 3 passages et 30 à 40 minutes entre chaque. Portée horizontale du CSV : 415,9 m. Corde annoncée Bandit 11 mm, deux brins, dynamomètre sur le brin du bas, tension au Maestro.

Arithmétique, pas une mesure de déformation :

- 4 / 415,9 ≈ 0,96 % de la portée horizontale, par événement.
- Trois fois, si les longueurs s'ajoutent et si chaque ravalement est un allongement permanent nouveau de la même corde : 12 / 415,9 ≈ 2,9 %.

La corde est plus longue que la portée (flèche, dénivelé). 2,9 % est donc une borne haute sur la déformation, pas une déformation mesurée. « Environ » n'a pas d'incertitude. On ne sait pas si les 4 m sont par brin ou pour les deux, ni si la queue mesurée est la longueur sortie du système ou une longueur de queue déjà détendue.

Ce que le chiffre peut faire : montrer que l'ordre de grandeur, sur une corde neuve et sur quelques heures, est celui d'une mise en place textile (la fourchette 1–3 % au premier cycle est dans les consolidations locales, pas revalidée ici sur un handbook textile primaire), pas celui du fluage secondaire HMPE en %/an, ni du fluage secondaire PA6 en %/décade sur une demi-heure.

Ce qu'il ne peut pas faire :

- Séparer les passages du temps. Les deux ont eu lieu ensemble. Aucune horloge seule n'est identifiée.
- Séparer le matériau du reste. Le Maestro est hors de ce ticket, mais le constat ne prouve pas que les 4 m sont un `ΔL₀` matériau. Glissement dans l'autobloquant, nœuds qui se serrent, ancrages qui bougent, brin du bas seul : même signe sur le dynamomètre. Sans la trace, ces parts sont indistinguables.
- Donner un taux. Trois points, pas une courbe tension-temps. Pas de `%MBL` pendant l'attente (la tension chutait ; le fluage publié est à charge constante).
- Caler Bandit. Les fiches n'ont pas de colonne fluage, et elles ne s'accordent pas sur l'allongement court.
- Transporter à l'acier. 1 % par événement est au-dessus de la fourchette Cablecraft pour une charge légère, et du même ordre que le haut de la fourchette constructionnelle totale, pas un incrément à répéter trois fois. Rien dans les bulletins acier ne prédit 4 m en 40 minutes sur 416 m.
- Dire que c'est permanent. Samson dit le fluage primaire réversible. Civier recouvre une grande part après décharge. Ravaler pour garder la tension fige un allongement qui aurait peut-être en partie disparu si on avait détendu. Le ravalement observé n'est pas la déformation permanente au sens du papier.

## Ce qu'une spec peut écrire

1. Garder la décomposition `ΔL₀,construction + ΔL₀,creep(t)`, puis re-solve. C'est le seul formulaire commun à la théorie locale et aux sources lues. L'afficher comme conseil de retension, pas comme état silencieux. Déjà dit en §9.2.

2. Ne pas calculer « après N passages » ni « après T heures sans passage ». Aucune source lue n'a ces deux entrées. Les proposer comme saisies utilisateur (un pourcentage de mise en place, une durée et un taux que l'utilisateur apporte) est une interface, pas un modèle. Les étiqueter convention ou inconnu. Ne pas préremplir avec 0,25 %, 1 %, 0,9 %/an ou 0,2 %/décade.

3. Familles séparées. Acier : mise en place seulement, fourchette indicative non normative, pas de fluage ambiant chiffré. Polyamide EN 1891 : pas de loi de ravalement ; l'allongement 50/150 kg et la rétraction à l'eau sont d'autres essais, et les chiffres Bandit sont en conflit entre deux documents. HMPE : renvoyer au modèle fabricant non publié, ne pas embarquer un taux. Les taux Samson 2019 et Avient 2024 ne se réconcilient pas.

4. Ne pas utiliser l'essai du 1er novembre comme calibration. Il peut servir plus tard de contrôle qualitatif (une corde neuve peut demander un ravalement de l'ordre du pourcent en quelques dizaines de minutes), une fois la trace là et une fois le glissement de mise en tension traité à part.

5. Laisser ouverts, explicitement : coefficients Vlasblom, seuil 30 % MBL, cellules du tableau de `simulation tyrolienne.md`, choix entre 2,5 % et 3,5 % pour le Bandit, tout `A` de la loi logarithmique hors du domaine Civier (PA6 immergé, sous-cordage, ≥ 25 % MBL).
