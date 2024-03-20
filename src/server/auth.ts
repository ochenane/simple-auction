import { Request, Response, RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import { expressjwt } from 'express-jwt';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../database';
import { ApiError } from '.';

const SIGN_ALGORITHM = 'HS256';

export default class Auth {
  private constructor() {}

  static readonly loginValidator = [
    body('username', 'username should not be empty').not().isEmpty(),
    body('password', 'password should not be empty').not().isEmpty(),
  ];

  static async login(secret: string, req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      res.status(400).json({ errors: result.array() });
      return;
    }
    console.log(secret, typeof req, typeof res);
    const user = await prisma.user.findUnique({
      where: { username: req.body.username },
    });

    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      throw new ApiError(401, 'Invalid username or password');
    }

    const token = jwt.sign({ id: user.id }, secret, {
      expiresIn: '10h', // TODO: read from config
      algorithm: SIGN_ALGORITHM,
    });
    res.status(200).json({ success: true, token: token });
  }

  static readonly registerValidator = [
    body('username', 'username should be at least 4 characters').isLength({
      min: 4,
    }),
    body('username', 'username should be alphanumeric').isAlphanumeric(),
    body('password', 'password should be at least 6 characters').isLength({
      min: 6,
    }),
    body('repeat', 'repeat should be at least 6 characters').isLength({
      min: 6,
    }),
  ];
  static async register(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new ApiError(400, 'Invalid input', result.array());
    }
    if (req.body.password != req.body.repeat) {
      throw new ApiError(400, "Password and repeat don't match");
    }
    const hashed = await bcrypt.hash(req.body.password, 10);
    await prisma.user.create({
      data: { username: req.body.username, password: hashed },
    });
    res.status(200).json({ success: true });
  }

  static protected(secret: string): RequestHandler {
    return expressjwt({ secret: secret, algorithms: [SIGN_ALGORITHM] });
  }
}
