# Purpose: pgvector image that can init on a Fly volume mounted at /data.
# Inputs: POSTGRES_* / PGDATA env (PGDATA=/data/pgdata).
# Outputs: Postgres listening on :5432 with the vector extension available.
FROM pgvector/pgvector:pg16

USER root
COPY deploy/db/entrypoint.sh /craft-entrypoint.sh
RUN chmod +x /craft-entrypoint.sh

ENTRYPOINT ["/craft-entrypoint.sh"]
