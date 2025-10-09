import { use, useEffect, useState } from 'react';
import Map, {Source, Layer} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

//Define a type for the GeoJSON data for better type safety
type FeatureCollection = {
    type: 'FeatureCollection';
    features: any[];
};

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

export default function MapLayer() {
    //Sate to hold the map data once its fetched from the API
    const [mapData, setMapData] = useState<FeatureCollection | null>(null);

    useEffect(() => {
        //Function to fetch the data
        async function fetchMapData() {
            try {
                const gameId = 'test-game-1'; //TODO: Make this dynamic

                //Call the API endpoint
                const response = await fetch(`http://localhost:3001/api/games/${gameId}/map`);
                const data = await response.json();
                setMapData(data);

            }catch(e) {
                console.error('Failed to fetch map data:', e);
            }
        }
        fetchMapData();
    }, []); //The empty dependency array ensures this runs only once when the component mounts

    return (
        <Map
            initialViewState={{
                longitude: 10, //Cenetered more on Europe
                latitude: 50,
                zoom: 4,
            }}
            style={{width: '100%', height: '100vh'}}
            mapStyle="https://api.maptiler.com/maps/0199b464-830b-79e7-9d86-b7e0dd2c4e8a/style.json?key=ixHYDS2Ueu45yt4aX67M" //URL points to the custom map
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
        </Map>
    );
}