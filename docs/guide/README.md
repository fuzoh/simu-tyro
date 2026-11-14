# Comprendre le simulateur — guide pas à pas

Ce guide explique, dans l'ordre où on en a besoin, ce que le simulateur calcule et comment. Il
part de la ligne elle-même, puis construit la statique, le jugement de sécurité, la dynamique du
passager et finit par ce que le modèle ne sait pas faire. Chaque chapitre suit une partie du
moteur de calcul, et chaque sous-chapitre porte un numéro (par exemple **2.4**) qu'on peut citer
ou partager comme lien.

## Pour qui

Pour un lecteur qui a des bases de mathématiques du secondaire : fractions, puissances, racine
carrée, sinus et cosinus d'un angle, lecture d'une formule et d'un graphique. Aucun prérequis de
mécanique ou de métier n'est supposé : chaque notion est définie avant d'être utilisée, chaque
lettre d'une formule est expliquée avec son unité, et chaque étape importante est accompagnée d'un
exemple chiffré que l'on peut refaire à la calculatrice.

Quand une notion plus avancée est nécessaire (une fonction comme le cosinus hyperbolique, une
intégrale, une méthode de résolution numérique), le guide dit ce qu'elle fait et pourquoi on en a
besoin, sans demander de savoir la manipuler.

## Sommaire

1. [Comprendre la ligne](1-ligne.md) — ce que l'outil calcule, le repère, les forces et les
   unités, la tension et ses deux composantes, l'allongement élastique, la flèche.
   - [1.1 Ce que calcule le simulateur](1-ligne.md#s-1-1)
   - [1.2 Le repère : où sont A et B](1-ligne.md#s-1-2)
   - [1.3 Forces, poids et unités](1-ligne.md#s-1-3)
   - [1.4 Câble ou corde : la famille de ligne](1-ligne.md#s-1-4)
   - [1.5 La tension et ses deux composantes](1-ligne.md#s-1-5)
   - [1.6 L'allongement élastique et la longueur non tendue](1-ligne.md#s-1-6)
   - [1.7 La flèche](1-ligne.md#s-1-7)
   - [1.8 Récapitulatif des notations](1-ligne.md#s-1-8)
2. [Statique : la forme et les tensions de la ligne](2-statique.md) — de la parabole à la
   chaînette élastique, la résolution numérique, le passager, le balayage, la garde au sol.
   - [2.1 Ce que veut dire « statique »](2-statique.md#s-2-1)
   - [2.2 Première approximation : la parabole](2-statique.md#s-2-2)
   - [2.3 La chaînette](2-statique.md#s-2-3)
   - [2.4 La chaînette élastique, modèle du moteur](2-statique.md#s-2-4)
   - [2.5 Résoudre les équations](2-statique.md#s-2-5)
   - [2.6 Dire à quel point la ligne est tendue](2-statique.md#s-2-6)
   - [2.7 Le passager, une charge ponctuelle](2-statique.md#s-2-7)
   - [2.8 Le balayage de la traversée](2-statique.md#s-2-8)
   - [2.9 Deux Brins porteurs](2-statique.md#s-2-9)
   - [2.10 La garde au sol](2-statique.md#s-2-10)
   - [2.11 Ce qui change avec le temps](2-statique.md#s-2-11)
3. [Sécurité : juger la ligne](3-securite.md) — charge de rupture, terminaisons, majoration au
   départ, régimes de sécurité, facteur de sécurité, Verdict.
   - [3.1 La charge de rupture](3-securite.md#s-3-1)
   - [3.2 Raideur et masse : les autres valeurs du matériau](3-securite.md#s-3-2)
   - [3.3 Les terminaisons et leur rendement](3-securite.md#s-3-3)
   - [3.4 La majoration au départ](3-securite.md#s-3-4)
   - [3.5 Régime de sécurité, tension admissible et facteur de sécurité](3-securite.md#s-3-5)
   - [3.6 Le Verdict](3-securite.md#s-3-6)
   - [3.7 Installation permanente ou temporaire](3-securite.md#s-3-7)
   - [3.8 Les avertissements sur la ligne à vide](3-securite.md#s-3-8)
   - [3.9 Ce qui n'est pas combiné : charges normatives et vent](3-securite.md#s-3-9)
4. [Dynamique : le mouvement du passager](4-dynamique.md) — l'hypothèse quasi statique,
   l'équation du mouvement, ses constantes, les résultats et la Proposition pour l'ancrage B.
   - [4.1 L'hypothèse quasi statique](4-dynamique.md#s-4-1)
   - [4.2 L'équation du mouvement](4-dynamique.md#s-4-2)
   - [4.3 Les constantes et leur provenance](4-dynamique.md#s-4-3)
   - [4.4 Deux exemples chiffrés](4-dynamique.md#s-4-4)
   - [4.5 Ce que la dynamique produit](4-dynamique.md#s-4-5)
   - [4.6 La Proposition pour l'ancrage B](4-dynamique.md#s-4-6)
   - [4.7 Le freinage, hors calcul](4-dynamique.md#s-4-7)
5. [Limites du modèle et statut des sources](5-limites.md) — hypothèses, ce qui n'est pas
   calculé, niveaux de confiance, questions ouvertes, documents d'origine.
   - [5.1 Les hypothèses du modèle](5-limites.md#s-5-1)
   - [5.2 Ce que l'outil ne calcule pas](5-limites.md#s-5-2)
   - [5.3 Le statut des sources](5-limites.md#s-5-3)
   - [5.4 Les questions ouvertes](5-limites.md#s-5-4)
   - [5.5 Les arbitrages entre sources](5-limites.md#s-5-5)
   - [5.6 Les documents d'origine](5-limites.md#s-5-6)

## Comment lire ce guide

**Un exemple suivi d'un bout à l'autre.** Les chapitres 1 à 4 reprennent tous la même ligne :
celle que le simulateur affiche à son ouverture, appelée ici la **ligne d'ouverture**. C'est une
portée de 150 m qui descend de 18 m, sur un câble de 12 mm, tendue à 263,4 daN, avec un passager
de 120 kg. Ses chiffres sont ceux que le moteur calcule ; vous pouvez les retrouver dans
l'application, et le guide montre comment les refaire à la main lorsque c'est possible. D'autres
exemples, plus simples (portée de niveau, chiffres ronds), viennent des cas de test vérifiés du
moteur.

**Les nombres** sont écrits à la française : virgule décimale (2,42 m), espace entre les milliers
(27 221 N). Les formules utilisent le point médian pour la multiplication ($a \cdot b$).

**La référence technique.** Ce guide est l'explication ; le contrat exact que le moteur respecte
est la [référence technique](../simulation-theory.md), en anglais, numérotée par paragraphes
(« § »). Les « § » des infobulles du simulateur renvoient à cette référence, pas à ce guide.
Chaque sous-chapitre du guide indique le paragraphe de la référence qui fait foi, pour aller
chercher le détail, les sources citées et les cas de test.

**Les rapports d'origine.** La référence a été consolidée à partir de rapports de recherche
conservés tels quels ; ils sont listés au [chapitre 5.6](5-limites.md#s-5-6) et servis dans la
documentation sous « Rapports d'origine ». Ce sont des sources, pas des explications : ils se
contredisent parfois, et la référence dit lequel elle suit et pourquoi.

**Ce que le guide n'est pas.** Il ne remplace ni une norme, ni un contrôle par un spécialiste, ni
un essai. Il ne fait d'aucune valeur une règle : quand un nombre est une convention, une valeur
non confirmée ou une valeur dont la source est payante, le guide le dit (voir
[5.3](5-limites.md#s-5-3)).
