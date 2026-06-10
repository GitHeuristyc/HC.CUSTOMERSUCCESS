# Customer Success Board

Tablero interno (Next.js 14 + Supabase) que consolida issues de Jira y recordatorios (Fathom / manual) para el equipo de Customer Success de Heuristyc.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Supabase** (Postgres + API) — persistencia de recordatorios, notas, config y cache de Jira
- **Jira Cloud REST API** — fuente de issues
- **Geist** fonts

## Estructura

```
app/
  api/
    config/        # GET/PUT de configuración (excluded_projects, alert_rules, etc.)
    jira/
      issues/      # Lista issues desde cache / Jira
      sync/        # Sincroniza issues de Jira a Supabase
    reminders/     # CRUD de recordatorios (+ batch e [id])
    email/         # Email SLA: ingesta (threads/batch) y lectura (kpis, threads, weekday-avg)
  email-sla/       # Panel de KPIs de Email SLA
  settings/        # UI de configuración
  page.tsx         # Board principal
components/        # Board, Column, IssueCard, DetailPanel, TopBar, EmailSla, etc.
lib/
  config.ts        # AppConfig + defaults + validación (incluye email_sla)
  email-sla.ts     # Derivación de status, KPIs y validación de ingesta de email
  jira.ts          # Cliente Jira
  reminders.ts     # Lógica de recordatorios
  supabase.ts      # Clientes Supabase (anon + service role)
  types.ts
  utils.ts
  mock-data.ts
supabase/
  migrations/001_init.sql      # Esquema inicial: users, reminders, notes, config, jira_issues_cache
  migrations/003_email_sla.sql # email_threads + config email_sla
docs/
  email-routine-contract.md    # Contrato de la routine de email (payload, auth, reglas)
```

## Requisitos

- Node.js **18.17+** (recomendado 20.x LTS)
- npm 9+ (o pnpm / yarn)
- Cuenta Supabase con el esquema de `supabase/migrations/001_init.sql` aplicado
- Token de API Jira Cloud

## Variables de entorno

Crear `.env.local` en la raíz:

```bash
# Jira
JIRA_BASE_URL=https://heuristyc.atlassian.net
JIRA_EMAIL=tu-email@heuristyc.com
JIRA_API_TOKEN=xxxxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ROUTINE_API_KEY=<generar con: openssl rand -base64 32>
```

## Instalación

### Unix / macOS / Linux / WSL

```bash
git clone <repo-url>
cd "Customer Success Board"
cp .env.local.example .env.local   # si existe; si no, crear a mano con el bloque de arriba
npm install
```

Generar `ROUTINE_API_KEY`:

```bash
openssl rand -base64 32
```

### Windows (PowerShell)

```powershell
git clone <repo-url>
Set-Location "Customer Success Board"
Copy-Item .env.local.example .env.local   # o crear manualmente
npm install
```

Generar `ROUTINE_API_KEY` sin `openssl`:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### Windows (Git Bash / cmd)

```bash
git clone <repo-url>
cd "Customer Success Board"
npm install
```

## Setup de Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Dashboard → **SQL Editor** → **New query** → pegar el contenido de `supabase/migrations/001_init.sql` → **Run**.
3. Copiar `Project URL`, `anon key` y `service_role key` al `.env.local`.

## Correr en desarrollo

### Unix / macOS / Linux

```bash
npm run dev
```

### Windows (PowerShell / cmd / Git Bash)

```powershell
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

> **Nota para la máquina de desarrollo de Heuristyc:** Node 22 está instalado en `C:\Program Files\AcumaticaTools\NodeJS\node-v22.11.0-win-x64` y **no** está en el `PATH`. Antes de correr `npm` en una shell nueva:
>
> ```powershell
> $env:Path = "C:\Program Files\AcumaticaTools\NodeJS\node-v22.11.0-win-x64;$env:Path"
> ```

## Build de producción

```bash
npm run build
npm run start
```

## Scripts

| Comando          | Descripción                         |
| ---------------- | ----------------------------------- |
| `npm run dev`    | Servidor de desarrollo (hot reload) |
| `npm run build`  | Build optimizado de producción      |
| `npm run start`  | Sirve el build de producción        |
| `npm run lint`   | Lint con `next lint`                |

## Endpoints API

- `GET /api/config` · `PUT /api/config` — configuración global
- `GET /api/jira/issues` — issues desde cache
- `POST /api/jira/sync` — fuerza sync desde Jira (requiere `ROUTINE_API_KEY`)
- `GET/POST /api/reminders` — listar/crear recordatorios
- `GET/PATCH/DELETE /api/reminders/[id]`
- `POST /api/reminders/batch`
- `POST /api/email/threads/batch` — ingesta de la routine de email (requiere `ROUTINE_API_KEY`; ver `docs/email-routine-contract.md`)
- `GET /api/email/kpis` — KPIs de Email SLA (semana + mes + deltas)
- `GET /api/email/threads` — hilos sin responder por urgencia (paginado)
- `GET /api/email/weekday-avg` — promedio de 1ª respuesta por día de la semana

## Notas

- `excluded_projects` por defecto: `CST`, `HP`, `HR`, `ARQ`, `EOSCOMP`.
- `sync_interval_minutes` default: `10`.
- La alerta de inactividad default es de `7` días.
