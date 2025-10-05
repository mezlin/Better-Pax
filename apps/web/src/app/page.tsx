'use client'; // Telling Next.js this is a client component

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

export default function Home() {
  //State to track if we are on the client side
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    //Set the state to true to indicate we are on the client side
    setIsClient(true);
  }, []);

  //Dynamically import the Map component preventing SSR
  const Map = useMemo(() => dynamic(
    () => import('@/components/MapLayer'), // The path to the Map component
    {
      loading: () => <p>A map is loading...</p>, // A temporary message while the component loads
      ssr: false, // This disables Server-Side Rendering for the Map.
    }
  ), []);

  return(
    <div>
      {isClient ? <Map /> : <p>Loading map...</p>}
    </div>
  );
}