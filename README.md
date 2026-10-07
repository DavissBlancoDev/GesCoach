# ⚽ GesCoach

Aplicación web para gestionar un equipo de fútbol base: plantilla, entrenos, partidos, convocatorias y estadísticas, pensada para usarse desde el móvil en el campo. 📱

> 🚧 **Estado: en desarrollo.** Proyecto personal y de portfolio. Lo que aparece como "previsto" todavía no existe.

## 📖 Qué es

GesCoach nace de una necesidad real: llevar un equipo de fútbol 11 sin depender de hojas de cálculo y mensajes sueltos. El entrenador se registra, crea su equipo y gestiona la temporada desde un único sitio. El diseño parte de dos ideas:

- 🏟️ **El partido es el centro de la app.** Convocatoria, alineación y acta son tres fases del mismo partido, y las estadísticas se calculan a partir de ellos en lugar de escribirse a mano.
- 🗄️ **Nada se borra al cambiar de temporada.** Cada año la plantilla empieza limpia, pero las temporadas anteriores quedan archivadas para consultarlas.

## ✨ Funcionalidades

### ✅ Hecho

- [x] 🔐 Registro e inicio de sesión (JWT en cookie `httpOnly`)
- [x] 🛡️ Rutas protegidas en el cliente
- [x] 🧙 Asistente de creación de equipo y primera temporada
- [x] 🧩 Modelo de datos de equipo, temporada y membresías con roles
- [x] 👥 API de plantilla: jugadores con ficha por temporada, posiciones, dorsal opcional, tutores y contrato opcionales

### 🔨 En curso

- [ ] 📋 Pantalla de plantilla (lista, posiciones abreviadas, formulario de jugadores)

### 🔮 Previsto

- [ ] 🏁 Finalizar temporada y consulta del histórico
- [ ] 🏆 Competiciones, equipos rivales, calendario y clasificación calculada
- [ ] 📄 Importación de jornadas desde los PDF de la federación, con vista previa antes de guardar
- [ ] 📝 Partidos: convocatoria (con límite según la competición), alineación por formaciones y acta
- [ ] 🏃 Entrenos con objetivos y control de asistencia
- [ ] 📅 Calendario mensual
- [ ] 📊 Estadísticas de jugadores y de equipo
- [ ] 🏠 Dashboard: próximo partido, próximo entreno, disponibilidad y riesgo de sanción
- [ ] 💌 Invitaciones por enlace (un solo uso, caducan a los 7 días) y permisos por rol
- [ ] 🛡️ Subida del escudo del equipo

## 🛠️ Stack

| Parte | Tecnología |
|---|---|
| 🎨 Cliente | React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS |
| ⚙️ Servidor | Node.js, Express, TypeScript |
| 🍃 Base de datos | MongoDB (Atlas) con Mongoose |
| ✔️ Validación | Zod |
| 🔑 Autenticación | JWT en cookie `httpOnly`, contraseñas con bcryptjs |

## 🧰 Tecnologías usadas

Detalle de las herramientas y librerías del proyecto, y para qué se usa cada una.

### 🎨 Cliente

| Tecnología | Para qué se usa |
|---|---|
| React | Interfaz basada en componentes |
| TypeScript | Tipado estático: los errores se detectan al escribir, antes de ejecutar |
| Vite | Servidor de desarrollo con recarga en caliente, empaquetado y proxy hacia la API |
| React Router | Navegación entre pantallas y rutas protegidas por sesión |
| TanStack Query | Estado del servidor: caché, estados de carga y gestión de errores en las peticiones |
| Tailwind CSS | Estilos con clases utilitarias, con un diseño pensado primero para móvil |

### ⚙️ Servidor

| Tecnología | Para qué se usa |
|---|---|
| Node.js | Entorno de ejecución |
| Express | API REST: rutas, middlewares y control de acceso |
| TypeScript | Tipado estático, compartido con el cliente en los conceptos de dominio |
| tsx | Ejecuta TypeScript en desarrollo y reinicia el servidor al guardar |
| Zod | Validación de los datos de entrada antes de tocar la base de datos |
| jsonwebtoken | Firma y verificación de los tokens de sesión |
| bcryptjs | Hash de contraseñas, en JavaScript puro (sin compilación nativa) |
| cookie-parser | Lectura de la cookie de sesión |
| cors | Control de los orígenes que pueden llamar a la API |
| dotenv | Carga de variables de entorno desde `.env` |

### 🍃 Base de datos

| Tecnología | Para qué se usa |
|---|---|
| MongoDB Atlas | Base de datos documental en la nube (plan gratuito) |
| Mongoose | Modelos, validación, índices únicos y transacciones |

### 🧪 Herramientas de desarrollo

| Herramienta | Para qué se usa |
|---|---|
| ESLint | Análisis estático del código |
| Git y GitHub | Control de versiones y alojamiento del repositorio |
| VS Code | Editor |
| Thunder Client | Probar la API desde el propio editor |
| MongoDB Compass | Explorar y revisar los datos de la base de datos |

### 🔜 Previstas

- Prettier, para formatear el código automáticamente
- Cloudinary u otro servicio de almacenamiento, para los escudos de los equipos
- Tests automáticos y GitHub Actions para la integración continua

## 📁 Estructura del repositorio

```
gescoach/
├── client/   # Aplicación React
├── server/   # API REST con Express
└── docs/     # Decisiones de diseño (pendiente)
```

## 🚀 Puesta en marcha

### 📋 Requisitos

- Node.js (versión LTS)
- Una base de datos MongoDB. Se recomienda un clúster gratuito de MongoDB Atlas: las transacciones que usa la API necesitan un conjunto de réplicas, y Atlas ya lo es.

### 📦 Instalación

```bash
git clone https://github.com/TU-USUARIO/gescoach.git
cd gescoach

cd server && npm ci
cd ../client && npm ci
```

### 🔧 Variables de entorno

Crea `server/.env` a partir de `server/.env.example`:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto de la API (por defecto, 3000) |
| `MONGODB_URI` | Cadena de conexión de MongoDB, **incluyendo el nombre de la base de datos** (por ejemplo `/gescoach` antes del `?`) |
| `JWT_SECRET` | Secreto largo y aleatorio para firmar los tokens |

Para generar un secreto:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

⚠️ El archivo `.env` está en `.gitignore`. No lo subas nunca al repositorio.

### ▶️ Arranque en desarrollo

En dos terminales:

```bash
# Terminal 1: API (http://localhost:3000)
cd server
npm run dev

# Terminal 2: cliente (http://localhost:5173)
cd client
npm run dev
```

Vite redirige las peticiones de `/api` al servidor, así que el cliente usa rutas relativas y no hay problemas de CORS en desarrollo.

🩺 Para comprobar que todo está conectado: `http://localhost:3000/api/health` debe responder con `database: "conectada"`.

## 🔌 API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado de la API y de la base de datos |
| POST | `/api/auth/register` | Crea una cuenta |
| POST | `/api/auth/login` | Inicia sesión (cookie `httpOnly`) |
| POST | `/api/auth/logout` | Cierra sesión |
| GET | `/api/auth/me` | Usuario de la sesión actual |
| POST | `/api/teams` | Crea equipo, primera temporada y membresía de entrenador principal |
| GET | `/api/teams/mine` | Equipos del usuario, con su rol y su temporada actual |
| GET | `/api/teams/:teamId/players` | Plantilla de la temporada actual |
| POST | `/api/teams/:teamId/players` | Añade un jugador a la plantilla |

## 🧠 Decisiones de diseño

- 🏷️ **Equipo y temporada separados.** El equipo es una entidad continua; categoría, división, modalidad y duración del partido pertenecen a la temporada, porque cambian cada año.
- 🧍 **Jugador como persona y como ficha de temporada.** Los datos estables (nombre, fecha de nacimiento, tutores) viven en el jugador; ficha, dorsal, posiciones y estado viven en su paso por cada temporada. Así se conserva el histórico sin duplicar datos.
- 🗃️ **Archivar, no borrar.** Al finalizar la temporada se cierra y se crea la siguiente. Las estadísticas históricas siguen apuntando a jugadores que existen.
- 🧮 **Valores calculados, no guardados.** La edad y los años de contrato restantes se calculan al responder, para que nunca estén desactualizados. Lo mismo ocurrirá con las estadísticas y la clasificación.
- 🎯 **Posiciones como datos.** Se guarda la posición concreta y el grupo (portero, defensa, centrocampista, atacante) se deduce de ella, de modo que no pueden contradecirse.
- 🎭 **Roles en la membresía.** El rol pertenece a la relación entre persona y equipo, no a la persona: la misma cuenta puede tener roles distintos en equipos distintos. Los permisos de cada rol se definen en un único archivo.
- 👀 **Importación con vista previa.** Los datos de la federación se importarán desde PDF subidos por el usuario, mostrando lo interpretado antes de guardar, y la clasificación calculada se contrastará con la oficial.

## 🔒 Seguridad y privacidad

- 🔐 Las contraseñas se guardan con hash y nunca se devuelven en las respuestas.
- 🍪 El token de sesión va en una cookie `httpOnly`, inaccesible para JavaScript.
- 🙈 Los datos sensibles (contrato, sueldo, contacto de tutores) se filtran **en el servidor** según el rol, no en el cliente.
- 🕵️ Los equipos a los que el usuario no pertenece responden `404`, para no revelar su existencia.
- 👶 La aplicación puede contener datos de menores. El repositorio y las demos solo deben usar **datos ficticios**, y no se suben a Git archivos `.env`, PDF reales de la federación ni escudos de terceros.

## 📄 Licencia

Consulta el archivo [LICENSE](./LICENSE).
