# API routing (`app/api`)

Contains the public service liveness endpoint (`health.py`) and the `/api/v1` domain router registry (`router.py`). Product endpoints remain gated on approved contracts in `docs/03-database-api.md`. No unauthenticated database diagnostic route is exposed.
