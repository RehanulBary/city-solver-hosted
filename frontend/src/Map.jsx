import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ----------------- ObjectionForm -----------------
function ObjectionForm({ latitude, longitude, onClose }) {
  const [imageFile, setImageFile] = useState(null);
  const [description, setDescription] = useState("");
  const [objectionType, setObjectionType] = useState("potholes");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!description || !imageFile) return alert("Please fill all fields");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", "civil_service");

      const cloudRes = await fetch(
        "https://api.cloudinary.com/v1_1/du3ucafou/image/upload",
        { method: "POST", body: formData }
      );
      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) throw new Error("Cloudinary upload failed");

      const payload = {
        description,
        latitude,
        longitude,
        image_url: cloudData.secure_url,
        objection_type: objectionType,
      };

      const res = await fetch("http://localhost:8080/api/objections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Backend error");

      alert("Objection submitted successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error submitting objection.");
    }
    setLoading(false);
  };

  return (
    <div className="w-64 p-2 bg-white rounded-lg shadow-md">
      <select
        value={objectionType}
        onChange={(e) => setObjectionType(e.target.value)}
        className="mb-2 w-full p-1 border rounded"
      >
        <option value="potholes">Potholes</option>
        <option value="streetlights">Streetlights</option>
        <option value="signboards">Signboards</option>
        <option value="drainage">Drainage</option>
      </select>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={3}
        className="mb-2 w-full p-1 border rounded resize-none"
      />

      <input
        type="file"
        onChange={(e) => setImageFile(e.target.files[0])}
        className="mb-2 w-full text-sm"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white p-1 rounded"
      >
        {loading ? "Uploading..." : "Submit"}
      </button>
    </div>
  );
}

// ----------------- RecenterMap -----------------
function RecenterMap({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 18); // zoom ~100m
    }
  }, [target, map]);
  return null;
}

// ----------------- MapPage -----------------
export default function MapPage() {
  const [userPosition, setUserPosition] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserPosition(coords);
          setSelectedPosition(coords);
        },
        () => {
          const fallback = [24.8949, 91.8687]; // Sylhet fallback
          setUserPosition(fallback);
          setSelectedPosition(fallback);
        }
      );
    }
  };

  useEffect(() => {
    locateUser();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setUserPosition(coords);
        setSelectedPosition(coords);
      } else {
        alert("Location not found");
      }
    } catch (err) {
      console.error(err);
      alert("Error searching location");
    }
  };

  function ClickHandler() {
    useMapEvents({
      click(e) {
        setSelectedPosition([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  }

  const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  if (!userPosition) return <div>Loading map...</div>;

  return (
    <div className="relative w-full min-h-screen">
      {/* Search Box */}
      <div className="absolute top-4 left-4 z-50 flex items-center bg-white rounded shadow p-2">
        <input
          type="text"
          placeholder="Search location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border p-1 rounded mr-2"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded"
        >
          Search
        </button>
      </div>

      {/* Current Location Button */}
      <button
        onClick={locateUser}
        className="absolute bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg"
        title="Go to current location"
      >
        📍
      </button>

      <MapContainer
        center={userPosition}
        zoom={18}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler />

        {/* Recenter map when selectedPosition changes */}
        <RecenterMap target={selectedPosition || userPosition} />

        {/* 100-meter circle */}
        {userPosition && (
          <Circle
            center={userPosition}
            radius={100}
            pathOptions={{ color: "blue", fillOpacity: 0.1 }}
          />
        )}

        {/* Marker */}
        {selectedPosition && (
          <Marker position={selectedPosition} icon={defaultIcon}>
            <Popup>
              <ObjectionForm
                latitude={selectedPosition[0]}
                longitude={selectedPosition[1]}
                onClose={() => setSelectedPosition(null)}
              />
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
