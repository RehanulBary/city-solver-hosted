import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// PORT automatically assigned by Railway
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

// CORS - allow all origins for now
app.use(cors());
app.use(express.json());

// MySQL pool using Railway environment variables
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

// Promisified query helper
const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

// ------------------- AUTH -------------------

// Signup route
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const hash = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)";
    const result = await q(sql, [name || null, email, hash, role || "user"]);
    res.status(201).json({ message: "User created", id: result.insertId });
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email already in use" });
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Signin route
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const rows = await q("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signin failed" });
  }
});

// JWT authentication middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ------------------- OBJECTIONS -------------------

// Get objections (authority can filter by status)
app.get("/api/objections", authenticateJWT, async (req, res) => {
  try {
    const { status } = req.query;
    let sql, params = [];

    if (req.user.role === "authority") {
      sql = "SELECT o.*, u.name AS owner_name, u.email AS owner_email FROM objections o LEFT JOIN users u ON o.user_id = u.id";
      if (status) {
        sql += " WHERE o.status = ?";
        params.push(status);
      } else {
        sql += " WHERE o.status != 'resolved'";
      }
      sql += " ORDER BY created_at DESC";
    } else {
      sql = "SELECT * FROM objections WHERE user_id = ?";
      params.push(req.user.id);
      if (status) sql += " AND status = ?";
      sql += " ORDER BY created_at DESC";
    }

    const rows = await q(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch objections" });
  }
});

// Authority marks objection pending_approval
app.patch("/api/objections/:id/resolve", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "authority") return res.status(403).json({ error: "Not authorized" });

    const id = req.params.id;
    const rows = await q("SELECT * FROM objections WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: "Objection not found" });

    await q("UPDATE objections SET status = 'pending_approval' WHERE id = ?", [id]);
    res.json({ message: "Marked pending approval - awaiting owner confirmation" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark pending approval" });
  }
});

// Owner approves objection
app.patch("/api/objections/:id/approve", authenticateJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const rows = await q("SELECT * FROM objections WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: "Objection not found" });

    const obj = rows[0];
    if (obj.user_id !== userId) return res.status(403).json({ error: "Only owner can approve" });
    if (obj.status !== "pending_approval") return res.status(400).json({ error: "Objection not awaiting approval" });

    await q(
      "INSERT INTO resolvedObjections (objection_id, user_id, description, latitude, longitude, image_url, objection_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [obj.id, obj.user_id, obj.description, obj.latitude, obj.longitude, obj.image_url, obj.objection_type]
    );
    await q("UPDATE objections SET status = 'resolved' WHERE id = ?", [id]);

    res.json({ message: "Objection approved and marked resolved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve objection" });
  }
});

// Get resolved objections
app.get("/api/objections/resolved", authenticateJWT, async (req, res) => {
  try {
    let rows;
    if (req.user.role === "authority") {
      rows = await q("SELECT r.*, u.name AS owner_name FROM resolvedObjections r LEFT JOIN users u ON r.user_id = u.id ORDER BY resolved_at DESC");
    } else {
      rows = await q("SELECT * FROM resolvedObjections WHERE user_id = ? ORDER BY resolved_at DESC", [req.user.id]);
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch resolved objections" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
