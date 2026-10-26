import { formatDateShort, formatMinutes } from "../utils/format";

export default function EntryList({ entries, selectedDate, onEdit, onDelete }) {
  return (
    <section className="panel entries-panel">
      <header className="panel-header">
        <div>
          <h2>Jornadas registradas</h2>
          <p>
            {entries.length === 0
              ? "Todavía no hay registros."
              : `${entries.length} ${entries.length === 1 ? "jornada registrada" : "jornadas registradas"}.`}
          </p>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            🗓
          </span>
          <p>
            Tu historial está vacío. Elige un día en el calendario y guarda tu
            primera jornada.
          </p>
        </div>
      ) : (
        <div className="entries-table-wrap">
          <table className="entries-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Segmentos</th>
                <th>Descanso</th>
                <th>Total</th>
                <th>Notas</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={entry.work_date === selectedDate ? "is-selected" : ""}
                >
                  <td data-label="Fecha">
                    <strong>{formatDateShort(entry.work_date)}</strong>
                  </td>
                  <td data-label="Segmentos">
                    <div className="segment-chips">
                      {entry.segments.map((segment) => (
                        <span className="segment-chip" key={segment.id}>
                          {segment.start_time}–{segment.end_time}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td data-label="Descanso">
                    {entry.break_minutes > 0
                      ? `${entry.break_minutes} min`
                      : "—"}
                  </td>
                  <td data-label="Total">
                    <span className="hours-pill">
                      {formatMinutes(entry.total_minutes)}
                    </span>
                  </td>
                  <td data-label="Notas" className="notes-cell">
                    {entry.notes || "—"}
                  </td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onEdit(entry.work_date)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={() => onDelete(entry)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
