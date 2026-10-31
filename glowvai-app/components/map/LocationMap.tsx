import React from 'react';
import './location-map.css';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  label: string;
}

// Half-width of the map window in degrees, about 650 m either side at Vijayawada's latitude.
const SPAN = 0.006;

// OpenStreetMap embed: no API key and no third-party tracking, so it fits the shop's CSP.
export const LocationMap: React.FC<LocationMapProps> = ({ latitude, longitude, label }) => {
  const bbox = [longitude - SPAN, latitude - SPAN, longitude + SPAN, latitude + SPAN].join('%2C');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <div className="location-map">
      <iframe title={label} src={src} loading="lazy" referrerPolicy="no-referrer" />
    </div>
  );
};
