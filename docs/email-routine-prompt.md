# Routine: Email SLA → Board

> **DESPLEGADA** (2026-06-10) como **Parte B** de la routine combinada
> "Heuristyc Board — Fathom + Email SLA Sync"
> (`trig_01NVh7FFYxAW52jBeEqzUZVQ`, https://claude.ai/code/routines/trig_01NVh7FFYxAW52jBeEqzUZVQ).
> La Parte A es el sync de Fathom, que quedó intacto.
>
> - **Schedule**: `0 14,16,18,20 * * 1-5` UTC (10:00/12:00/14:00/16:00 ET,
>   lunes a viernes — el mínimo de la plataforma es 1 hora entre corridas,
>   por eso no corre cada 30 min como sugería el contrato original).
> - **Buzones monitoreados**: `jrincon@heuristyc.com` y `david@heuristyc.com`
>   (hardcodeados en el prompt; si el mismo `conversationId` aparece en ambos,
>   la routine fusiona los mensajes y deduplica por `internetMessageId`).
> - **Skip sin credenciales**: la Parte B verifica primero que
>   `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` y `AZURE_CLIENT_SECRET` existan como
>   variables de entorno. Si faltan, reporta
>   "Email SLA sync skipped: Azure credentials not configured" y NO falla —
>   la Parte A (Fathom) corre igual.
>
> **Prerequisitos pendientes (una sola vez, fuera de este prompt):**
> - App registration en Azure AD (Entra ID) con permiso de aplicación
>   `Mail.Read` (admin consent) y un client secret.
> - Cargar en el environment **Routines** de claude.ai (donde ya viven
>   `BOARD_API_URL` y `ROUTINE_API_KEY`): `AZURE_TENANT_ID`,
>   `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`.
>
> Lo que sigue es la Parte B tal cual está desplegada. Los valores `{ASÍ}`
> son variables de entorno del sandbox de la routine.

---

OBJETIVO: Lee los correos recientes de los buzones monitoreados vía Microsoft Graph, calcula las métricas de cada hilo y envíalas al Board API. El Board deriva el estado (pendiente/en riesgo/vencido) — tú NO envías status.

Buzones monitoreados: jrincon@heuristyc.com y david@heuristyc.com.

REGLA CRÍTICA: Todos los cálculos de horas laborales se hacen ejecutando un script (paso B5), NUNCA con aritmética mental.

B0. VERIFICAR CREDENCIALES
   Verifica en bash que las variables de entorno AZURE_TENANT_ID, AZURE_CLIENT_ID y AZURE_CLIENT_SECRET existan y no estén vacías.
   Si falta alguna → reporta "Email SLA sync skipped: Azure credentials not configured" y termina la Parte B sin error.

B1. OBTENER TOKEN DE MICROSOFT GRAPH
   HTTP POST a:
   URL: https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token
   Body (form-urlencoded):
     grant_type=client_credentials
     client_id={AZURE_CLIENT_ID}
     client_secret={AZURE_CLIENT_SECRET}
     scope=https://graph.microsoft.com/.default
   Guarda el access_token. Si falla, reporta el error y termina la Parte B.

B2. TRAER MENSAJES RECIENTES (últimos 35 días) DE CADA BUZÓN
   Para cada buzón (jrincon@heuristyc.com, david@heuristyc.com), HTTP GET a:
   https://graph.microsoft.com/v1.0/users/{buzón}/messages?$filter=receivedDateTime ge {AHORA_MENOS_35_DIAS_ISO}&$select=id,internetMessageId,conversationId,subject,from,toRecipients,receivedDateTime,sentDateTime,isDraft&$orderby=receivedDateTime asc&$top=100
   Headers: Authorization: Bearer <access_token>
   Sigue la paginación con @odata.nextLink hasta traer todo.
   Descarta drafts (isDraft = true).
   La ventana de 35 días es intencional: el backend hace upsert idempotente,
   así que re-enviar hilos viejos solo los actualiza, y los hilos sin
   responder necesitan re-enviarse en cada corrida para que sus horas avancen.

B3. AGRUPAR POR HILO
   Agrupa los mensajes por conversationId. Ese es el thread_id.
   Si el mismo conversationId aparece en ambos buzones, fusiona los mensajes de ambos en un solo hilo (deduplica mensajes por internetMessageId).
   Dentro de cada hilo, ordena los mensajes por receivedDateTime ascendente.

B4. FILTRAR Y CLASIFICAR CADA HILO
   Un mensaje es INTERNO si from.emailAddress.address termina en "@heuristyc.com"; si no, es EXTERNO.

   Descarta el hilo completo si:
   - El primer mensaje del hilo es INTERNO (hilos iniciados por nosotros no cuentan para el SLA), o
   - El remitente del primer mensaje contiene alguno de estos patrones (case-insensitive): no-reply, noreply, notifications@, mailer-daemon, donotreply.
   (El Board también rechaza estos casos; el filtro local solo evita tráfico inútil.)

   Para cada hilo que sobrevive, calcula:
   - thread_id = conversationId
   - subject = asunto del primer mensaje
   - sender_email = from del primer mensaje (lowercase)
   - sender_domain = dominio de sender_email
   - received_at = receivedDateTime del primer mensaje (UTC, ISO 8601)
   - first_response_at = receivedDateTime del PRIMER mensaje INTERNO posterior a received_at, o null si no hay.
     EXCEPCIÓN: no cuenta como respuesta un mensaje cuyo asunto empiece con "Automatic reply", "Respuesta automática" o "Out of office".
   - last_message_at = receivedDateTime del último mensaje del hilo
   - resolved_at: si el hilo tiene first_response_at Y el último mensaje es de hace más de 72 horas, considera el hilo cerrado → resolved_at = last_message_at. Si no, null.

B5. CALCULAR HORAS LABORALES (con script, obligatorio)
   Escribe y ejecuta un script (Python o Node) que implemente esta función y
   calcula con él TODOS los valores. No calcules a mano.

   business_hours_between(start_utc, end_utc):
   - Horario laboral: lunes a viernes, 09:00–18:00, timezone America/New_York
     (usar la zona IANA, no un offset fijo — el script debe manejar EST/EDT solo).
   - Convierte ambos timestamps a hora local de America/New_York.
   - "Clampea" cada timestamp al horario laboral: un instante fuera de horario
     se mueve al inicio del siguiente bloque laboral (sábado → lunes 09:00;
     viernes 20:00 → lunes 09:00; martes 07:30 → martes 09:00; martes 19:00 →
     miércoles 09:00).
   - Suma solo las horas dentro de bloques laborales entre ambos puntos.
   - Devuelve horas decimales (1h30m = 1.5).

   Verificación del script antes de usarlo (si alguno falla, corrige el script):
   - viernes 17:00 → lunes 10:30 = 2.5
   - martes 10:00 → martes 15:00 = 5.0
   - sábado 12:00 → lunes 09:00 = 0.0

   Con esa función calcula para cada hilo:
   - business_hours_elapsed:
     * si first_response_at != null → business_hours_between(received_at, first_response_at)
     * si no → business_hours_between(received_at, AHORA)
   - business_hours_to_resolution:
     * si resolved_at != null → business_hours_between(received_at, resolved_at)
     * si no → null

B6. ENVIAR AL BOARD API
   Haz un HTTP POST a:
   URL: {BOARD_API_URL}/api/email/threads/batch
   Headers:
     Content-Type: application/json
     x-api-key: {ROUTINE_API_KEY}

   Body (JSON):
   {
     "threads": [
       {
         "thread_id": "<conversationId>",
         "subject": "<asunto>",
         "sender_email": "<remitente del primer mensaje>",
         "sender_domain": "<dominio>",
         "received_at": "<ISO 8601 UTC>",
         "first_response_at": "<ISO 8601 UTC o null>",
         "last_message_at": "<ISO 8601 UTC>",
         "business_hours_elapsed": <número>,
         "business_hours_to_resolution": <número o null>,
         "resolved_at": "<ISO 8601 UTC o null>",
         "metadata": { "message_count": <cantidad de mensajes del hilo>, "mailbox": "<buzón o buzones donde apareció el hilo, separados por coma>" }
       }
     ]
   }

   Si hay más de 100 hilos, envíalos en batches de 100.
   NO incluyas un campo "status" — lo deriva el Board.

B7. MANEJAR RESPUESTAS
   El endpoint responde 200 con { "inserted": [...], "updated": [...], "errors": [...] }.
   - inserted/updated: éxito (re-enviar un hilo existente lo actualiza, nunca duplica — es lo esperado).
   - errors: items rechazados individualmente (ej. "excluded sender pattern"); es normal si se coló un remitente automático, continúa.
   - 400: ningún item pasó la validación — revisa el formato del payload y reporta.
   - 401: error de API key, reporta el error.
   - Cualquier otro error: reporta pero no reintentes más de una vez.

B8. RESUMEN PARTE B
   - Cuántos mensajes y hilos se leyeron de Graph (por buzón)
   - Cuántos hilos se descartaron por filtros (internos / automáticos)
   - Cuántos enviados: insertados, actualizados, rechazados
   - Cuántos hilos quedan sin responder, y de esos cuántos llevan más de 20 horas laborales

   Si no hay mensajes en la ventana, reporta "No messages found" para la Parte B.
