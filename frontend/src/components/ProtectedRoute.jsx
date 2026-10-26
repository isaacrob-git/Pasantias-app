import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, loading, children }) {
  if (loading) {
    return (
      <div className="page-loader">
        <span className="spinner" aria-hidden="true" />
        <p>Cargando tu información…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
