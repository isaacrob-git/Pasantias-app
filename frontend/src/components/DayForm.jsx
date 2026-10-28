import { useMemo, useState } from "react";

import { api } from "../services/api";
import { formatDateLong, formatMinutes, timeToMinutes } from "../utils/format";

const MAX_SEGMENTS = 10;

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function calculateTotal(segments, breakMinutes) {
  let workedMinutes = 0;
  const sorted = [...segments].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  for (let index = 0; index < sorted.length; index += 1) {
    const start = timeToMinutes(sorted[index].start_time);
    const end = timeToMinutes(sorted[index].end_time);

    if (start === null || end === null) {
      return {
        total: null,
        error: "Completa la hora de inicio y de fin de cada segmento.",
      };
    }

    if (end <= start) {
      return {
        total: null,
        error:
          "En cada segmento, la hora de fin debe ser posterior a la de inicio.",
      };
    }

    if (index > 0 && sorted[index].start_time < sorted[index - 1].end_time) {
      return {
        total: null,
        error: "Los segmentos no pueden solaparse entre sí.",
      };
    }

    workedMinutes += end - start;
  }

  const rest = Number(breakMinutes);

  if (!Number.isInteger(rest) || rest < 0) {
    return {
      total: null,
      error: "El descanso debe ser un número entero de minutos.",
    };
  }

  const total = workedMinutes - rest;

  if (total <= 0) {
    return {
      total: null,
      error: "El descanso no puede ser mayor o igual a las horas trabajadas.",
    };
  }

  return { total, error: null };
}

function getSegmentDuration(segment) {
  const start = timeToMinutes(segment.start_time);
  const end = timeToMinutes(segment.end_time);

  if (start === null || end === null || end <= start) return null;
  return end - start;
}

export default function DayForm({
  date,
  entry,
  onDateChange,
  onSaved,
  onDeleted,
}) {
  const [segments, setSegments] = useState(() => {
    if (entry?.segments?.length) {
      return entry.segments.map((segment) => ({
        start_time: segment.start_time,
        end_time: segment.end_time,
      }));
    }

    return [{ start_time: "07:00", "end_time": "16:00" }];
  });
  const [breakMinutes, setBreakMinutes] = useState(
    entry ? String(entry.break_minutes) : "60"
  );
  const [notes, setNotes] = useState(entry?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const calculation = useMemo(
    () => calculateTotal(segments, breakMinutes),
    [segments, breakMinutes]
  );

  function updateSegment(index, field, value) {
    setSegments((current) =>
      current.map((segment, position) =>
        position === index ? { ...segment, [field]: value } : segment
      )
    );
  }

  function addSegment() {
    setSegments((current) => {
      const lastEnd = current[current.length - 1]?.end_time || "13:00";
      const startMinutes = Math.min(
        timeToMinutes(lastEnd) ?? 13 * 60,
        23 * 60 + 30
      );
      const endMinutes = Math.min(startMinutes + 240, 23 * 60 + 59);

      return [
        ...current,
        {
          start_time: minutesToTime(startMinutes),
          end_time: minutesToTime(endMinutes),
        },
      ];
    });
  }

  function removeSegment(index) {
    setSegments((current) =>
      current.length === 1
        ? current
        : current.filter((_, position) => position !== index)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (segments.length === 0) {
      setError("Agrega al menos un segmento de trabajo.");
      return;
    }

    if (calculation.error) {
      setError(calculation.error);
      return;
    }

    setSaving(true);

    try {
      await api.post("/entries", {
        work_date: date,
        break_minutes: Number(breakMinutes) || 0,
        notes,
        segments: segments.map((segment) => ({
          start_time: segment.start_time,
          end_time: segment.end_time,
        })),
      });
      onSaved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;

    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar el registro de este día?"
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      await api.delete(`/entries/${entry.id}`);
      onDeleted();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel form-panel">
      <header className="panel-header">
        <div>
          <h2>{entry ? "Editar jornada" : "Registrar jornada"}</h2>
          <p>{formatDateLong(date)}</p>
        </div>
      </header>

      <form className="day-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="work-date">Fecha</label>
          <input
            id="work-date"
            type="date"
            value={date}
            onChange={(event) => {
              if (event.target.value) onDateChange(event.target.value);
            }}
            required
          />
        </div>

        <div className="field">
          <span className="field-label">Segmentos de trabajo</span>

          <div className="segments-list">
            {segments.map((segment, index) => {
              const duration = getSegmentDuration(segment);

              return (
                <div className="segment-row" key={index}>
                  <input
                    type="time"
                    value={segment.start_time}
                    onChange={(event) =>
                      updateSegment(index, "start_time", event.target.value)
                    }
                    aria-label={`Hora de inicio del segmento ${index + 1}`}
                    required
                  />
                  <span className="segment-separator">a</span>
                  <input
                    type="time"
                    value={segment.end_time}
                    onChange={(event) =>
                      updateSegment(index, "end_time", event.target.value)
                    }
                    aria-label={`Hora de fin del segmento ${index + 1}`}
                    required
                  />
                  <span className="segment-duration">
                    {duration === null ? "—" : formatMinutes(duration)}
                  </span>
                  <button
                    type="button"
                    className="segment-remove"
                    onClick={() => removeSegment(index)}
                    disabled={segments.length === 1}
                    aria-label={`Quitar segmento ${index + 1}`}
                    title="Quitar segmento"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="add-segment-button"
            onClick={addSegment}
            disabled={segments.length >= MAX_SEGMENTS}
          >
            + Agregar segmento
          </button>
        </div>

        <div className="field">
          <label htmlFor="break-minutes">Descanso del día (minutos)</label>
          <input
            id="break-minutes"
            type="number"
            min="0"
            max="480"
            step="5"
            value={breakMinutes}
            onChange={(event) => setBreakMinutes(event.target.value)}
          />
          <p className="field-hint">
            Se resta una sola vez del total (60 min predeterminados para almuerzo).
          </p>
        </div>

        <div className="field">
          <label htmlFor="notes">Notas (opcional)</label>
          <textarea
            id="notes"
            rows="2"
            maxLength="500"
            placeholder="Actividades realizadas, observaciones…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="form-total">
          <span>Total del día</span>
          <strong>
            {calculation.total === null ? "—" : formatMinutes(calculation.total)}
          </strong>
        </div>

        {error && <div className="alert error">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving
              ? "Guardando…"
              : entry
                ? "Actualizar jornada"
                : "Guardar jornada"}
          </button>

          {entry && (
            <button
              type="button"
              className="danger-button"
              onClick={handleDelete}
              disabled={saving}
            >
              Eliminar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
