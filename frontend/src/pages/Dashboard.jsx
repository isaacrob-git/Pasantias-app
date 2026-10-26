import { useCallback, useEffect, useMemo, useState } from "react";

import Calendar from "../components/Calendar";
import DayForm from "../components/DayForm";
import EntryList from "../components/EntryList";
import HoursSummary from "../components/HoursSummary";
import { api } from "../services/api";
import { formatDateLong, toISODate } from "../utils/format";

const EMPTY_SUMMARY = {
  total_minutes: 0,
  month_minutes: 0,
  total_days: 0,
};

export default function Dashboard({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [selectedDate, setSelectedDate] = useState(() => toISODate());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const loadEntries = useCallback(async () => {
    try {
      const data = await api.get("/entries");
      setEntries(data.entries);
      setSummary(data.summary);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.work_date === selectedDate) || null,
    [entries, selectedDate]
  );

  const formKey = selectedEntry
    ? `${selectedDate}-${selectedEntry.id}-${selectedEntry.updated_at}-${selectedEntry.segments.length}`
    : `${selectedDate}-new`;

  async function handleLogout() {
    try {
      await api.post("/auth/logout", {});
    } finally {
      onLogout();
    }
  }

  async function handleSaved() {
    await loadEntries();
    setToast("Jornada guardada correctamente.");
  }

  async function handleDeleted() {
    await loadEntries();
    setToast("Registro eliminado.");
  }

  async function handleListDelete(entry) {
    const confirmed = window.confirm(
      `¿Eliminar la jornada del ${formatDateLong(entry.work_date)}?`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/entries/${entry.id}`);
      await loadEntries();
      setToast("Registro eliminado.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">H</span>
          <div>
            <strong>Horas de Pasantía</strong>
            <span>Control de jornadas</span>
          </div>
        </div>

        <div className="topbar-user">
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">
              {firstName.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="page">
        <div className="page-heading">
          <div>
            <h1>Hola, {firstName}</h1>
            <p>
              Registra tus jornadas y mantén el control de tus horas de
              pasantía.
            </p>
          </div>
          <div className="today-pill">{formatDateLong(toISODate())}</div>
        </div>

        {error && <div className="alert error">{error}</div>}

        <HoursSummary summary={summary} />

        <div className="workspace-grid">
          <Calendar
            entries={entries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <DayForm
            key={formKey}
            date={selectedDate}
            entry={selectedEntry}
            onDateChange={setSelectedDate}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        </div>

        <EntryList
          entries={entries}
          selectedDate={selectedDate}
          onEdit={setSelectedDate}
          onDelete={handleListDelete}
        />

        {loading && <p className="loading-inline">Cargando registros…</p>}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
