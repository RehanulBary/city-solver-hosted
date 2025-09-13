import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 8080;
const JWT_SECRET = "replace_this_secret_in_prod";
const CLIENT_ORIGIN = "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

console.log("Starting server...");

// MySQL pool
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "$$596552",
  database: "objections",
});

console.log("MySQL pool created");

// promise wrapper
const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    console.log("Executing SQL:", sql, "Params:", params);
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error("SQL Error:", err);
        return reject(err);
      }
      console.log("SQL Result:", results);
      resolve(results);
    });
  });

// ------------------- AUTH -------------------

// signup
app.post("/api/auth/signup", async (req, res) => {
  console.log("Signup request body:", req.body);
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) {
      console.log("Signup failed: missing email/password");
      return res.status(400).json({ error: "Email and password required" });
    }
    const hash = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)";
    const result = await q(sql, [name || null, email, hash, role || "user"]);
    console.log("User created with ID:", result.insertId);
    res.status(201).json({ message: "User created", id: result.insertId });
  } catch (err) {
    console.error("Signup error:", err);
    if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email already in use" });
    res.status(500).json({ error: "Signup failed" });
  }
});

// signin
app.post("/api/auth/signin", async (req, res) => {
  console.log("Signin request body:", req.body);
  try {
    const { email, password } = req.body;
    const rows = await q("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) {
      console.log("Signin failed: user not found");
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      console.log("Signin failed: wrong password");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    console.log("Signin success: token generated for user ID", user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ error: "Signin failed" });
  }
});

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log("Auth header:", authHeader);
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log("JWT payload:", payload);
    req.user = payload;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}

// GET: unresolved / filterable by status
app.get("/api/objections", authenticateJWT, async (req, res) => {
  console.log("Fetch objections for user:", req.user);
  try {
    const { status } = req.query;
    let sql;
    let params = [];

    if (req.user.role === "authority") {
      sql = "SELECT o.*, u.name as owner_name, u.email as owner_email FROM objections o LEFT JOIN users u ON o.user_id = u.id";
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
    console.log("Fetched objections count:", rows.length);
    res.json(rows);
  } catch (err) {
    console.error("Fetch objections error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});


// Authority marks pending_approval
app.patch("/api/objections/:id/resolve", authenticateJWT, async (req, res) => {
  console.log("Resolve request for objection ID:", req.params.id, "User:", req.user);
  try {
    if (req.user.role !== "authority") return res.status(403).json({ error: "Not authorized" });
    const id = req.params.id;
    const rows = await q("SELECT * FROM objections WHERE id = ?", [id]);
    if (!rows.length) {
      console.log("Objection not found");
      return res.status(404).json({ error: "Objection not found" });
    }
    await q("UPDATE objections SET status = 'pending_approval' WHERE id = ?", [id]);
    console.log("Objection marked pending_approval");
    res.json({ message: "Marked pending approval - awaiting owner confirmation" });
  } catch (err) {
    console.error("Resolve action error:", err);
    res.status(500).json({ error: "Resolve action failed" });
  }
});

// Owner approves
app.patch("/api/objections/:id/approve", authenticateJWT, async (req, res) => {
  console.log("Approve request for objection ID:", req.params.id, "User:", req.user);
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const rows = await q("SELECT * FROM objections WHERE id = ?", [id]);
    if (!rows.length) {
      console.log("Objection not found");
      return res.status(404).json({ error: "Objection not found" });
    }
    const obj = rows[0];
    if (obj.user_id !== userId) return res.status(403).json({ error: "Only owner can approve" });
    if (obj.status !== "pending_approval") return res.status(400).json({ error: "Objection not awaiting approval" });

    await q(
      "INSERT INTO resolvedObjections (objection_id, user_id, description, latitude, longitude, image_url, objection_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [obj.id, obj.user_id, obj.description, obj.latitude, obj.longitude, obj.image_url, obj.objection_type]
    );
    await q("UPDATE objections SET status = 'resolved' WHERE id = ?", [id]);
    console.log("Objection approved and marked resolved");
    res.json({ message: "Objection approved and marked resolved" });
  } catch (err) {
    console.error("Approve action error:", err);
    res.status(500).json({ error: "Approve action failed" });
  }
});

// GET: unresolved
app.get("/api/objections", authenticateJWT, async (req, res) => {
  console.log("Fetch unresolved objections for user:", req.user);
  try {
    let rows;
    if (req.user.role === "authority") {
      rows = await q(
        "SELECT o.*, u.name as owner_name, u.email as owner_email FROM objections o LEFT JOIN users u ON o.user_id = u.id WHERE o.status != 'resolved' ORDER BY created_at DESC"
      );
    } else {
      rows = await q("SELECT * FROM objections WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
    }
    console.log("Fetched objections count:", rows.length);
    res.json(rows);
  } catch (err) {
    console.error("Fetch unresolved error:", err);
    res.status(500).json({ error: "Fetch unresolved failed" });
  }
});

// GET: resolved
app.get("/api/objections/resolved", authenticateJWT, async (req, res) => {
  console.log("Fetch resolved objections for user:", req.user);
  try {
    let rows;
    if (req.user.role === "authority") {
      rows = await q("SELECT r.*, u.name as owner_name FROM resolvedObjections r LEFT JOIN users u ON r.user_id = u.id ORDER BY resolved_at DESC");
    } else {
      rows = await q("SELECT * FROM resolvedObjections WHERE user_id = ? ORDER BY resolved_at DESC", [req.user.id]);
    }
    console.log("Fetched resolved objections count:", rows.length);
    res.json(rows);
  } catch (err) {
    console.error("Fetch resolved error:", err);
    res.status(500).json({ error: "Fetch resolved failed" });
  }
});

// GET single objection
app.get("/api/objections/:id", authenticateJWT, async (req, res) => {
  console.log("Fetch single objection ID:", req.params.id, "User:", req.user);
  try {
    const id = req.params.id;
    const rows = await q("SELECT o.*, u.name as owner_name FROM objections o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ?", [id]);
    if (!rows.length) {
      console.log("Objection not found");
      return res.status(404).json({ error: "Not found" });
    }
    console.log("Fetched objection:", rows[0]);
    res.json(rows[0]);
  } catch (err) {
    console.error("Fetch single objection error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ------------------- START SERVER -------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
