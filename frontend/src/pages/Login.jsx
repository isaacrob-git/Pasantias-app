import { useState } from "react";

import { api } from "../services/api";

export default function Login({ onLogin, theme, onToggleTheme }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload =
        mode === "register" ? { name, email, password } : { email, password };
      const data = await api.post(`/auth/${mode}`, payload);
      onLogin(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <button
        type="button"
        className="icon-button theme-toggle auth-theme-toggle"
        onClick={onToggleTheme}
        aria-label={
          theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"
        }
        title={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <div className="auth-card">
        <aside className="auth-aside">
          <div className="auth-brand">
            <span className="brand-mark large">H</span>
            <span>Horas de Pasantía</span>
          </div>

          <div className="auth-aside-copy">
            <h1>Tu tiempo de pasantía, siempre bajo control.</h1>
            <p>
              Registra tus jornadas día a día y consulta al instante cuántas
              horas llevas acumuladas.
            </p>
          </div>

          <ul className="auth-features">
            <li>Registro diario en segundos</li>
            <li>Calendario con tus horas</li>
            <li>Total acumulado siempre visible</li>
          </ul>
        </aside>

        <section className="auth-form-side">
          <div className="auth-tabs" role="tablist" aria-label="Acceso">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "active" : ""}
              onClick={() => switchMode("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "active" : ""}
              onClick={() => switchMode("register")}
            >
              Crear cuenta
            </button>
          </div>

          <div className="auth-heading">
            <h2>{mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2>
            <p>
              {mode === "login"
                ? "Ingresa con tus datos para ver tus horas."
                : "Solo necesitas tu nombre, correo y una contraseña."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="field">
                <label htmlFor="name">Nombre completo</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ana Pérez"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength="2"
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength="6"
              />
            </div>

            {error && <div className="alert error">{error}</div>}

            <button type="submit" className="primary-button" disabled={loading}>
              {loading
                ? "Procesando…"
                : mode === "login"
                  ? "Entrar"
                  : "Crear cuenta"}
            </button>
          </form>

          <p className="auth-switch">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </section>
      </div>
    </div>
  );
}
