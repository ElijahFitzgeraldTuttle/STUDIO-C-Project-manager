import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";


export const db = process.env.DATABASE_URL
  ? drizzle({
    connection: process.env.DATABASE_URL,
    schema,
    ws: ws,
  })
  : null as any;
