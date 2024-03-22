import {
  Request,
  Response,
  NextFunction,
  Express,
  default as express,
} from 'express';
require('express-async-errors');
import AuthHandler from './auth_handler';
import { ValidationError } from 'express-validator';
import { UnauthorizedError } from 'express-jwt';
import Auction from '../auction';
import AuctionHandler from './auction_handler';
import User from '../user';
import AdminHandler from './admin_handler';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export default class Server {
  private app: Express;

  constructor() {
    this.app = express();
  }

  public start(
    host: string,
    port: number,
    secret: string,
    jwtTime: string,
    auction: Auction,
    user: User,
  ) {
    this.app.use(express.json());
    this.setupRoutes(secret, jwtTime, auction, user);
    this.app.use(
      (err: object, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof ApiError) {
          res
            .status(err.status)
            .json({ success: false, message: err.message, errors: err.inner });
        } else if (err instanceof UnauthorizedError) {
          res.status(err.status).json({ success: false, message: err.message });
        } else if (err instanceof SyntaxError) {
          res.status(400).json({ success: false, message: err.message });
        } else if (
          err instanceof PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          res.status(404).json({ success: false, message: err.message });
        } else if ('message' in err && typeof err.message == 'string') {
          res.status(500).json({ success: false, message: err.message });
        } else {
          next(err);
        }
      },
    );
    this.app.listen(port, host, () => {
      console.log(`App running at http://${host}:${port}/`);
    });
  }

  private setupRoutes(
    secret: string,
    jwtTime: string,
    auction: Auction,
    user: User,
  ) {
    this.app.get(
      '/',
      AuthHandler.protected(secret),
      AuthHandler.admin(),
      async (req, res) => {
        res.status(200).json('OK');
      },
    );

    this.app.use('/auth', AuthHandler.router(user, secret, jwtTime));

    this.app.use(
      '/auction',
      AuthHandler.protected(secret),
      AuctionHandler.router(auction),
    );

    this.app.use(
      '/admin',
      AuthHandler.protected(secret),
      AuthHandler.admin(),
      AdminHandler.router(auction, user),
    );

    this.app.use(
      '/sign',
      AuthHandler.protected(secret),
      async (req: Request, res: Response) => {
        const signed = await auction.sign(req.body.privateKey, req.body.tx);
        res.status(200).json({ success: true, signed });
      },
    );
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly inner?: Error | ValidationError[];

  constructor(
    status: number,
    message: string,
    inner?: Error | ValidationError[],
  ) {
    super(message);
    this.status = status;
    this.inner = inner;
  }
}
