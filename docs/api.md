# API de GesCoach

La API REST se sirve bajo `/api`. Las rutas protegidas usan la cookie de sesión `httpOnly` obtenida al iniciar sesión.

## Salud y autenticación

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/health` | Estado de la API y la base de datos |
| POST | `/api/auth/register` | Crea una cuenta |
| POST | `/api/auth/login` | Inicia sesión |
| POST | `/api/auth/logout` | Cierra sesión |
| GET | `/api/auth/me` | Devuelve el usuario actual |

## Equipos y jugadores

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/teams` | Crea un equipo, su primera temporada y la membresía principal |
| GET | `/api/teams/mine` | Lista los equipos del usuario |
| GET/POST | `/api/teams/:teamId/players` | Lista o añade jugadores |
| PUT | `/api/teams/:teamId/players/:playerId` | Edita un jugador |
| PATCH | `/api/teams/:teamId/players/:playerId/status` | Cambia el estado de un jugador |
| DELETE | `/api/teams/:teamId/players/:playerId` | Elimina un jugador de la temporada |
| GET/POST | `/api/teams/:teamId/players/:playerId/notes` | Lista o añade notas del entrenador |
| PUT/DELETE | `/api/teams/:teamId/players/:playerId/notes/:noteId` | Edita o elimina una nota |

## Entrenamientos

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET/POST | `/api/teams/:teamId/trainings` | Lista o crea entrenamientos |
| GET/PUT | `/api/teams/:teamId/trainings/:trainingId` | Consulta o edita un entrenamiento |
| PATCH | `/api/teams/:teamId/trainings/:trainingId/status` | Suspende o reprograma un entrenamiento |
| PUT | `/api/teams/:teamId/trainings/:trainingId/attendance` | Guarda la asistencia |
| DELETE | `/api/teams/:teamId/trainings/:trainingId` | Elimina un entrenamiento y su asistencia |

## Partidos

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET/POST | `/api/teams/:teamId/matches` | Lista o programa partidos |
| GET | `/api/teams/:teamId/matches/opponents` | Lista rivales usados |
| GET/PUT/DELETE | `/api/teams/:teamId/matches/:matchId` | Consulta, edita o elimina un partido |
| PATCH | `/api/teams/:teamId/matches/:matchId/status` | Cambia el estado del partido |
| PATCH | `/api/teams/:teamId/matches/:matchId/score` | Cambia el resultado durante el partido |
| PUT | `/api/teams/:teamId/matches/:matchId/callup` | Guarda la convocatoria |
| PUT | `/api/teams/:teamId/matches/:matchId/lineup` | Guarda la alineación y los dorsales |
| POST | `/api/teams/:teamId/matches/:matchId/events` | Registra un evento del acta |
| DELETE | `/api/teams/:teamId/matches/:matchId/events/:eventId` | Elimina un evento del acta |

## Calendario, equipo y cuenta

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET/POST | `/api/teams/:teamId/calendar-notes` | Lista o crea notas y eventos |
| DELETE | `/api/teams/:teamId/calendar-notes/:noteId` | Elimina una nota o evento |
| PATCH | `/api/teams/:teamId/season` | Actualiza los datos de la temporada |
| PATCH | `/api/teams/:teamId/season/settings` | Configura el umbral de sanción por amarillas |
| PATCH | `/api/teams/:teamId/club` | Actualiza los datos del club |
| GET | `/api/teams/:teamId/club/members` | Lista los miembros y sus roles |
| PATCH | `/api/account/profile` | Actualiza los datos personales |
| PATCH | `/api/account/email` | Cambia el correo |
| PUT | `/api/account/password` | Cambia la contraseña |
