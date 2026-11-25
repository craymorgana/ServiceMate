const { tooManyRequests } = require("./errors");

const buckets = new Map();

function clientIp(req) {
	if (!req) return "unknown";
	return req.ip || req.socket?.remoteAddress || "unknown";
}

function rateLimit(key, { limit = 10, windowMs = 15 * 60 * 1000 } = {}) {
	if (process.env.NODE_ENV === "test") return;

	const now = Date.now();
	const recent = (buckets.get(key) || []).filter((stamp) => now - stamp < windowMs);
	if (recent.length >= limit) {
		throw tooManyRequests();
	}
	recent.push(now);
	buckets.set(key, recent);
}

module.exports = { clientIp, rateLimit };
