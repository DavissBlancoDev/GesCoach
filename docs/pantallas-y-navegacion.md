# Pantallas y navegación

Este documento describe cómo se navega por GesCoach, qué muestra cada pantalla y las reglas de cálculo del dashboard. Para los datos, ver [modelo de datos](./modelo-de-datos.md), y para lo que puede hacer cada rol, [roles y permisos](./roles-y-permisos.md).

## Flujo

1. **Iniciar sesión** o **crear una cuenta**. Quien se registra pasa por el asistente de creación de equipo.
2. **Pantalla de inicio** (`/`): saluda y lista los equipos a los que el usuario tiene acceso, cada uno con su categoría, modalidad, temporada, división y el rol del usuario. Si no tiene ninguno, se le lleva a crearlo.
3. **Elegir un equipo** abre su dashboard, ya con la barra de navegación del equipo.
4. **Cambiar de equipo** desde la cabecera devuelve a la pantalla de inicio.

El equipo elegido se guarda en el navegador (solo su identificador), no en la dirección de cada pantalla. Si el usuario tiene un solo equipo, las pantallas funcionan aunque se entre directamente por la dirección. Si tiene varios y no ha elegido, cualquier pantalla de equipo lo devuelve a la pantalla de inicio.

## Pantallas

| Ruta | Pantalla | Acceso |
| --- | --- | --- |
| `/login` | Iniciar sesión | Público |
| `/registro` | Crear cuenta | Público |
| `/` | Inicio: elegir equipo | Con sesión |
| `/crear-equipo` | Asistente de creación de equipo y primera temporada | Con sesión |
| `/dashboard` | Dashboard | Con equipo elegido |
| `/plantilla` y `/plantilla/:playerId` | Plantilla y ficha del jugador | Con equipo elegido |
| `/entrenos` y `/entrenos/:trainingId` | Entrenos y pase de lista | Con equipo elegido |
| `/partidos` y `/partidos/:matchId` | Partidos y ficha del partido | Con equipo elegido |
| `/calendario` | Calendario mensual | Con equipo elegido |
| `/perfil` | Mi perfil | Con equipo elegido |
| `/ajustes` | Ajustes del club | Con equipo elegido |

## Cabecera

- El **nombre del equipo**, el botón **Cambiar de equipo** y el **menú del usuario** ("Hola, [nombre]", con su foto de iniciales).
- El menú tiene **Mi perfil**, **Ajustes del club** y **Cerrar sesión**, que al cerrar también limpia los datos en caché y el equipo elegido, para que no los vea otra persona en el mismo navegador.
- Debajo, la barra de navegación: Dashboard, Plantilla, Entrenos, Partidos y Calendario. Si no caben en una línea, saltan a la siguiente.

## Dashboard

Todo se calcula con los datos que ya cargan las demás pantallas, y cada rol ve solo lo que le corresponde.

| Bloque | Qué muestra y cómo se calcula |
| --- | --- |
| Bienvenida | "Hola, [nombre] - [equipo]", y debajo la fecha de hoy y la temporada |
| Plantilla | Jugadores en plantilla (todos, incluidos los inactivos), lesionados, sancionados e inactivos, y cuántos están disponibles |
| Partidos | Partidos finalizados de **todos los tipos** y su récord (victorias, empates y derrotas) |
| Puntos de liga | 3 puntos por victoria y 1 por empate, sobre el máximo posible (3 por partido). **Solo cuentan los partidos de liga** finalizados: copa, torneo y amistosos no suman |
| Próximo partido | El que se está jugando o, si no hay, el pendiente más cercano en el tiempo (aunque su fecha ya haya pasado). Sin ninguno, un mensaje y el botón de programar partido, que abre el formulario |
| Último partido | El finalizado más reciente |
| Esta semana | Los siete días de la semana actual, de lunes a domingo, con entrenos y partidos |
| Tareas pendientes | Ver la tabla siguiente |
| Riesgo de sanción | Jugadores con **una amarilla menos que el límite**: con el límite por defecto (5), los que tienen 4. Sin ninguno, un mensaje. El entrenador principal ajusta el límite con la ruedecita |

Tareas pendientes (cada una lleva a la pantalla donde se resuelve, y solo se muestran las que el rol puede resolver):

| Tarea | Condición |
| --- | --- |
| Convocatoria sin hacer | Partido pendiente sin ningún convocado, a **48 horas o menos** de empezar. Si no tiene hora, se toma el inicio del día |
| Partido sin finalizar | Partido con la fecha pasada que no está finalizado |
| Entreno sin pasar lista | Entreno programado con la fecha pasada |

Hasta que se registren las amarillas (con el acta del partido), el bloque de riesgo de sanción estará vacío, porque todos los jugadores tienen cero.

## Mi perfil

- Cabecera con la foto (un círculo con las iniciales, por ejemplo DB), el nombre y apellidos en negrita y, debajo, el rol y el equipo.
- **Cuenta**: nombre y apellidos, correo electrónico, rol (bloqueado) y fecha de nacimiento. Cada uno se cambia en una ventana emergente. Cambiar el correo pide la contraseña actual.
- **Seguridad**: la contraseña nunca se muestra, solo asteriscos. Para cambiarla hay que escribir la actual, la nueva y repetir la nueva.
- Un botón grande de **Cerrar sesión**.

## Ajustes del club

- Cabecera con el escudo (uno genérico hasta que se puedan subir imágenes), el nombre en negrita y, debajo, la modalidad, la categoría y la temporada.
- **Equipo**: nombre, categoría, modalidad, temporada, duración del partido y competición (el nombre de la liga). La categoría y la modalidad se bloquean si ya hay jugadores o partidos.
- **Colores**: principal y secundario.
- **Ubicación**: país, localidad y campo.
- **Miembros**: todos los del equipo con su rol. El botón de invitar aún no funciona.
- Solo el entrenador principal puede cambiar algo; el resto ve los ajustes sin poder editarlos.

## Piezas comunes

- **Modal** y **FieldsModal**: las ventanas emergentes de toda la aplicación. FieldsModal es un formulario genérico: solo cambian los campos que se le pasan y lo que hace al guardar.
- **SettingsGroup** y **SettingsRow**: las filas de los ajustes, con flecha si se pueden cambiar y candado si están bloqueadas.
- **DateSelect**: el selector de fecha con tres desplegables (día, mes y año).
- **MatchCards**: las tarjetas de último y próximo partido, compartidas por la pantalla de partidos y el dashboard.
