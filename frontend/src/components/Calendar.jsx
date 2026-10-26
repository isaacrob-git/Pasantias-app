import { useEffect, useMemo, useState } from "react";

import { formatMinutes, monthLabel, parseISODate, toISODate } from "../utils/format";

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

export default function Calendar({ entries, selectedDate, onSelectDate }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    const selected = parseISODate(selectedDate);
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [selectedDate]);

  const entriesByDate = useMemo(() => {
    const map = {};
    for (const entry of entries) {
      map[entry.work_date] = entry;
    }
    return map;
  }, [entries]);

  const today = toISODate();
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  function changeMonth(offset) {
    setVisibleMonth(new Date(year, month + offset, 1));
  }

  function goToToday() {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(toISODate(now));
  }

  return (
    <section className="panel calendar-panel">
      <header className="panel-header">
        <div>
          <h2>Calendario</h2>
          <p>Elige un día para registrar o editar sus horas.</p>
        </div>
        <div className="calendar-nav">
          <button
            type="button"
            className="icon-button"
            onClick={() => changeMonth(-1)}
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <span className="calendar-month">{monthLabel(visibleMonth)}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => changeMonth(1)}
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>
      </header>

      <div className="calendar-weekdays" aria-hidden="true">
        {WEEK_DAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((date, index) => {
          if (!date) {
            return <span key={`empty-${index}`} className="calendar-cell empty" />;
          }

          const iso = toISODate(date);
          const entry = entriesByDate[iso];
          const classes = ["calendar-cell"];

          if (iso === today) classes.push("today");
          if (iso === selectedDate) classes.push("selected");
          if (entry) classes.push("has-entry");

          return (
            <button
              key={iso}
              type="button"
              className={classes.join(" ")}
              onClick={() => onSelectDate(iso)}
              aria-pressed={iso === selectedDate}
              aria-label={`${date.toLocaleDateString("es-ES")}${
                entry ? `, ${formatMinutes(entry.total_minutes)} registradas` : ""
              }`}
            >
              <span className="calendar-day">{date.getDate()}</span>
              {entry && <span className="calendar-hours">{formatMinutes(entry.total_minutes)}</span>}
            </button>
          );
        })}
      </div>

      <footer className="calendar-footer">
        <span className="calendar-legend">
          <i className="legend-dot" /> Día con horas registradas
        </span>
        <button type="button" className="ghost-button" onClick={goToToday}>
          Ir a hoy
        </button>
      </footer>
    </section>
  );
}
