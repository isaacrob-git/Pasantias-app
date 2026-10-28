import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./src/components/ProtectedRoute";
import Dashboard from "./src/pages/Dashboard";
import Login from "./src/pages/Login";
import { useTheme } from "./src/hooks/useTheme";
import { api } from "./src/services/api";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    api
      .get("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <Login
              onLogin={setUser}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          )
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute user={user} loading={loading}>
            <Dashboard
              user={user}
              onLogout={() => setUser(null)}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
