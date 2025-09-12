// Home.jsx
import React, { useEffect, useState } from "react";
import ObjectionCard from "./ObjectionCard";

const Home = () => {
  const [objections, setObjections] = useState([]);
  const [resolvedObjections, setResolvedObjections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("unresolved");

  useEffect(() => {
    fetchObjections();
  }, []);

  const fetchObjections = async () => {
    try {
      const [unresolvedRes, resolvedRes] = await Promise.all([
        fetch("http://localhost:8080/api/objections"),
        fetch("http://localhost:8080/api/objections/resolved"),
      ]);
      setObjections(await unresolvedRes.json());
      setResolvedObjections(await resolvedRes.json());
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleResolved = (id) => {
    const resolvedItem = objections.find((obj) => obj.id === id);
    if (resolvedItem) setResolvedObjections([resolvedItem, ...resolvedObjections]);
    setObjections(objections.filter((obj) => obj.id !== id));
  };

  if (loading) return <p className="text-center mt-4">Loading objections...</p>;

  const displayObjections = tab === "unresolved" ? objections : resolvedObjections;
  const isResolvedTab = tab === "resolved";

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Objections</h1>

      {/* Tabs */}
      <div className="flex justify-center mb-8 space-x-4">
        <button
          onClick={() => setTab("unresolved")}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-500
            ${tab === "unresolved" ? "bg-blue-600 text-white shadow-lg scale-105" : "bg-gray-200 text-gray-700 hover:bg-blue-500 hover:text-white hover:scale-105"}
            cursor-pointer`}
        >
          Unresolved
        </button>

        <button
          onClick={() => setTab("resolved")}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-500
            ${tab === "resolved" ? "bg-green-600 text-white shadow-lg scale-105" : "bg-gray-200 text-gray-700 hover:bg-green-500 hover:text-white hover:scale-105"}
            cursor-pointer`}
        >
          Resolved
        </button>
      </div>

      {displayObjections.length === 0 ? (
        <p className="text-center text-gray-500">No {tab} objections found.</p>
      ) : (
        displayObjections.map((obj) => (
          <ObjectionCard
            key={obj.id}
            objection={obj}
            onResolved={handleResolved}
            isResolvedTab={isResolvedTab}
          />
        ))
      )}
    </div>
  );
};

export default Home;
