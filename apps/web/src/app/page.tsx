'use client'; // Telling Next.js this is a client component

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

export default function Home() {
  // We use `useMemo` to ensure the dynamic import only happens once.
  const Map = useMemo(() => dynamic(
    () => import('@/components/Map'), // The path to the Map component
    {
      loading: () => <p>A map is loading...</p>, // A temporary message while the component loads
      ssr: false, // This disables Server-Side Rendering for the Map.
    }
  ), []);

  return <Map />;
}