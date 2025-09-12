import React, { useState } from "react";

export default function Home() {
  const [imageFile, setImageFile] = useState(null);
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [objectionType, setObjectionType] = useState("potholes");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!imageFile || !description || !latitude || !longitude || !objectionType) {
      alert("Please fill all fields and select an image.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload image to Cloudinary
      const folderPath = `civil/uploads/${objectionType}`;
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", "civil_service"); // case sensitive
      formData.append("cloud_name","du3ucafou")

      formData.append("folder", folderPath);

      const cloudinaryRes = await fetch(
        "https://api.cloudinary.com/v1_1/du3ucafou/image/upload",
        {
          method: "POST",
          body: formData
        }
      );

      const cloudinaryData = await cloudinaryRes.json();
      const imageUrl = cloudinaryData.secure_url;
      console.log(cloudinaryData);


      // Step 2: Send metadata to backend
      const payload = {
        description,
        latitude,
        longitude,
        image_url: imageUrl,
        objection_type: objectionType
      };

      const backendRes = await fetch("http://localhost:8080/api/objections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!backendRes.ok) throw new Error("Backend error");

      alert("Objection submitted successfully!");
      setImageFile(null);
      setDescription("");
      setLatitude("");
      setLongitude("");
      setObjectionType("potholes");
    } catch (err) {
      console.error(err);
      alert("Error uploading image or sending data.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Submit an Objection
        </h1>

        <input
          type="text"
          placeholder="Latitude"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          className="mb-4 w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="text"
          placeholder="Longitude"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          className="mb-4 w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-4 w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          rows={3}
        />

        <select
          value={objectionType}
          onChange={(e) => setObjectionType(e.target.value)}
          className="mb-4 w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="potholes">Potholes</option>
          <option value="streetlights">Streetlights</option>
          <option value="signboards">Signboards</option>
          <option value="drainage">Drainage</option>
        </select>

        <input
          type="file"
          onChange={(e) => setImageFile(e.target.files[0])}
          className="mb-4 w-full text-gray-700"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-3 rounded transition duration-200"
        >
          {loading ? "Uploading..." : "Submit Objection"}
        </button>
      </div>
    </div>
  );
}
