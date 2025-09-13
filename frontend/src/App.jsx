import React from "react";
import { Link } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="w-full bg-gray-900 text-white shadow-md py-4 px-6 flex flex-col sm:flex-row sm:justify-between sm:items-center">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left mb-3 sm:mb-0">
          Civil Service Portal
        </h1>

        <div className="hidden sm:flex">
          {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center w-full sm:w-auto">
          <Link
            to="/signin"
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition mb-2 sm:mb-0 sm:mr-3 w-full sm:w-auto text-center"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition w-full sm:w-auto text-center"
          >
            Sign Up
          </Link>
        </div>
        </div>
      </header>
      <div className="flex sm:hidden text-white">
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center w-full sm:w-auto">
          <Link
            to="/signin"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition sm:mb-0 sm:mr-3 w-full sm:w-auto text-center"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 transition w-full sm:w-auto text-center"
          >
            Sign Up
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-grow p-6 text-center">
        <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 text-gray-800">
          Report civic issues in your area easily
        </h2>
        <p className="text-gray-600 mb-6 max-w-xl text-lg sm:text-xl">
          View pending objections, track progress, and help local authorities fix
          what matters in your community.
        </p>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 text-center">
        <p className="text-gray-100 font-semibold text-lg">
          "Let's fix what needs fixing"
        </p>
      </footer>
    </div>
  );
}
