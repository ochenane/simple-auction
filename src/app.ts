import Server from './server';
import config from './configs';
import prisma from './database';
import Auction from './auction';
import User from './user';

async function main() {
  const auction = await Auction.new(
    config.auction.rpc_url,
    config.auction.private_key,
  );

  const server = new Server();
  server.start(
    config.server.host,
    config.server.port,
    config.auth.token,
    config.auth.time,
    auction,
    new User(),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
