import Server from "./server";
import config from "./configs";

async function main() {
    const server = new Server(config.server.host, config.server.port, config.auth.token);
    server.start();
}

main().then().catch()
