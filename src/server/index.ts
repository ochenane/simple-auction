import { Express, default as express } from 'express';
import { expressjwt, Params } from 'express-jwt';
import Auth from './auth';

export default class Server {
    private app: Express;
    private host: string;
    private port: number;
    private auth: Auth;

    constructor(host: string, port: number, secret: string) {
        this.app = express();
        this.host = host;
        this.port = port;
        this.auth = new Auth(secret);
    }

    public start() {
        this.setupMiddlewares();
        this.setupRoutes();
        this.app.listen(this.port, this.host, () => {
            console.log(`App running at http://${this.host}:${this.port}/`)
        });
    }

    private setupRoutes() {
        this.app.get('/', async (req, res) => {
            res.status(200).json("OK");
        })
        this.app.post('/auth/register')
    }

    private setupMiddlewares() {
        this.app.use(express.json());
        this.app.use(this.auth.middleware().unless({
            path: ["/auth"],
        }));
    }
}
