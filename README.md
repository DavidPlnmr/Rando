# Wanderland - CH

Application permettant de récupérer les itinéraires de randonnées officielles en Suisse.

## Prérequis
* Python
* Avoir téléchargé la dernière version du Shapefile+Zip de [Wanderland](https://data.geo.admin.ch/browser/index.html#/collections/ch.astra.wanderland/items/wanderland)

## Installation
1. Créer un environnement virtuel
2. Installer les dépendances du fichier requirements.txt
3. Dézipper le fichier wanderland_*.shp.zip

## Utilisation
1. Exécuter le fichier convert.py pour convertir le fichier .shp en .geojson
2. Lancer la commande `python -m http.server 8000`
3. Utiliser l'application sur `http://localhost:8000`
