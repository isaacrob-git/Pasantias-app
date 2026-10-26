# Horas de Pasantía

Aplicación web para registrar y controlar las horas de tus pasantías: guarda
cada jornada, edítala cuando haga falta y consulta tu total acumulado en todo
momento.

## Funciones

- Registro e inicio de sesión con contraseña cifrada (`bcrypt`).
- Calendario mensual con las horas registradas en cada día.
- Alta y edición de la jornada de un día con **varios segmentos horarios** (por ejemplo, 07:00–10:00 y 13:00–16:00).
- Validación de solapamientos entre segmentos y cálculo automático del total en vivo.
- Resumen de total acumulado, **horas restantes para la meta de 320 h**, horas del mes actual y días registrados.
- Historial de jornadas con edición y eliminación.
- Sesiones persistidas en PostgreSQL.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19, React Router, Vite |
| Backend | Node.js, Express 5, express-session |
| Base de datos | PostgreSQL |
| Seguridad | bcrypt, helmet, cookies httpOnly |

## Estructura

```
pasantias-app/
├── .env                      # Variables de entorno (no se sube al repo)
├── database/
│   ├── schema.sql            # Tablas de usuarios, días y segmentos
│   └── migrations/
│       └── 001_multiple_segments.sql  # Migración a varios segmentos por día
├── backend/
│   ├── app.js                # Configuración de Express y rutas
│   ├── server.js             # Arranque del servidor
│   └── src/
│       ├── config/database.js
│       ├── middleware/requireAuth.js
│       └── routes/
│           ├── auth.js       # Registro, login, sesión y logout
│           └── entries.js    # CRUD de jornadas y resumen
└── frontend/
    ├── App.jsx               # Rutas de la aplicación
    ├── main.jsx
    └── src/
        ├── components/       # Calendario, formulario, resumen e historial
        ├── pages/            # Login y Dashboard
        ├── services/api.js
        ├── utils/format.js
        └── styles.css
```

## Puesta en marcha

Requisitos: Node.js 20 o superior y PostgreSQL en ejecución.

### 1. Base de datos

Crea la base y aplica el esquema:

```bash
createdb -U postgres pasantias
psql -U postgres -d pasantias -f database/schema.sql
```

Si ya tenías la versión anterior con una sola jornada por día, aplica la
migración para conservar los datos:

```bash
psql -U postgres -d pasantias -f database/migrations/001_multiple_segments.sql
```

### 2. Variables de entorno

Revisa el archivo `.env` en la raíz y ajusta tus credenciales:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=una-cadena-larga-y-aleatoria
DATABASE_URL=postgresql://postgres:TU_CONTRASENA@localhost:5432/pasantias
```

### 3. Backend

```bash
cd backend
npm install
npm run dev      # http://localhost:3000
```

### 4. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Vite redirige las peticiones `/api` al backend, así que solo necesitas abrir
<http://localhost:5173>.

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Comprueba que el backend responde |
| `POST` | `/api/auth/register` | Crea una cuenta e inicia sesión |
| `POST` | `/api/auth/login` | Inicia sesión |
| `POST` | `/api/auth/logout` | Cierra la sesión |
| `GET` | `/api/auth/me` | Devuelve el usuario de la sesión |
| `GET` | `/api/entries` | Lista las jornadas y el resumen de horas |
| `POST` | `/api/entries` | Crea o actualiza la jornada de una fecha |
| `DELETE` | `/api/entries/:id` | Elimina una jornada |

Solo se permite una jornada por día y usuario, pero esa jornada puede tener
varios segmentos. Si guardas otra vez la misma fecha, el día se actualiza en
lugar de duplicarse.

Ejemplo de petición para guardar un día:

```json
{
  "work_date": "2026-10-23",
  "break_minutes": 0,
  "notes": "Mañana y tarde",
  "segments": [
    { "start_time": "07:00", "end_time": "10:00" },
    { "start_time": "13:00", "end_time": "16:00" }
  ]
}
```

## Horas restantes

Cada usuario tiene una meta en `users.required_hours`, con valor inicial de
**320 horas**. El dashboard muestra `meta − horas acumuladas`. Para cambiarla:

```sql
UPDATE users SET required_hours = 400 WHERE email = 'tu-correo@ejemplo.com';
```

## Notas

- `.env` y `node_modules` están excluidos mediante `.gitignore`.
- Los totales se calculan en minutos y se muestran como horas y minutos.
- El descanso se resta una sola vez del total del día.
- Si divides la jornada en segmentos, deja el descanso en 0 para no restarlo dos veces.
