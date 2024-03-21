import {
  Request,
  Response,
  NextFunction,
  Express,
  default as express,
} from 'express';
require('express-async-errors');
import Auth from './auth';
import { ValidationError } from 'express-validator';
import { UnauthorizedError } from 'express-jwt';
import Auction from '../auction';
import AuctionHandler from './auction_handler';

export default class Server {
  private app: Express;
  private host: string;
  private port: number;
  private secret: string;
  private auction: Auction;

  constructor(host: string, port: number, secret: string, auction: Auction) {
    this.app = express();
    this.host = host;
    this.port = port;
    this.secret = secret;
    this.auction = auction;
  }

  public start() {
    this.app.use(express.json());
    this.setupRoutes();
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
          //} else if ('message' in err && typeof err.message == 'string') {
          //  res.status(500).json({ success: false, message: err.message });
        } else {
          next(err);
        }
      },
    );
    this.app.listen(this.port, this.host, () => {
      console.log(`App running at http://${this.host}:${this.port}/`);
    });
  }

  private setupRoutes() {
    this.app.get('/', Auth.protected(this.secret), async (req, res) => {
      res.status(200).json('OK');
    });
    this.app.post('/auth/register', Auth.registerValidator, Auth.register);
    this.app.post(
      '/auth/login',
      Auth.loginValidator,
      Auth.login.bind(null, this.secret),
    );

    this.app.use(
      '/auction',
      Auth.protected(this.secret),
      AuctionHandler.router(this.auction),
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
