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
  database: "objections",
});

db.connect((err) => {
  if (err) {
    console.error("DB connection error:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

// -------------------- POST: Add Objection --------------------
app.post("/api/objections", (req, res) => {
  const { description, latitude, longitude, image_url, objection_type } = req.body;

  if (!description || !latitude || !longitude || !image_url || !objection_type) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const sql = `INSERT INTO objections (description, latitude, longitude, image_url, objection_type, status)
               VALUES (?, ?, ?, ?, ?, 'pending')`;

  db.query(sql, [description, latitude, longitude, image_url, objection_type], (err, result) => {
    if (err) {
      console.error("DB insert error:", err);
      return res.status(500).json({ error: "Database insert failed" });
    }
    res.status(201).json({ message: "Objection saved successfully", id: result.insertId });
  });
});

// -------------------- PATCH: Resolve Objection --------------------
app.patch("/api/objections/:id/resolve", (req, res) => {
  const { id } = req.params;

  // Fetch the objection first
  const fetchSql = "SELECT * FROM objections WHERE id=?";
  db.query(fetchSql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Fetch failed" });
    if (results.length === 0) return res.status(404).json({ error: "Objection not found" });

    const obj = results[0];

    // Insert into resolvedObjections
    const insertSql = `INSERT INTO resolvedObjections 
                       (description, latitude, longitude, image_url, objection_type)
                       VALUES (?, ?, ?, ?, ?)`;
    db.query(insertSql, [obj.description, obj.latitude, obj.longitude, obj.image_url, obj.objection_type], (err2) => {
      if (err2) return res.status(500).json({ error: "Insert to resolved failed" });

      // Delete from unresolved objections table
      const deleteSql = "DELETE FROM objections WHERE id=?";
      db.query(deleteSql, [id], (err3) => {
        if (err3) return res.status(500).json({ error: "Delete unresolved failed" });
        res.json({ message: "Objection resolved successfully" });
      });
    });
  });
});

// -------------------- GET: Unresolved Objections --------------------
app.get("/api/objections", (req, res) => {
  const sql = "SELECT * FROM objections ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Fetch unresolved failed" });
    res.json(results);
  });
});

// -------------------- GET: Resolved Objections --------------------
app.get("/api/objections/resolved", (req, res) => {
  const sql = "SELECT * FROM resolvedObjections ORDER BY resolved_at DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Fetch resolved failed" });
    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
