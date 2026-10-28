
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const pool = require("./src/config/database");
const authRoutes = require("./src/routes/auth");
const entryRoutes = require("./src/routes/entries");

const app = express();

// Si utilizas un proxy HTTPS en producción.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Middlewares de seguridad y solicitudes.
app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sesiones persistidas en PostgreSQL.
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    name: "pasantias.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    },
  })
);

// Ruta para comprobar que el backend funciona.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend de pasantías funcionando",
  });
});

// Rutas de autenticación y jornadas.
app.use("/api/auth", authRoutes);
app.use("/api/entries", entryRoutes);

// Ruta para endpoints inexistentes.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// Manejo básico de errores.
app.use((err, req, res, next) => {
  console.error("Error del servidor:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
});

// Puerto asignado por Render o 4000 para desarrollo local
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;
