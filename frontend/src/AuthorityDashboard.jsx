import React, { useEffect, useState } from "react";
import AuthObjectionCard from "./AuthObjectionCard";

export default function AuthorityDashboard() {
  const [unresolved, setUnresolved] = useState([]);
  const [pendingApproval, setPendingApproval] = useState([]);
  const [resolved, setResolved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("unresolved");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchObjections();
  }, []);

  const fetchObjections = async () => {
    setLoading(true);
    try {
      const [unresRes, pendingRes, resRes] = await Promise.all([
        fetch("http://localhost:8080/api/objections?status=pending", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://localhost:8080/api/objections?status=pending_approval", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://localhost:8080/api/objections/resolved", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const unresData = await unresRes.json();
      const pendingData = await pendingRes.json();
      const resData = await resRes.json();

      setUnresolved(unresData.filter(o => o.status === "pending"));
      setPendingApproval(pendingData.filter(o => o.status === "pending_approval"));
      setResolved(resData.map(r => ({ ...r, status: "resolved" })));
    } catch (err) {
      console.error(err);
      alert("Failed to fetch objections.");
    }
    setLoading(false);
  };

  const markPendingApproval = (id) => {
    const moved = unresolved.find(o => o.id === id);
    if (moved) {
      setUnresolved(prev => prev.filter(o => o.id !== id));
      setPendingApproval(prev => [...prev, { ...moved, status: "pending_approval" }]);
    }
  };

  if (loading) return <p className="text-center mt-4 text-gray-200">Loading objections...</p>;

  const getDisplay = () => {
    if (tab === "unresolved") return unresolved;
    if (tab === "pendingApproval") return pendingApproval;
    return resolved;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="w-full bg-gray-800 text-white shadow-md py-4 px-6 flex justify-between items-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-100 truncate">
          Authority Dashboard
        </h1>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/signin";
          }}
          className="px-3 hover:cursor-pointer py-1 sm:px-4 sm:py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm sm:text-base"
        >
          Logout
        </button>
      </header>

      {/* Main content */}
      <div className="flex-grow p-4 max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center mb-6 gap-2 sm:gap-3">
          <button
            onClick={() => setTab("unresolved")}
            className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition ${
              tab === "unresolved"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => setTab("pendingApproval")}
            className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition ${
              tab === "pendingApproval"
                ? "bg-yellow-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"
            }`}
          >
            Pending Approval
          </button>
          <button
            onClick={() => setTab("resolved")}
            className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition ${
              tab === "resolved"
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"
            }`}
          >
            Resolved
          </button>
        </div>

        {/* Content */}
        {getDisplay().length === 0 ? (
          <p className="text-center text-gray-400">No objections in this tab.</p>
        ) : (
          getDisplay().map(obj => (
            <AuthObjectionCard
              key={obj.id}
              objection={obj}
              isResolvedTab={tab === "resolved"}
              onResolved={tab === "unresolved" ? markPendingApproval : undefined}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 py-3 text-center mt-auto">
        <p className="text-gray-100 font-semibold text-lg">
          "Let's fix what needs fixing"
        </p>
      </footer>
    </div>
  );
}
