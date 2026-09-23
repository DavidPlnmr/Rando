// =====================================================
// CARTE
// =====================================================

const map = L.map("map").setView(
    [46.8, 8.2],
    8
);


// =====================================================
// FOND DE CARTE
// =====================================================

L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);


// =====================================================
// VARIABLES
// =====================================================

let toutesLesRoutes = null;

let coucheRoutes = null;


// Registre utilisé pour les téléchargements GPX

const registreFeatures = {};

let compteurFeatures = 0;


// =====================================================
// TRADUCTION DES DIFFICULTÉS
// =====================================================

const traductionDifficulte = {

    leicht: "Facile",

    mittel: "Moyenne",

    schwer: "Difficile"

};


function traduireDifficulte(valeur) {

    if (!valeur) {
        return "Non renseignée";
    }

    return traductionDifficulte[valeur] || valeur;
}


// =====================================================
// COULEUR DES ROUTES
// =====================================================

function couleurRoute(feature) {

    const difficulte =
        feature.properties.TechnikR;


    if (difficulte === "leicht") {

        return "#2e8b57";

    }


    if (difficulte === "mittel") {

        return "#e67e22";

    }


    // Difficulté technique non renseignée

    return "#777777";
}


// =====================================================
// CHARGEMENT DU GEOJSON
// =====================================================

fetch("routes.geojson")

    .then(response => {

        if (!response.ok) {

            throw new Error(
                "Impossible de charger routes.geojson"
            );

        }

        return response.json();

    })

    .then(data => {

        toutesLesRoutes = data;


        console.log(
            `GeoJSON chargé : ${data.features.length} itinéraires`
        );


        afficherRoutes(
            data.features
        );


        // Zoom automatique sur la Suisse / les données

        if (
            coucheRoutes
            && coucheRoutes.getBounds().isValid()
        ) {

            map.fitBounds(
                coucheRoutes.getBounds(),
                {
                    padding: [20, 20]
                }
            );

        }

    })

    .catch(error => {

        console.error(error);


        document
            .getElementById("resultat")
            .textContent =
            "Erreur lors du chargement du GeoJSON";

    });


// =====================================================
// UTILITAIRE XML POUR GPX
// =====================================================

function echapperXML(texte) {

    if (texte == null) {
        return "";
    }


    return String(texte)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&apos;");
}


// =====================================================
// CONVERSION GEOJSON -> GPX
// =====================================================

function featureVersGPX(feature) {

    const geom = feature.geometry;


    if (!geom) {

        throw new Error(
            "La route ne contient pas de géométrie."
        );

    }


    let segments = [];


    // LineString

    if (geom.type === "LineString") {

        segments = [
            geom.coordinates
        ];

    }


    // MultiLineString

    else if (geom.type === "MultiLineString") {

        segments =
            geom.coordinates;

    }


    else {

        throw new Error(
            `Géométrie non supportée : ${geom.type}`
        );

    }


    const nom =
        feature.properties.NameR
        || `Route ${feature.properties.NrR ?? ""}`;


    const segmentsXML =
        segments.map(segment => {


            const pointsXML =
                segment.map(coord => {


                    const lon =
                        coord[0];


                    const lat =
                        coord[1];


                    const ele =
                        coord.length >= 3
                            ? coord[2]
                            : null;


                    if (ele != null) {

                        return `
        <trkpt lat="${lat}" lon="${lon}">
            <ele>${ele}</ele>
        </trkpt>`;

                    }


                    return `
        <trkpt lat="${lat}" lon="${lon}">
        </trkpt>`;

                }).join("");


            return `
    <trkseg>
${pointsXML}
    </trkseg>`;

        }).join("");


    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx
    version="1.1"
    creator="RandonneesSuisse"
    xmlns="http://www.topografix.com/GPX/1/1"
>
    <trk>
        <name>${echapperXML(nom)}</name>
${segmentsXML}
    </trk>
</gpx>`;

}


// =====================================================
// TÉLÉCHARGEMENT GPX
// =====================================================

function telechargerGPX(feature) {

    try {

        const contenu =
            featureVersGPX(feature);


        const blob =
            new Blob(
                [contenu],
                {
                    type: "application/gpx+xml"
                }
            );


        const url =
            URL.createObjectURL(blob);


        let nomFichier =
            feature.properties.NameR
            || `route_${feature.properties.NrR ?? "itineraire"}`;


        // Nettoyage du nom du fichier

        nomFichier =
            nomFichier

                .normalize("NFD")

                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )

                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                )

                .replace(
                    /_+/g,
                    "_"
                );


        const lien =
            document.createElement("a");


        lien.href =
            url;


        lien.download =
            `${nomFichier}.gpx`;


        document.body.appendChild(
            lien
        );


        lien.click();


        document.body.removeChild(
            lien
        );


        setTimeout(
            () => URL.revokeObjectURL(url),
            1000
        );

    }

    catch (error) {

        console.error(error);


        alert(
            "Impossible de générer le fichier GPX."
        );

    }

}


// =====================================================
// AFFICHAGE DES ROUTES
// =====================================================

function afficherRoutes(features) {

    // Supprimer les anciennes routes

    if (coucheRoutes) {

        map.removeLayer(
            coucheRoutes
        );

    }


    const collection = {

        type: "FeatureCollection",

        features: features

    };


    coucheRoutes =
        L.geoJSON(

            collection,

            {

                // -------------------------------------
                // STYLE
                // -------------------------------------

                style: function(feature) {

                    return {

                        color:
                            couleurRoute(feature),

                        weight: 3,

                        opacity: 0.85

                    };

                },


                // -------------------------------------
                // ROUTE INDIVIDUELLE
                // -------------------------------------

                onEachFeature:
                    function(feature, layer) {


                        const p =
                            feature.properties;


                        // -----------------------------
                        // ID pour téléchargement GPX
                        // -----------------------------

                        const featureId =
                            `f${compteurFeatures++}`;


                        registreFeatures[
                            featureId
                        ] = feature;


                        // -----------------------------
                        // Distance
                        // -----------------------------

                        const distance =

                            p.distance_km != null

                            ? Number(
                                p.distance_km
                            ).toFixed(1)

                            : "-";


                        // -----------------------------
                        // Difficulté
                        // -----------------------------

                        const difficulteTechnique =
                            traduireDifficulte(
                                p.TechnikR
                            );


                        const conditionPhysique =
                            traduireDifficulte(
                                p.KonditionR
                            );


                        // -----------------------------
                        // SwissMobility
                        // -----------------------------

                        const lienSwissMobility =

                            p.swissmobility_link


                            ? `<a href="
                                ${p.swissmobility_link}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Voir l'itinéraire
                            </a>
                          `

                            : "-";


                        // =============================
                        // POPUP
                        // =============================

                        layer.bindPopup(`

                            <div class="route-popup">

                                <h3>
                                    ${p.NameR ?? "Sans nom"}
                                </h3>


                                <b>N° :</b>
                                ${p.NrR ?? "-"}

                                <br>


                                <b>Départ :</b>
                                ${p.AOrt ?? "-"}

                                <br>


                                <b>Arrivée :</b>
                                ${p.ZOrt ?? "-"}


                                <hr>


                                <b>Distance :</b>
                                ${distance} km

                                <br>


                                <b>D+ :</b>
                                ${p.HoeheAufR ?? "-"} m

                                <br>


                                <b>D- :</b>
                                ${p.HoeheAbR ?? "-"} m

                                <br>


                                <b>Altitude max :</b>
                                ${p.HoeheMaxR ?? "-"} m


                                <hr>


                                <b>
                                    Difficulté technique :
                                </b>

                                ${difficulteTechnique}

                                <br>


                                <b>
                                    Condition physique :
                                </b>

                                ${conditionPhysique}


                                <hr>


                                <b>
                                    SwissMobility :
                                </b>

                                ${lienSwissMobility}


                                <br>


                                <button
                                    class="popup-gpx-btn"
                                    data-feature-id="${featureId}"
                                >
                                    Télécharger GPX
                                </button>

                            </div>

                        `);


                        // =============================
                        // BOUTON GPX
                        // =============================

                        layer.on(
                            "popupopen",
                            function(event) {

                                const popup =
                                    event.popup
                                        .getElement();


                                const bouton =
                                    popup.querySelector(
                                        ".popup-gpx-btn"
                                    );


                                if (!bouton) {
                                    return;
                                }


                                bouton.onclick =
                                    function() {

                                        const id =
                                            bouton.dataset
                                                .featureId;


                                        telechargerGPX(
                                            registreFeatures[id]
                                        );

                                    };

                            }
                        );


                        // =============================
                        // SURVOL
                        // =============================

                        layer.on({

                            mouseover:
                                function(event) {

                                    event.target
                                        .setStyle({

                                            color:
                                                "#ffcc00",

                                            weight:
                                                6,

                                            opacity:
                                                1

                                        });

                                },


                            mouseout:
                                function(event) {

                                    coucheRoutes
                                        .resetStyle(
                                            event.target
                                        );

                                }

                        });

                    }

            }

        ).addTo(map);


    // =================================================
    // COMPTEUR
    // =================================================

    const texte =
        `${features.length} itinéraire${features.length > 1 ? "s" : ""}`;


    document
        .getElementById(
            "resultat"
        )
        .textContent =
        texte;

}


// =====================================================
// FILTRAGE
// =====================================================

function filtrerRoutes() {

    if (!toutesLesRoutes) {
        return;
    }


    const distanceMax =
        Number(
            document
                .getElementById(
                    "distanceMax"
                )
                .value
        );


    const deniveleMax =
        Number(
            document
                .getElementById(
                    "deniveleMax"
                )
                .value
        );


    const technique =
        document
            .getElementById(
                "technique"
            )
            .value;


    const condition =
        document
            .getElementById(
                "condition"
            )
            .value;


    const routesFiltrees =
        toutesLesRoutes
            .features
            .filter(route => {


                const p =
                    route.properties;


                const distance =
                    Number(
                        p.distance_km
                    );


                const denivele =
                    Number(
                        p.HoeheAufR
                    );


                // -------------------------------------
                // DISTANCE
                // -------------------------------------

                const correspondDistance =

                    !Number.isNaN(distance)

                    && distance <= distanceMax;


                // -------------------------------------
                // DÉNIVELÉ
                // -------------------------------------

                const correspondDenivele =

                    !Number.isNaN(denivele)

                    && denivele <= deniveleMax;


                // -------------------------------------
                // TECHNIQUE
                // -------------------------------------

                const correspondTechnique =

                    technique === ""

                    || p.TechnikR === technique;


                // -------------------------------------
                // CONDITION
                // -------------------------------------

                const correspondCondition =

                    condition === ""

                    || p.KonditionR === condition;


                return (

                    correspondDistance

                    && correspondDenivele

                    && correspondTechnique

                    && correspondCondition

                );

            });


    afficherRoutes(
        routesFiltrees
    );

}


// =====================================================
// RESET DES FILTRES
// =====================================================

function resetFiltres() {

    if (!toutesLesRoutes) {
        return;
    }


    document
        .getElementById(
            "distanceMax"
        )
        .value =
        20;


    document
        .getElementById(
            "deniveleMax"
        )
        .value =
        1000;


    document
        .getElementById(
            "technique"
        )
        .value =
        "";


    document
        .getElementById(
            "condition"
        )
        .value =
        "";


    afficherRoutes(
        toutesLesRoutes.features
    );

}


// =====================================================
// ÉVÉNEMENTS
// =====================================================

document
    .getElementById(
        "btn-filtrer"
    )
    .addEventListener(
        "click",
        filtrerRoutes
    );


document
    .getElementById(
        "btn-reset"
    )
    .addEventListener(
        "click",
        resetFiltres
    );


// Entrée dans les champs numériques = filtrer

document
    .getElementById(
        "distanceMax"
    )
    .addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                filtrerRoutes();

            }

        }
    );


document
    .getElementById(
        "deniveleMax"
    )
    .addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                filtrerRoutes();

            }

        }
    );