import { Response, Router } from 'express';
import { Request } from 'express-jwt';
import Auction from '../auction';
import { body, param, validationResult } from 'express-validator';
import User from '../user';
import { ApiError } from '.';

export default class AdminHandler {
  private auction: Auction;
  private user: User;

  private constructor(auction: Auction, user: User) {
    this.auction = auction;
    this.user = user;
  }

  public static router(auction: Auction, user: User): Router {
    const router = Router();
    const handler = new AdminHandler(auction, user);

    router.post(
      '/auction/deploy',
      handler.deployValidator,
      handler.deploy.bind(handler),
    );

    router.post(
      '/auction/end',
      handler.endValidator,
      handler.end.bind(handler),
    );

    router.get('/users', handler.listUsers.bind(handler));
    router.put(
      '/users',
      handler.createUserValidator,
      handler.createUser.bind(handler),
    );
    router.get(
      '/users/:id',
      handler.getUserValidator,
      handler.getUser.bind(handler),
    );
    router.post(
      '/users/:id',
      handler.updateUserValidator,
      handler.updateUser.bind(handler),
    );

    return router;
  }

  readonly deployValidator = [
    body('time', 'time should be number').isNumeric(),
  ];
  async deploy(req: Request, res: Response) {
    const id = await this.auction.deploy(Number(req.body.time));
    res.status(200).json({ success: true, id });
  }

  readonly endValidator = [body('id', 'id should be number').isNumeric()];
  async end(req: Request, res: Response) {
    const hash = await this.auction.end(Number(req.body.id));
    res.status(200).json({ success: true, hash });
  }

  async listUsers(req: Request, res: Response) {
    const users = await this.user.list();
    res.status(200).json({ success: true, users });
  }

  readonly createUserValidator = [
    body('username', 'username should not be empty').notEmpty(),
    body('password', 'password should not be empty').notEmpty(),
    body('isAdmin', 'isAdmin should be boolean').isBoolean(),
  ];
  async createUser(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new ApiError(400, 'Invalid input', result.array());
    }
    const user = await this.user.create(
      req.body.username,
      req.body.password,
      Boolean(req.body.isAdmin),
    );
    res.status(200).json({ success: true, user });
  }

  readonly getUserValidator = [param('id', 'is should be numeric').isNumeric()];
  async getUser(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new ApiError(400, 'Invalid input', result.array());
    }
    const user = await this.user.get(Number(req.params.id));
    res.status(200).json({ success: true, user });
  }
  readonly updateUserValidator = [
    param('id', 'is should be numeric').isNumeric(),
    body('password', 'password should not be empty').notEmpty().optional(),
    body('isAdmin', 'isAdmin should be boolean').isBoolean().optional(),
  ];
  async updateUser(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new ApiError(400, 'Invalid input', result.array());
    }
    const user = await this.user.update(
      Number(req.params.id),
      req.body.password,
      req.body.isAdmin,
    );
    res.status(200).json({ success: true, user });
  }
}
