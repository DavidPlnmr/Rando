import geopandas as gpd
import sys
from pyogrio.errors import DataSourceError

try:
    folder_path = sys.argv[1]
    routes = gpd.read_file(f"{folder_path}/Route.shp")
except DataSourceError:
    print("Le fichier Route.shp est introuvable dans le dossier spécifié.")
    sys.exit(1)

# Distance en kilomètres
routes["distance_km"] = (routes["LaengeR"] / 1000).round(1)

# Garder uniquement les données nécessaires à l'application
colonnes = [
    "NrR",
    "NameR",
    "TechnikR",
    "KonditionR",
    "distance_km",
    "AOrt",
    "ZOrt",
    "HoeheAufR",
    "HoeheAbR",
    "HoeheMaxR",
    "geometry"
]

colonnes = [col for col in colonnes if col in routes.columns]

routes = routes[colonnes]

# Simplifier les tracés avec une tolérance de 2 mètres
routes["geometry"] = routes.geometry.simplify(
    tolerance=2,
    preserve_topology=True
)

# LV95 -> WGS84
routes = routes.to_crs(epsg=4326)

# Export
routes.to_file(
    "routes.geojson",
    driver="GeoJSON"
)

print(f"{len(routes)} itinéraires exportés.")