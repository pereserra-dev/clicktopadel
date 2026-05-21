const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const db = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const authMiddleware = require("./middleware/auth.middleware");
const courtsRoutes = require("./routes/courts.routes");
const timeslotsRoutes = require("./routes/timeslots.routes");
const reservationsRoutes = require("./routes/reservations.routes");
const adminRoutes = require("./routes/admin.routes");
const availabilityRoutes = require("./routes/availability.routes");

const app = express();

// Limiter per a rutes d'autenticació, ja que són més sensibles a intents de força bruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Massa intents d'autenticació. Torna-ho a provar d'aquí a uns minuts.",
  },
});

// Limiter específic per a rutes de registre, ja que són més sensibles a abusos
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Has superat el límit de registres permesos temporalment. Torna-ho a provar més tard.",
  },
});

// Configuració de CORS per permetre només el frontend de Vite
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ];

app.use(
  cors({
    origin: function (origin, callback) {
      // permet requests sense origin (Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Origen no permès per CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Endpoint de prueba para verificar que el servidor funciona
app.get("/", (req, res) => {
  res.json({ message: "API de PadelBook funcionant correctament" });
});

// Endpoint de prueba para verificar la conexión con la base de datos
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1");
    res.json({ message: "Connexió amb MySQL correcta" });
  } catch (error) {
    res.status(500).json({ error: "Error connexió BD" });
  }
});

// Rutes d'autenticació
app.use("/auth", authRoutes);

// Endpoint de prueba para verificar que el middleware de autenticación funciona
app.get("/private", authMiddleware, (req, res) => {
  res.json({
    message: "Ruta privada correcta",
    user: req.user
  });
});

// Ruta de pistes
app.use("/courts", courtsRoutes);
// Rutas de franges horàries
app.use("/time-slots", timeslotsRoutes);
// Rutas de reserves
app.use("/reservations", reservationsRoutes);
// Ruta d'administració (protegides per autenticació i rol d'admin)
app.use("/admin", adminRoutes);
// Ruta per obtenir la disponibilitat de pistes i franges horàries per a una data concreta (protegida per autenticació)
app.use("/availability", availabilityRoutes);

// Limiter per a rutes d'autenticació i registre
app.locals.authLimiter = authLimiter;
app.locals.registerLimiter = registerLimiter;

module.exports = app;