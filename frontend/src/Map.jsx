import React, { useState, useEffect, useRef } from "react";
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
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [objectionType, setObjectionType] = useState("potholes");
  const [loading, setLoading] = useState(false);

  // Handle image preview
  useEffect(() => {
    if (!imageFile) {
      setPreview(null);
      console.log("No image selected");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    console.log("Preview image set", url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!description || !imageFile) {
      console.log("Missing description or image");
      return alert("Please fill all fields");
    }

    setLoading(true);
    console.log("Submitting objection...");

    try {
      // Upload image to Cloudinary
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", "civil_service");

      const cloudRes = await fetch(
        "https://api.cloudinary.com/v1_1/du3ucafou/image/upload",
        { method: "POST", body: formData }
      );
      const cloudData = await cloudRes.json();
      console.log("Cloudinary response:", cloudData);

      if (!cloudData.secure_url) throw new Error("Cloudinary upload failed");

      // Prepare payload for backend
      const payload = {
        description,
        latitude,
        longitude,
        image_url: cloudData.secure_url,
        objection_type: objectionType,
      };
      console.log("Payload prepared:", payload);

      // Send to backend
      const res = await fetch("http://localhost:8080/api/objections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Backend error");
      console.log("Objection submitted successfully!");

      alert("Objection submitted successfully!");
      onClose();
    } catch (err) {
      console.error("Error submitting objection:", err);
      alert("Error submitting objection.");
    }
    setLoading(false);
  };

  return (
    <div className="p-3 bg-white rounded-lg shadow-2xl border border-gray-200 text-center w-[250px] mx-auto">
      <h3 className="text-xl font-bold mb-3 text-gray-800">Report Issue</h3>

      {/* Objection Type */}
      <div className="mb-2 text-left">
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          value={objectionType}
          onChange={(e) => {
            setObjectionType(e.target.value);
            console.log("Objection type changed:", e.target.value);
          }}
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="Potholes">Potholes</option>
          <option value="Streetlights">Streetlights</option>
          <option value="Signboards">Signboards</option>
          <option value="Drainage">Drainage</option>
          <option value="Garbage">Garbage</option>
          <option value="Water logging">Water logging</option>
          <option value="Encroachment">Encroachment</option>
          <option value="Sidewalk damage">Sidewalk</option>
          <option value="Tree obstruction">Tree</option>
          <option value="Traffic signals">Traffic signals</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Description */}
      <div className="mb-2 text-left">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            console.log("Description updated:", e.target.value);
          }}
          placeholder="Describe the issue in detail..."
          rows={2}
          className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&::-webkit-resize]:hidden"
        />
      </div>

      {/* Image Upload */}
      <div className="mb-2 text-left">
        <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
        <div className="flex items-center space-x-3">
          <label className="cursor-pointer flex-shrink-0 px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-200 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImageFile(e.target.files[0]);
                console.log("Image selected:", e.target.files[0]);
              }}
              className="hidden"
            />
            Upload Image
          </label>
          {preview ? (
            <img
              src={preview}
              alt="preview"
              className="w-16 h-12 object-cover rounded-md border border-gray-300"
            />
          ) : (
            <div className="w-16 h-12 bg-gray-50 border border-gray-300 rounded-md flex items-center justify-center text-xs text-gray-400">
              No image
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {loading ? "Submitting..." : "Submit Report"}
      </button>
    </div>
  );
}

// ----------------- RecenterMap -----------------
function RecenterMap({ target }) {
    const map = useMap();
  
    useEffect(() => {
      if (!target) return;
  
      const mapHeight = map.getSize().y; // map container height in pixels
      const offsetY = mapHeight / 4; // move marker 1/4 screen below center
  
      const targetPoint = map.latLngToContainerPoint(target);
      const adjustedPoint = L.point(targetPoint.x, targetPoint.y - offsetY);
      const adjustedLatLng = map.containerPointToLatLng(adjustedPoint);
  
      map.flyTo(adjustedLatLng, map.getZoom(), { duration: 0.8 });
    }, [target, map]);
  
    return null;
  }
  

// ----------------- Auto-open Marker -----------------
function OpenableMarker({ position, icon, children }) {
  const markerRef = useRef(null);
  useEffect(() => {
    console.log("Opening marker popup at:", position);
    markerRef.current?.openPopup();
  }, [position]);

  return (
    <Marker position={position} icon={icon} ref={markerRef}>
      <Popup
        minWidth={260}
        maxWidth={320}
        className="!flex !justify-center !items-center !p-0 overflow-hidden"
      >
        {children}
      </Popup>
    </Marker>
  );
}

// ----------------- MapPage -----------------
export default function MapPage() {
  const [userPosition, setUserPosition] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [target, setTarget] = useState(null);

  // Get user location
  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          console.log("User location detected:", coords);
          setUserPosition(coords);
          setSelectedPosition(coords);
          setTarget(coords);
        },
        () => {
          const fallback = [24.8949, 91.8687];
          console.log("Geolocation failed, fallback:", fallback);
          setUserPosition(fallback);
          setSelectedPosition(fallback);
          setTarget(fallback);
        }
      );
    }
  };

  useEffect(() => {
    locateUser();
  }, []);

  // Search location
  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      console.log("Search results:", data);

      if (data?.length > 0) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        console.log("Search location found:", coords);
        setUserPosition(coords);
        setSelectedPosition(coords);
        setTarget(coords);
      } else {
        console.log("Location not found");
        alert("Location not found");
      }
    } catch (err) {
      console.error("Error searching location:", err);
      alert("Error searching location");
    }
  };

  // Handle map click
  function ClickHandler() {
    useMapEvents({
      click(e) {
        const coords = [e.latlng.lat, e.latlng.lng];
        console.log("Map clicked at:", coords);
        setSelectedPosition(coords);
        setTarget(coords);
      },
    });
    return null;
  }

  // Marker icon
  const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [26, 42],
    iconAnchor: [13, 42],
  });

  if (!userPosition) return <div className="flex items-center justify-center h-screen bg-gray-50">Loading map...</div>;

  return (
    <div className="relative w-full h-screen">
      {/* Search bar */}
      <div className="absolute top-3 right-4 z-[1000] w-[60%] md:w-auto max-w-xl">
        <div className="flex flex-row items-center bg-white rounded-full shadow-lg border border-gray-300 overflow-hidden">
          <input
            type="text"
            placeholder="Search location"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              console.log("Search input changed:", e.target.value);
            }}
            className="flex-grow px-4 py-2 min-w-0 focus:outline-none text-sm"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:cursor-pointer text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Search
          </button>
        </div>
      </div>

      {/* My location button */}
      <button
        onClick={locateUser}
        className="absolute hover:cursor-pointer bottom-10 right-4 z-[1000] bg-blue-600 hover:bg-blue-700 p-4 rounded-full shadow-lg text-white text-lg transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75v10.5A2.25 2.25 0 0118.75 22.5H5.25A2.25 2.25 0 013 20.25V9.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 22.5V12h6v10.5" />
        </svg>
      </button>

      {/* Map */}
      <MapContainer center={userPosition} zoom={16} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler />
        <RecenterMap target={target} />

        {/* Circle around target */}
        {target && (
          <Circle center={target} radius={100} pathOptions={{ color: "#2563eb", fillOpacity: 0.12 }} />
        )}

        {/* Marker with ObjectionForm */}
        {selectedPosition && (
          <OpenableMarker position={selectedPosition} icon={defaultIcon}>
            <ObjectionForm
              latitude={selectedPosition[0]}
              longitude={selectedPosition[1]}
              onClose={() => {
                console.log("Closing objection form");
                setSelectedPosition(null);
              }}
            />
          </OpenableMarker>
        )}
      </MapContainer>
    </div>
  );
}
