# Barrido tú → usted (22-nov-2026)

Alcance: textos visibles de `src/app/**/*.html` y cadenas de `*.ts` (toasts, confirmaciones, placeholders, `title`, `aria-label`), el centro de ayuda (`/ayuda`) y los mensajes de error del backend (`sst_ws/src/**`) que llegan a pantalla. Se buscó con un script que descarta los comentarios y solo mira texto visible y literales: imperativos a inicio de frase, `tu/tus/te/ti`, `puedes/tienes/quieres/debes/deseas…`, subjuntivos de tú (`confirmes`, `vuelves`…) y pretéritos (`-aste`, `-iste`).

La app ya iba casi toda de usted: el centro de ayuda (`ayuda.contenido.ts` e `ilustraciones/*`) no tenía ningún tuteo. Lo que parecía tuteo en una búsqueda rápida («elige», «revisa», «sube»…) son terceras personas («el asesor sube», «se elige el asesor») o comentarios del código.

## Cambios (14 textos: 10 en el frontend, 4 en el backend)

### Frontend

| Archivo | Antes | Después |
|---|---|---|
| `src/app/pages/import/import.html:270` | Revisa y corrige antes de guardar. Nada llega a Órdenes hasta que confirmes | Revise y corrija antes de guardar. Nada llega a Órdenes hasta que confirme |
| `src/app/pages/import/import.html:463` | Puedes seguir revisando los campos extraídos a la derecha. | Puede seguir revisando los campos extraídos a la derecha. |
| `src/app/pages/import/import.html:510` | Baja confianza general. Revisa con cuidado los campos resaltados… | Baja confianza general. Revise con cuidado los campos resaltados… |
| `src/app/pages/import/import.html:642` | ⚠ Baja confianza — verifica contra el documento original. | ⚠ Baja confianza — verifique contra el documento original. |
| `src/app/pages/validation/validation.html:5` | Revisa, edita, valida y administra el estado de las órdenes | Revise, edite, valide y administre el estado de las órdenes |
| `src/app/pages/validation/validation.html:576` | Baja confianza general. Revisa con especial cuidado… | Baja confianza general. Revise con especial cuidado… |
| `src/app/pages/validation/validation.html:756` | ⚠ Baja confianza — verifica contra el documento original. | ⚠ Baja confianza — verifique contra el documento original. |
| `src/app/pages/validation/validation.ts` (`disableOrder`) | ¿Deseas deshabilitar la orden de «…»? Podrás verla y restaurarla… | ¿Desea deshabilitar la orden de «…»? Podrá verla y restaurarla… |
| `src/app/pages/validation/validation.ts` (`restoreOrder`) | ¿Deseas restaurar la orden de «…»? | ¿Desea restaurar la orden de «…»? |
| `src/app/pages/validation/validation.ts` (`deleteOrderPermanently`) | ¿Deseas eliminar PARA SIEMPRE…? No podrás restaurarla y, si vuelves a importar… | ¿Desea eliminar PARA SIEMPRE…? No podrá restaurarla y, si vuelve a importar… |

(Las tres confirmaciones de `validation.ts` suman 5 formas cambiadas: Deseas×3, Podrás×2, vuelves×1; en la tabla van como 3 filas.)

### Backend (`sst_ws`)

| Archivo | Antes | Después |
|---|---|---|
| `src/modules/imports/drafts.routes.js:280` | Envía "fields" con los campos editados… | Envíe "fields" con los campos editados… |
| `src/modules/imports/imports.routes.js:49` | Adjunta un archivo en el campo "file" | Adjunte un archivo en el campo "file" |
| `src/modules/imports/imports.routes.js:62` | Adjunta un archivo en el campo "file" | Adjunte un archivo en el campo "file" |
| `src/modules/public/public.routes.js:159` | Adjunta al menos un archivo | Adjunte al menos un archivo |

Comprobado: `ng build` limpio y `node --check` de los tres archivos del backend.

## Dudosos, sin tocar

- **Correos del backend en tú** (no son pantalla, por eso quedaron fuera del encargo):
  - correo de asignación al asesor (`orders.routes.js` ~1577-1764: «imprímelos y completa…», «los redactas tú», «Se te asignó», «Abajo tienes», «Cuando termines la visita, sube los soportes… no necesitas iniciar sesión», «tendrás que subir», «para tu calendario»);
  - correo de soportes rechazados (`orders.routes.js` ~2256-2294: «Sube los soportes corregidos», «Solicita un enlace nuevo», «los soportes que enviaste», «podrás reemplazar», «el que subas»);
  - correo de cuenta de cobro (`billing.service.js:878`: «revísela y acéptela o **recházala**», que mezcla los dos tratos);
  - correos de contraseña (`auth.service.js:83-139`: «restablecer tu contraseña. Ingresa a…», «Si no solicitaste…, ignora este correo», «Tu contraseña fue actualizada», «Si no realizaste este cambio, contacta…»).
  Si el dueño quiere usted también en los correos, son esos.
- **Prompts de la IA** (`system-extraccion.prompt.ts`, `prefacturas.prompt.js`, `gemini.service.js`): van en tú al modelo, no los ve nadie.
- **Terceras personas que se leen como imperativo**, correctas tal cual: «Filtra mientras escribe» (pie del selector de búsqueda), «Consulta rápida» (título del centro de ayuda), «Avisa, no genera nada solo» (Configuración), «Carga de Excel…» (subtítulo de Importar), los `title` «Consulta a la DIAN…», «Anula su comprobante…», «Deja fuera bancos…».
- `src/app/layout/shell/**`, `src/app/pages/dashboard/**` y `src/app/pages/reports/finanzas/**` no se tocaron (otros agentes): no tienen tuteo (el «sube/baja» de `reports/finanzas/formato.ts` es tercera persona).
