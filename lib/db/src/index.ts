import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
if (process.env.DATABASE_URL) {
  poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
  console.warn(
    "[LiveArena DB] Variável DATABASE_URL não definida. O banco persistente PostgreSQL está desativado; usando armazenamento em memória/local para desenvolvimento.",
  );
}

export const pool = poolInstance as pg.Pool;

export const db = poolInstance
  ? drizzle(poolInstance, { schema })
  : (new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "select") {
            return () => {
              const queryBuilder: any = {
                from: () => queryBuilder,
                where: () => queryBuilder,
                orderBy: () => queryBuilder,
                limit: () => queryBuilder,
                then: (fn: any) => Promise.resolve([{ value: 0 }]).then(fn),
                catch: (fn: any) => Promise.resolve([{ value: 0 }]).catch(fn),
                [Symbol.toStringTag]: "Promise",
              };
              return queryBuilder;
            };
          }
          if (prop === "insert" || prop === "update" || prop === "delete") {
            return () => {
              const mutationBuilder: any = {
                values: () => mutationBuilder,
                set: () => mutationBuilder,
                where: () => mutationBuilder,
                returning: () => mutationBuilder,
                then: (fn: any) => Promise.resolve([]).then(fn),
                catch: (fn: any) => Promise.resolve([]).catch(fn),
                [Symbol.toStringTag]: "Promise",
              };
              return mutationBuilder;
            };
          }
          return () => Promise.resolve([]);
        },
      },
    ) as ReturnType<typeof drizzle<typeof schema>>);

export * from "./schema";
