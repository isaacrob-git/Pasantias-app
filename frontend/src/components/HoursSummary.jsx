import { formatMinutes } from "../utils/format";

export default function HoursSummary({ summary }) {
  const requiredMinutes = summary.required_minutes || 0;
  const remainingMinutes =
    summary.remaining_minutes ??
    Math.max(0, requiredMinutes - (summary.total_minutes || 0));
  const goalMet = requiredMinutes > 0 && remainingMinutes === 0;

  const cards = [
    {
      label: "Total acumulado",
      value: formatMinutes(summary.total_minutes),
      hint: "Todas tus jornadas registradas",
      icon: "⏱",
      accent: "indigo",
    },
    {
      label: "Horas restantes",
      value: formatMinutes(remainingMinutes),
      hint:
        requiredMinutes > 0
          ? goalMet
            ? "¡Meta completada!"
            : `de ${formatMinutes(requiredMinutes)} requeridas`
          : "Sin meta definida",
      icon: "🎯",
      accent: "rose",
    },
    {
      label: "Este mes",
      value: formatMinutes(summary.month_minutes),
      hint: "Horas del mes en curso",
      icon: "📅",
      accent: "teal",
    },
    {
      label: "Días registrados",
      value: summary.total_days,
      hint: summary.total_days === 1 ? "Jornada cargada" : "Jornadas cargadas",
      icon: "✓",
      accent: "amber",
    },
  ];

  return (
    <section className="summary-grid" aria-label="Resumen de horas">
      {cards.map((card) => (
        <article
          className={`summary-card accent-${card.accent}`}
          key={card.label}
        >
          <div className="summary-card-top">
            <span className="summary-label">{card.label}</span>
            <span className="summary-icon" aria-hidden="true">
              {card.icon}
            </span>
          </div>
          <strong className="summary-value">{card.value}</strong>
          <span className="summary-hint">{card.hint}</span>
        </article>
      ))}
    </section>
  );
}
