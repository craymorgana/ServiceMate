const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express4");
const { ApolloServerPluginDrainHttpServer } = require("@apollo/server/plugin/drainHttpServer");
const { authMiddleware } = require("./utils/auth");
const { assertRuntimeEnv } = require("./config/env");
const { typeDefs, resolvers } = require("./schemas");

assertRuntimeEnv();

const db = require("./config/connection");

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";
const app = express();
const httpServer = http.createServer(app);

if (process.env.TRUST_PROXY === "1") {
	app.set("trust proxy", 1);
}

function allowedOrigins() {
	const configured = (process.env.CLIENT_ORIGIN || "")
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
	if (!isProduction && configured.length === 0) {
		configured.push("http://localhost:5173");
	}
	return configured;
}

function corsOrigin(origin, callback) {
	if (!origin || allowedOrigins().includes(origin)) {
		callback(null, true);
		return;
	}
	callback(null, false);
}

app.use((req, res, next) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("Referrer-Policy", "no-referrer");
	res.setHeader("X-Frame-Options", "DENY");
	next();
});

app.use(express.json());

app.get("/health", (_req, res) => {
	if (db.readyState === 1) {
		res.json({ status: "pass" });
		return;
	}
	res.status(503).json({ status: "fail" });
});

const server = new ApolloServer({
	typeDefs,
	resolvers,
	introspection: !isProduction,
	includeStacktraceInErrorResponses: !isProduction,
	plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

function waitForDatabase() {
	if (db.readyState === 1) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const onOpen = () => {
			cleanup();
			resolve();
		};
		const onError = (err) => {
			cleanup();
			reject(err);
		};
		const cleanup = () => {
			db.off("open", onOpen);
			db.off("error", onError);
		};
		db.once("open", onOpen);
		db.once("error", onError);
	});
}

async function start() {
	await server.start();
	app.use(
		"/graphql",
		cors({ origin: corsOrigin }),
		expressMiddleware(server, {
			context: async ({ req }) => authMiddleware({ req }),
		})
	);

	if (isProduction) {
		const distPath = path.join(__dirname, "../client/dist");
		app.use(express.static(distPath));
		app.use((req, res, next) => {
			if (req.path.startsWith("/graphql") || req.path === "/health") return next();
			if (req.method !== "GET" && req.method !== "HEAD") return next();
			res.sendFile(path.join(distPath, "index.html"), (err) => {
				if (err) res.status(404).end();
			});
		});
	}

	await waitForDatabase();
	await new Promise((resolve) => httpServer.listen(PORT, resolve));
	console.log(`API server running on port ${PORT}`);
	console.log(`GraphQL endpoint http://localhost:${PORT}/graphql`);
	if (isProduction) {
		console.log("Serving the built client from client/dist");
	}
}

start().catch((err) => {
	console.error("Server failed to start:", err.message);
	process.exit(1);
});
