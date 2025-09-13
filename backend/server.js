import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors()); // allow all origins
app.use(express.json());

console.log("Starting server...");

// MySQL pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

console.log("MySQL pool created");

// promise wrapper
const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

// ------------------- AUTH -------------------

// signup
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
    res.status(500).json({ error: "Signup failed" });
  }
});

// signin
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
  } catch {
    res.status(500).json({ error: "Signin failed" });
  }
});

// JWT middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ------------------- OBJECTIONS -------------------

// Get objections (filter by status, role-aware)
app.get("/api/objections", authenticateJWT, async (req, res) => {
  try {
    const { status } = req.query;
    let sql, params = [];

    if (req.user.role === "authority") {
      sql = "SELECT o.*, u.name as owner_name, u.email as owner_email FROM objections o LEFT JOIN users u ON o.user_id = u.id";
      if (status) { sql += " WHERE o.status = ?"; params.push(status); } 
      else { sql += " WHERE o.status != 'resolved'"; }
      sql += " ORDER BY created_at DESC";
    } else {
      sql = "SELECT * FROM objections WHERE user_id = ?";
      params.push(req.user.id);
      if (status) sql += " AND status = ?";
      sql += " ORDER BY created_at DESC";
    }

    const rows = await q(sql, params);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// Authority marks pending_approval
app.patch("/api/objections/:id/resolve", authenticateJWT, async (req, res) => {
  if (req.user.role !== "authority") return res.status(403).json({ error: "Not authorized" });
  try {
    const id = req.params.id;
    const rows = await q("SELECT * FROM objections WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: "Objection not found" });

    await q("UPDATE objections SET status = 'pending_approval' WHERE id = ?", [id]);
    res.json({ message: "Marked pending approval - awaiting owner confirmation" });
  } catch {
    res.status(500).json({ error: "Resolve action failed" });
  }
});

// Owner approves
app.patch("/api/objections/:id/approve", authenticateJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await q("SELECT * FROM objections WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: "Objection not found" });

    const obj = rows[0];
    if (obj.user_id !== req.user.id) return res.status(403).json({ error: "Only owner can approve" });
    if (obj.status !== "pending_approval") return res.status(400).json({ error: "Objection not awaiting approval" });

    await q(
      "INSERT INTO resolvedObjections (objection_id, user_id, description, latitude, longitude, image_url, objection_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [obj.id, obj.user_id, obj.description, obj.latitude, obj.longitude, obj.image_url, obj.objection_type]
    );
    await q("UPDATE objections SET status = 'resolved' WHERE id = ?", [id]);
    res.json({ message: "Objection approved and marked resolved" });
  } catch {
    res.status(500).json({ error: "Approve action failed" });
  }
});

// Get resolved objections
app.get("/api/objections/resolved", authenticateJWT, async (req, res) => {
  try {
    let rows;
    if (req.user.role === "authority") {
      rows = await q("SELECT r.*, u.name as owner_name FROM resolvedObjections r LEFT JOIN users u ON r.user_id = u.id ORDER BY resolved_at DESC");
    } else {
      rows = await q("SELECT * FROM resolvedObjections WHERE user_id = ? ORDER BY resolved_at DESC", [req.user.id]);
    }
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Fetch resolved failed" });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
