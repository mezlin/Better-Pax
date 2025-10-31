import { useEffect, useState, useCallback } from 'react';
import Map, {Source, Layer, Popup} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import CounselorChat from './CounselorChat';
import DiploChat from './DiploChat';
import {MessageSquare, User} from 'lucide-react';
import { latest } from 'maplibre-gl';
import { type } from 'node:os';


//Define a type for the GeoJSON data for better type safety
type FeatureCollection = {
    type: 'FeatureCollection';
    features: any[];
};
type Feature = GeoJSON.Feature;

type GameState = {
    turn_number: number;
    currentDate: string;
};

type PopupInfo = {
    longitude: number;
    latitude: number;
    territoryName: string;
    factionId: string;
    factionName: string;
}

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
    const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);

    //State to hold the current game state
    const [gameState, setGameState] = useState<GameState | null>(null);

    //State to manage loading state to prevent double-clicks
    const [isLoading, setIsLoading] = useState(false);

    //State variable for Counselor Chat visibility
    const [isChatVisible, setIsChatVisible] = useState(false);

    //State variable for to manage diplo chat
    const [chatTarget, setChatTarget] = useState<{factionId: string, factionName: string} | null>(null);

    const gameId = 'test-game-1'; //TODO: Make this dynamic

    //Function to fetch all data related to map
    const fetchAllGameData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch map, state, and label data in parallel for speed.
      const [mapRes, stateRes, factionRes] = await Promise.all([
        fetch(`http://localhost:3001/api/games/${gameId}/map`),
        fetch(`http://localhost:3001/api/games/${gameId}/state`),
        fetch(`http://localhost:3001/api/games/${gameId}/factions`)
      ]);

      if (!mapRes.ok || !stateRes.ok || !factionRes.ok) {
        throw new Error('Failed to fetch game data');
      }
      
      const mapData = await mapRes.json();
      const stateData = await stateRes.json();
      const factionLabelData = await factionRes.json();

      setMapData(mapData);
      setGameState(stateData);
      setFactionLabelData(factionLabelData);

    } catch (e) {
      console.error('Failed to fetch game data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

    //Initial data load when component mounts
    useEffect(() => {
        fetchAllGameData();
    }, [fetchAllGameData]);
    
    const handleNextTurn = async () => {
        if (isLoading) return; // Prevent clicking while a turn is processing.
        setIsLoading(true);
        try {
        const response = await fetch(`http://localhost:3001/api/games/${gameId}/adTurn`, {
            method: 'POST',
        });

        if (!response.ok) throw new Error('Failed to advance turn');

        // After the turn is successfully advanced on the backend,
        // we refresh ALL data to show the new state of the world.
        await fetchAllGameData();

        } catch (e) {
            console.error(e);
            setIsLoading(false);
        }
    };

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
                territoryName: feature.properties.name,
                factionId: feature.properties.factionId,
                factionName: feature.properties.factionName,
            });
        } else {
            // If the user clicks anywhere else, close the popup
            setPopupInfo(null);
        }
  };

    return (
    <div className="relative w-screen h-screen overflow-hidden">
        <Map
            initialViewState={{
                longitude: 10, //Cenetered more on Europe
                latitude: 50,
                zoom: 4,
            }}
            style={{width: '100%', height: '100vh'}}
            mapStyle="https://api.maptiler.com/maps/0199b464-830b-79e7-9d86-b7e0dd2c4e8a/style.json?key=ixHYDS2Ueu45yt4aX67M"
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
                    className="ui-no-map-click"
                    style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', color: 'white', borderRadius: '4px' }}
                >
                    <div className="p-2">
                        <h4 className="font-bold text-lg">{popupInfo.territoryName}</h4>
                        <p className="text-sm">Owner: {popupInfo.factionName}</p>

                        {/* This button opens the main diplomacy chat */}
                      <button
                        onClick={() => {
                          // Set the target for the chat modal
                          setChatTarget({ factionId: popupInfo.factionId, factionName: popupInfo.factionName });
                          // Close this small popup
                          setPopupInfo(null); 
                        }}
                        className="w-full mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 inline-block mr-1" />
                        Chat with {popupInfo.factionName}
                      </button>
                      {/* You can add more buttons here later (e.g., "Declare War") */}
                    </div>
                </Popup>
            )}
        </Map>

        {/* Simple UI overlay for game info and controls */}
        <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-75 text-white p-4 rounded-lg shadow-lg">
            {gameState ? (
                <>
                    <p>Turn: <span className="font-semibold">{gameState.turn_number}</span></p>
                    <p>Date: <span className="font-semibold">{new Date(gameState.currentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span></p>
                </>
            ) : (
                <p>Loading game state...</p>
            )}
        </div>

        {!isChatVisible && (
            <div className="absolute top-4 right-4 z-20 ">
                <button
                    title="Open Advisor"
                    onClick={() => setIsChatVisible(true)}
                    className="bg-gray-900 bg-opacity-75 text-white p-3 rounded-lg shadow-lg hover:bg-opacity-100 transition-colors"
                >
                    <User className="w-6 h-6" />
                </button>
            </div>
        )}

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
            <button 
                onClick={handleNextTurn}
                disabled={isLoading}
                className="px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-xl hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300"
            >
                {isLoading ? 'Processing...' : 'Next Turn'}
            </button>
        </div>

        <CounselorChat 
            gameId={gameId}
            isOpen={isChatVisible}
            onClose={() => setIsChatVisible(false)}
        />

        {chatTarget && (
          <DiploChat
            gameId={gameId}
            factionId={chatTarget.factionId}
            factionName={chatTarget.factionName}
            onClose={() => setChatTarget(null)}
          />
        )}
    </div>
            
    );
}