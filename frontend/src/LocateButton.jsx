import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";

// Component to handle current location button
function LocateButton({ setSelectedPosition }) {
  const map = useMap();

  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setSelectedPosition(coords); // update marker
        map.flyTo(coords, 17);       // move map smoothly
      });
    } else {
      alert("Geolocation not supported.");
    }
  };

  return (
    <button
      onClick={locateUser}
      className="absolute bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg text-xl"
      title="Go to current location"
    >
      📍
    </button>
  );
}
