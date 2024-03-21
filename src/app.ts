import Server from './server';
import config from './configs';
import prisma from './database';
import Auction from './auction';

async function main() {
  const auction = await Auction.new(
    config.auction.rpc_url,
    config.auction.private_key,
  );

  const server = new Server(
    config.server.host,
    config.server.port,
    config.auth.token,
    auction,
  );
  server.start();
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
