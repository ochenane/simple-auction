import { Request, Response } from 'express';
import { expressjwt } from 'express-jwt';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../database';
import { ApiError } from '.';

const SIGN_ALGORITHM = 'ES256';

export default class Auth {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  public async login(
    req: Request<object, object, LoginRequest>,
    res: Response<LoginResponse>,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { username: req.body.username },
    });

    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      throw new ApiError(401, 'Invalid username or password');
    }

    const token = jwt.sign(
      {
        id: user.id,
      },
      this.secret,
      {
        expiresIn: '10h', // TODO: read from config
        algorithm: SIGN_ALGORITHM,
      },
    );
    res.status(200).json({ success: true, token: token });
  }

  public async register(
    req: Request<object, object, RegisterRequest>,
    res: Response<RegisterResponse>,
  ): Promise<void> {
    if (req.body.password != req.body.repeat) {
      throw new ApiError(400, "Password and repeat don't match");
    }
    const hashed = await bcrypt.hash(req.body.password, 10);
    await prisma.user.create({
      data: { username: req.body.username, password: hashed },
    });
    res.status(200).json({ success: true });
  }

  public middleware() {
    return expressjwt({
      secret: this.secret,
      algorithms: [SIGN_ALGORITHM],
    });
  }
}

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
}

interface RegisterRequest {
  username: string;
  password: string;
  repeat: string;
}

interface RegisterResponse {
  success: boolean;
}
