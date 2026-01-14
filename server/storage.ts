import { DatabaseStorage } from "./storage-impl";

// Export the interface from the implementation file
export type { IStorage } from "./storage-impl";

// Create and export the storage instance
export const storage = new DatabaseStorage();
