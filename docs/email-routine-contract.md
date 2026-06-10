# Contrato: routine de Email SLA → Customer Success Board

Este documento es el contrato contra el cual se construirá la routine de email.
El backend y la web ya están listos; la routine es el único componente pendiente.

```
Routine de email (externa, Microsoft Graph) → POST /api/email/threads/batch → Supabase → panel /email-sla
```

El backend y la web **no** se conectan a Outlook. La routine corre por separado
(igual que la de Fathom) y empuja los hilos ya procesados.

## Endpoint de ingesta

```
POST {APP_URL}/api/email/threads/batch
Headers:
  Content-Type: application/json
  x-api-key: {ROUTINE_API_KEY}     ← misma key que usa la routine de Fathom
```

- La ruta está eximida del auth de sesión (middleware), pero exige la API key.
- El upsert es **idempotente por `thread_id`**: re-enviar un hilo lo actualiza,
  nunca lo duplica. Es seguro (y esperado) re-enviar en cada sync el estado
  vigente de todos los hilos abiertos o recientemente modificados.

### Payload

```json
{
  "threads": [
    {
      "thread_id": "AAQkADAwATM3ZmYAZS05...",
      "subject": "Problema con el módulo de facturación",
      "sender_email": "cliente@empresa.com",
      "sender_domain": "empresa.com",
      "received_at": "2026-06-09T14:32:00Z",
      "first_response_at": "2026-06-10T13:05:00Z",
      "last_message_at": "2026-06-10T13:05:00Z",
      "business_hours_elapsed": 7.55,
      "business_hours_to_resolution": null,
      "resolved_at": null,
      "metadata": { "message_count": 3, "mailbox": "support@heuristyc.com" }
    }
  ]
}
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `thread_id` | string | ✔ | `conversationId` de Outlook/Graph. Clave de upsert. |
| `subject` | string | — | Se trunca a 500 chars. Default `""`. |
| `sender_email` | string | ✔ | Remitente del **primer mensaje entrante**. Debe ser un email válido. |
| `sender_domain` | string | — | Si falta, el backend lo deriva de `sender_email`. |
| `received_at` | ISO 8601 UTC | ✔ | Timestamp del primer mensaje entrante del hilo. |
| `first_response_at` | ISO 8601 UTC \| null | — | Primer reply de una casilla `@heuristyc.com`. `null` = sin responder. |
| `last_message_at` | ISO 8601 UTC | — | Último mensaje del hilo (cualquier dirección). Default: `received_at`. |
| `business_hours_elapsed` | number ≥ 0 | ✔ | Ver semántica abajo. |
| `business_hours_to_resolution` | number ≥ 0 \| null | — | Horas laborales de `received_at` a `resolved_at`. `null` si no resuelto. |
| `resolved_at` | ISO 8601 UTC \| null | — | Cuándo se consideró cerrado el hilo. |
| `metadata` | object | — | JSON libre para extensibilidad. |

> **No enviar `status`.** El estado (`respondido` / `pendiente` / `en_riesgo` /
> `vencido`) lo deriva el backend a partir de la config del SLA. Si mañana el
> target cambia de 24h a 12h, la routine no se toca.

### Semántica de `business_hours_elapsed`

- Si el hilo **tiene respuesta** (`first_response_at != null`): horas laborales
  entre `received_at` y `first_response_at`. Valor **congelado**.
- Si el hilo **no tiene respuesta**: horas laborales entre `received_at` y el
  momento del sync. Valor que **crece en cada sync** — por eso es importante
  re-enviar los hilos abiertos en cada corrida.

### Respuesta

```json
{
  "inserted": ["thread-id-1"],
  "updated": ["thread-id-2"],
  "errors": [
    { "index": 2, "thread_id": "thread-id-3", "error": "excluded sender pattern" }
  ]
}
```

- `200` si al menos un item fue aceptado; `400` si ninguno pasó la validación;
  `401` API key inválida.
- Los items inválidos se rechazan individualmente (no abortan el batch).

## Reglas de cálculo de horas laborales

La routine debe calcular horas laborales con estas reglas (espejo de la config
`email_sla` del backend — consultarla antes de hardcodear):

- **Días**: lunes a viernes.
- **Horario**: 09:00–18:00.
- **Timezone**: `America/New_York` (IANA — la routine debe usar la zona, no un
  offset fijo; el cambio EST/EDT se maneja solo).
- Timestamps fuera de horario se "clampean": un correo recibido el sábado, o un
  viernes 20:00, cuenta como recibido el lunes 09:00. Un reply enviado a las
  07:30 cuenta como 09:00 del mismo día.
- Resultado en horas decimales (ej.: hora y media = `1.5`).

Ejemplo: correo recibido viernes 17:00, respondido lunes 10:30 →
`business_hours_elapsed = 1.0 (viernes 17–18) + 1.5 (lunes 9–10:30) = 2.5`.

## Filtros (qué hilos enviar)

Enviar solo hilos **iniciados por remitentes externos** (clientes):

- Excluir hilos cuyo primer mensaje viene de `@heuristyc.com` (el backend
  también los rechaza — `internal_domain`).
- Excluir remitentes automáticos. Patrones (substring match, case-insensitive,
  espejo de `excluded_senders` en config): `no-reply`, `noreply`,
  `notifications@`, `mailer-daemon`, `donotreply`. El backend también los
  rechaza defensivamente.
- "Primera respuesta" = primer reply en el hilo enviado desde cualquier casilla
  `@heuristyc.com` **posterior** a `received_at`. Auto-replies (out of office)
  no cuentan como respuesta.

## Implementación sugerida (Microsoft Graph)

- **Delta queries** sobre la(s) casilla(s) monitoreadas
  (`/me/mailFolders/{id}/messages/delta`) para traer solo lo nuevo en cada
  corrida, guardando el `deltaLink` entre corridas.
- Agrupar mensajes por `conversationId` → ese es el `thread_id`.
- En cada corrida, recalcular y re-enviar **todos los hilos sin responder** (para
  que `business_hours_elapsed` avance) **más** los hilos que tuvieron mensajes
  nuevos desde la última corrida.
- **Frecuencia sugerida: cada 15–30 minutos** (el umbral "en riesgo" está a 4h
  del target; con sync de 30 min la precisión es más que suficiente).

## Config del SLA (vive en el backend)

Key `email_sla` en la tabla `config` (editable vía `PATCH /api/config`, admin):

```json
{
  "sla_target_hours": 24,
  "at_risk_threshold_hours": 20,
  "business_hours": { "days": [1, 2, 3, 4, 5], "start": "09:00", "end": "18:00" },
  "timezone": "America/New_York",
  "internal_domain": "heuristyc.com",
  "excluded_senders": ["no-reply", "noreply", "notifications@", "mailer-daemon", "donotreply"]
}
```

Derivación de estado (en el backend, al leer):

| Estado | Condición |
|---|---|
| `respondido` | `first_response_at != null` |
| `vencido` | sin respuesta y `business_hours_elapsed >= 24` |
| `en_riesgo` | sin respuesta y `business_hours_elapsed >= 20` |
| `pendiente` | sin respuesta, por debajo del umbral de riesgo |

## Endpoints de lectura (consumidos por el panel `/email-sla`)

Requieren sesión (cookie de Supabase Auth) — no son para la routine:

- `GET /api/email/kpis` — KPIs de la semana (lun–dom, TZ de config) + acumulado
  mensual + deltas vs semana anterior + distribución de estados.
- `GET /api/email/threads?page=&page_size=` — hilos sin responder por urgencia.
- `GET /api/email/weekday-avg` — promedio de 1ª respuesta por día de la semana
  (últimas 4 semanas).
