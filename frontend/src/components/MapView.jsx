import { useEffect } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

const safeIcon = new L.DivIcon({
  html: `
    <div style="
      width:18px;
      height:18px;
      border-radius:9999px;
      background:#16a34a;
      border:3px solid #dcfce7;
      box-shadow:0 0 0 4px rgba(22,163,74,.18);
    "></div>
  `,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const unsafeIcon = new L.DivIcon({
  html: `
    <div style="
      width:18px;
      height:18px;
      border-radius:9999px;
      background:#e11d48;
      border:3px solid #ffe4e6;
      box-shadow:0 0 0 4px rgba(225,29,72,.18);
    "></div>
  `,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const selectedIcon = new L.DivIcon({
  html: `
    <div style="
      width:20px;
      height:20px;
      border-radius:9999px;
      background:#2563eb;
      border:3px solid #dbeafe;
      box-shadow:0 0 0 4px rgba(37,99,235,.18);
    "></div>
  `,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const fallbackCenter = [23.8103, 90.4125];

function pickLat(item) {
  return Number(item?.latitude ?? item?.location?.lat ?? item?.location?.latitude);
}

function pickLng(item) {
  return Number(item?.longitude ?? item?.location?.lng ?? item?.location?.longitude);
}

function Recenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (
      center &&
      Number.isFinite(Number(center.lat)) &&
      Number.isFinite(Number(center.lng))
    ) {
      map.setView([Number(center.lat), Number(center.lng)], 13);
    }
  }, [center, map]);

  return null;
}

export default function MapView({
  reports = [],
  center,
  selectedLocation,
}) {
  const validReports = reports.filter((item) => {
    const lat = pickLat(item);
    const lng = pickLng(item);
    return Number.isFinite(lat) && Number.isFinite(lng);
  });

  const mapCenter =
    center && Number.isFinite(Number(center.lat)) && Number.isFinite(Number(center.lng))
      ? [Number(center.lat), Number(center.lng)]
      : validReports.length > 0
      ? [pickLat(validReports[0]), pickLng(validReports[0])]
      : fallbackCenter;

  return (
    <div
      style={{
        width: '100%',
        height: '500px',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        overflow: 'hidden',
        background: '#f8fafc',
      }}
    >
      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Recenter center={center} />

        {center &&
          Number.isFinite(Number(center.lat)) &&
          Number.isFinite(Number(center.lng)) && (
            <CircleMarker
              center={[Number(center.lat), Number(center.lng)]}
              radius={12}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.3,
              }}
            >
              <Popup>Your current/saved location</Popup>
            </CircleMarker>
          )}

        {selectedLocation &&
          Number.isFinite(Number(selectedLocation.lat)) &&
          Number.isFinite(Number(selectedLocation.lng)) && (
            <Marker
              position={[Number(selectedLocation.lat), Number(selectedLocation.lng)]}
              icon={selectedIcon}
            >
              <Popup>
                Selected report location
                <br />
                {Number(selectedLocation.lat).toFixed(5)},{' '}
                {Number(selectedLocation.lng).toFixed(5)}
              </Popup>
            </Marker>
          )}

        {validReports.map((item) => {
          const lat = pickLat(item);
          const lng = pickLng(item);
          const status = item.status || 'Pending';
          const icon = status === 'Safe' ? safeIcon : unsafeIcon;

          return (
            <Marker
              key={item._id || `${lat}-${lng}-${item.userName || item.community}`}
              position={[lat, lng]}
              icon={icon}
            >
              <Popup>
                <div style={{ fontSize: '14px' }}>
                  <strong>{item.userName || 'Resident'}</strong>
                  <br />
                  Community: {item.community || 'N/A'}
                  <br />
                  Status: {status}
                  {item.note ? (
                    <>
                      <br />
                      Note: {item.note}
                    </>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}