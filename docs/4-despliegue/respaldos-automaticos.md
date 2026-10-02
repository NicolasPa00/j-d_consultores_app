# Respaldos automáticos de producción (A0-02)

> **Estado (2-oct-2026): PREPARADO, NO INSTALADO.** El script está en el repo del backend
> (`sst_ws/scripts/servidor/respaldo-diario.sh`). Instalarlo es una tarea sobre el servidor de
> producción: la decide el usuario. Falta además decidir **dónde va la copia fuera de la máquina**
> (§3).

## 1. Qué hace

Cada noche, como el usuario `orbita` del VPS de producción (`45.77.118.62`):

1. `pg_dump -Fc` de la base (la URL sale de `/opt/orbita/sst_ws/.env`, igual que en los runbooks) y
   **comprueba que el dump se puede leer** (`pg_restore --list`) antes de darlo por bueno.
2. `tar` de los archivos subidos (`/opt/orbita/storage`: soportes, órdenes, PDF de facturas).
3. Si `RESPALDO_REMOTO` está definido, copia los dos archivos **fuera de la máquina** con `rclone`.
4. Borra los automáticos de más de 7 días. Los respaldos manuales de `~/respaldos/` (los de cada
   despliegue) **no se tocan**: los automáticos van en `~/respaldos/auto/`.

Todo queda en `~/respaldos/auto/respaldo.log`: una línea `OK` por noche, o `ERROR`/`AVISO` con el motivo.

## 2. Instalar (≈10 minutos)

```bash
ssh orbita@45.77.118.62 -i ~/.ssh/id_orbita
cd /opt/orbita/sst_ws && git pull --ff-only        # trae scripts/servidor/respaldo-diario.sh
chmod +x scripts/servidor/respaldo-diario.sh
which pg_dump pg_restore                            # vienen con PostgreSQL 16
scripts/servidor/respaldo-diario.sh                 # primera corrida a mano
tail -3 ~/respaldos/auto/respaldo.log               # debe decir OK
ls -lh ~/respaldos/auto/
```

Programarlo (el servidor está en UTC: 08:15 UTC = 3:15 a. m. en Colombia, sin nadie trabajando):

```bash
crontab -e
# añadir:
15 8 * * * /opt/orbita/sst_ws/scripts/servidor/respaldo-diario.sh
```

Si el `git pull` no conviene en ese momento (código a medio desplegar), basta con copiar el script
con `scp` a `~/bin/` y apuntar el crontab ahí.

## 3. La copia fuera de la máquina (decisión pendiente)

Sin ella, un fallo del disco del VPS se lleva la base **y** sus respaldos. Opciones, de menos a
más trabajo:

| Opción | Costo aprox. | Qué hay que hacer |
|---|---|---|
| **Vultr Object Storage** (mismo proveedor) | ~US$ 6/mes | Crear el bucket, `rclone config` con sus llaves, `RESPALDO_REMOTO=vultr:orbita-respaldos` en el crontab |
| Backups automáticos de Vultr (instantánea del disco entero) | ~20 % del plan | Activarlos en el panel; no reemplaza al dump (no es por base) pero cubre el disco |
| Descarga al PC de desarrollo | 0 | Una tarea programada en Windows que haga `scp` de `~/respaldos/auto/` cada día; depende de que el PC esté encendido |

Con la que se elija, el crontab queda así (ejemplo con rclone):

```cron
15 8 * * * RESPALDO_REMOTO=vultr:orbita-respaldos /opt/orbita/sst_ws/scripts/servidor/respaldo-diario.sh
```

## 4. Restaurar

```bash
# Ensayo (siempre primero en una base aparte):
sudo -n -u postgres createdb -O orbita orbita_ensayo
pg_restore --no-owner -d "postgresql://orbita:<clave>@localhost:5432/orbita_ensayo" ~/respaldos/auto/orbita-AAAAMMDD-HHMM.dump
# Archivos:
tar -xzf ~/respaldos/auto/storage-AAAAMMDD-HHMM.tgz -C /tmp/ensayo-storage
```

Restaurar sobre la base real (`orbita`) es una decisión que se toma con el sistema detenido
(`pm2 stop`), después de un respaldo del estado actual. Mismo método que el plan de reversa de
`despliegue-lote2.md`.
