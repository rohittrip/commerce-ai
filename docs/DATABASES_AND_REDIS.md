# MongoDB, Redis, and service isolation (BFF vs orchestration)

## Overview

- **PostgreSQL**: Shared by BFF and orchestration (same DB, different tables; BFF uses Prisma + `NODE_DATABASE_URL`).
- **MongoDB**: Optional. If you introduce it, use **separate collections** (or separate databases) per service so data is isolated.
- **Redis**: Single instance can be **shared** by both services; isolation is by **key prefix**, not separate instances.

---

## Redis: one instance, key prefix per service

Redis does **not** have “collections” like MongoDB. It has a single flat key space. To let BFF and orchestration share one Redis without key collisions:

1. **Use the same `REDIS_URL`** for both services (e.g. `redis://localhost:6379`).
2. **Set a different `REDIS_KEY_PREFIX`** per service:
   - **BFF**: `REDIS_KEY_PREFIX=bff` (default in BFF config).
   - **Orchestration**: `REDIS_KEY_PREFIX=orch` (default in orchestration config).

All keys are then prefixed automatically (e.g. `bff:chat:session:...`, `orch:chat:session:...`), so:
- One Redis instance is enough.
- No key collisions between BFF and orchestration.
- No need for a second Redis server or Redis “database” number.

**Optional**: You can use Redis logical databases (0–15) by URL, e.g. `redis://localhost:6379/0` for BFF and `redis://localhost:6379/1` for orchestration, but key prefix is simpler and already implemented.

---

## MongoDB: two collections (or two databases) for the two services

If you add MongoDB:

- Use **one MongoDB deployment** (one `MONGODB_URI`).
- Separate data by **service** in one of these ways:

| Approach | BFF data | Orchestration data |
|----------|----------|--------------------|
| **Same DB, two collections** | e.g. `bff_sessions` | e.g. `orch_sessions` |
| **Two databases** | e.g. database `bff` | e.g. database `orch` |

Configure `MONGODB_URI` and in code use either:
- One database + different collection names per service, or  
- Different database names per service (e.g. `mongodb://localhost:27017/bff` vs `.../orch`).

---

## Summary

| Store    | How to isolate BFF vs orchestration |
|----------|-------------------------------------|
| **PostgreSQL** | Same DB; different tables/schemas (already in place). |
| **Redis**      | Same instance; set `REDIS_KEY_PREFIX=bff` and `REDIS_KEY_PREFIX=orch`. |
| **MongoDB**    | Same server; use two collections or two databases. |
