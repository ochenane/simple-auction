import { PrismaClient } from '@prisma/client';

class Database {
  private static prisma: PrismaClient;
  private constructor() {}
  public static getInstance(): PrismaClient {
    if (!Database.prisma) {
      Database.prisma = new PrismaClient();
    }

    return Database.prisma;
  }
}

export default Database.getInstance();
