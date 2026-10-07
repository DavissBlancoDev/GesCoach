# Roles y permisos

Este documento recoge qué roles existen en un equipo, qué puede hacer cada uno y cómo se aplican los permisos. Para el modelo de datos, ver [modelo de datos](./modelo-de-datos.md).

## Estado actual

| Parte | Estado |
|---|---|
| Los cinco roles existen en el modelo | Implementado |
| Un único `head_coach` por equipo | Implementado |
| Comprobación de pertenencia al equipo | Implementado |
| Filtrado de datos sensibles de jugadores según el rol | Implementado |
| Invitar a otros miembros | Previsto |
| Permisos del resto de funciones (convocatoria, acta, estadísticas...) | Diseñado, a medida que se construya cada función |

Hoy solo existe el rol `head_coach`, porque quien crea el equipo lo recibe automáticamente y todavía no hay invitaciones. El diseño ya está preparado para varios miembros.

## Roles

El rol se guarda en la **membresía** (la relación entre usuario y equipo), no en el usuario. Así una misma cuenta puede ser entrenador en un equipo y responsable en otro.

| Rol | Clave | Quién es |
|---|---|---|
| Entrenador principal | `head_coach` | Quien crea el equipo. Gestiona todo y es el único que invita |
| Segundo entrenador | `assistant_coach` | Cuerpo técnico con acceso amplio, sin gestión del equipo ni de miembros |
| Delegado | `delegate` | La persona que acompaña al equipo en los partidos |
| Responsable de equipo | `team_manager` | Director de cantera o miembro directivo. Observa desde fuera, y puede tener varios equipos |
| Médico | `medical` | Gestiona el estado de lesionados |

Reglas:

- Cada equipo tiene **un único** `head_coach`. Lo garantiza un índice único en la base de datos.
- Una invitación nunca puede asignar el rol `head_coach`.
- Traspasar un equipo a otro entrenador sería una función aparte, que no existe.

## Tabla de permisos

Es el diseño acordado. Las filas marcadas como *implementado* ya se comprueban en el servidor; el resto se aplicará al construir cada función.

| Función | Entrenador | 2º entrenador | Delegado | Responsable | Médico |
|---|---|---|---|---|---|
| Ver plantilla, calendario y partidos | Sí | Sí | Sí | Sí | Sí |
| Editar plantilla *(implementado)* | Sí | Sí | No | No | No |
| Crear entrenos y pasar lista | Sí | Sí | No | No | No |
| **Editar convocatoria y alineación** | **Sí** | No | No | No | No |
| Ver convocatoria y alineación | Sí | Sí | Sí | No | No |
| Registrar el acta | Sí | Sí | Sí | No | No |
| Ver estadísticas | Sí | Sí | Sí | Sí | No |
| Marcar lesiones | Sí | Sí | No | No | Sí |
| Invitar y gestionar miembros | Sí | No | No | No | No |
| Editar equipo y temporada | Sí | No | No | No | No |

Una consecuencia de este diseño: el delegado puede registrar el acta, pero no preparar la convocatoria que la precede. La convocatoria y la alineación solo las modifica el entrenador principal.

## Datos sensibles

Algunos datos de los jugadores solo los ven determinados roles. **El filtrado se hace en el servidor**: lo que el servidor no envía no se puede ver, ni siquiera inspeccionando las peticiones del navegador.

| Dato | Entrenador | 2º entrenador | Delegado | Responsable | Médico |
|---|---|---|---|---|---|
| Contrato y sueldo *(implementado)* | Sí | No | No | No | No |
| Contacto de tutores *(implementado)* | Sí | Sí | Sí | No | No |

Notas:

- El **sueldo** es el dato más sensible de la ficha, por eso solo lo ve el entrenador principal. Está pendiente decidir si el responsable de equipo también debería verlo.
- El **contacto de tutores** lo ve el delegado por si hay una urgencia durante un partido.
- Las fichas pueden contener datos de menores. El **estado** de un jugador (lesionado, sancionado...) guarda solo la situación, sin diagnósticos ni detalles clínicos, porque los datos de salud tienen una protección especial en el RGPD.

## Cómo se aplican

Los permisos están en un **único archivo del servidor** (`server/src/lib/permissions.ts`), con una función por cada acción, por ejemplo:

- `canEditSquad(role)`: quién puede crear o editar jugadores.
- `canSeeContract(role)`: quién ve contrato y sueldo.
- `canSeeGuardians(role)`: quién ve el contacto de tutores.

Cambiar un permiso es editar ese archivo. Los permisos no se guardan en la base de datos: solo se guarda el rol.

El flujo de una petición a una ruta de equipo (`/api/teams/:teamId/...`) es:

1. **`requireAuth`** comprueba que hay sesión iniciada.
2. **`requireTeamMember`** comprueba que el usuario pertenece al equipo de la URL y deja su rol disponible.
3. La ruta consulta la función de permisos que le corresponde y responde `403` si no tiene permiso.
4. Al construir la respuesta, se omiten los campos sensibles que ese rol no puede ver.

### Códigos de respuesta

| Código | Cuándo |
|---|---|
| `401` | No hay sesión o es inválida |
| `404` | El equipo no existe **o el usuario no pertenece a él** |
| `403` | Pertenece al equipo pero su rol no permite la acción |

Se responde `404` y no `403` a quien no es miembro, para no revelar si un equipo existe.

## Invitaciones (previsto)

El entrenador principal genera un enlace de invitación eligiendo el rol.

- **Un solo uso** y **caduca a los 7 días**.
- El rol lo fija quien invita, nunca quien acepta.
- En la base de datos se guarda solo el hash del token, no el token.
- Quien acepta la invitación entra directamente en el equipo, sin pasar por el asistente de creación de equipo.

El detalle de los campos está en [modelo de datos](./modelo-de-datos.md#invitation).
