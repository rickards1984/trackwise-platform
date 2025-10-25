---
applyTo:
- "backend/**"
---

# TrackWise – Backend Instructions
- Scope: Only modify files under `backend/**`.
- Node: 20.x. Install with `npm ci`. Start script: `npm start` (adjust if needed).
- Add `/healthz` route returning `200 OK` and a JSON payload `{status:"ok"}` if absent.
- Add/repair minimal unit tests for the healthcheck.
