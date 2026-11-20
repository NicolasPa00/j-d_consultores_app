# Rediseño visual de ORBITA («glamur») — 20-nov-2026

> **Rama `rediseno-visual` en los DOS repos** (frontend `jdd_consultores_app` y backend `sst_ws`), subida a GitHub.
> **NO está desplegada y no debe desplegarse hasta que el dueño la apruebe.**
> La dirección de diseño completa (paleta, contrastes medidos, tipografía, componentes, «no hacer» y
> **decisiones pendientes**) está en `docs/2-arquitectura/DESIGN.md`. Este archivo es el tablero para retomar.

## 0. Dónde retomar (desde otro equipo)

```bash
# frontend
cd jdd_consultores_app && git fetch && git checkout rediseno-visual && npm install
# backend (trae GET /api/reports/inicio)
cd ../sst_ws && git fetch && git checkout rediseno-visual
# túnel a jdd_dev (ver CLAUDE.md §5) y luego:
cd sst_ws && npm run dev          # :4000
cd jdd_consultores_app && npm start   # :4001
```

Sin migraciones: el backend solo agrega un endpoint de lectura.

## 1. Por qué

La clienta: «lo primero que veo al ingresar son un montón de órdenes. Vamos dándole un poquito de glamur». Mandó un
inicio de Siigo (accesos directos con ícono) como **referencia, no para copiar**. El dueño pidió un rediseño de TODAS
las vistas, hecho con agentes constructores y jueces críticos, identidad propia de ORBITA (azul profundo + cian) y el
**oficio** de color de EscalApp (tokens con nombre, contrastes medidos, sombras teñidas, login partido), no su paleta.

Decisiones del dueño: identidad ORBITA · Inicio por rol · rama local sin desplegar · **piel nueva, flujo igual**
(no se movió ningún botón, filtro ni paso de las vistas de trabajo).

## 2. Qué se hizo (commits en `rediseno-visual`)

| Fase | Qué | Commit |
|---|---|---|
| 1 | Investigación + 3 direcciones (A sobria, B operativa, C cálida) → mezcla B+A → `DESIGN.md` + lámina `docs/2-arquitectura/diseno-orbita-lamina.png` | front `07ba766` |
| 2 | Cimientos: tokens ORBITA (`src/styles/_tokens.scss`, con los 77 nombres viejos como alias), Inter autoalojada (`public/fonts/`), componentes globales (`.tabs`, `.estado-vacio`, `.kpi-card`, `.seg`, tablas tabulares, pills), limpieza de hex en todas las hojas | front `07ba766` |
| 3 | Shell en «noche» con grupos, segmentado Operación/Finanzas en la barra superior, «Contraer menú» al pie · Login / recuperar / reset / sistemas partidos en dos con escena (`pages/login/escena-acceso.*`) · **Inicio por rol** (Resumen: accesos según permisos + «Requiere su atención» + «Próximas a ejecutar»; pestaña Indicadores con los KPI) — se eliminó `loadOrders()` (`GET /orders` sin filtros) | front `c0f5811` · back `e041f48` |
| 4 | Piel de todas las vistas de trabajo: Órdenes (fila en dos niveles, columna Opciones fija a ~1093 px, FINALIZADA con visto), Operación (importar, profesionales, cuentas de cobro, empresas, estadísticas, configuración, portal, encuesta, ayuda), Finanzas (facturación, DS, nómina, cartera, compras, contabilidad y subvistas, informes contables, terceros, parametrización) | front `c0f5811` |
| 5 | Refutación final: juez de coherencia + abogado del diablo + corrector + juez final | ver §4 |

Endpoint nuevo: `GET /api/reports/inicio` (`sst_ws/src/modules/reports/reports.routes.js`). Una sola consulta con los
conteos de «Requiere su atención» usando LAS MISMAS definiciones de cada vista; filtra por `sst.permisos_rol` (lo no
permitido llega `null`). Usa `pg_input_is_valid` → requiere PostgreSQL ≥ 16 (producción es 16).

## 3. Qué mirar (orden sugerido para revisar en :4001)

1. `/login` (escritorio y celular: en el celular las credenciales suben como hoja) · `/recuperar` · `/sistemas`.
2. `/dashboard` como admin: saludo, accesos, «Requiere su atención», pestaña Indicadores. Luego con un usuario
   contador y uno administrativo: cada rol ve solo sus accesos (verificado por captura con permisos reales del rol).
3. `/ordenes`: pestañas, fila en dos niveles, pills de estado (FINALIZADA con ✓), modal Ver, modal de Cobro.
4. Cambiar a Finanzas con el segmentado: `/facturacion` (emitidas, borradores, modal nota crédito), `/contabilidad`,
   `/cartera`, `/nomina`.
5. Barra lateral contraída y navegación en el celular (barra inferior + «Más»).
6. `/configuracion` y `/ayuda`.

## 4. Calificaciones de los jueces (umbral pedido 8,5)

Ningún grupo llegó a 8,5 en el juez de DISEÑO (quedaron 7,6–8,1 tras 3 rondas cada uno); el juez de FLUJO quedó en
8–8,5 **sin veto** en todos. Los defectos restantes de cada grupo están volcados abajo (§6) y en la ronda final.
El orquestador revisó las pantallas clave y las acepta para revisión del dueño.

- `ng build`: sin errores ni avisos de presupuesto · `ng test`: verde.
- Consola del navegador: **0 errores** en todas las rutas, a 1440 y 390, con sesiones maestro, contador,
  administrativo y auditor.

## 5. Decisiones que necesita el dueño

Están detalladas en **`DESIGN.md` §11 «Pendientes del dueño»**. Resumen:

1. Confirmar el **Inicio por rol** tal como quedó (se retiró «Órdenes recientes»; KPI pasan a la pestaña Indicadores).
2. Confirmar los **cambios de posición del shell**: segmentado Operación/Finanzas en vez del título centrado,
   «Contraer menú» y Configuración al pie, subtítulo de la barra superior retirado.
3. **Estado ARL «Pendiente» en neutro** (antes ámbar).
4. **Barrido tú → usted** del resto de la app (§12 de DESIGN) — y con él rehacer las capturas del centro de ayuda.
5. Funciones que quedaron fuera a propósito (filtros nuevos en Órdenes, Semana/Mes/Año, Órdenes apiladas en celular…).
6. Cuándo desplegar.

## 6. Pendientes técnicos tras la aprobación

- Rehacer las capturas del centro de ayuda (`herramientas/ayuda-capturas/ayuda-capturas.mjs todos`): hoy muestran el
  shell viejo. El tema nuevo «Inicio: Resumen e Indicadores» ya está escrito en `ayuda.contenido.ts` (sin pantallazo).
- Desplegar back y front juntos (el Inicio llama a `/reports/inicio`; con el back viejo, «Requiere su atención» sale con «—»).
- Revisar la lista de defectos abiertos de los jueces (§7).

## 7. Herramientas usadas (no viajan por git)

Las capturas antes/después, los scripts de recorrido (`capturar.mjs`, con sesiones simuladas por rol que
interceptan `/auth/me`) y las salidas de los jueces quedaron en el scratchpad de la sesión del equipo original.
Si hacen falta, se regeneran: dev solo tiene usuarios admin, así que los demás roles se simulan firmando el JWT del
maestro y respondiendo `/auth/me` con los permisos del rol (`sst.permisos_rol`).
