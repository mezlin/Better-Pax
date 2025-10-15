import { useEffect, useState } from 'react';
import Map, {Source, Layer, Popup} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';


//Define a type for the GeoJSON data for better type safety
type FeatureCollection = {
    type: 'FeatureCollection';
    features: any[];
};
type Feature = GeoJSON.Feature;

//This layer will handle the colored fill for the territories
const territoryFillStyle = {
    id: 'territory-fill',
    type: 'fill' as const, //This tells MapLibre to render this data as filled polygons
    paint: {
        'fill-color': ['get', 'ownerColor'] as ['get', string], //Fill color for the territories
        'fill-opacity': 0.7,
    }
};

//This is the layer that draws the border of the territories
const territoryBorderStyle = {
    id: 'territory-border',
    type: 'line' as const, //This tells MapLibre to render this data as lines
    paint: {
        'line-color': '#000', 
        'line-width': 1.5,
    }
};

//This layer will handle the faction labels
const factionLabelStyle = {
  id: 'faction-labels',
  type: 'symbol' as const, // 'symbol' layers are used for text and icons
  layout: {
    'text-field': ['get', 'name'] as ['get', string], // Mapbox expression for dynamic text
    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
    'text-size': 24,
    'text-transform': 'uppercase' as const,
    'text-letter-spacing': 0.1,
  },
  paint: {
    'text-color': '#FFFFFF',
    'text-halo-color': '#000000', // A black "glow" around the text for readability
    'text-halo-width': 1.5,
  }
};

export default function MapLayer() {
    //Sate to hold the map data once its fetched from the API
    const [mapData, setMapData] = useState<FeatureCollection | null>(null);

    //State to hold the faction label data
    const [factionLabelData, setFactionLabelData] = useState<FeatureCollection | null>(null);

    //State to manage popup for territory details
    const [popupInfo, setPopupInfo] = useState<{longitude: number, latitude: number, name: string} | null>(null);

    const gameId = 'test-game-1'; //TODO: Make this dynamic

    useEffect(() => {
        //Function to fetch the data
        async function fetchMapData() {
            try {
                //Call the API endpoint
                const response = await fetch(`http://localhost:3001/api/games/${gameId}/map`);
                const data = await response.json();
                setMapData(data);

            }catch(e) {
                console.error('Failed to fetch map data:', e);
            }
        }

        //Fetches the pre calculated faction label points
        async function fetchFactionLabelData() {
            try {
                const response = await fetch(`http://localhost:3001/api/games/${gameId}/factions`);
                const data = await response.json();
                setFactionLabelData(data);
            } catch (e) {
                console.error('Failed to fetch faction label data:', e);
            }
        }
        

        fetchMapData();
        fetchFactionLabelData();
    }, [gameId]); 

    //Click handler for territories
    const onMapClick = (event: MapLayerMouseEvent) => {
        const features = event.features;
        // Check if the click happened on our 'territory-fill' layer
        if (features && features.length > 0 && features[0].layer.id === 'territory-fill') {
        const feature = features[0];
        // Set the popup info with coordinates and the territory's name
        setPopupInfo({
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
            name: feature.properties.name,
        });
        } else {
        // If the user clicks anywhere else, close the popup
        setPopupInfo(null);
        }
  };

    return (
        <Map
            initialViewState={{
                longitude: 10, //Cenetered more on Europe
                latitude: 50,
                zoom: 4,
            }}
            style={{width: '100%', height: '100vh'}}
            mapStyle="https://api.maptiler.com/maps/0199b464-830b-79e7-9d86-b7e0dd2c4e8a/style.json?key=ixHYDS2Ueu45yt4aX67M" //URL points to the custom map
            onClick={onMapClick}
            interactiveLayerIds={['territory-fill']} //This makes only the territory-fill layer interactive
        > 
            {/* This conditional rendering is the same concept as before. */}
            {mapData && (
                // A <Source> tells the map about a new set of data it can display.
                <Source id="territory-source" type="geojson" data={mapData}>
            
                    {/* A <Layer> tells the map HOW to draw the data from the Source. */}
                    {/* We use two layers to achieve desired effect. */}
                
                    {/* Layer 1: The colored fill for each territory. */}
                    <Layer {...territoryFillStyle} />

                    {/* Layer 2: The white border outline for each territory. */}
                    <Layer {...territoryBorderStyle} />
                </Source>
            )}

            {/* Source and Layer for the Faction Labels */}
            {factionLabelData && (
                <Source id="faction-label-source" type="geojson" data={factionLabelData}>
                    <Layer {...factionLabelStyle} />
                </Source>
            )}

            {/* Conditionally render the Popup component */}
            {popupInfo && (
                <Popup
                    longitude={popupInfo.longitude}
                    latitude={popupInfo.latitude}
                    onClose={() => setPopupInfo(null)}
                    closeButton={false}
                >
                    {popupInfo.name}
                </Popup>
            )}
        </Map>
    );
}