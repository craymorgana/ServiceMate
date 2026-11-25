# ServiceMate codebase review

Review date: 2026-11-25. Tree reviewed: `main` at `f66076a` (2026-02-17, "Stop tracking .vscode"). Scope was the repository as it exists, including git history for secrets. No application code was changed.

This is a vehicle-maintenance tracker. A root `package.json` starts two separate npm projects: a Vite/React client and an Express/Apollo/Mongoose server. Recent work (`745a860`, 2026-02-17, "cleaned up old mutations, added new car mutations") lets a logged-in user add a car, remove a car, and update that car's mileage, with the remove and mileage mutations scoped to `context.user._id`. Password storage uses bcrypt (10 salt rounds) in a Mongoose `pre("save")` hook. The client sends the session as a Bearer token through Apollo. Those pieces are the right shape. The gaps below are what block a safe web deploy and an Android client.

Severity counts: **4 high, 11 medium, 5 low.**

## Snapshot

| Area | What is in the repo |
| --- | --- |
| Server | Express 4.18.2, `apollo-server-express` 3.13.0, GraphQL 16.8.1, Mongoose 6.12.3, `jsonwebtoken` 8.5.1, bcrypt 5.1.1. One GraphQL endpoint. |
| Client | React 18.3.1, Vite 5.4.21, Apollo Client 3.14.0, React Router 6.30.3, Bootstrap 5.3.8 CSS, `react-modal` 3.16.1. JavaScript only. |
| Data | MongoDB via `MONGODB_URI`. Models: `User`, `Vehicle`, `Service`. |
| Tests / CI | One Create React App leftover test. No test script, no workflow files. |
| Docs | `README.md` is 7 lines. `.env.example` lists `MONGODB_URI` and `PORT` only. |

`npm audit` was run against the three lockfiles on 2026-11-25 (registry advisories as of that date):

| Lockfile | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| `server/package-lock.json` | 6 | 21 | 8 | 10 | 45 |
| `client/package-lock.json` | 0 | 6 | 4 | 1 | 11 |
| `package-lock.json` (root) | 2 | 3 | 2 | 0 | 7 |

The root package is not the API process. `server/server.js` loads the server package's Express 4, not the root's Express 5.

---

## 1. Architecture and code quality

The split between `client/` and `server/` is clear, and GraphQL documents live in `client/src/utils/mutations.js` and `client/src/utils/queries.js`. Past that, UI, network, and browser APIs share the same files. `client/src/pages/Dashboard.jsx` (354 lines) fetches the NHTSA catalog, owns add/remove state, and renders the garage. `client/src/pages/Board.jsx` (258 lines) loads a vehicle and its services, picks an illustration, edits mileage, and hosts the modal. `client/src/utils/auth.js` reads `localStorage` and calls `window.location`. There is no hooks layer, no shared package, and no `npm` workspaces: three package.json files, three lockfiles.

### L1. Dead code, unused dependencies, and CRA leftovers

- **Severity:** Low
- **Paths:** `client/src/components/ToDoTaskList/index.jsx`, `client/src/components/ToDoTaskList/index.js`, `client/src/utils/helpers.js`, `client/src/reportWebVitals.js`, `client/src/setupTests.js`, `client/src/App.test.js`, `client/src/App.js`, `client/src/index.js`, `client/public/index.html`, `client/public/manifest.json`, `client/package.json`, `server/models/User.js`, `server/models/Vehicle.js`, `package.json`
- **What is there:** Nothing imports `ToDoTaskList`, `validateEmail`, `checkPassword`, or `reportWebVitals`. `reportWebVitals.js` dynamic-imports `web-vitals`, which is not a dependency. `setupTests.js` imports `@testing-library/jest-dom`, which is not a dependency. `App.test.js` looks for the text "learn react", which the UI does not render. Vite enters through `client/index.html` → `client/src/main.jsx` → `client/src/App.jsx`. `client/src/index.js` and `client/src/App.js` only re-export those modules for the leftover test. `client/public/index.html` says it is unused. `react-bootstrap` is in `client/package.json` and is never imported; only `bootstrap/dist/css/bootstrap.min.css` is. `User.js` imports `./Vehicle` and does not use it. `Vehicle.js` imports `./Service` and does not use it. The root `package.json` depends on Express `^5.2.1`, and `server/server.js` never loads it.
- **Recommendation:** Delete the unused modules and the `react-bootstrap` dependency. Keep a single entry (`main.jsx` / `App.jsx`). Drop Express from the root package unless a script actually imports it. After that, add ESLint with `no-unused-vars` so the next unused file fails CI.

### L2. Naming drifts between "task" and "service"

- **Severity:** Low
- **Paths:** `client/src/components/AddTask/`, `client/src/components/TaskCard/index.jsx`, `client/src/components/ToDoTaskList/index.jsx`, `server/models/Vehicle.js`, `server/schemas/typeDefs.js`, `server/schemas/resolvers.js`
- **What is there:** The domain words in the schema are Vehicle and Service. The UI components are still AddTask, TaskCard, and ToDoTaskList. `TaskCard` reads `task.serviceType || task.task` and `task.serviceDescription || task.taskDescription`, leftover from an older shape. The Mongoose path and the GraphQL field for a list of services are both named `service` (singular). The GraphQL `Vehicle` type also declares `title` and `user`, which are not on the Mongoose schema and have no field resolvers, so they always resolve empty.
- **Recommendation:** Rename the components to match the schema (`AddService`, `ServiceCard`). Rename the array field to `services` in one migration. Remove `title` and `user` from the GraphQL type until a resolver owns them.

### M5. There are no runnable tests and no CI

- **Severity:** Medium
- **Paths:** `client/src/App.test.js`, `client/package.json`, `server/package.json`, `package.json`. No `.github/workflows/`, no Jest or Vitest config, no server test file. `server/test.js` is a MongoDB ping script, not a test suite.
- **What is there:** `client/package.json` has `dev`, `build`, and `preview` only. The server scripts are `start`, `seed`, and `watch`. The only `test()` in the repo cannot run: the runner and `@testing-library/react` are not installed, and the assertion does not match the UI.
- **Recommendation:** Add Vitest + React Testing Library for the client and a Node test runner for resolvers. First cases should be the ones that already fail open: `vehicle`, `service`, and `user` require the owner; `addService` rejects another user's `vehicleId`; `removeVehicle` and `updateVehicleMileage` stay owner-scoped; login does not distinguish "no such email" from a bad password. Add a GitHub Actions workflow that runs those tests and `npm audit --audit-level=high` in `server/` and `client/`.

### M8. Data fetching is wired into page components and full page loads

- **Severity:** Medium
- **Paths:** `client/src/utils/auth.js`, `client/src/App.jsx`, `client/src/components/AddTask/index.jsx`, `client/src/pages/Dashboard.jsx`, `client/src/pages/Board.jsx`, `client/vite.config.js`
- **What is there:** `Auth.login` writes `localStorage` and then `window.location.assign("/dashboard")`. `Auth.logout` removes the key and calls `window.location.reload()`. `AddTask` calls `window.location.reload()` after `addService` instead of updating the Apollo cache. `Header` calls `Auth.loggedIn()` during render, so the header cannot update without a reload. `Dashboard` calls `useParams()` for `username`, but no route in `App.jsx` defines `:username`, so the `QUERY_USER` branch never runs. `Board` is mounted at `/vehicles/:vehicleId` with no login check, and it fires `QUERY_VEHICLE` and `QUERY_SERVICE` separately. The dev GraphQL URL is the relative `/graphql`, proxied only by Vite to `http://localhost:3001`.
- **Recommendation:** Make `Auth` accept a storage adapter and return the token. Navigate with React Router. After mutations, `refetchQueries` or `cache.updateQuery` the service list (mileage already refetches). Guard `/dashboard` and `/vehicles/:vehicleId` with a route element that checks the session. Replace the relative URI with `import.meta.env.VITE_GRAPHQL_URL` defaulting to `/graphql` in dev.

### L5. A few schema options do nothing

- **Severity:** Low
- **Paths:** `server/models/Vehicle.js`, `server/config/connection.js`, `server/schemas/resolvers.js`
- **What is there:** `vehicleTitle.allowNull` is a Sequelize option; Mongoose ignores it. `mongoose.connect` is called with `useNewUrlParser` and `useUnifiedTopology`, which Mongoose 6 no longer uses. `addVehicle` `console.log`s the title and the new id. The `vehicle` resolver throws `AuthenticationError` when `vehicleId` is missing, which is an input failure rather than an auth failure.
- **Recommendation:** Delete the no-op options and the logs. Throw `UserInputError` for bad ids. Require `SECRET` and `MONGODB_URI` at startup (see H4).

---

## 2. Security

### H1. A live database URI is committed, and older secrets remain in git history

- **Severity:** High
- **Paths:** `server/test.js` (current tree, line 2). History: `servicemate/server/.env` added in `32372f4` (2023-11-22), moved to `server/.env` in `1520c48` (2023-11-22), credentials replaced in `80284cd` (2025-03-08), still tracked in `5b9b80e` and `def2aa7`, deleted in `d2f52f9` (2025-03-08). `server/test.js` added in `91db0f7` (2026-02-16) and still present at `f66076a`.
- **What is there:** `server/test.js` hardcodes a `mongodb+srv://` URI for Atlas user `aaron` on host `main.fdmbe4v.mongodb.net`, including the password. That password is the same string previously stored for Atlas user `aaronmorgan7` on `cluster0.0awkt.mongodb.net` in the deleted `server/.env`. An earlier revision of that file (and `servicemate/server/.env`) stored a different URI for Atlas user `kanban` on `cluster0.wbagpgu.mongodb.net`. Both deleted env files also stored a JWT signing secret (`SECRET`) that is a short, guessable literal. `.gitignore` and `server/.gitignore` ignore `.env` now, but ignore rules do not remove files already committed, and they do not cover `server/test.js`. `.env.example` is only a placeholder and is fine.
- **Recommendation:** In Atlas, delete or rotate every database user named above (`aaron`, `aaronmorgan7`, `kanban`) and confirm the clusters no longer accept those passwords. Treat the historical JWT secret as public: set a new long random `SECRET` everywhere the app runs, and assume every token signed with the old value is forgeable. Delete `server/test.js`. Rewrite or orphan the git history that contains those blobs (`git filter-repo` or a fresh repo) and force-push only with the understanding that every existing clone is still tainted. Until rotation is done, assume anyone with the repo can reach those databases. Do not put the password or the old secret into new files, tickets, or this report's future edits.

### H2. Cars and service history are readable without a session, and service writes are not ownership-checked

- **Severity:** High
- **Paths:** `server/schemas/resolvers.js` (`user`, `vehicle`, `service`, `addService`), `server/schemas/typeDefs.js`, `client/src/App.jsx`, `client/src/utils/queries.js`
- **What is there:** `vehicles`, `me`, `addVehicle`, `removeVehicle`, and `updateVehicleMileage` require `context.user`, and the three mutations that take a `vehicleId` also match `userId: context.user._id`. These do not:
  - `user(username)` loads any account and returns `email` plus that account's vehicles. No session required.
  - `vehicle(vehicleId)` loads any vehicle and populates its services. The id check throws when the id is missing; it never checks the caller.
  - `service(vehicleId)` returns every service row for that id. No session required.
  - `addService` requires a session, then creates a service and `$addToSet`s it onto `Vehicle` by id alone. It never checks that the vehicle belongs to `context.user`.
- **Why it matters:** Usernames are chosen at signup (`Signup.jsx` stores the "Name" field as `username`). A caller who knows or guesses one calls `user`, receives the email and the vehicle ids, then calls `service` for each id. A logged-in caller can append service rows to someone else's car. `/vehicles/:vehicleId` in `App.jsx` is not wrapped in a login check, so the client will issue those queries for anyone who opens the URL.
- **Recommendation:** On `vehicle`, `service`, and `addService`, require a session and `userId: context.user._id` (for services, resolve the parent vehicle first and compare). On `user`, either remove the query or return only public fields for the caller. Prefer `me` for the signed-in account. Add the same check inside a small `loadOwnVehicle(vehicleId, userId)` helper so the next mutation cannot forget it. Cover it with the tests in M5.

### H3. The API stack is end of life, several direct dependencies have advisories, and versions are unpinned

- **Severity:** High
- **Paths:** `server/package.json`, `server/package-lock.json`, `client/package.json`, `client/package-lock.json`, `package.json`, `package-lock.json`
- **What is there:**
  - `apollo-server-express`, `bcrypt`, and `dotenv` are specified as `""`. The root devDependency `concurrently` is `""`. npm treats that as `*`. The lockfile currently pins apollo-server-express 3.13.0, bcrypt 5.1.1, dotenv 16.3.1, and concurrently 8.2.2, but a lockfile refresh can move them to whatever is latest.
  - Apollo Server 3 is end of life (apollo-server-core 3.13.0). `npm audit` reports `apollo-server-core` and `apollo-server-express` high, with no fix inside that major, including a cross-site search advisory on the server (`GHSA-9q82-xgwf-vj6h`). `@graphql-tools/utils` prototype pollution is pulled in transitively and also has no fix available on the locked line.
  - `mongoose` is locked at 6.12.3. Audit marks `mongoose <=6.13.11` critical for search-injection and `$nor` sanitizer issues (`GHSA-m7xq-9374-9rvx`, `GHSA-vg7j-7cwx-8wgw`, `GHSA-wpg9-53fq-2r8h`). Current resolvers pass GraphQL scalars into equality filters, so they are not an open `$` operator sink today. The patched line is still a required upgrade.
  - `jsonwebtoken` is locked at 8.5.1, which audit marks high: legacy key typing (`GHSA-8cf7-32gw-wr33`), HMAC/RSA algorithm confusion (`GHSA-hjrf-2m68-5959`), and signature validation bypass via the default algorithm (`GHSA-qwph-4952-7xr6`). `jws <3.2.3` is high as well.
  - `express` is declared `^4.17.2` and locked at 4.18.2. Audit marks `express <=4.22.2` high (open redirect and `response.redirect` XSS, plus `body-parser` DoS). The root package's Express 5.2.1 is a different, unused tree and its own audit is not clean (`proxy-addr` critical, `body-parser` high, via that tree).
  - bcrypt 5.1.1 is flagged high through `@mapbox/node-pre-gyp` → `tar`. That is an install-time toolchain issue, not the password hash.
  - Client audit: Vite `<=6.4.3` is high (the lock is 5.4.21), including dev-server path traversal in optimized deps. `react-router` / `react-router-dom` 6.30.3 are in a range with open-redirect advisories. `esbuild` (via Vite) moderate: the dev server can be called from another website.
- **Recommendation:** Move the server to `@apollo/server` 4 (or current 5) with `expressMiddleware`, Mongoose 8, and `jsonwebtoken` 9. Pass `algorithms: ["HS256"]` on every `jwt.verify`. Pin every dependency to an exact version or a caret range; delete the `""` specifiers. Upgrade Express to a release newer than the `<=4.22.2` advisory range, and re-run `npm audit` in `server/` and `client/` because this review did not assume a safe version number beyond what the advisory ranges state. Remove the unused root Express dependency so it stops looking like the runtime. Replace nodemon 2.0.22 (high, through `semver`) with the current major or with `node --watch`.

### H4. The process `npm start` launches is not a locked-down production server

- **Severity:** High
- **Paths:** `package.json`, `server/server.js`, `server/utils/auth.js`, `server/config/connection.js`, `.env.example`, `client/vite.config.js`
- **What is there:**
  - `npm start` is `node server/server.js --ignore client`. Node does not treat `--ignore` specially; it lands in `process.argv` and is ignored by this program. `NODE_ENV` is never set.
  - Static files are served from `client/build` only when `NODE_ENV === "production"`. Vite writes `client/dist`. There is no `client/build` directory. `app.get("/")` always calls `res.sendFile` on `client/build/index.html`, including in development, and no route falls back for `/dashboard` or `/vehicles/:id`.
  - `auth.js` sets `const secret = process.env.SECRET`. `.env.example` does not mention `SECRET`. If it is unset, `jsonwebtoken` throws when someone signs or verifies a token. The server still listens.
  - `connection.js` warns and continues when `MONGODB_URI` is missing or not a `mongodb://` / `mongodb+srv://` URL. `server.js` listens either way and prints a warning if `readyState !== 1`.
  - Introspection: `apollo-server-core` 3.13.0 turns introspection off only when `nodeEnv === "production"`. With `NODE_ENV` unset, introspection and the Apollo landing page stay on.
  - CSRF: in that same version, omitting `csrfPrevention` stores `null`, so CSRF prevention stays off. `server.js` does not pass the option.
  - Apollo's built-in `/.well-known/apollo/server-health` returns `{ status: "pass" }` even when MongoDB is down, because `onHealthCheck` is not set.
- **Recommendation:** Fail fast if `SECRET` or `MONGODB_URI` is missing or if `SECRET` is shorter than 32 bytes. Document both in `.env.example`. Set `NODE_ENV=production` in the start script. Serve the API as its own process; if the same process must serve the SPA, point it at `client/dist` and fall back to `index.html` for non-file GET routes. Pass `introspection: false` outside local dev, `csrfPrevention: true`, and a real health check that pings MongoDB. Keep the Vite proxy for local dev only.

### M1. Tokens are accepted from more places than the client sends them, and they live in localStorage

- **Severity:** Medium
- **Paths:** `server/utils/auth.js`, `client/src/utils/auth.js`, `client/src/App.jsx`
- **What is there:** The middleware takes `req.body.token || req.query.token || req.headers.authorization`, then if an `Authorization` header exists it strips a `Bearer ` prefix. A token in the query string is written to access logs, browser history, and `Referer`. Verification errors are swallowed (`console.log("Invalid token")`) and the request continues as anonymous, which hides broken clients. `signToken` puts `email`, `username`, and `_id` in the payload, signs with `expiresIn: "2h"`, and `jwt.verify` passes `maxAge: "2h"` without an `algorithms` allow list (see H3). There is no refresh token and no server-side revocation. The client stores the JWT in `localStorage` under `id_token`. Any script that runs on the origin can read it. Nothing sets a Content-Security-Policy.
- **Recommendation:** Accept only the `Authorization: Bearer` header. Keep the 2-hour lifetime. On a native client, store the token in the platform secure store (see section 6), not in a WebView `localStorage`. Add a CSP once the Google Fonts and NHTSA calls have a deliberate allowlist. Logout can stay client-side until there is a reason to denylist tokens.

### M2. Signup and login are easy to brute force and leak whether an email exists

- **Severity:** Medium
- **Paths:** `server/schemas/resolvers.js` (`login`, `addUser`), `server/models/User.js`, `client/src/pages/Login.jsx`, `client/src/pages/Signup.jsx`, `client/src/utils/helpers.js`
- **What is there:** Passwords are hashed with bcrypt, 10 rounds, only in `pre("save")`. That hook does not run for `findOneAndUpdate`; nothing updates a password today, so this is safe until a reset flow is added. The schema `minlength` is 5. There is no email format check, and email is not lowercased, so `A@x.com` and `a@x.com` are different users. `login` throws "No user found with this email address" when the email is missing and "Incorrect credentials" when the password is wrong. `helpers.js` contains a stricter password regex and an email regex, and no page imports them. The regex also requires a leading letter and only `\w` characters, and it misspells the local variable `passwword`. No rate limit, lockout, or account lock exists. Seeds create `aaron` / `taylor` with password `password123` (`server/seeds/seeds.js`).
- **Recommendation:** Use one generic login error. Normalize email with `trim` + `lowercase` and a simple format check in the schema. Raise the minimum length (15 or more is a reasonable bar for a new app) and drop the unused regex or call one shared checker from the client and the schema. Add a rate limit on `login` and `addUser` before the API is reachable from the internet. Hash any future password change through the document `save()` path, not `findOneAndUpdate`.

### M3. Any website can call GraphQL from a browser

- **Severity:** Medium
- **Paths:** `server/server.js`. Behavior confirmed against `apollo-server-express@3.13.0` `dist/ApolloServer.js` and `apollo-server-core@3.13.0` `dist/ApolloServer.js`.
- **What is there:** `applyMiddleware({ app })` does not pass `cors`. In 3.13.0, any value other than `false` installs the `cors` package. With the option omitted, that call is `cors(undefined)`, whose default is `Access-Control-Allow-Origin: *`. CSRF prevention stays off when the option is omitted (the core constructor sets the header list to `null`). The client today is same-origin through the Vite proxy, so this default is unused locally. A phone WebView, a second origin, or a malicious page is cross-origin. Bearer tokens are not cookies, so a random site cannot attach the victim's `localStorage` token. It can still call the unauthenticated queries in H2, and it will be able to call cookie-based auth later if someone adds cookies without narrowing CORS.
- **Recommendation:** Pass an explicit allowlist (`cors: { origin: [WEB_ORIGIN, CAPACITOR_ORIGIN] }`) and `csrfPrevention: true`. Do this together with H2; an allowlist does not fix unauthenticated reads.

### M7. Relations are stored twice, with no transaction and no query index

- **Severity:** Medium
- **Paths:** `server/models/User.js`, `server/models/Vehicle.js`, `server/models/Service.js`, `server/schemas/resolvers.js`, `server/seeds/seeds.js`
- **What is there:** A vehicle id is stored on `User.vehicles` and `Vehicle.userId`. A service id is stored on `Vehicle.service` and `Service.vehicleId`. `addVehicle`, `addService`, and `removeVehicle` write both sides as separate `await`s. If the second write fails, the sides disagree. `removeVehicle` does delete services with `Service.deleteMany({ vehicleId })`, then pulls the id from the user, then deletes the vehicle. Nothing uses a MongoDB transaction. There is no index on `Vehicle.userId` or `Service.vehicleId`. `Service.mileage` has no `min: 0` even though `updateVehicleMileage` rejects negatives.
- **Recommendation:** Keep `Vehicle.userId` and `Service.vehicleId` as the source of truth. Derive the lists with queries (or a virtual `populate`) instead of mirroring id arrays, or update both sides inside `session.withTransaction`. Add indexes `{ userId: 1 }` on vehicles and `{ vehicleId: 1, columnId: 1 }` on services. Set `min: 0` on service mileage.

### L3. Lists are unbounded, and there is no N+1 in the current resolvers

- **Severity:** Low
- **Paths:** `server/schemas/typeDefs.js`, `server/schemas/resolvers.js`, `client/src/pages/Board.jsx`
- **What is there:** `vehicles`, `user.vehicles`, and `service(vehicleId)` return every matching document. There is no cursor, limit, or `pageInfo`. There are also no GraphQL field resolvers. `vehicles` and `vehicle` use `.populate("service")`, and `user` / `me` use `.populate("vehicles")`, each of which is one extra query rather than one query per parent. The board page issues two HTTP queries (`QUERY_VEHICLE` and `QUERY_SERVICE`) for data the `vehicle` resolver already populates and then ignores, because `QUERY_VEHICLE` does not ask for services.
- **Recommendation:** Add `services` to `QUERY_VEHICLE` and stop the second round trip. Before an Android client syncs long histories, add a cursor (`services(vehicleId, after, first)`) with a stable sort (`_id` or a new `createdAt`). Do not add per-field resolvers that query Mongo in a loop; keep using `populate` or a single `Service.find`.

---

## 3. Data model and API design

Models are three Mongoose schemas. The GraphQL schema in `server/schemas/typeDefs.js` matches them closely, with the extra `Vehicle.title` and `Vehicle.user` fields from L2. Auth returns `token: ID!`, which overloads `ID` for an opaque string. Mutations that exist: `addUser`, `login`, `addVehicle`, `removeVehicle`, `updateVehicleMileage`, `addService`. There is no update, delete, or move for a service, no password change, and no account delete.

### M4. Seeding wipes the database and writes statuses the board does not render

- **Severity:** Medium
- **Paths:** `server/seeds/seeds.js`, `client/src/pages/Board.jsx`, `client/src/components/AddTask/index.jsx`, `client/src/components/TaskCard/index.jsx`, `package.json` (`seed` script)
- **What is there:** On Mongo `open`, the seed deletes every `User`, `Service`, and `Vehicle`, then inserts two users. Service rows use `columnId` `"completed"` and `"planned"`. The board filters `"To Do"`, `"In Progress"`, and `"Done"`. Seeded services therefore match no column. `AddTask` posts those three UI strings. `TaskCard` renders "Move back" and "Move up" buttons with no `onClick`. Nothing in the schema updates `columnId` after insert.
- **Recommendation:** Define one enum, for example `TODO`, `IN_PROGRESS`, `DONE`, in the GraphQL schema and refuse any other `columnId`. Use that enum in the seed. Add `updateService` (at least `columnId`, and a delete). Wire the buttons to that mutation. Guard `npm run seed` so it refuses to run when `NODE_ENV=production` or when the URI host is an Atlas cluster, unless an explicit `SEED_CONFIRM=yes` is set. The current script will empty a production database if `MONGODB_URI` points at one.

### M6. The board contract does not match the product the UI describes

- **Severity:** Medium
- **Paths:** `client/src/pages/Home.jsx`, `client/src/pages/Board.jsx`, `client/src/components/AddTask/index.jsx`, `server/schemas/typeDefs.js`, `server/models/Service.js`
- **What is there:** Home says a log takes "3 min", data is "100% user-owned", the app stores receipts, shows a maintenance timeline, and can export a history to share when a car is sold. The implementation is a three-column board of title, description, mileage, and `columnId`. There is no receipt field, no date, no `createdAt` / `updatedAt` on any schema, no export, and no share link. `Service` has no owner id of its own; ownership is only through the vehicle.
- **Recommendation:** Either build timestamps plus an export query, or change the marketing copy to describe the board that exists. Add `timestamps: true` on the schemas before an Android client needs "when did this happen". Keep ownership on the vehicle and enforce it in resolvers (H2).

### L4. The year the user picks does not filter makes

- **Severity:** Low
- **Paths:** `client/src/pages/Dashboard.jsx`
- **What is there:** Choosing a year fetches `https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json`, which returns car makes and ignores the year. Models then use `GetModelsForMakeYear/make/{make}/modelyear/{year}`. Both fetches have no timeout, no abort on a newer selection, and no server-side cache. The endpoint is called from the browser, so a native app would call NHTSA directly too.
- **Recommendation:** Call `GetMakesForManufacturerAndYear` or the make-for-model-year endpoint so the year matters. Abort the previous request in the effect cleanup. If the Android app should work offline or avoid an extra vendor, cache makes and models in the API instead of calling NHTSA from each client.

---

## 4. Frontend

The UI is a Vite SPA: Home, Login, Signup, Dashboard, Board, plus Header, AddTask, and TaskCard. Styling is Bootstrap's CSS plus `client/src/App.css` (845 lines) and `client/src/index.css` (25 lines, including a Google Fonts import). React 18.3.1 and React Router 6.30.3 are current enough to keep for a web client; they are not the latest majors as of this review (React 19 and React Router 7 exist). Vite 5.4.21 is inside the advisory range in M11. Bootstrap is used as a global stylesheet (`d-flex`, `fixed-top`, `btn`, `form-control`) while the newer screens restyle the same elements in `App.css`.

### M9. Keyboard and assistive-tech gaps

- **Severity:** Medium
- **Paths:** `client/src/App.css` (focus outlines removed around lines 364, 574, 584, 664, 769), `client/src/pages/Login.jsx`, `client/src/pages/Signup.jsx`, `client/src/pages/Dashboard.jsx`, `client/src/pages/Board.jsx`, `client/src/components/Header/index.jsx`, `client/src/components/TaskCard/index.jsx`, `client/src/components/AddTask/index.jsx`
- **What is there:** Login and signup inputs have `<label htmlFor>`, which is good, and `.auth-form-modern input:focus` restores a visible border. `.dashboard-form select` and several other controls set `outline: none` without a matching `:focus-visible` rule. Header links set `opacity: 50%` on hover, which drops contrast. Logout is an `<a href="/logout">` that also calls `Auth.logout()`; `/logout` renders `Home`. Errors are rendered in a `<p>` with no `role="alert"` or `aria-live`. `TaskCard` buttons say "Move back" and "Move up" with no service name and no action. `react-modal` is used without `Modal.setAppElement`, so the library cannot hide the rest of the page from assistive tech. The vehicle illustration alt text includes the title, which is good. Loading states are plain text ("Loading...", "Loading service board...") with no status role.
- **Recommendation:** Use `:focus-visible` instead of `outline: none`. Make logout a `<button>`. Point `aria-describedby` from each input to its error and mark the error `role="alert"`. Give move buttons an accessible name that includes the service title, once they do something (M4). Call `Modal.setAppElement("#root")` at startup. Check the header and empty-state colors against WCAG AA on the dark background.

### M10. README and env setup do not match the app

- **Severity:** Medium
- **Paths:** `README.md`, `.env.example`, `package.json`, `server/package.json`, `client/package.json`, `client/src/assets/Screenshot 2026-02-17 192121.png`
- **What is there:** The README is the title, one sentence, and a screenshot. It does not say which Node version, how to install (`npm run install` at the root is the intended chain), that `.env` needs `MONGODB_URI` and `SECRET`, that the API is `http://localhost:3001/graphql`, or that the client dev server proxies `/graphql`. It does not mention `npm run develop`, `npm run seed`, or the seed passwords. The screenshot path is real (`client/src/assets/Screenshot 2026-02-17 192121.png`). There is no `engines` field. This review ran Node v22.23.4; nothing in the repo states that.
- **Recommendation:** Document, in order: Node version, `cp .env.example .env`, both required variables, `npm run install`, `npm run develop`, `npm run seed` and a warning that seed deletes all data, and the two local URLs. State that `SECRET` must be a long random value and must not be committed. Point the screenshot at a path without spaces, or leave it and make sure the link stays valid.

### M11. The client lockfile has advisories, and a built bundle is committed

- **Severity:** Medium
- **Paths:** `client/package-lock.json`, `client/dist/` (`index.html`, `assets/index-DCz2cSSe.js`, `assets/index-CAIe0efV.css`, `manifest.json`, logos), `client/.gitignore`, `.gitignore`
- **What is there:** Client audit totals 11 issues (6 high, 4 moderate, 1 low), dominated by Vite 5.4.21, its esbuild, and React Router 6.30.3. The high Vite issues are aimed at the dev server and optimized-deps handling; they still mean `npm run dev` should not be exposed beyond localhost. `client/dist/` is tracked (added in `745a860`). `client/.gitignore` ignores `/build`, which is the old Create React App output, and does not ignore `/dist`. The root gitignore also ignores `/build` and not `client/dist`. The committed `dist/manifest.json` is the Create React App sample ("Create React App Sample") and `client/index.html` does not link a manifest or register a service worker.
- **Recommendation:** Upgrade Vite to a current major outside `<=6.4.3`, and React Router to a release outside the open-redirect range, then re-audit. Stop tracking `client/dist`. Ignore `dist/` in `client/.gitignore`. Generate the bundle in CI or at deploy time.

---

## 5. Dev experience

Local development is a reasonable two-process script once env vars are known: root `develop` runs `server` via nodemon and `client` via Vite. `install` installs both packages. `build` builds only the client. The problems are the ones in H4 (start script, static directory, missing `SECRET`), M5 (no lint or test step), M10 (docs), and M11 (dist tracked).

There is no ESLint config, no Prettier config, no EditorConfig, and no `typecheck` script. Files mix tabs and spaces (server resolvers are mostly 2-space; several client files are tabs). A formatter would be a one-time cleanup, not a behavior change.

`client/src/pages/Dashboard.jsx` and the board are the files a new contributor will edit for the car feature. They are readable. The risk is changing a mutation in `client/src/utils/mutations.js` and forgetting the resolver, or the reverse, with nothing compiling against a shared schema.

---

## 6. Android port readiness

The owner wants an Android app eventually. The API is GraphQL over HTTP with a Bearer JWT. That transport is usable from a phone. The app is not ready to put a phone on it until H1, H2, H3, and H4 are done: a shipped client would be calling an API with committed database credentials, open vehicle reads, an end-of-life server, and no production host.

### Options that fit this stack

| Option | What would be reused | What blocks it here |
| --- | --- | --- |
| React Native / Expo | `mutations.js`, `queries.js`, the bcrypt-backed login contract, Apollo Client, the same JWT. UI rewritten in RN. | Logic is mixed into pages. Auth calls `localStorage` and `window.location`. No TypeScript types to share. |
| Capacitor around the current web client | Almost the whole `client/` build, loaded in a WebView. | `/graphql` is relative and only proxied in Vite. CORS is `*`, CSRF prevention is off, and the board is a desktop three-column layout. `localStorage` inside a WebView is a weak token store. Play Store policy and the web UX stay web UX. |
| PWA / Trusted Web Activity | The existing SPA, if it were installable. | `client/public/manifest.json` is the CRA sample and is not linked from `client/index.html`. There is no service worker. `npm start` does not serve the Vite build. A TWA still needs a deployed HTTPS origin. |
| Native Kotlin (Apollo Kotlin) against this API | The GraphQL schema only. | Every screen is rewritten. The repo is JavaScript with no published schema artifact, no pagination, and the auth holes in H2. Two clients would drift immediately. |

### Recommendation: Expo, after the API is safe to host

Use Expo (React Native) and share a small API package with the web client. This is the option that matches the code that already exists: one JavaScript team, Apollo Client, and a Bearer token that does not depend on cookies.

Capacitor is the shorter path to a store listing of the current UI, and it is a poor destination. The screens are not mobile layouts, token storage would stay in the WebView, and every later native feature (camera receipts, background mileage, secure storage) fights the WebView. A PWA is not started in this repo, and it does not produce a normal Play Store app without a TWA on top of a deployed site. Kotlin would throw away the only client the team has in exchange for a typed schema they can generate later anyway.

Do the Expo port only after a hosted API exists. Suggested sequence:

1. Finish H1–H4 and M3 so the phone talks to an HTTPS GraphQL endpoint with owner checks, a real `SECRET`, and an origin allowlist that includes the Expo dev client.
2. Extract the shared module listed below, and point the web app at it before writing RN screens.
3. Build the Android UI against that module: login, garage, service board, mileage. Use `expo-secure-store` for the token. Use a configurable GraphQL URL, not the Vite proxy.

### Refactor now so the port is smaller

These are changes in the current repo, before any Android project exists.

1. **Owner checks on every resolver** that reads or writes a vehicle or service (H2). A mobile client will send raw ids; the server has to be the authority.
2. **Boot-time config and a deployable API** (H4): required `MONGODB_URI` and `SECRET`, `introspection: false` in production, `csrfPrevention: true`, CORS allowlist, a health check that fails when MongoDB is down, HTTPS in front. Do not couple the phone to `client/build`.
3. **Token interface.** Change `client/src/utils/auth.js` so storage is injected (`getToken` / `setToken` / `clearToken`). The web adapter uses `localStorage`. The later Expo adapter uses SecureStore. Delete `window.location.assign` and `window.location.reload` from that module.
4. **GraphQL URL from the environment.** `VITE_GRAPHQL_URL` for web. The same env name, read from Expo config, for the phone. Default the web dev value to `/graphql` so the Vite proxy keeps working.
5. **Shared operations package.** Move `client/src/utils/mutations.js` and `queries.js` to something like `shared/graphql/` that both Vite and Expo can import. Add one `vehicle(id)` query that returns mileage and services so the board is a single round trip (L3).
6. **One column enum and service mutations** (M4). The phone and the web must send the same `columnId` values. Add move/update/delete now, or the second client will invent its own.
7. **Generated types from `server/schemas/typeDefs.js`.** `graphql-codegen` can emit TypeScript for the web and for Expo from the schema that already exists. This is the "shared types" step. It is worth doing while the surface is six mutations, and it removes the drift already visible (`Vehicle.title`, task vs service fields, seed column ids).
8. **Cursor pagination and timestamps** (L3, M6) before the phone caches long service lists. Add `createdAt` even if the UI does not show it yet.
9. **Stop calling NHTSA from the component** (L4). A shared hook or a server proxy can be called from web and Expo the same way.
10. **Pin dependencies and add the auth tests** (H3, M5) so the shared contract cannot change silently.

---

## Top 5 next steps

1. **Rotate the leaked credentials and delete `server/test.js`.** Atlas users `aaron`, `aaronmorgan7`, and `kanban` on the hosts in H1, plus the JWT `SECRET` from the deleted env files, should be treated as public. Rotate them, then purge or replace git history. Do this before any hosted deploy or any new collaborator clone.
2. **Authorize `user`, `vehicle`, `service`, and `addService`.** Require the session and the owning `userId` on every vehicle and service read and write. `removeVehicle` and `updateVehicleMileage` already do this; copy that pattern. This is the bug a mobile client would expose immediately.
3. **Replace the end-of-life API stack and pin versions.** Leave `apollo-server-express` 3 for `@apollo/server`, upgrade Mongoose off 6.12.3, upgrade `jsonwebtoken` off 8.5.1 with an `HS256` allow list, and replace the `""` version specifiers. Re-run `npm audit` in `server/` and `client/` and upgrade Vite and React Router past the advisory ranges.
4. **Make `npm start` a real production API.** Require `SECRET` and `MONGODB_URI`, set `NODE_ENV`, turn introspection off, turn CSRF prevention on, restrict CORS, and point health at MongoDB. Serve `client/dist` only if this process is still responsible for the SPA, with a fallback for client routes. Ignore `client/dist` in git. Document the env file (M10).
5. **Extract the shared API module and fix the board contract, then start Expo.** Pull mutations, queries, the column enum, and a token-storage interface out of the pages. Add service move/update/delete and align the seed data with the columns. Add tests for the auth rules. After steps 1–4, that module is what the Android app should import.

---

## Findings index

| ID | Severity | Area | Summary |
| --- | --- | --- | --- |
| H1 | High | Security | Atlas URIs in `server/test.js` and in git history; old JWT secret in history |
| H2 | High | Security / API | Unauthenticated vehicle reads; `addService` is not ownership-checked |
| H3 | High | Security / deps | Apollo Server 3 EOL, Mongoose and JWT advisories, unpinned versions |
| H4 | High | Security / DX | `npm start` is not a safe or working production server |
| M1 | Medium | Security | Query-string tokens, localStorage, no algorithm allow list |
| M2 | Medium | Security | Short passwords, email enumeration, no rate limit |
| M3 | Medium | Security | CORS `*` and CSRF prevention off |
| M4 | Medium | API | Seed wipes all data; column ids do not match the board |
| M5 | Medium | Quality | No runnable tests and no CI |
| M6 | Medium | API / product | No dates, receipts, export, or service update/delete |
| M7 | Medium | Data | Dual writes, no transactions, no foreign-key indexes |
| M8 | Medium | Client | `window.location` reloads, unguarded board route, relative GraphQL URL |
| M9 | Medium | Client | Focus, modal, and control-name accessibility gaps |
| M10 | Medium | DX | README and `.env.example` omit how to run the app |
| M11 | Medium | Client / DX | Vite and React Router advisories; `client/dist` committed |
| L1 | Low | Quality | Dead CRA files, unused `react-bootstrap`, unused imports |
| L2 | Low | Quality | Task vs service naming; unused GraphQL fields |
| L3 | Low | API | No pagination; no N+1 in current resolvers |
| L4 | Low | Client | Make dropdown ignores the selected year |
| L5 | Low | API | No-op Mongoose options and resolver logs |
