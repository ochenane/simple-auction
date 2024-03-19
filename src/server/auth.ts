import { Request, Response } from 'express';
import { expressjwt } from 'express-jwt';

export default class Auth {
    private secret: string;

    constructor(secret: string) {
        this.secret = secret;
    }

    public login(req: Request<{}, LoginResponse, LoginRequest>, res: Response<LoginResponse>) {
    }

    public middleware() {
        return expressjwt({
            secret: this.secret,
            algorithms: ["HS256"],
        })
    }
}

interface LoginRequest {
    username: string,
    password: string,
}

interface LoginResponse {
    success: boolean,
    token?: string,
}
