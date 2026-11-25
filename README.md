# ServiceMate

ServiceMate is a vehicle maintenance tracker. Each account has a garage of cars, and each car has a service board with mileage and a downloadable history.

## Requirements

- Node.js 20 or newer
- A MongoDB database

## Setup

1. Install dependencies from the repository root:

   ```bash
   npm run bootstrap
   ```

2. Copy the environment template and fill in the two required values:

   ```bash
   cp .env.example .env
   ```

   - `MONGODB_URI` is the connection string from your database host.
   - `SECRET` is a random string of at least 32 characters used to sign login tokens.

   Do not commit `.env`. If a database password or signing secret was ever committed, rotate it in the database host and replace `SECRET` everywhere the app runs. This repository does not rewrite git history.

3. Start the API and the Vite client:

   ```bash
   npm run develop
   ```

   - Client: http://localhost:5173
   - GraphQL: http://localhost:3001/graphql

   The client calls `/graphql` by default. Vite proxies that path to port 3001. Set `VITE_GRAPHQL_URL` when the API is on another origin.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run develop` | API with nodemon, and the Vite client |
| `npm test` | Server resolver tests and client tests |
| `npm run build` | Production client bundle in `client/dist` |
| `npm start` | Builds the client, then serves the API and `client/dist` with production settings |
| `npm run seed` | Deletes all app data and inserts sample users, cars, and services |

`npm run seed` refuses to run when `NODE_ENV=production` unless `SEED_CONFIRM=yes`. It deletes every user, vehicle, and service in the database named by `MONGODB_URI`.

## Production

`npm start` sets `NODE_ENV=production`, which turns GraphQL introspection off, hides server stack traces, and serves the built client from `client/dist`. The process exits if `MONGODB_URI` or `SECRET` is missing or if `SECRET` is shorter than 32 characters.

Set `CLIENT_ORIGIN` to the browser origins that may call the API, separated by commas. Requests with no `Origin` header are allowed. Set `TRUST_PROXY=1` when a reverse proxy sets the client IP.

`GET /health` returns `{"status":"pass"}` only when MongoDB is connected.

## Android

The web client keeps its API contract in `shared/graphql` and its token storage in `shared/auth/createAuth.js`. A later Expo app can import those modules, pass a secure-store adapter to `createAuth`, and point `VITE_GRAPHQL_URL` (or the same env name in Expo) at the hosted GraphQL endpoint. The phone should send `Authorization: Bearer <token>` only.

## Tests

GitHub Actions runs the server tests, the client tests, and `npm audit --audit-level=high` for both packages.
