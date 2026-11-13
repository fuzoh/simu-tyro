# 5. Limites du modèle et statut des sources

Un résultat ne vaut que ce que valent ses hypothèses et ses données. Ce chapitre rassemble ce que
le modèle suppose, ce que l'outil ne calcule pas, le niveau de confiance de chaque source, les
questions restées ouvertes et les documents d'origine.

## 5.1 Les hypothèses du modèle

Le moteur repose sur les hypothèses suivantes. Chacune est un choix de modélisation, pas une
propriété garantie de la ligne réelle.

| Hypothèse | Conséquence | Où |
| --- | --- | --- |
| Une seule portée, sans appui intermédiaire | pas de ligne à plusieurs travées | [1.1](1-ligne.md#s-1-1) |
| La ligne reste dans le **plan vertical** A–B | pas de déplacement latéral sous le vent ; la Banane n'est qu'une allure dessinée | [3.9](3-securite.md#s-3-9) |
| Toutes les charges sont **verticales** | $H$ est la même tout le long de la ligne | [1.5](1-ligne.md#s-1-5) |
| Matériau **élastique linéaire**, $EA$ constant | la souplesse non linéaire du polyamide et la souplesse du HMPE aux faibles charges ne sont pas représentées | [3.2](3-securite.md#s-3-2) |
| **Ancrages rigides** | aucune souplesse d'arbre ou de mât ; c'est le choix prudent pour la tension | — |
| Passager = **charge ponctuelle** | ni écartement des réas, ni balancement | [2.7](2-statique.md#s-2-7) |
| **Quasi statique** : la ligne suit le passager instantanément | valide sous $v/c \approx 0{,}2$, avertissement au-delà | [4.1](4-dynamique.md#s-4-1) |
| Un état à **un instant** | ni température, ni fluage, ni allongement de construction | [2.11](2-statique.md#s-2-11) |
| Deux Brins porteurs partagent le passager **à 50/50** | non confirmé par l'essai ; d'où le Cas défavorable | [2.9](2-statique.md#s-2-9) |
| Le sol est le profil reçu, **jamais lissé ni rééchantillonné** | la garde ne voit que les points du profil | [2.10](2-statique.md#s-2-10) |

Référence : [§3](../simulation-theory.md#s-3), [§8.4](../simulation-theory.md#s-8-4),
[§13.3](../simulation-theory.md#s-13-3), [§17](../simulation-theory.md#s-17).

## 5.2 Ce que l'outil ne calcule pas

La Page Avancé en garde la liste sous « Ce que cet outil ne calcule pas » :

- la **combinaison de charges normative** EN 15567 (texte payant) ([3.9](3-securite.md#s-3-9)) ;
- l'**essai de charge à 2 fois** exigé par WorkSafe QLD ([3.5](3-securite.md#s-3-5)) ;
- la **Banane chiffrée en mètres** et la garde au sol sous vent avec passager (modèle plan) ;
- le **freinage** et la **tension dynamique** de la ligne ([4.7](4-dynamique.md#s-4-7)) ; la
  dynamique du passager n'est qu'une estimation, hors Verdict ;
- **aucune attestation de conformité**.

S'y ajoutent, d'après les chapitres précédents : les évolutions dans le temps (température,
fluage, [2.11](2-statique.md#s-2-11)), la souplesse des ancrages, et la vérification de toute
pièce autre que la ligne et ses terminaisons (ancrages, poulies, dispositifs de Mise en tension,
au-delà de l'avertissement sur la limite de tension d'un Maestro).

## 5.3 Le statut des sources

Chaque nombre de la référence porte une **étiquette** qui dit d'où il vient. Le guide en parle en
clair ; voici la correspondance.

| Étiquette | Ce qu'elle veut dire | Exemple |
| --- | --- | --- |
| `[VERIFIED-NUM]` | recalculé indépendamment et recoupé avec le logiciel MoorPy à 6 chiffres significatifs | les cas Z1 à Z8 |
| `[STD-ATTESTED]` | texte d'une norme attesté par des sources ouvertes ; la norme elle-même peut être payante | $k = 3$ d'EN 15567-1, facteurs $K$ de la MBF |
| `[FIELD:SSF]` | mesure de terrain instrumentée du Spéléo Secours Français (ligne de 1109 m, 2008) | majoration au départ 1,2, $C_dA$ 0,45 |
| `[DATASHEET]` | donnée d'un fabricant, produit et document nommés | $k = 22$ du HMPE |
| `[REGULATOR]` | guide public d'un régulateur, cité mot pour mot | régime WorkSafe QLD |
| `[CONVENTION]` | pratique du métier, sans texte primaire trouvé ; modifiable, jamais présentée comme règle | gabarit 2,1 m, zones d'ancrage 10 m, ACCT 10:1 |
| `[UNVERIFIED:R1]` | affirmé par un seul rapport de recherche, non retrouvé ailleurs ou faux au recalcul | ANSI/ACCT 5:1 |
| `[PAYWALLED]` | la valeur est dans une norme payante ; à acheter pour confirmer | vent de dimensionnement EN 15567 |

**La règle qui en découle.** Une valeur `[PAYWALLED]`, `[CONVENTION]` ou `[UNVERIFIED:R1]` peut
figurer dans le simulateur comme **valeur par défaut, étiquetée, modifiable et accompagnée d'un
avertissement** — jamais comme une constante cachée, jamais comme une valeur normative. À l'écran,
une seule pastille « non confirmé » signale ces valeurs ; la provenance détaillée est dans sa
fenêtre.

**Estimation.** Tout ce qui vient de la dynamique (chapitre 4) est qualifié d'estimation : un
modèle simple, ajusté sur une seule campagne. L'essai de terrain du 1er novembre 2026 le trouve
cohérent en ordre de grandeur ; il ne le confirme pas, et ne montre rien du vent.

Référence : [§0.2](../simulation-theory.md#s-0-2).

## 5.4 Les questions ouvertes

La référence tient un registre des questions sans réponse. Aucune valeur n'y est inventée en
attendant.

**À acheter pour confirmer** (valeurs dans des normes payantes) : EN 15567-1 (masse de calcul du
passager, combinaisons de charges, facteur de sécurité exact, espaces libres, couloir et vitesse
de vent, ancrages sur arbres) ; ANSI/ACCT 03-2019 (5:1 ou 10:1) ; ASTM F2959 / F2291 (limites de
décélération) ; EN 13411-5/-6 (rendement des serre-câbles et manchons à coin) ; EN 12385-4 (tables
de MBF par diamètre).

**À mesurer ou à chercher** : raideur du polyamide aux charges de travail d'une tyrolienne ;
raideur du HMPE sous 10 % de sa MBL ; un jeu de mesures de terrain complet pour valider le moteur ;
raideur des arbres d'ancrage ; frottement de la poulie sur câble et sur corde ; erreur de
l'hypothèse quasi statique au-delà du seuil ; gabarit normatif du passager ; dilatation et fluage
du HMPE et du polyamide ; modèle de vent latéral ; courbes des freins à courants de Foucault ;
fiches techniques contradictoires.

Référence : [§16](../simulation-theory.md#s-16).

## 5.5 Les arbitrages entre sources

Les deux recherches d'origine (« R1 » et « R2 ») se contredisent sur plusieurs points. La
référence a tranché avec une règle simple : **R2 l'emporte sur R1 pour la provenance, et le
recalcul l'emporte sur les deux pour les nombres.** R1 présente une précision fabriquée : ses
exemples chiffrés ne se recalculent pas, et son tableau de « mesures » contredit les faits publiés
par le Spéléo Secours Français. R2 dit explicitement ce qu'il n'a pas trouvé, mais a commis des
erreurs de recopie.

Quelques arbitrages qui touchent directement le simulateur :

- la **raideur du polyamide** : $EA \approx 1{,}5 \cdot \text{MBL}$ (R2), et non $18 \cdot \text{MBL}$
  (R1), qui contredit ses propres allongements mesurés d'un facteur 10 ;
- la **surface de traînée** d'un passager couché : 0,45 m² mesurée (R2/SSF), et non 0,08 à 0,12 m²
  (R1) ;
- la **majoration au départ** : 1,2 mesurée (R2/SSF), et non 1,25 (R1) ;
- la **précision de la parabole** : le tableau de R1 se recalcule, les écarts plus grands de R2 non
  ([2.2](2-statique.md#s-2-2)) ;
- le **nœud de huit** en polyamide : 60 à 80 % selon la source, le simulateur prend 0,60.

Le registre complet est au [§14 de la référence](../simulation-theory.md#s-14).

## 5.6 Les documents d'origine

Le guide et la référence s'appuient sur des rapports conservés **tels qu'ils ont été reçus**. Ce
sont des sources : on y cherche une citation ou un détail, en sachant qu'ils se contredisent
parfois et que la référence dit lequel elle suit.

**Servis dans la documentation, sous « Rapports d'origine »** :

| Document | Contenu | Langue |
| --- | --- | --- |
| [Modèle mathématique — rapport de recherche](../references/algo%20simulation%20tyrolienne.md) | équations : chaînettes, charge ponctuelle, méthodes numériques, valeurs matériaux | français |
| [Simulation d'une tyrolienne — rapport](../references/simulation%20tyrolienne.md) | statique, matériaux, dynamique, garde au sol, algorithmes | français |
| [Tyrolienne sur câble](../references/tyrolienne%20sur%20cable.md) | normes et dimensionnement sur câble | français |
| [Tyrolienne sur corde](../references/tyrolienne%20sur%20corde.md) | normes et dimensionnement sur corde, secours | français |
| [Recherche R2](../references/research-two.md) | arbitrages, dérivations manquantes, données de validation | anglais |
| [Équilibre spatial sous vent](../references/equilibre%20spatial%20vent.md) | note préparatoire sur le vent et la forme spatiale de la ligne, sans valeur aérodynamique adoptée | français |

**Dans le dépôt seulement** : `docs/references/research-one.md` (recherche R1, dont la précision
n'est pas fiable, voir 5.5), `docs/references/deep-research-prompt.md` (la liste des questions
posées aux deux recherches), le dossier `docs/references/spatial-wind/` (revues préparatoires sur
le vent) et `docs/mesures dynamometre/` (relevés bruts de l'essai du 1er novembre 2026).

**La [référence technique](../simulation-theory.md)** consolide tout cela : c'est le contrat que le
moteur respecte et que ses tests vérifient.

---

Précédent : [4. Dynamique](4-dynamique.md) · Suivant : [Sommaire](README.md)
