
import { DatabaseStorage, IStorage } from "./storage-impl";
import { MemStorage } from "./mem-storage";

export * from "./storage-impl";

export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemStorage();
