import { Response, RequestHandler, Router, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { expressjwt, Request } from 'express-jwt';
import jwt from 'jsonwebtoken';
import User from '../user';
import { ApiError } from '.';

const SIGN_ALGORITHM = 'HS256';

export default class AuthHandler {
  private user: User;
  private secret: string;
  private jwtTime: string;

  private constructor(user: User, secret: string, jwtTime: string) {
    this.user = user;
    this.secret = secret;
    this.jwtTime = jwtTime;
  }

  public static router(user: User, secret: string, jwtTime: string): Router {
    const router = Router();
    const handler = new AuthHandler(user, secret, jwtTime);

    router.post('/login', handler.loginValidator, handler.login.bind(handler));
    router.post(
      '/register',
      handler.registerValidator,
      handler.register.bind(handler),
    );
    router.post(
      '/change-password',
      AuthHandler.protected(secret),
      handler.changePasswordValidator,
      handler.changePassword.bind(handler),
    );

    return router;
  }

  readonly loginValidator = [
    body('username', 'username should not be empty').notEmpty(),
    body('password', 'password should not be empty').notEmpty(),
  ];
  async login(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      res.status(400).json({ errors: result.array() });
      return;
    }
    const user = await this.user.login(req.body.username, req.body.password);
    if (user == undefined) {
      throw new ApiError(401, 'Invalid username or password');
    }

    const token = jwt.sign(user, this.secret, {
      expiresIn: this.jwtTime,
      algorithm: SIGN_ALGORITHM,
    });
    res.status(200).json({ success: true, token: token });
  }

  readonly registerValidator = [
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
  async register(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new ApiError(400, 'Invalid input', result.array());
    }
    if (req.body.password != req.body.repeat) {
      throw new ApiError(400, "Password and repeat don't match");
    }
    await this.user.create(req.body.username, req.body.password, false);
    res.status(200).json({ success: true });
  }

  readonly changePasswordValidator = [
    body('password', 'password should be at least 6 characters').isLength({
      min: 6,
    }),
    body('newPassword', 'newPassword should be at least 6 characters').isLength(
      {
        min: 6,
      },
    ),
    body('repeat', 'repeat should be at least 6 characters').isLength({
      min: 6,
    }),
  ];
  async changePassword(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new ApiError(400, 'Invalid input', result.array());
    }
    if (req.body.newPassword != req.body.repeat) {
      throw new ApiError(400, "newPassword and repeat don't match");
    }
    await this.user.changePassword(
      req.auth!.id,
      req.body.password,
      req.body.newPassword,
    );
    res.status(200).json({ success: true });
  }

  static protected(secret: string): RequestHandler {
    return expressjwt({ secret: secret, algorithms: [SIGN_ALGORITHM] });
  }

  static admin(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.auth?.isAdmin) {
        throw new ApiError(403, 'User is not admin');
      }
      next();
    };
  }
}
