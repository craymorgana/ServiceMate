import { createRequire } from "module";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ApolloServer } from "@apollo/server";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

const require = createRequire(import.meta.url);
const { typeDefs, resolvers } = require("../schemas");
const { User, Vehicle, Service } = require("../models");
const { signToken, authMiddleware } = require("../utils/auth");

let mongod;
let server;

const VEHICLE = `
	query Vehicle($vehicleId: ID!) {
		vehicle(vehicleId: $vehicleId) {
			vehicleTitle
			services { serviceType columnId }
		}
	}
`;

const SERVICES = `
	query Services($vehicleId: ID!) {
		service(vehicleId: $vehicleId) {
			items { serviceType }
		}
	}
`;

const USER = `
	query User($username: String!) {
		user(username: $username) { username email }
	}
`;

const ADD_SERVICE = `
	mutation Add($vehicleId: ID!) {
		addService(
			vehicleId: $vehicleId
			serviceType: "Oil"
			serviceDescription: "Filter"
			mileage: 10
			columnId: TODO
		) { serviceType }
	}
`;

const LOGIN = `
	mutation Login($email: String!, $password: String!) {
		login(email: $email, password: $password) { token }
	}
`;

function single(result) {
	expect(result.body.kind).toBe("single");
	return result.body.singleResult;
}

async function execute(query, variables, user) {
	return server.executeOperation(
		{ query, variables },
		{ contextValue: { user: user || null, req: { ip: "127.0.0.1", headers: {} } } }
	);
}

beforeAll(async () => {
	mongod = await MongoMemoryServer.create();
	await mongoose.connect(mongod.getUri());
	server = new ApolloServer({ typeDefs, resolvers });
	await server.start();
});

afterAll(async () => {
	await mongoose.disconnect();
	if (mongod) await mongod.stop();
});

beforeEach(async () => {
	await Promise.all([User.deleteMany({}), Vehicle.deleteMany({}), Service.deleteMany({})]);
});

describe("ownership", () => {
	it("rejects vehicle, service, and user reads without a session", async () => {
		const owner = await User.create({
			username: "ada",
			email: "ada@example.com",
			password: "longpassword",
		});
		const vehicle = await Vehicle.create({ vehicleTitle: "Ada Car", userId: owner._id });

		for (const query of [
			execute(VEHICLE, { vehicleId: String(vehicle._id) }),
			execute(SERVICES, { vehicleId: String(vehicle._id) }),
			execute(USER, { username: "ada" }),
		]) {
			const body = single(await query);
			expect(body.errors?.[0].extensions.code).toBe("UNAUTHENTICATED");
		}
	});

	it("hides another user's vehicle and blocks writing a service onto it", async () => {
		const owner = await User.create({
			username: "ada",
			email: "ada@example.com",
			password: "longpassword",
		});
		const other = await User.create({
			username: "grace",
			email: "grace@example.com",
			password: "longpassword",
		});
		const vehicle = await Vehicle.create({ vehicleTitle: "Ada Car", userId: owner._id });
		const grace = { _id: String(other._id), username: other.username, email: other.email };

		const read = single(await execute(VEHICLE, { vehicleId: String(vehicle._id) }, grace));
		expect(read.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");

		const write = single(await execute(ADD_SERVICE, { vehicleId: String(vehicle._id) }, grace));
		expect(write.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
		expect(await Service.countDocuments()).toBe(0);
	});

	it("returns the caller's own user and vehicle", async () => {
		const owner = await User.create({
			username: "ada",
			email: "Ada@Example.com",
			password: "longpassword",
		});
		const vehicle = await Vehicle.create({ vehicleTitle: "Ada Car", userId: owner._id, mileage: 12 });
		await Service.create({
			serviceType: "Oil",
			serviceDescription: "Filter",
			mileage: 12,
			columnId: "TODO",
			vehicleId: vehicle._id,
		});
		const ada = { _id: String(owner._id), username: owner.username, email: owner.email };

		const userBody = single(await execute(USER, { username: "ada" }, ada));
		expect(userBody.errors).toBeUndefined();
		expect(userBody.data.user.email).toBe("ada@example.com");

		const other = single(
			await execute(USER, { username: "ada" }, { _id: "1", username: "grace", email: "g@example.com" })
		);
		expect(other.errors?.[0].extensions.code).toBe("FORBIDDEN");

		const vehicleBody = single(await execute(VEHICLE, { vehicleId: String(vehicle._id) }, ada));
		expect(vehicleBody.errors).toBeUndefined();
		expect(vehicleBody.data.vehicle.vehicleTitle).toBe("Ada Car");
		expect(vehicleBody.data.vehicle.services).toHaveLength(1);
	});
});

describe("signup", () => {
	it("rejects a short password without repeating it", async () => {
		const password = "shortpw";
		const body = single(
			await execute(
				`mutation Add($username: String!, $email: String!, $password: String!) {
					addUser(username: $username, email: $email, password: $password) { token }
				}`,
				{ username: "ada", email: "ada@example.com", password }
			)
		);
		expect(body.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
		expect(body.errors?.[0].message).not.toContain(password);
	});
});

describe("login", () => {
	it("uses the same error when the email is missing or the password is wrong", async () => {
		await User.create({
			username: "ada",
			email: "ada@example.com",
			password: "longpassword",
		});
		const missing = single(
			await execute(LOGIN, { email: "missing@example.com", password: "longpassword" })
		);
		const wrong = single(await execute(LOGIN, { email: "ada@example.com", password: "not-the-password" }));
		expect(missing.errors?.[0].message).toBe(wrong.errors?.[0].message);
		expect(missing.errors?.[0].extensions.code).toBe("UNAUTHENTICATED");
	});

	it("signs a token that the middleware accepts only from a Bearer header", async () => {
		const user = await User.create({
			username: "ada",
			email: "ada@example.com",
			password: "longpassword",
		});
		const token = signToken(user);
		const fromHeader = authMiddleware({
			req: { headers: { authorization: `Bearer ${token}` } },
		});
		expect(fromHeader.user.username).toBe("ada");

		const fromQuery = authMiddleware({
			req: { headers: {}, query: { token } },
		});
		expect(fromQuery.user).toBeNull();
	});
});
