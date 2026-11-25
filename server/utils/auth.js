const jwt = require("jsonwebtoken");

const expiration = "2h";

function signingSecret() {
	const secret = process.env.SECRET || "";
	if (secret.length < 32) {
		throw new Error("SECRET must be set to a random string of at least 32 characters.");
	}
	return secret;
}

function readBearer(req) {
	const header = req.headers?.authorization || "";
	if (!header.startsWith("Bearer ")) return "";
	return header.slice("Bearer ".length).trim();
}

function authMiddleware({ req }) {
	const token = readBearer(req);
	let user = null;

	if (token) {
		try {
			const { data } = jwt.verify(token, signingSecret(), {
				algorithms: ["HS256"],
				maxAge: expiration,
			});
			user = data;
		} catch {
			user = null;
		}
	}

	return { user, req };
}

function signToken({ email, username, _id }) {
	const payload = { email, username, _id };
	return jwt.sign({ data: payload }, signingSecret(), {
		algorithm: "HS256",
		expiresIn: expiration,
	});
}

module.exports = { authMiddleware, signToken, readBearer };
