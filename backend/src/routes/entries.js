const express = require("express");

const pool = require("../config/database");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_SEGMENTS = 10;

const DAY_COLUMNS = `
  id,
  to_char(work_date, 'YYYY-MM-DD') AS work_date,
  break_minutes,
  total_minutes,
  notes,
  updated_at
`;

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isValidDate(value) {
  if (!DATE_RE.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

router.use(requireAuth);

// GET /api/entries
router.get("/", async (req, res) => {
  const userId = req.session.userId;

  const [daysResult, segmentsResult, summaryResult, userResult] =
    await Promise.all([
      pool.query(
        `SELECT ${DAY_COLUMNS}
         FROM work_days
         WHERE user_id = $1
         ORDER BY work_date DESC`,
        [userId]
      ),
      pool.query(
        `SELECT
           s.id,
           s.day_id,
           to_char(s.start_time, 'HH24:MI') AS start_time,
           to_char(s.end_time, 'HH24:MI') AS end_time
         FROM work_segments s
         JOIN work_days d ON d.id = s.day_id
         WHERE d.user_id = $1
         ORDER BY s.start_time ASC`,
        [userId]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(total_minutes), 0)::int AS total_minutes,
           COALESCE(SUM(total_minutes) FILTER (
             WHERE work_date >= date_trunc('month', CURRENT_DATE)
               AND work_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
           ), 0)::int AS month_minutes,
           COUNT(*)::int AS total_days
         FROM work_days
         WHERE user_id = $1`,
        [userId]
      ),
      pool.query("SELECT required_hours FROM users WHERE id = $1", [userId]),
    ]);

  const segmentsByDay = new Map();

  for (const segment of segmentsResult.rows) {
    if (!segmentsByDay.has(segment.day_id)) {
      segmentsByDay.set(segment.day_id, []);
    }

    segmentsByDay.get(segment.day_id).push({
      id: segment.id,
      start_time: segment.start_time,
      end_time: segment.end_time,
    });
  }

  const entries = daysResult.rows.map((day) => ({
    ...day,
    segments: segmentsByDay.get(day.id) || [],
  }));

  const summary = summaryResult.rows[0];
  const requiredMinutes = (userResult.rows[0]?.required_hours ?? 0) * 60;

  return res.json({
    success: true,
    entries,
    summary: {
      ...summary,
      required_minutes: requiredMinutes,
      remaining_minutes: Math.max(0, requiredMinutes - summary.total_minutes),
    },
  });
});

// POST /api/entries  (crea o actualiza la jornada de una fecha)
router.post("/", async (req, res) => {
  const userId = req.session.userId;
  const workDate = String(req.body.work_date || "").trim();
  const breakMinutes = Number(req.body.break_minutes ?? 0);
  const notes = String(req.body.notes || "").trim();
  const rawSegments = req.body.segments;

  if (!isValidDate(workDate)) {
    return res.status(400).json({
      success: false,
      message: "Selecciona una fecha válida",
    });
  }

  if (
    !Array.isArray(rawSegments) ||
    rawSegments.length === 0 ||
    rawSegments.length > MAX_SEGMENTS
  ) {
    return res.status(400).json({
      success: false,
      message: `Agrega entre 1 y ${MAX_SEGMENTS} segmentos de trabajo`,
    });
  }

  if (
    !Number.isInteger(breakMinutes) ||
    breakMinutes < 0 ||
    breakMinutes > 480
  ) {
    return res.status(400).json({
      success: false,
      message: "El descanso debe estar entre 0 y 480 minutos",
    });
  }

  if (notes.length > 500) {
    return res.status(400).json({
      success: false,
      message: "Las notas no pueden superar los 500 caracteres",
    });
  }

  const segments = [];

  for (const item of rawSegments) {
    const startTime = String(item?.start_time || "").trim();
    const endTime = String(item?.end_time || "").trim();

    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: "Cada segmento debe tener horas válidas (HH:MM)",
      });
    }

    if (endTime <= startTime) {
      return res.status(400).json({
        success: false,
        message:
          "En cada segmento, la hora de fin debe ser posterior a la de inicio",
      });
    }

    segments.push({ startTime, endTime });
  }

  segments.sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (let index = 1; index < segments.length; index += 1) {
    if (segments[index].startTime < segments[index - 1].endTime) {
      return res.status(400).json({
        success: false,
        message: "Los segmentos no pueden solaparse entre sí",
      });
    }
  }

  const totalMinutes =
    segments.reduce(
      (total, segment) =>
        total + timeToMinutes(segment.endTime) - timeToMinutes(segment.startTime),
      0
    ) - breakMinutes;

  if (totalMinutes <= 0) {
    return res.status(400).json({
      success: false,
      message: "El descanso no puede ser mayor o igual a las horas trabajadas",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const dayResult = await client.query(
      `INSERT INTO work_days
         (user_id, work_date, break_minutes, total_minutes, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, work_date) DO UPDATE SET
         break_minutes = EXCLUDED.break_minutes,
         total_minutes = EXCLUDED.total_minutes,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING ${DAY_COLUMNS}`,
      [userId, workDate, breakMinutes, totalMinutes, notes || null]
    );

    const day = dayResult.rows[0];

    await client.query("DELETE FROM work_segments WHERE day_id = $1", [day.id]);

    const savedSegments = [];

    for (const segment of segments) {
      const segmentResult = await client.query(
        `INSERT INTO work_segments (day_id, start_time, end_time)
         VALUES ($1, $2, $3)
         RETURNING
           id,
           to_char(start_time, 'HH24:MI') AS start_time,
           to_char(end_time, 'HH24:MI') AS end_time`,
        [day.id, segment.startTime, segment.endTime]
      );

      savedSegments.push(segmentResult.rows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      entry: { ...day, segments: savedSegments },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

// DELETE /api/entries/:id
router.delete("/:id", async (req, res) => {
  const entryId = Number(req.params.id);

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Registro no válido",
    });
  }

  const result = await pool.query(
    "DELETE FROM work_days WHERE id = $1 AND user_id = $2",
    [entryId, req.session.userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      success: false,
      message: "Registro no encontrado",
    });
  }

  return res.json({ success: true });
});

module.exports = router;
