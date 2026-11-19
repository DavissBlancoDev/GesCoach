# Documentación de GesCoach

Este documento reúne la información ampliada del proyecto. Para una introducción rápida, consulta el [README](../README.md).

## Qué es

GesCoach es una aplicación web para gestionar un equipo de fútbol base: plantilla, entrenamientos, partidos, convocatorias y estadísticas, pensada para utilizarse desde el móvil en el campo.

El entrenador se registra, crea su equipo y gestiona la temporada desde un único sitio. El partido es el centro de la aplicación: convocatoria, alineación y acta forman parte del mismo flujo, y las estadísticas se calculan a partir de esos datos.

Las temporadas se conservan como histórico. Al cambiar de temporada la plantilla empieza limpia, pero los datos anteriores siguen disponibles para consulta.

## Funcionalidades

### Hecho

- Registro e inicio de sesión con JWT en cookie `httpOnly`.
- Rutas protegidas en el cliente.
- Asistente de creación de equipo y primera temporada.
- Modelo de equipos, temporadas, jugadores y membresías con roles.
- Gestión de plantilla: altas, edición, estados, posiciones, dorsales, tutores y contratos opcionales.
- Notas privadas del entrenador sobre cada jugador.
- Entrenamientos tácticos, técnicos, físicos o mixtos, con control de asistencia y porcentajes por jugador.
- Partidos programados manualmente, con estados, resultado, duración, convocatoria, alineación, formaciones y acta en directo.
- Cálculo de minutos jugados a partir de los intervalos de participación.
- Calendario mensual con entrenamientos, partidos y eventos personalizados.
- Dashboard con resumen de plantilla, partidos, calendario, tareas y riesgo de sanción.
- Pantalla de estadísticas con resultados, goles, puntos de liga, tarjetas, líderes y gráficos por partido.
- Gestión de varios equipos por usuario, perfil, club, colores y miembros.

### Previsto

- Finalizar temporadas y consultar el histórico completo.
- Competiciones con jornadas y clasificación calculada.
- Importar jornadas desde PDF de la federación con vista previa.
- Estadísticas avanzadas de jugadores y equipos.
- Invitaciones por enlace y permisos adicionales por rol.
- Recuperación de contraseña e inicio de sesión con proveedores externos.
- Subida del escudo del equipo.

## Estructura del repositorio

```text
gescoach/
├── client/   # Aplicación React
├── server/   # API REST con Express
└── docs/     # Documentación del proyecto
```

La lista de endpoints está en [API de GesCoach](./api.md). El modelo de datos, los permisos y las pantallas se documentan en [modelo-de-datos.md](./modelo-de-datos.md), [roles-y-permisos.md](./roles-y-permisos.md) y [pantallas-y-navegacion.md](./pantallas-y-navegacion.md).

## Decisiones de diseño

- **Equipo y temporada separados:** el equipo es una entidad continua; categoría, división, modalidad y duración del partido pertenecen a la temporada.
- **Jugador como persona y ficha de temporada:** los datos estables viven en el jugador; dorsal, posiciones y estado pertenecen a su participación en cada temporada.
- **Archivar, no borrar:** las temporadas anteriores se conservan para mantener las estadísticas históricas.
- **Valores calculados:** edad, años de contrato, estadísticas y clasificación se calculan al responder para evitar datos desactualizados.
- **Posiciones como datos:** se guarda la posición concreta y el grupo se deduce de ella.
- **Roles en la membresía:** el rol pertenece a la relación entre persona y equipo, por lo que una misma cuenta puede tener roles distintos.
- **Reglas en el servidor:** los límites de convocatoria y las restricciones de temporada se comprueban en el servidor, no solo en el cliente.
- **Varios equipos por usuario:** la cuenta puede pertenecer a varios equipos con roles diferentes y elegir el equipo activo desde la aplicación.

## Seguridad y privacidad

- Las dependencias se instalan con `pnpm` y el `pnpm-lock.yaml` está versionado.
- Las contraseñas se guardan con hash y nunca se devuelven en las respuestas.
- El token de sesión se almacena en una cookie `httpOnly`.
- Los datos sensibles se filtran en el servidor según el rol del usuario.
- Los equipos a los que el usuario no pertenece responden `404` para no revelar su existencia.
- El repositorio y las demos deben utilizar únicamente datos ficticios. No deben subirse archivos `.env`, documentos reales de federaciones ni escudos de terceros.

Antes de desplegar, todavía está pendiente limitar los intentos de inicio de sesión, ajustar `cors` con credenciales y traducir los mensajes de validación de Zod.
