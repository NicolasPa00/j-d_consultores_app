# Despliegue en Vultr — ORBITA (JD&D Consultores)

> **Tablero de la subida a producción.** Empezado el 2-sep-2026.
> Estado: **EN LÍNEA** desde el 2-sep-2026 en https://orbita.jddconsultores.com
> (HTTPS, servicios activos y arranque automático). Lo que queda son los
> respaldos (§7.1) y los riesgos abiertos del §7.
> Al terminar cada bloque, marcarlo aquí y volcar el resumen en `HANDOFF.md` §3.

## 0 · Dónde retomar

**El sistema está en línea.** Lo hecho está marcado ✅ a lo largo del documento;
esto es lo que queda, por orden de urgencia:

| | Qué | Dónde |
|---|---|---|
| 🔴 1 | **Respaldos.** No hay ninguno y la base del cliente vive solo en ese disco | §7.1 |
| 🔴 2 | **Empujar dos commits** que el servidor tiene aplicados a mano como parche | abajo |
| 🟠 3 | **Ensayo funcional completo** en producción: nada de la aplicación se ha ejecutado nunca ahí | §5.5 |
| 🟠 4 | **El resumen ejecutivo se inventa el texto** | §7.7 |
| 🟡 5 | `pdf.service.js` depende de la zona horaria del proceso | §7.9a |
| 🟡 6 | `npm run migrate` resiembra lo que se borró | §5.1 |
| 🟡 7 | Grupo de cortafuegos de Vultr, como segunda barrera | §4.3 |
| 🟡 8 | Verificar el correo de recuperación de la cuenta de Google | §7.4 |

**Los dos commits sin empujar** (el servidor los tiene como parche local, así que
tras el push hay que reconciliar):

```bash
# desde el equipo de desarrollo
git -C sst_ws push origin master                 # fix(schema)
git -C jdd_consultores_app push origin main      # fix(ssr)

# y luego, en el servidor
ssh orbita@45.77.118.62 -i ~/.ssh/id_orbita
cd /opt/orbita/sst_ws   && git checkout -- db/schema.sql && git pull
cd /opt/orbita/frontend && git checkout -- angular.json src/server.ts && git pull && npm run build
sudo systemctl restart orbita-api orbita-web
```

**Cómo entrar y mirar cómo va:**

```bash
ssh orbita@45.77.118.62 -i ~/.ssh/id_orbita      # root y contraseñas están cerrados

systemctl status orbita-api orbita-web           # los dos procesos Node
sudo journalctl -u orbita-api  -f                # log de la API
sudo journalctl -u orbita-web  -f                # log del SSR
curl -s localhost:4000/api/health                # ¿responde la API?

# psql: la contraseña está dentro del .env, no en ningún otro sitio
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
psql -h 127.0.0.1 -U orbita -d orbita
```

**Qué NO hacer:**

- No correr `npm run migrate` sin volver a borrar después lo que siembra (§5.1).
- No tocar el apex ni `www` en el DNS de Hostinger: ahí vive la landing.
- No poner `EMAIL_DRIVER=smtp` en pruebas locales sin pensarlo: los correos
  salen ahora **a nombre del cliente**.

---

## 1 · Qué corre dónde

```
Internet
 │
 ├─ jddconsultores.com     ─┐
 ├─ www.jddconsultores.com  ├─→ Hostinger (landing actual)  ← NO SE TOCA
 │                         ─┘
 └─ orbita.jddconsultores.com ──→ registro A ──→ 45.77.118.62  (Vultr, Miami)
                                                   │
                                            nginx :80 / :443  (certbot / Let's Encrypt)
                                                   ├── /api/*  → 127.0.0.1:4000   sst_ws (Express)
                                                   └── /*      → 127.0.0.1:4001   Angular SSR
                                                          │
                                            PostgreSQL 16 :5432   (escucha SOLO en localhost)
                                            /opt/orbita/storage   (soportes, importados, PDFs generados)
```

Fuera del VPS quedan, porque son servicios de terceros y no hay alternativa:
**OpenAI** (motor de extracción de las OS), **Gemini** (auxiliar) y **SMTP de
Gmail** (correos al profesional). La base de datos y los archivos sí quedan
enteramente en el VPS, como se decidió.

**Presupuesto de RAM (2 GB).** Postgres ~350 MB · backend Node ~250 MB ·
SSR Node ~250 MB · nginx ~20 MB · sistema ~250 MB ≈ **1,1 GB**. Sobra margen
para operar, **pero no para compilar**: `ng build` pide cerca de 2 GB. Eso lo
cubre el swap, que la imagen de Vultr ya trae puesto (§4.2).

## 2 · Crear la instancia (Vultr, Step 2) — ✅ hecha el 2-sep-2026

Plan ya elegido: `vc2-1c-2gb` · 1 vCPU · 2 GB · 55 GB SSD · **Miami** (la mejor
latencia hacia Colombia de las opciones de Vultr).

| Campo | Qué poner |
|---|---|
| Operating System | **Ubuntu 24.04 LTS x64** (cambiar el 26.04 preseleccionado) |
| SSH Keys | Agregar la clave dedicada `id_orbita` — ver §2.1 |
| Startup Script | *(vacío)* — el primer arranque se hace a mano, §4 |
| Firewall Group | *(vacío por ahora)* — se crea y se engancha después, §4.3 |
| Instance Address | **Solo Public IPv4**. Nada del stack usa IPv6 y una segunda dirección pública es una segunda puerta que asegurar |
| VPC / Private Network | No (una sola máquina) |
| DDoS Protection | No (son 10 USD/mes aparte) |
| Auto Backups | **Disabled** — decisión del cliente. ⚠️ Leer §7.1 |
| Server Hostname | `orbita-prod` |
| Server Label | `orbita-prod` |
| Limited User Login | No — el usuario con nombre propio se crea a mano en §4.1 |

### 2.1 · Clave SSH

Se generó una clave **dedicada a este proyecto** el 2-sep-2026, en vez de
reutilizar la `id_ed25519` personal que ya sirve al otro VPS (`escalapp`).
Motivo: todo lo del cliente se está registrando bajo
`redes.jddconsultores@gmail.com`, y una clave por proyecto significa que
entregar o revocar el acceso a este servidor no toca ningún otro.

```
archivo privado : ~/.ssh/id_orbita
huella          : SHA256:t/x0cnY5rWABjLvU7SAVNN4wg+tU2IiMG6hKiLdBEHc
```

En Vultr quedó registrada con el nombre **`jddkey`**. Su contenido es:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOslLmEm9nBWirb37Zn+r6soYrF3Bpjw1j0/Rql7E7kh redes.jddconsultores@gmail.com
```

⚠️ El comentario del final (`redes.jddconsultores@gmail.com`) es **solo una
etiqueta**: no autentica nada ni ata la clave a esa cuenta de Google. Lo que sí
conviene revisar es que la **cuenta de Vultr y la de Hostinger** estén a nombre
del cliente, porque de eso sí depende quién es dueño de la infraestructura.

La clave nació **sin contraseña**, para que los despliegues no pidan nada. Si
se le quiere poner una: `ssh-keygen -p -f ~/.ssh/id_orbita`.

## 3 · Dominio en Hostinger

Los nameservers son `ns1/ns2.dns-parking.com`, o sea que **la zona DNS se
administra en Hostinger**: Dominios → `jddconsultores.com` → *DNS / Nameservers*
→ *Registros DNS*.

1. **Antes de tocar nada**, guardar una captura (o el export) de la zona actual.
   Es el seguro por si la landing deja de responder.
2. Agregar **un solo registro**:

   | Tipo | Nombre | Apunta a | TTL |
   |---|---|---|---|
   | A | `orbita` | `45.77.118.62` | 300 |

   TTL 300 mientras se configura, para poder corregir en cinco minutos; al
   final se sube a 14400.
3. **No tocar**: el registro `@`, el `www`, los `MX` ni los `TXT`. De ahí vive
   la landing y el correo del cliente.
4. Comprobar antes de pedir el certificado:
   `nslookup orbita.jddconsultores.com 8.8.8.8`

## 4 · Primer arranque del servidor

### 4.1 · Usuario y acceso — ✅ hecho el 2-sep-2026

La instancia es **45.77.118.62** (`orbita-prod`, Ubuntu 24.04.4 LTS, 1 vCPU,
1,9 GiB útiles, 52 GB de disco).

🔴 **La imagen de Vultr llega con el SSH abierto de par en par:**
`PermitRootLogin yes` y, en `sshd_config.d/50-cloud-init.conf`,
`PasswordAuthentication yes`. Es decir, root con contraseña desde internet en un
puerto 22 que los bots barren de continuo. Lo primero es cerrarlo.

```bash
# 1) usuario propio, con la misma llave que ya trae root
adduser --disabled-password --gecos "" orbita
usermod -aG sudo orbita
install -d -m 700 -o orbita -g orbita /home/orbita/.ssh
cp /root/.ssh/authorized_keys /home/orbita/.ssh/authorized_keys
chown orbita:orbita /home/orbita/.ssh/authorized_keys && chmod 600 /home/orbita/.ssh/authorized_keys

# 2) sudo SIN contraseña. La cuenta nace sin contraseña (solo llave), así que un
#    sudo que la pidiera fallaría siempre. La credencial real es la llave SSH.
echo "orbita ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-orbita
chmod 440 /etc/sudoers.d/90-orbita && visudo -c -f /etc/sudoers.d/90-orbita
```

⚠️ **Comprobar que `orbita` entra y que su `sudo` funciona ANTES de tocar sshd.**
Si se cierra el acceso de root sin haberlo verificado, la única puerta que queda
es la consola web de Vultr.

El endurecimiento va en un archivo aparte, **con prefijo `00`**:

```bash
cat > /etc/ssh/sshd_config.d/00-orbita-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
chmod 644 /etc/ssh/sshd_config.d/00-orbita-hardening.conf
sshd -t && sshd -T | grep -Ei '^(permitrootlogin|passwordauthentication)'
systemctl restart ssh
```

⚠️ **El prefijo `00` no es estética.** En sshd **gana la PRIMERA aparición** de
cada directiva, y el `Include /etc/ssh/sshd_config.d/*.conf` está en la línea 12
de `sshd_config`, antes de su propio `PermitRootLogin yes`. Un archivo `99-…`
perdería contra `50-cloud-init.conf`; uno `00-…` los pisa a los dos. Y `sshd -T`
antes de reiniciar dice qué va a quedar de verdad, en vez de suponerlo.

Verificado el 2-sep-2026: `orbita` entra · `root` → *Permission denied* ·
autenticación por contraseña → *Permission denied*.

En el equipo local, `~/.ssh/config`:

```
Host orbita
    HostName 45.77.118.62
    User orbita
    IdentityFile ~/.ssh/id_orbita
    IdentitiesOnly yes
```

**Sobre `linuxuser`:** la imagen lo crea aunque *Limited User Login* esté
apagado en el panel. Tiene la contraseña **bloqueada** (`passwd -S` → `L`) y su
propio `authorized_keys` con la misma llave, así que no añade una vía de entrada
distinta. Se deja como está.

### 4.2 · Swap — ✅ ya venía puesto

**No hay que crearlo.** La imagen de Vultr trae un `/swapfile` de **5,3 GB** ya
declarado en `/etc/fstab`. Sobra para compilar el frontend.

Lo único que se ajustó es la tendencia a usarlo:

```bash
echo 'vm.swappiness=10' > /etc/sysctl.d/99-orbita.conf
sysctl -p /etc/sysctl.d/99-orbita.conf
```

Con el 60 de fábrica el kernel empieza a mandar páginas al disco mucho antes de
necesitarlo, y eso con Postgres al lado se nota.

### 4.3 · Cortafuegos — ✅ hecho

`ufw` **ya venía activo** en la imagen, con `deny (incoming)` y solo el 22
abierto. Solo faltaba la web:

```bash
ufw allow 80/tcp && ufw allow 443/tcp
```

Estado actual: 22, 80 y 443 abiertos (IPv4 e IPv6), todo lo demás denegado.

Sigue pendiente, como segunda barrera y ahora que la base de datos vive aquí, el
**grupo de cortafuegos de Vultr** (Network → Firewall → `orbita-web` con
22/80/443 en *accept*; luego engancharlo desde la instancia, Settings →
Firewall). Es gratis y protege aunque alguien deje `ufw` mal configurado.

### 4.4 · Paquetes base — ✅ hecho el 2-sep-2026

```bash
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
sudo -E apt-get update -qq
sudo -E apt-get -y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold upgrade
sudo -E apt-get install -y git nginx postgresql postgresql-contrib                            python3-certbot-nginx unattended-upgrades
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo -E apt-get install -y nodejs
```

⚠️ `NEEDRESTART_MODE=a` y `DEBIAN_FRONTEND=noninteractive` no son adorno: sin
ellos, Ubuntu 24.04 abre el diálogo de *needrestart* a mitad del `upgrade` y la
sesión se queda esperando una respuesta que por SSH no llega nunca.

Quedó instalado:

```
Node        v22.23.2   ·  npm 10.9.8
nginx       1.24.0     ·  activo
PostgreSQL  16.15      ·  activo
certbot     2.9.0
```

No hizo falta reiniciar (`/var/run/reboot-required` no existía). Memoria tras la
instalación: 425 MiB en uso, 1,5 GiB disponibles.

### 4.5 · PostgreSQL — ✅ hecho el 2-sep-2026

```bash
CLAVE=$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)
umask 077 && echo "$CLAVE" > /home/orbita/.orbita-db-pass   # provisional
sudo -u postgres psql -c "CREATE ROLE orbita LOGIN PASSWORD '$CLAVE';"
sudo -u postgres psql -c "CREATE DATABASE orbita OWNER orbita;"
sudo -u postgres psql -d orbita -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
```

⚠️ **`pgcrypto` se crea de antemano y como `postgres`.** `db/schema.sql` la pide
con `CREATE EXTENSION IF NOT EXISTS`, pero esa sentencia exige **superusuario**:
ejecutada por el rol `orbita` durante `npm run migrate`, la migración entera
falla en la línea 13. Creándola antes, el `IF NOT EXISTS` pasa de largo.

🔑 La contraseña generada vive en **`/home/orbita/.orbita-db-pass`** (modo 600).
Es **provisional**: en cuanto exista `/opt/orbita/sst_ws/.env` con la
`DATABASE_URL`, ese archivo sobra y hay que borrarlo.

El ajuste de memoria va en un **drop-in**, no editando `postgresql.conf`
(la última línea del archivo hace `include_dir = 'conf.d'`), para que una
actualización del paquete no lo pise:

```bash
sudo tee /etc/postgresql/16/main/conf.d/10-orbita.conf <<'EOF'
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 8MB
maintenance_work_mem = 64MB
max_connections = 50
EOF
sudo systemctl restart postgresql
```

Comprobado el 2-sep-2026, con la cadena de conexión que usará la app:

```
conexión TCP 127.0.0.1 como el rol orbita  → OK
permisos de DDL (crear/borrar esquemas)    → OK, puede crear `sst`
listen_addresses                           → localhost  (no se llega desde fuera)
autenticación en pg_hba para 127.0.0.1     → scram-sha-256
```

La base queda **vacía**: el esquema lo crea `npm run migrate` en §5.1.

## 5 · Subir el código — ✅ hecho el 2-sep-2026

Los dos repositorios son privados, así que el servidor necesita una **deploy
key de solo lectura** por repo.

⚠️ **Hacen falta DOS llaves, no una.** GitHub exige que cada deploy key sirva a
**un solo repositorio**: al pegar la misma en el segundo responde *"Key is
already in use"*. Como las dos apuntan a `github.com`, se distinguen con alias
de host en `~/.ssh/config`.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_deploy_front -N '' -C 'orbita-prod · frontend'
ssh-keygen -t ed25519 -f ~/.ssh/id_deploy_ws    -N '' -C 'orbita-prod · sst_ws'

cat > ~/.ssh/config <<'EOF'
Host github-front
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_deploy_front
    IdentitiesOnly yes

Host github-ws
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_deploy_ws
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
```

Cada `.pub` se pega en **su** repo (Settings → Deploy keys → Add deploy key),
**sin** marcar *Allow write access*: el servidor solo tiene que leer, y si
pudiera escribir, quien entrara a la máquina podría empujar código a los repos.

Comprobar antes de clonar, que falla mucho más barato:

```bash
git ls-remote git@github-front:NicolasPa00/j-d_consultores_app.git HEAD
git ls-remote git@github-ws:Juanskpc/sst_ws.git HEAD
```

📌 `sst_ws` está bajo la cuenta **Juanskpc**: es lo único del despliegue que
depende de otra persona.

Estructura en el servidor:

```
/opt/orbita/
  ├── sst_ws/       (repo Juanskpc/sst_ws)
  ├── frontend/     (repo NicolasPa00/j-d_consultores_app)
  └── storage/      ← FUERA de los repos, para que un git clean no lo borre
```

```bash
sudo mkdir -p /opt/orbita/storage && sudo chown -R orbita:orbita /opt/orbita
cd /opt/orbita
git clone git@github-ws:Juanskpc/sst_ws.git
git clone git@github-front:NicolasPa00/j-d_consultores_app.git frontend
```

✅ **Ya no hay que elegir rama.** El 2-sep-2026 se confirmó lo pendiente en los
dos repos y la tanda del 22-ago se fusionó a `main`/`master` (avance rápido, sin
conflictos: las ramas principales eran ancestros directos). El servidor clona la
principal, como debe ser.

### 5.1 · Backend — ✅

```bash
cd /opt/orbita/sst_ws
npm ci
npm run prisma:generate      # el cliente tipado NO se genera solo
# crear /opt/orbita/sst_ws/.env — ver §6
npm run migrate              # aplica schema.sql + seed.sql y siembra cuentas
```

`db/schema.sql` **ya trae aplicadas las cinco migraciones** del 22 y 23 de
agosto (se comprobó columna por columna: `modalidad_ejecucion`,
`tipo_servicio_arl`, `viaticos_*`, `estado_cobro`, `profesional_formatos_id`,
`tipos_viatico`, `profesionales_arl`, `historial_cobro_orden`,
`soportes_requeridos`). Es decir: **la base de producción se levanta desde cero
con `npm run migrate`, sin necesidad de traerse nada de Neon.**


> 🔴 **`schema.sql` no se podía aplicar sobre una base vacía.** Dos
> `ALTER TABLE sst.borradores_extraccion ADD COLUMN` (`tipo_orden_id`,
> `tipo_viatico_id`) vivían en la línea 498, pero la tabla se crea en la 678.
> Contra la Neon compartida nunca dio la cara —la tabla ya existía de antes—, y
> aquí la migración murió en el primer intento con
> *relation "sst.borradores_extraccion" does not exist*. Arreglado en el commit
> `fix(schema): schema.sql no se podía aplicar sobre una base vacía`. **Esta fue
> la primera vez que ese archivo corrió contra una base vacía de verdad**, y por
> eso conviene levantar una base desechable de vez en cuando.

> ⚠️ **`npm run migrate` siembra cosas que en producción no se quieren.** Crea
> la cuenta CLIENTE (siempre, aunque no se use), tres **profesionales
> inventados** (Carlos Mendoza, Diana Patiño, Jorge Salazar `@jdd.com`) y —desde
> `schema.sql`— tres **tipos de orden con valor hora inventado** (Asesoría
> 120.000, Capacitación 85.000, Inspección 95.000), que es de donde sale lo que
> se le paga al profesional en la cuenta de cobro. El 2-sep-2026 se borraron los
> tres grupos a mano tras migrar. **Un `npm run migrate` futuro los vuelve a
> crear**: hay que volver a borrarlos, o gatear la siembra por variable de
> entorno (tarea pendiente).

Estado real de la base tras la limpieza:

```
usuarios       1   (solo el Administrador Maestro)
profesionales  0     ordenes 0     borradores 0     empresas 0
tipos_orden    0   (los crea el cliente con SUS tarifas)
--- catalogos que SÍ deben estar ---
arls 3 · permisos_rol 32 · plantillas 3 · configuracion 5
```

⚠️ Con `tipos_orden` vacío **no se pueden importar órdenes**: el tipo es
obligatorio al confirmar. Es lo primero que el cliente tiene que crear, en
Configuración → Preferencias del sistema.

### 5.2 · Frontend — ✅

```bash
cd /opt/orbita/frontend
npm ci
npm run build                # ~3-5 min en esta máquina; por eso el swap
```

### 5.3 · Servicios systemd — ✅

`/etc/systemd/system/orbita-api.service`

```ini
[Unit]
Description=ORBITA · API (sst_ws)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=orbita
WorkingDirectory=/opt/orbita/sst_ws
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/orbita-web.service`

```ini
[Unit]
Description=ORBITA · Frontend SSR
After=network.target

[Service]
Type=simple
User=orbita
WorkingDirectory=/opt/orbita/frontend
ExecStart=/usr/bin/node dist/jdd_consultores_app/server/server.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=4001

[Install]
WantedBy=multi-user.target
```

⚠️ **`PORT=4001` no es cosmético.** El servidor SSR de Angular y el backend
*ambos* caen por defecto en el 4000; sin esta línea, el segundo que arranque
muere con `EADDRINUSE`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now orbita-api orbita-web
sudo systemctl status orbita-api orbita-web
```

### 5.4 · nginx y TLS — ✅

`/etc/nginx/sites-available/orbita`

```nginx
server {
    listen 80;
    server_name orbita.jddconsultores.com;

    # los PDFs del SIPAB y los soportes pesan; 1 MB por defecto se queda corto
    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # la extracción con OpenAI puede tardar: 30 s de timeout + 2 reintentos
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/orbita /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# con el registro A ya propagado:
sudo certbot --nginx -d orbita.jddconsultores.com
```

### 5.5 · Comprobado de punta a punta (2-sep-2026)

```
https://orbita.jddconsultores.com            HTTP 200 · TLS válido
http://…                                     301 → https
/api/health                                  {"status":"ok"}
login maestro (documento 9999999999)         token de 331 caracteres
/api/auth/me con ese token                   usuario + 8 permisos
/api/orders                                  {"data":[]}
credenciales falsas                          {"error":"Credenciales inválidas"}
https://jddconsultores.com (landing)         HTTP 200 — intacta
certbot renew --dry-run                      success · timer a las 11:02 UTC
orbita-api · orbita-web · nginx · postgresql  todos `enabled`
```

**Comprobaciones de resistencia (2-sep-2026, con la base vacía):**

```
reinicio completo de la máquina    todo vuelve solo en ~40 s
  orbita-api · orbita-web · nginx · postgresql   activos
  zona horaria · swap · ufw                      conservados
salida SMTP desde el VPS           587 y 465 abiertos · 25 bloqueado por Vultr
correo real enviado DESDE el VPS   entregado
api.openai.com desde el VPS        alcanzable
/opt/orbita/storage                escribible por el usuario del servicio
activos estáticos (logos, favicon) 200
log del SSR tras el arreglo        0 errores
```

⚠️ Los dos Node escuchan en `*:4000` y `*:4001`, no en `127.0.0.1`. No son
alcanzables desde fuera porque `ufw` solo abre 22/80/443, pero el cierre depende
del cortafuegos y no del propio proceso. Si algún día se toca `ufw`, tenerlo
presente.

## 6 · Variables de producción (`/opt/orbita/sst_ws/.env`)

Partiendo del `.env` de desarrollo, lo que **cambia**:

```ini
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://orbita:CLAVE@127.0.0.1:5432/orbita?sslmode=disable
DB_SCHEMA=sst
DB_SSL=false                                   # ← requiere el cambio de §8.2

CORS_ORIGIN=https://orbita.jddconsultores.com
PUBLIC_APP_URL=https://orbita.jddconsultores.com

JWT_SECRET=<nuevo: openssl rand -hex 32>
MAESTRO_PASSWORD=<clave nueva, NO la de desarrollo>
CLIENTE_PASSWORD=<clave nueva; solo se usa en el alta inicial>

STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=/opt/orbita/storage

EMAIL_DRIVER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=redes.jddconsultores@gmail.com
SMTP_PASS=<contraseña de aplicación de esa cuenta — ver §7.4>
EMAIL_FROM=ORBITA · JD&D Consultores <redes.jddconsultores@gmail.com>
```

Se conservan tal cual: `OPENAI_*`, `GEMINI_*`.
Permisos: `chmod 600 /opt/orbita/sst_ws/.env`.

## 7 · Riesgos y decisiones abiertas

### 7.1 · 🔴 Los backups ya no son "cosa del cliente" en el mismo sentido

Cuando la base era Neon, apagar los backups de Vultr costaba poco: Neon
guardaba la base y el VPS solo tenía archivos. **Con Postgres dentro del VPS y
los backups automáticos apagados, un fallo de disco se lleva la base de datos
completa del cliente.** No hay copia en ninguna parte.

Mínimo indispensable, y es barato: un `pg_dump` diario más el `tar` de
`storage/`, con 7 días de retención y **una copia fuera de la máquina** (Vultr
Object Storage, S3, o incluso descarga programada). Sin la copia fuera, el
respaldo se pierde con el mismo disco que pretende proteger.

Esto hay que decírselo al cliente de forma explícita: no es lo mismo declinar
los backups de Vultr con la base en la nube que declinarlos con la base en el
servidor.

### 7.2 · ¿Se traen los datos actuales de Neon?

`npm run migrate` levanta la base vacía, con los catálogos del `seed.sql` y las
cuentas. Si el cliente quiere arrancar con lo que ya hay en Neon, es un
`pg_dump --schema=sst` desde Neon y `psql` contra la local — pero entonces
también viajan las **26 órdenes de demostración** (OS-2026-1001…) que se
sembraron para las pruebas. Recomendación: **arrancar limpio** y volver a
importar los archivos reales del SIPAB.

### 7.3 · Las ramas sin fusionar

Ambos repos están en `tanda-22-ago-formatos-y-viaticos`. Además hay cambios sin
confirmar: en el frontend `.gitignore`, `HANDOFF.md` y
`docs/plan-peticiones-22-ago-2026.md`; en el backend, el script
`scripts/generar-ordenes-demo-peticiones.mjs` sin agregar. Hay que confirmarlos
y fusionar antes de clonar en el servidor, o el despliegue sale con menos de lo
que hay hecho.

### 7.4 · El correo pasa a salir de `redes.jddconsultores@gmail.com`

**Decidido el 2-sep-2026.** Hasta ahora el sistema autenticaba contra el SMTP de
una cuenta de desarrollo y declaraba `EMAIL_FROM = JD&D Consultores
<no-reply@jdd.com>` — un dominio que no es del cliente. Eso nunca se vio así en
la bandeja de nadie: **Gmail reescribe el `From` a la cuenta autenticada** cuando
no coincide con ella ni con un alias verificado, así que los correos salían a
nombre de la cuenta de desarrollo. De ahí cuelgan cosas que importan: el `.ics`
de la agenda, el enlace de soportes del profesional y las cuentas de cobro.

En producción los tres valores apuntan a la **misma** cuenta del cliente, que es
la condición para que Gmail respete el remitente:

```
SMTP_USER  = redes.jddconsultores@gmail.com
EMAIL_FROM = ORBITA · JD&D Consultores <redes.jddconsultores@gmail.com>
```

El nombre visible sí es libre; la dirección no. No hace falta tocar código: todo
el envío pasa por `sendEmail()` en `src/services/email.service.js`, que usa
`env.email.from` en un único sitio.

**Lo que hay que conseguir**, y sin esto el correo no sale. Estado revisado el
2-sep-2026 en el panel de seguridad de la cuenta:

1. ✅ **Verificación en dos pasos** — activada el **2-sep-2026, 10:50**.
2. ⛔ **Autenticador (TOTP) — descartado a propósito.** El único segundo factor
   es el **celular del cliente (310 6057237)**, el mismo número que figura como
   contacto del dominio en Hostinger. Es una decisión deliberada: que la llave
   de la cuenta se quede del lado del cliente y no del nuestro.
   **Consecuencia a tener presente:** cualquier cosa que en el futuro pida el
   segundo factor —crear otra contraseña de aplicación, recuperar la cuenta,
   revisar por qué dejó de salir el correo— **necesita al cliente al teléfono**.
   No es un problema, pero sí hay que contarlo en la planeación en vez de
   descubrirlo con el sistema caído.
3. ✅ **Contraseña de aplicación** creada (`ORBITA VPS`) y **probada el
   2-sep-2026**: `verify()` aceptado por `smtp.gmail.com` y dos correos
   entregados, uno con el script suelto y otro por el `sendEmail()` real del
   sistema. Va en `SMTP_PASS` **sin los espacios** con que Google la presenta
   (16 caracteres seguidos). La contraseña normal de la cuenta **no** funciona:
   Google cerró el acceso de "apps menos seguras".
   El probador quedó en **`sst_ws/scripts/probar-smtp.mjs`**:
   `SMTP_PASS='…' node scripts/probar-smtp.mjs destino@ejemplo.com`.
4. ⬜ De paso: verificar el correo de recuperación
   `asesoria.jddconsultores@gmail.com`, que aparece pendiente.

⚠️ **La credencial no viaja por git.** El `.env` está en el `.gitignore`, así
que en el servidor hay que escribirla a mano. Y ojo con los respaldos: el
patrón ignorado es `.env` **exacto**, de modo que un `.env.bak` o un
`.env.viejo` sí quedarían a la vista de git.

🔴 **Trampa a futuro:** si el cliente cambia la contraseña de la cuenta de
Google, **Google revoca todas las contraseñas de aplicación** y el sistema deja
de enviar correos **sin dar ningún error visible en la aplicación** — el fallo
aparece enterrado en el log del servicio. Si algún día "dejan de llegar los
correos a los profesionales", empezar a mirar por aquí.

Dos límites de una cuenta Gmail gratuita a tener presentes: **~500 destinatarios
al día** y 100 por mensaje. Para el goteo diario sobra, pero el cierre mensual de
cuentas de cobro manda una tanda de golpe — si el equipo de profesionales crece,
esto es lo primero que se rompe, y la salida sería Google Workspace o un
proveedor transaccional.

Queda pendiente, aparte: si algún día se quiere enviar desde
`@jddconsultores.com` en vez de la cuenta Gmail, hay que revisar el SPF del
dominio en Hostinger.

### 7.5 · El dominio no se renueva solo

En el panel de Hostinger la **renovación automática está desactivada** y el
dominio caduca el **2027-02-10**. Si vence, se cae la landing *y* ORBITA.
Es del cliente la decisión, pero hay que dejarla dicha por escrito.

### 7.7 · 🔴 El resumen ejecutivo de una orden se INVENTA el texto

No hay `GEMINI_API_KEY`, y las tres funciones auxiliares caen a un respaldo. Dos
degradan de forma honesta: la extracción de PDF ya no usa Gemini (es OpenAI) y
la búsqueda en lenguaje natural cae a `keywordInterpret()`, un intérprete de
palabras clave real —menos listo, pero verdadero—.

**El resumen ejecutivo no.** `mockSummary()` devuelve un párrafo con toda la
pinta de un análisis: cita la Resolución 0312 de 2019, la 4272 de 2021 y afirma
cosas como *"no se detectaron requisitos especiales de alto riesgo; se recomienda
validar los soportes al cierre de la visita"* — sin haber leído nada. En
producción, quien lo lea lo tomará por el análisis de su orden.

Tres salidas, de menos a más trabajo: conseguir una clave de Gemini; migrar esa
función a OpenAI, que ya está configurado y pagado (es lo que el propio código
marca como *PENDIENTE DE MIGRACIÓN*); u ocultar el resumen hasta que haya motor.
**Lo que no se puede es dejarlo como está.**

### 7.8 · La cuenta que se le entrega al cliente

```
URL        https://orbita.jddconsultores.com
documento  9999999999          ← con esto se inicia sesión, no con el correo
correo     redes.jddconsultores@gmail.com
contraseña Orbita2026          ← deliberadamente simple, PARA CAMBIARLA
```

Es el **Administrador Maestro**: la única cuenta que existe, y la única que
puede dar de alta usuarios internos. Desde ahí el cliente crea su equipo. Lo
primero que debería hacer, en este orden: **cambiar la contraseña**
(Configuración → Perfil), crear sus **tipos de orden con sus tarifas reales**
(sin eso no se puede importar nada) y dar de alta a sus profesionales.

### 7.9 · Dos fallos que solo aparecen en un servidor de verdad

Los dos se encontraron el 2-sep-2026 probando el despliegue, no en desarrollo, y
los dos **fallaban en silencio**: la aplicación respondía 200 y nadie se enteraba.

**a · El servidor estaba en UTC y Colombia es UTC-5.** La máquina de desarrollo
está en UTC-5, así que esto no se podía ver ahí. `src/utils/formato.js` ya fija
`America/Bogota` a propósito —y `pdf.service.js:56` tiene el comentario de
cuando esto mordió: *"un servidor en UTC imprimía en el acta una hora corrida
cinco horas"*—, pero el PDF de la **cuenta de cobro** (líneas 170 y 189) sigue
usando `toLocaleDateString('es-CO')` a secas, que toma la zona del proceso.

Lo grave no era la hora, era el **mes**: una orden del 30 de septiembre a las
8 de la noche en Bogotá es el 1 de octubre en UTC, así que se habría cobrado en
el periodo equivocado sin dar un solo error. Arreglado en la raíz:

```bash
sudo timedatectl set-timezone America/Bogota
echo "timezone = 'America/Bogota'" >> /etc/postgresql/16/main/conf.d/10-orbita.conf
```

Comprobado: `to_char(timestamptz '2026-09-30 20:00-05', 'YYYY-MM')` → `2026-09`.

📌 Queda pendiente arreglar `pdf.service.js` para que no dependa de la zona del
proceso, como ya hace `formato.js`.

**b · El renderizado en servidor estaba desactivado.** `angular.json` traía
`security.allowedHosts: []`. Una lista vacía **no** significa "sin restricción":
significa que ningún host vale, así que Angular rechazaba todas las peticiones y
caía a renderizado de cliente. La respuesta era un 200 con `<app-root></app-root>`
**vacío** (1.568 bytes) y el motivo solo estaba en el log del servicio:

```
Header "host" with value "orbita.jddconsultores.com" is not allowed.
Falling back to client side rendering.
This will become a 400 Bad Request in a future major version.
```

O sea: hoy degrada sin avisar, y en una versión futura de Angular la aplicación
deja de cargar. Arreglado en el commit `fix(ssr)`, junto con `trustProxyHeaders`
(el motor va detrás de nginx). Tras el arreglo: **14.824 bytes con el formulario
ya renderizado**.

### 7.6 · Sin cron, sigue sin haber cierre mensual automático

Nada cambia con el despliegue: el cierre mensual de cuentas de cobro y los
avisos del día de corte se materializan al abrir la aplicación. Ahora que hay
una máquina propia, **sí se podría** poner el cron — pero es trabajo aparte, no
parte de esta subida.

## 8 · Cambios de código previos — ✅ HECHOS el 2-sep-2026

### 8.1 · ✅ `API_BASE` del frontend estaba clavado en localhost

`src/app/core/config.ts` dice `http://localhost:4000/api`. Compilado así, el
navegador del cliente pediría datos a *su propia* máquina. Se resuelve con el
`fileReplacements` de Angular, que es el mecanismo idiomático:

`src/app/core/config.prod.ts` (nuevo):
```ts
export const API_BASE = 'https://orbita.jddconsultores.com/api';
```

y en `angular.json`, dentro de `configurations.production`:
```json
"fileReplacements": [
  { "replace": "src/app/core/config.ts", "with": "src/app/core/config.prod.ts" }
]
```

Se deja **absoluta** y no relativa (`/api`) a propósito: la app tiene SSR, y una
ruta relativa dentro de `HttpClient` puede reventar al renderizarse en el
servidor. Como el origen es el mismo que sirve la página, tampoco hay CORS de
por medio.

### 8.2 · ✅ `db.js` forzaba SSL siempre

`src/config/db.js` trae `ssl: { rejectUnauthorized: false }` fijo, escrito para
Neon. Contra la Postgres local hay que poder apagarlo:

```js
const sslOff = process.env.DB_SSL === 'false';
export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: sslOff ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});
```

(El paquete de Ubuntu levanta Postgres con SSL autofirmado, así que sin el
cambio *probablemente* conecte igual; pero deja al `pg` y al Prisma
contradiciéndose sobre el mismo `sslmode`, y eso se paga después.)

## 9 · Orden de ejecución

0. **Pedirle al cliente la contraseña de aplicación** de
   `redes.jddconsultores@gmail.com` (§7.4). Es lo único que depende de un
   tercero, así que conviene pedirlo hoy aunque se use al final.
1. Crear la instancia con la tabla de §2. → **estás aquí**
2. Registro A en Hostinger (§3) y esperar la propagación.
3. Usuario, swap, ufw, paquetes, Postgres (§4).
4. Cambios de código de §8, confirmar y fusionar ramas (§7.3).
5. Clonar, `npm ci`, migrar, compilar (§5).
6. systemd + nginx + certbot (§5.3, §5.4).
7. Backups (§7.1) — antes de meter un solo dato real.
8. Probar de punta a punta: login, importar un PDF, generar formatos, correo.
