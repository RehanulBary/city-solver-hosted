import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ---------------- RecenterMap ----------------
function RecenterMap({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const mapHeight = map.getSize().y;
    const offsetY = mapHeight / 4;
    const targetPoint = map.latLngToContainerPoint(target);
    const adjustedPoint = L.point(targetPoint.x, targetPoint.y - offsetY);
    const adjustedLatLng = map.containerPointToLatLng(adjustedPoint);
    map.flyTo(adjustedLatLng, map.getZoom(), { duration: 0.8 });
  }, [target, map]);
  return null;
}

// ---------------- OpenableMarker ----------------
function OpenableMarker({ position, icon, children }) {
  const markerRef = useRef(null);
  useEffect(() => {
    markerRef.current?.openPopup();
  }, [position]);
  return (
    <Marker position={position} icon={icon} ref={markerRef}>
      <Popup minWidth={260} maxWidth={320}>{children}</Popup>
    </Marker>
  );
}

// ---------------- ObjectionForm ----------------
function ObjectionForm({ latitude, longitude, onClose }) {
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [objectionType, setObjectionType] = useState("Potholes");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!imageFile) return setPreview(null);
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleSubmit = async () => {
    console.log("Submitting objection...");
    console.log("Description:", description);
    console.log("Latitude:", latitude, "Longitude:", longitude);
    console.log("Objection type:", objectionType);
    console.log("Image file:", imageFile);

    const token = localStorage.getItem("token");
    console.log("JWT token from localStorage:", token);

    if (!description || !imageFile) return alert("Please fill all fields.");
    if (!token) return alert("You must sign in.");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", "civil_service");

      const cloudRes = await fetch("https://api.cloudinary.com/v1_1/du3ucafou/image/upload", {
        method: "POST",
        body: formData,
      });

      const cloudData = await cloudRes.json();
      console.log("Cloudinary response:", cloudData);

      if (!cloudData.secure_url) throw new Error("Upload failed");

      const payload = {
        description,
        latitude,
        longitude,
        image_url: cloudData.secure_url,
        objection_type: objectionType,
      };
      console.log("Payload to backend:", payload);

      const res = await fetch("http://localhost:8080/api/objections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("Backend response status:", res.status);
      const resData = await res.json();
      console.log("Backend response data:", resData);

      if (!res.ok) throw new Error(resData.error || "Backend error");

      alert("Objection submitted");
      onClose();
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Submit failed");
    }
    setLoading(false);
  };


  return (
    <div style={{ width: 260, padding: 8 }}>
      <h3 className="font-semibold mb-2">Report Issue</h3>

      <div className="mb-2">
        <label className="block text-sm">Type</label>
        <select value={objectionType} onChange={(e) => setObjectionType(e.target.value)} className="w-full p-1 border rounded">
          <option>Potholes</option>
          <option>Streetlights</option>
          <option>Signboards</option>
          <option>Drainage</option>
          <option>Garbage</option>
          <option>Other</option>
        </select>
      </div>

      <div className="mb-2">
        <label className="block text-sm">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full p-1 border rounded" />
      </div>

      <div className="mb-2">
        <label className="block text-sm">Photo</label>
        <div className="flex items-center space-x-2">
          <label className="px-3 py-1 bg-blue-100 rounded cursor-pointer">
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="hidden" />
            Upload
          </label>
          {preview ? <img src={preview} alt="preview" style={{ width: 80, height: 56, objectFit: "cover" }} /> : <div style={{ width: 80, height: 56, background: "#f3f4f6" }} />}
        </div>
      </div>

      <div className="flex space-x-2">
        <button onClick={handleSubmit} disabled={loading} className="w-full px-3 hover:cursor-pointer py-1 bg-blue-600 text-white rounded">
          {loading ? "Sending..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

// ---------------- MapPage ----------------
export default function MapPage() {
  const [userPosition, setUserPosition] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [target, setTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    locateUser();
  }, []);

  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserPosition(coords);
          setSelectedPosition(coords);
          setTarget(coords);
        },
        () => fallbackLocation()
      );
    } else fallbackLocation();
  };

  const fallbackLocation = () => {
    const fallback = [24.8949, 91.8687];
    setUserPosition(fallback);
    setSelectedPosition(fallback);
    setTarget(fallback);
  };

  function ClickHandler() {
    useMapEvents({
      click(e) {
        const coords = [e.latlng.lat, e.latlng.lng];
        setSelectedPosition(coords);
        setTarget(coords);
      },
    });
    return null;
  }

  const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [26, 42],
    iconAnchor: [13, 42],
  });

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data?.length > 0) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setUserPosition(coords);
        setSelectedPosition(coords);
        setTarget(coords);
      } else alert("Location not found");
    } catch (err) {
      console.error(err);
      alert("Search failed");
    }
  };

  if (!userPosition) return <div className="flex items-center justify-center h-screen">Loading map...</div>;

  return (
    <div className="w-full h-screen relative">
      {/* Search Bar */}
      <div className="absolute top-3 right-4 z-[1000] flex max-w-xs w-60 sm:w-full space-x-1">
        <input
          type="text"
          placeholder="Search location"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 text-sm rounded-l-full border border-gray-600 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />


        {/* Button */}
        <div className="flex-none ">
          <button
            onClick={handleSearch}
            className="px-4 py-2 hover:cursor-pointer text-white bg-blue-600 rounded-r-full hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* My Location Button */}
      <button
        onClick={locateUser}
        className="absolute hover:cursor-pointer bottom-6 right-4 z-[1000] bg-blue-600 hover:bg-blue-700 p-3 rounded-full text-white shadow-lg flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-10 0h10" />
        </svg>
      </button>

      {/* Map */}
      <MapContainer center={userPosition} zoom={16} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler />
        <RecenterMap target={target} />

        {target && <Circle center={target} radius={100} pathOptions={{ color: "#2563eb", fillOpacity: 0.12 }} />}

        {selectedPosition && (
          <OpenableMarker position={selectedPosition} icon={defaultIcon}>
            <ObjectionForm latitude={selectedPosition[0]} longitude={selectedPosition[1]} onClose={() => setSelectedPosition(null)} />
          </OpenableMarker>
        )}
      </MapContainer>
    </div>
  );
}
