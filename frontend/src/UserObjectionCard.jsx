import React, { useEffect, useState } from "react";

const UserObjectionCard = ({ objection, onApprove }) => {
  const [areaName, setAreaName] = useState("Loading...");

  useEffect(() => {
    const fetchAreaName = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${objection.latitude}&lon=${objection.longitude}`,
          { headers: { "User-Agent": "UserObjectionApp/1.0" } }
        );
        const data = await res.json();
        setAreaName(data.display_name || "Unknown area");
      } catch {
        setAreaName("Unknown area");
      }
    };
    fetchAreaName();
  }, [objection.latitude, objection.longitude]);

  return (
    <div className="bg-gray-800 shadow-lg rounded-xl p-4 mb-4 border border-gray-700">
      <div>
        <h3 className="text-lg font-semibold text-gray-100">
          {objection.objection_type}
        </h3>
        <p className="text-gray-300 mt-1">{objection.description}</p>
        <p className="text-gray-400 text-sm mt-1">Location: {areaName}</p>
        <p className="text-xs text-gray-500 mt-1">Status: {objection.status}</p>
      </div>

      {objection.image_url && (
        <div className="w-full aspect-video overflow-hidden rounded my-3">
          <img
            src={objection.image_url}
            alt="Objection"
            className="w-full h-full object-cover rounded"
          />
        </div>
      )}

      {/* Show Approve button if callback is provided */}
      {onApprove && (
        <button
          onClick={() => onApprove(objection.id)}
          className="px-4 py-2 mt-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium transition cursor-pointer"
        >
          Approve resolution
        </button>
      )}
    </div>
  );
};

export default UserObjectionCard;
