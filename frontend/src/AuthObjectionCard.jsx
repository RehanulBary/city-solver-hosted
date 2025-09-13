import React, { useEffect, useState } from "react";

const AuthObjectionCard = ({ objection, onResolved, isResolvedTab }) => {
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
      } catch {
        setAreaName("Unknown area");
      }
    };
    fetchAreaName();
  }, [objection.latitude, objection.longitude]);

  const handleResolved = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/objections/${objection.id}/resolve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      onResolved?.(objection.id);
      alert("Marked pending approval (owner must confirm).");
    } catch (err) {
      console.error(err);
      alert("Failed to mark resolved: " + err.message);
    }
  };

  return (
    <div className="bg-gray-800 shadow-lg rounded-xl p-4 mb-4 border border-gray-700 text-gray-200">
      <div>
        <h3 className="text-lg font-semibold">{objection.objection_type}</h3>
        <p className="text-gray-300 mt-1">{objection.description}</p>
        <p className="text-gray-400 text-sm mt-1">Location: {areaName}</p>
        <p className="text-xs text-gray-500 mt-1">Status: {objection.status}</p>
      </div>

      {objection.image_url && (
        <div className="w-full aspect-video overflow-hidden rounded-xl my-3">
          <img src={objection.image_url} alt="Objection" className="w-full h-full object-cover" />
        </div>
      )}

      <div>
        <button
          onClick={isResolvedTab ? undefined : handleResolved}
          className={`px-4 py-2 rounded-lg text-white font-medium transition ${isResolvedTab ? "bg-gray-500 cursor-default" : "bg-green-600 hover:bg-green-700 cursor-pointer"}`}
        >
          {isResolvedTab ? "Resolved" : "Resolve"}
        </button>
      </div>
    </div>
  );
};

export default AuthObjectionCard;
