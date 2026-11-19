# ⚽ GesCoach

Aplicación web para gestionar un equipo de fútbol base: plantilla, entrenos, partidos, convocatorias y estadísticas, pensada para usarse desde el móvil en el campo. 📱

> 🚧 **Estado: en desarrollo.** Proyecto personal y de portfolio. Lo que aparece como "previsto" todavía no existe.

## 🧰 Tecnologías usadas

- **Cliente:** React, TypeScript, Vite, React Router, TanStack Query y Tailwind CSS.
- **Servidor:** Node.js, Express, TypeScript, Zod y JWT en cookies `httpOnly`.
- **Base de datos:** MongoDB Atlas y Mongoose.
- **Desarrollo:** pnpm, ESLint, Git y GitHub.

## 📚 Documentación

Este proyecto dispone de [una documentación más extensa](./docs/doc.md) del proyecto que recomiendo revisar.

También puedes consultar la [referencia de la API](./docs/api.md), el [modelo de datos](./docs/modelo-de-datos.md), los [roles y permisos](./docs/roles-y-permisos.md) y las [pantallas y navegación](./docs/pantallas-y-navegacion.md).

## 🚀 Puesta en marcha

### 📋 Requisitos

- Node.js (versión LTS)
- [pnpm](https://pnpm.io/installation) (el proyecto lo usa en lugar de npm)
- Una base de datos MongoDB. Se recomienda un clúster gratuito de MongoDB Atlas: las transacciones que usa la API necesitan un conjunto de réplicas, y Atlas ya lo es.

### 📦 Instalación

```bash
git clone https://github.com/TU-USUARIO/gescoach.git
cd gescoach

cd server && pnpm install --frozen-lockfile
cd ../client && pnpm install --frozen-lockfile
```

### 🔧 Variables de entorno

Crea `server/.env` a partir de `server/.env.example`:

| Variable      | Descripción                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `PORT`        | Puerto de la API (por defecto, 3000)                                                                                |
| `MONGODB_URI` | Cadena de conexión de MongoDB, **incluyendo el nombre de la base de datos** (por ejemplo `/gescoach` antes del `?`) |
| `JWT_SECRET`  | Secreto largo y aleatorio para firmar los tokens                                                                    |

Para generar un secreto:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

⚠️ El archivo `.env` está en `.gitignore`. No lo subas nunca al repositorio.

### ▶️ Arranque en desarrollo

Desde la raíz del proyecto, un solo comando arranca el cliente y el servidor a la vez:

```bash
pnpm dev
```

- 🟢 **Cliente**: <http://localhost:5173>
- 🔵 **API**: <http://localhost:3000>

Los mensajes de cada uno salen en la misma terminal con la etiqueta `CLIENT` o `SERVER`, y `Ctrl + C` los para a la vez.

También se pueden arrancar por separado, en dos terminales:

```bash
# Terminal 1: API
cd server
pnpm dev

# Terminal 2: cliente
cd client
pnpm dev
```

Vite redirige las peticiones de `/api` al servidor, así que el cliente usa rutas relativas y no hay problemas de CORS en desarrollo.

🩺 Para comprobar que todo está conectado: `http://localhost:3000/api/health` debe responder con `database: "conectada"`.

## 🤝 Guía de contribución

¡Gracias por querer contribuir a **GesCoach**! 🙌 Sea cual sea tu propósito:

- Añadir nuevas funcionalidades a la aplicación.
- Corregir errores.
- Mejorar la documentación.
- Sugerir mejoras o nuevas ideas.

Las contribuciones se integran mediante Pull Requests:

1. Si no tienes permisos de escritura, crea un fork del repositorio y clónalo. Si los tienes, puedes trabajar directamente en una rama local.
2. Crea una rama descriptiva desde la rama principal: `feature/nombre-del-cambio` o `fix/nombre-del-error`.
3. Instala las dependencias con `pnpm install` en la raíz, en `client` y en `server`.
4. Desarrolla el cambio y comprueba el flujo afectado con `pnpm dev`.
5. Antes de abrir el Pull Request, ejecuta `pnpm --dir client lint`, `pnpm --dir client build` y `pnpm --dir server build`.
6. Haz commits claros, sube la rama a tu fork o al repositorio y abre un Pull Request contra la rama principal.
7. En la descripción, explica qué cambiaste, cómo lo probaste y cualquier decisión pendiente. Responde a las revisiones y actualiza la rama si es necesario.

Mantén los cambios centrados, sigue el estilo existente y no subas datos reales, archivos `.env`, credenciales ni documentos de menores. Si modificas una ruta, un modelo o un permiso, actualiza también la documentación correspondiente en [docs/](./docs/).

## 📄 Licencia

Consulta el archivo [LICENSE](./LICENSE).
