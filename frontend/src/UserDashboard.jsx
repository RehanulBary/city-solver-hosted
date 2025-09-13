import React, { useEffect, useState } from "react";
import UserObjectionCard from "./UserObjectionCard";
import { useNavigate } from "react-router-dom";

export default function UserDashboard() {
  const [pending, setPending] = useState([]);
  const [resolved, setResolved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, resolvedRes] = await Promise.all([
        fetch("http://localhost:8080/api/objections", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:8080/api/objections/resolved", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const pendingData = await pendingRes.json();
      const resolvedData = await resolvedRes.json();

      // Store both "pending" and "pending_approval" in pending list
      setPending(
        pendingData.filter(
          (obj) => obj.status === "pending" || obj.status === "pending_approval"
        )
      );

      setResolved(resolvedData.map((obj) => ({ ...obj, status: "resolved" })));
    } catch (err) {
      console.error(err);
      alert("Failed to fetch objections");
    }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/objections/${id}/approve`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Approve failed");
      }

      const approved = pending.find((obj) => obj.id === id);
      if (approved) {
        setPending((prev) => prev.filter((obj) => obj.id !== id));
        setResolved((prev) => [...prev, { ...approved, status: "resolved" }]);
      }

      alert("You approved the resolution. Objection is now resolved.");
    } catch (err) {
      console.error(err);
      alert("Approve failed: " + err.message);
    }
  };

  if (loading)
    return <p className="text-center mt-4 text-gray-200">Loading...</p>;

  const getDisplay = () => (tab === "pending" ? pending : resolved);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="w-full bg-gray-800 text-gray-100 shadow-md px-4 py-3 flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
          My Objections
        </h1>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/signin");
          }}
          className="px-3 hover:cursor-pointer py-1 sm:px-4 sm:py-2 bg-red-600 rounded hover:bg-red-700 text-white text-sm sm:text-base md:text-base"
        >
          Logout
        </button>
      </header>

      {/* Main content */}
      <div className="flex-grow p-4 max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center mb-6 gap-2 sm:gap-3">
          <button
            onClick={() => setTab("pending")}
            className={`px-3 sm:px-5 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition ${
              tab === "pending"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setTab("resolved")}
            className={`px-3 sm:px-5 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition ${
              tab === "resolved"
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => navigate("/objection")}
            className="px-3 sm:px-5 py-1 sm:py-2 rounded-lg bg-purple-600 text-white font-medium text-xs sm:text-sm hover:bg-purple-700 transition cursor-pointer"
          >
            Add Objection
          </button>
        </div>

        {/* Content */}
        {getDisplay().length === 0 ? (
          <p className="text-center text-gray-400">No objections in this tab.</p>
        ) : (
          getDisplay().map((obj) => (
            <UserObjectionCard
              key={obj.id}
              objection={obj}
              onApprove={obj.status !== "resolved" ? handleApprove : undefined} 
            />
          ))
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 py-3 text-center">
        <p className="text-gray-100 font-semibold text-lg">
          "Let's fix what needs fixing"
        </p>
      </footer>
    </div>
  );
}
