import express from "express";
import mysql from "mysql2";
import cors from "cors";

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "$$596552",
  database: "objections"
});

db.connect((err) => {
  if (err) {
    console.error("DB connection error:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

// POST endpoint to save objection
app.post("/api/objections", (req, res) => {
  const { description, latitude, longitude, image_url, objection_type } = req.body;

  if (!description || !latitude || !longitude || !image_url || !objection_type) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const sql = `INSERT INTO objections (description, latitude, longitude, image_url, objection_type)
               VALUES (?, ?, ?, ?, ?)`;

  db.query(sql, [description, latitude, longitude, image_url, objection_type], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database insert failed" });
    }
    res.status(201).json({ message: "Objection saved successfully", id: result.insertId });
  });
});

// Optional: GET endpoint to fetch objections
app.get("/api/objections", (req, res) => {
  const sql = "SELECT * FROM objections ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database fetch failed" });
    }
    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
