// ObjectionCard.jsx
import React, { useState, useEffect } from "react";

const ObjectionCard = ({ objection, onResolved, isResolvedTab }) => {
  const [areaName, setAreaName] = useState("Loading...");

  useEffect(() => {
    const fetchAreaName = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${objection.latitude}&lon=${objection.longitude}`,
          { headers: { "User-Agent": "ObjectionApp/1.0" } }
        );
        const data = await res.json();
        setAreaName(data.display_name || "Unknown area");
      } catch (err) {
        console.error("Error fetching area name:", err);
        setAreaName("Unknown area");
      }
    };
    fetchAreaName();
  }, [objection.latitude, objection.longitude]);

  const handleResolved = async () => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/objections/${objection.id}/resolve`,
        { method: "PATCH" }
      );
      if (res.ok) onResolved(objection.id);
    } catch (err) {
      console.error("Failed to resolve:", err);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4 border border-gray-200
                    transition-transform duration-600 ease-in-out transform hover:scale-101 hover:shadow-xl cursor-pointer">
      <h2 className="text-lg font-semibold mb-1">{objection.objection_type}</h2>
      <p className="text-gray-700 mb-1">{objection.description}</p>
      <p className="text-gray-500 text-sm mb-2">
        Location: {areaName} (Lat: {objection.latitude}, Lng: {objection.longitude})
      </p>

      {objection.image_url && (
        <div className="w-full aspect-video overflow-hidden rounded mb-3">
          <img
            src={objection.image_url}
            alt="Objection"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <button
        onClick={isResolvedTab ? undefined : handleResolved}
        className={`px-4 py-2 rounded text-white transition-colors duration-300
          ${isResolvedTab ? "bg-gray-400 cursor-default" : "bg-green-500 hover:bg-green-600 cursor-pointer"}`}
      >
        {isResolvedTab ? "Resolved" : "Resolve"}
      </button>
    </div>
  );
};

export default ObjectionCard;
