-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "address" TEXT NOT NULL,
    "endTime" DATETIME NOT NULL,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "highestBid" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "auctionId" INTEGER NOT NULL,
    "amount" BIGINT NOT NULL,
    "returned" BOOLEAN NOT NULL,
    CONSTRAINT "Bid_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_address_key" ON "Auction"("address");
