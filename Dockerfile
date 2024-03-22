FROM node:20-alpine as base
WORKDIR /app

COPY package*.json ./
RUN npm install --verbose

COPY . .

RUN npm run compile
RUN npm run build

FROM node:20-alpine as final
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/cache ./cache
COPY --from=base /app/artifacts ./artifacts
COPY --from=base /app/dist ./dist
COPY --from=base /app/dist/hardhat.config.js ./

ENV NODE_ENV production

RUN npm run db:generate

EXPOSE 8080
CMD npm run db:migrate && npm run db:seed && npm run start
