import postgres from "postgres";

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  "postgresql://synapse:synapse@localhost:5432/synapse";

async function main() {
  const sql = postgres(url, { max: 1 });
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log("pgvector extension ready");
  } catch (err) {
    console.warn(
      "pgvector extension unavailable; RAG will use legacy JSON embeddings until vector is installed.",
    );
    console.warn(err instanceof Error ? err.message : err);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
