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
routes["distance_km"] = routes["LaengeR"] / 1000

# Lien SwitzerlandMobility
routes["swissmobility_link"] = routes.apply(
    lambda row: f"https://schweizmobil.ch/fr/suisse-a-pied/itineraire-{row['NrR']}", axis=1
)

# Conversion LV95 -> WGS84 pour Leaflet
routes = routes.to_crs(epsg=4326)

# Export
routes.to_file("routes.geojson", driver="GeoJSON")

print(f"{len(routes)} itinéraires exportés.")