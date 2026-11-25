const { GraphQLError } = require("graphql");

function unauthenticated(message = "You need to be logged in") {
	return new GraphQLError(message, {
		extensions: { code: "UNAUTHENTICATED" },
	});
}

function forbidden(message = "You cannot access this resource") {
	return new GraphQLError(message, {
		extensions: { code: "FORBIDDEN" },
	});
}

function badInput(message) {
	return new GraphQLError(message, {
		extensions: { code: "BAD_USER_INPUT" },
	});
}

function tooManyRequests(message = "Too many attempts. Try again later.") {
	return new GraphQLError(message, {
		extensions: { code: "TOO_MANY_REQUESTS" },
	});
}

module.exports = { unauthenticated, forbidden, badInput, tooManyRequests };
