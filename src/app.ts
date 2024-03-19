import Server from './server';
import config from './configs';
import prisma from './database';

async function main() {
  const server = new Server(
    config.server.host,
    config.server.port,
    config.auth.token,
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
