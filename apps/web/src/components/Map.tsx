import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { use, useEffect, useState } from 'react';
import { collectRoutesUsingEdgeRuntime } from 'next/dist/build/utils';

//Define a type for the GeoJSON data for better type safety
type FeatureCollection = {
    type: 'FeatureCollection';
    features: any[];
};

export default function Map() {
    //Sate to hold the map data once its fetched from the API
    const [mapData, setMapData] = useState<FeatureCollection | null>(null);

    useEffect(() => {
        //Function to fetch the data
        async function fetchMapData() {
            try {
                const scenarioId = 'cmg86ib8g0000u1a4fzdlvu1n'; //TODO: Make this dynamic

                //Call the API endpoint
                const response = await fetch(`http://localhost:3001/api/scenarios/${scenarioId}/map`);
                const data = await response.json();
                setMapData(data);

            }catch(e) {
                console.error('Failed to fetch map data:', e);
            }
        }
        fetchMapData();
    }, []); //The empty dependency array ensures this runs only once when the component mounts

    //Define a style for the territories
    const territoryStyle = {
        fillColor: 'blue', //TODO: Make this dynamic
        weight: 1,
        color: 'white',
        fillOpacity: 0.5,
    };

    return (
        <MapContainer
            center={[48.8566, 2.3522]}
            zoom={5}
            style={{ height: '100vh', width: '100%' }}
        > 
        {/* This is the base map layer from OpenStreetMap */}
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {/* This line is a conditional render. The GeoJSON component will ONLY be rendered if mapData is not null. */}
            {mapData && (
                <GeoJSON
                    data={mapData}
                    style={() => territoryStyle}
                />
            )}
        </MapContainer>
    )
}