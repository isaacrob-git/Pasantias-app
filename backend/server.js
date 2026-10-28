
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
  quiet: true,
});

const app = require("./app");
const pool = require("./src/config/database");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Verificar conexión con PostgreSQL.
    await pool.query("SELECT 1");

    console.log("Conexión con PostgreSQL establecida.");

    const server = app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });

    // Cierre ordenado.
    async function shutdown() {
      console.log("Cerrando servidor...");

      server.close(async () => {
        try {
          await pool.end();
          console.log("Conexiones de PostgreSQL cerradas.");
          process.exit(0);
        } catch (error) {
          console.error("Error al cerrar PostgreSQL:", error.message);
          process.exit(1);
        }
      });
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error.message);
    process.exit(1);
  }
}

startServer();
