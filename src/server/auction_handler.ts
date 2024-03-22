import { Response, Router } from 'express';
import { Request } from 'express-jwt';
import { body, param, validationResult } from 'express-validator';
import { ApiError } from '.';
import Auction from '../auction';

export default class AuctionHandler {
  private auction: Auction;

  private constructor(auction: Auction) {
    this.auction = auction;
  }

  public static router(auction: Auction): Router {
    const router = Router();
    const handler = new AuctionHandler(auction);

    router.get('/:id', handler.idValidator, handler.status.bind(handler));
    router.get('/:id/bids', handler.idValidator, handler.history.bind(handler));

    router.post(
      '/:id/bids/create',
      handler.rawBidValidator,
      handler.rawBid.bind(handler),
    );

    router.post(
      '/:id/bids/send',
      handler.bidValidator,
      handler.bid.bind(handler),
    );

    router.post(
      '/:id/bids/:bidId/withdraw/create',
      handler.rawBidValidator,
      handler.rawBid.bind(handler),
    );

    router.post(
      '/:id/bids/:bidId/withdraw/send',
      handler.bidValidator,
      handler.bid.bind(handler),
    );

    return router;
  }

  readonly idValidator = [param('id', 'id should be number').isNumeric()];

  async status(req: Request, res: Response) {
    const status = await this.auction.status(Number(req.params.id));
    res.status(200).json({ success: true, ...status });
  }

  async history(req: Request, res: Response) {
    const history = await this.auction.history(Number(req.params.id));
    res.status(200).json({ success: true, history });
  }

  readonly rawBidValidator = [
    param('id', 'id should be number').isNumeric(),
    body('value', 'value should be number').isNumeric(),
  ];
  async rawBid(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new ApiError(400, 'Invalid input', result.array());
    }
    const tx = await this.auction.rawBid(req.body.id, req.body.value);
    res.status(200).json({ success: true, tx });
  }

  readonly bidValidator = [
    param('id', 'id should be number').isNumeric(),
    body('tx', 'id should be string').notEmpty(),
  ];
  async bid(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new ApiError(400, 'Invalid input', result.array());
    }
    await this.auction.bid(req.body.id, req.auth?.id, req.body.tx);
    res.status(200).json({ success: true });
  }

  async rawWithdraw(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new ApiError(400, 'Invalid input', result.array());
    }
    const tx = await this.auction.rawWithdraw(req.body.id, req.body.bidId);
    res.status(200).json({ success: true, tx });
  }

  readonly withdrawValidator = [
    param('id', 'id should be number').isNumeric(),
    param('bidId', 'id should be number').isNumeric(),
    body('tx', 'id should be string').notEmpty(),
  ];
  async withdraw(req: Request, res: Response) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      throw new ApiError(400, 'Invalid input', result.array());
    }
    const success = await this.auction.withdraw(
      req.body.id,
      req.body.bidId,
      req.auth?.id,
      req.body.tx,
    );
    res.status(200).json({ success });
  }
}
