import { useEffect } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  CircleMarker,
  useMap,
  useMapEvents,
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
      width:24px;
      height:24px;
      border-radius:9999px;
      background:#2563eb;
      border:4px solid #dbeafe;
      box-shadow:0 0 0 8px rgba(37,99,235,.20);
    "></div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const fallbackCenter = [23.8103, 90.4125];

function pickLat(item) {
  return Number(item?.latitude ?? item?.location?.lat ?? item?.location?.latitude);
}

function pickLng(item) {
  return Number(item?.longitude ?? item?.location?.lng ?? item?.location?.longitude);
}

function Recenter({ center, selectedLocation }) {
  const map = useMap();

  useEffect(() => {
    if (
      selectedLocation &&
      Number.isFinite(Number(selectedLocation.lat)) &&
      Number.isFinite(Number(selectedLocation.lng))
    ) {
      map.setView([Number(selectedLocation.lat), Number(selectedLocation.lng)], 15);
      return;
    }

    if (
      center &&
      Number.isFinite(Number(center.lat)) &&
      Number.isFinite(Number(center.lng))
    ) {
      map.setView([Number(center.lat), Number(center.lng)], 13);
    }
  }, [center, selectedLocation, map]);

  return null;
}

function MapClickHandler({ interactive, onLocationSelect }) {
  useMapEvents({
    click(event) {
      if (!interactive || typeof onLocationSelect !== 'function') return;

      const lat = event.latlng.lat;
      const lng = event.latlng.lng;

      onLocationSelect({ lat, lng });
    },
  });

  return null;
}

export default function MapView({
  reports = [],
  center,
  selectedLocation,
  onLocationSelect,
  interactive = false,
  height = '500px',
}) {
  const validReports = reports.filter((item) => {
    const lat = pickLat(item);
    const lng = pickLng(item);
    return Number.isFinite(lat) && Number.isFinite(lng);
  });

  const mapCenter =
    center &&
    Number.isFinite(Number(center.lat)) &&
    Number.isFinite(Number(center.lng))
      ? [Number(center.lat), Number(center.lng)]
      : validReports.length > 0
      ? [pickLat(validReports[0]), pickLng(validReports[0])]
      : fallbackCenter;

  return (
    <div
      style={{
        width: '100%',
        height,
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        overflow: 'hidden',
        background: '#f8fafc',
        position: 'relative',
      }}
    >
      {interactive && (
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            zIndex: 500,
            borderRadius: '9999px',
            background: 'rgba(255,255,255,0.96)',
            padding: '9px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#2563eb',
            boxShadow: '0 8px 20px rgba(15,23,42,0.12)',
            border: '1px solid #dbeafe',
          }}
        >
          Click map to select report location
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{
          width: '100%',
          height: '100%',
          cursor: interactive ? 'crosshair' : 'grab',
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler
          interactive={interactive}
          onLocationSelect={onLocationSelect}
        />

        <Recenter center={center} selectedLocation={selectedLocation} />

        {center &&
          Number.isFinite(Number(center.lat)) &&
          Number.isFinite(Number(center.lng)) && (
            <CircleMarker
              center={[Number(center.lat), Number(center.lng)]}
              radius={13}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.25,
                weight: 2,
              }}
            >
              <Popup>Your login/current location</Popup>
            </CircleMarker>
          )}

        {selectedLocation &&
          Number.isFinite(Number(selectedLocation.lat)) &&
          Number.isFinite(Number(selectedLocation.lng)) && (
            <Marker
              position={[
                Number(selectedLocation.lat),
                Number(selectedLocation.lng),
              ]}
              icon={selectedIcon}
            >
              <Popup>
                <div style={{ fontSize: '14px' }}>
                  <strong>Selected report location</strong>
                  <br />
                  Latitude: {Number(selectedLocation.lat).toFixed(5)}
                  <br />
                  Longitude: {Number(selectedLocation.lng).toFixed(5)}
                </div>
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
                  {item.createdAt ? (
                    <>
                      <br />
                      Submitted: {new Date(item.createdAt).toLocaleString()}
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