# Simple Auction
Simple Auction is for handling Auction using Smart Contract

## Features

* Users can register and create auctions.
* Users can bid on auctions.
* The highest bidder wins the auction at the end of the auction time and the amount goes to beneficiary

## Running
The whole project can be run using docker-compose (it contains mysql too)
```bash
    docker-compose up -d
```

Just make sure the `.env` file is set properly, there is `sample.env` file to show how it should be provided

It can also be run without docker:
```bash
    npm install
    npm run compile
    npm run build
    npm run db:generate
    npm run db:migrate
    npm run db:seed
    npm run start
```

#### Note
The setup creates a user with `admin` username and `pasword`, change it first of all

## Contributing
Project code is in `src/` directory

There are 3 main modules:

* **Auction**: is a wrapper around the smart contract
* **User**: handles users
* **Server**: handles APIs

There are other utility files too

Server is a directory as it is a little bigger to fit in a file, if any of other modules grow bigger, they should become directories too

