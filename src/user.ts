import bcrypt from 'bcrypt';
import prisma from './database';
import { ApiError } from './server';

export default class User {
  constructor() {}

  public async list(): Promise<UserInfo[]> {
    // FIXME: add pagination
    return await prisma.user.findMany();
  }

  public async login(
    username: string,
    password: string,
  ): Promise<UserInfo | undefined> {
    const user = await prisma.user.findUnique({ where: { username } });

    if (user && (await bcrypt.compare(password, user.password))) {
      // remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...res } = user;
      return res;
    }
  }

  public async create(
    username: string,
    password: string,
    isAdmin: boolean,
  ): Promise<UserInfo> {
    password = await bcrypt.hash(password, 10);
    return await prisma.user.create({
      data: { username, password, isAdmin },
      select: { id: true, username: true, isAdmin: true },
    });
  }

  public async get(id: number): Promise<UserInfo> {
    return await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, username: true, isAdmin: true },
    });
  }

  public async update(
    id: number,
    password?: string,
    isAdmin?: boolean,
  ): Promise<UserInfo> {
    if (password !== undefined) {
      password = await bcrypt.hash(password, 10);
    }
    return await prisma.user.update({
      where: { id },
      data: { password, isAdmin },
      select: { id: true, username: true, isAdmin: true },
    });
  }

  public async changePassword(
    id: number,
    password: string,
    newPassword: string,
  ): Promise<void> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { password: true },
    });
    if (!(await bcrypt.compare(password, user.password))) {
      throw new ApiError(403, 'Invalid password');
    }

    newPassword = await bcrypt.hash(newPassword, 10);

    // Passing password to where prevents concurrent change problem
    await prisma.user.update({
      where: { id, password: user.password },
      data: { password: newPassword },
    });
  }
}

export interface UserInfo {
  readonly id: number;
  readonly username: string;
  readonly isAdmin: boolean;
}
