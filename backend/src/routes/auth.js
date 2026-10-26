const express = require("express");
const bcrypt = require("bcrypt");

const pool = require("../config/database");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_NAME = "pasantias.sid";

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (name.length < 2) {
    return res.status(400).json({
      success: false,
      message: "El nombre debe tener al menos 2 caracteres",
    });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Ingresa un correo electrónico válido",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "La contraseña debe tener al menos 6 caracteres",
    });
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);

  if (existing.rowCount > 0) {
    return res.status(409).json({
      success: false,
      message: "Ya existe una cuenta con ese correo electrónico",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email`,
    [name, email, passwordHash]
  );

  req.session.userId = rows[0].id;

  return res.status(201).json({
    success: true,
    user: publicUser(rows[0]),
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Correo y contraseña son obligatorios",
    });
  }

  const { rows } = await pool.query(
    "SELECT id, name, email, password_hash FROM users WHERE email = $1",
    [email]
  );

  const user = rows[0];
  const passwordMatches = user
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message: "Correo o contraseña incorrectos",
    });
  }

  req.session.userId = user.id;

  return res.json({
    success: true,
    user: publicUser(user),
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, email FROM users WHERE id = $1",
    [req.session.userId]
  );

  if (!rows[0]) {
    return req.session.destroy(() => {
      res.clearCookie(COOKIE_NAME);
      res.status(401).json({
        success: false,
        message: "La sesión ya no es válida",
      });
    });
  }

  return res.json({
    success: true,
    user: publicUser(rows[0]),
  });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: "No se pudo cerrar la sesión",
      });
    }

    res.clearCookie(COOKIE_NAME);
    return res.json({ success: true });
  });
});

module.exports = router;
