import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { del } from "@vercel/blob";

const BATCH_SIZE = 100;

async function main() {
  if (process.env.CONFIRM_ITERATION_RETIREMENT !== "yes") {
    throw new Error(
      "Refusing to delete iteration Blobs without CONFIRM_ITERATION_RETIREMENT=yes.",
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  if (!blobToken) throw new Error("BLOB_READ_WRITE_TOKEN is required.");

  const sql = neon(databaseUrl);
  const [table] = await sql`
    SELECT to_regclass('public.iteration_images')::text AS "tableName"
  `;
  if (!table?.tableName) {
    console.log("Iteration image table is already absent; nothing to delete.");
    return;
  }

  const rows = await sql`
    SELECT blob_pathname AS pathname
    FROM iteration_images
    ORDER BY blob_pathname
  `;
  const pathnames = rows.map(({ pathname }) => String(pathname));

  for (let offset = 0; offset < pathnames.length; offset += BATCH_SIZE) {
    await del(pathnames.slice(offset, offset + BATCH_SIZE), {
      token: blobToken,
    });
  }

  console.log(`Deleted ${pathnames.length} iteration Blob objects.`);
  console.log(
    "The database rows remain until the iteration-removal migration runs.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
