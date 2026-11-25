import { createRequire } from "module";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

const require = createRequire(import.meta.url);
const { User, Vehicle, Service } = require("../models");
const { importReceipts } = require("../utils/importReceipts");

let mongod;
let user;

const vin = "TESTVIN0000000001";

function payload(records, vehicles = [sampleVehicle()]) {
	return { vehicles, records };
}

function sampleVehicle(overrides = {}) {
	return {
		id: "car-1",
		year: 2018,
		make: "Honda",
		model: "Civic",
		trim: "LX",
		vin,
		nickname: "Daily",
		source: "example",
		...overrides,
	};
}

function sampleRecord(overrides = {}) {
	return {
		vehicleId: "car-1",
		date: "2024-03-01",
		vendor: "Sample Auto",
		category: "service",
		description: "Oil change",
		items: [{ name: "Filter", partNumber: "OF-1", qty: 1, unitPrice: 9 }],
		total: 40,
		currency: "USD",
		mileage: 45000,
		orderNumber: "ORDER-1",
		emailSubject: "Receipt",
		emailReceivedAt: "2024-03-02T00:00:00.000Z",
		emailId: "email-1",
		...overrides,
	};
}

beforeAll(async () => {
	mongod = await MongoMemoryServer.create();
	await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
	await mongoose.disconnect();
	if (mongod) await mongod.stop();
});

beforeEach(async () => {
	await Promise.all([User.deleteMany({}), Vehicle.deleteMany({}), Service.deleteMany({})]);
	user = await User.create({
		username: "ada",
		email: "ada@example.com",
		password: "longpassword",
	});
});

describe("importReceipts", () => {
	it("imports once and skips the same email or order on a rerun", async () => {
		const records = [
			sampleRecord(),
			sampleRecord({
				emailId: null,
				orderNumber: "ORDER-2",
				date: "2024-04-01",
				description: "Brake pads",
				total: 80,
			}),
		];
		const first = await importReceipts({ userId: user._id, payload: payload(records) });
		expect(first.servicesInserted).toHaveLength(2);
		expect(await Service.countDocuments()).toBe(2);

		const second = await importReceipts({ userId: user._id, payload: payload(records) });
		expect(second.servicesInserted).toHaveLength(0);
		expect(second.servicesSkipped.map((row) => row.reason).sort()).toEqual([
			"emailId",
			"orderNumber+date",
		]);
		expect(await Service.countDocuments()).toBe(2);
		expect(await Vehicle.countDocuments({ userId: user._id })).toBe(1);
	});

	it("matches an existing vehicle by VIN instead of creating another", async () => {
		const existing = await Vehicle.create({
			userId: user._id,
			vehicleTitle: "Already here",
			vin,
			mileage: 10,
		});
		const result = await importReceipts({
			userId: user._id,
			payload: payload([sampleRecord()]),
		});
		expect(result.vehiclesCreated).toHaveLength(0);
		expect(result.vehiclesUpdated[0].matchedBy).toBe("vin");
		expect(await Vehicle.countDocuments({ userId: user._id })).toBe(1);
		const service = await Service.findOne({ emailId: "email-1" });
		expect(String(service.vehicleId)).toBe(String(existing._id));
		const vehicle = await Vehicle.findById(existing._id);
		expect(vehicle.vehicleTitle).toBe("Already here");
		expect(vehicle.make).toBe("Honda");
		expect(vehicle.mileage).toBe(45000);
	});

	it("skips null vehicle ids unless an unassigned bucket is requested", async () => {
		const record = sampleRecord({ vehicleId: null, emailId: "loose-email", orderNumber: "ORDER-9" });
		const skipped = await importReceipts({
			userId: user._id,
			payload: payload([record], []),
		});
		expect(skipped.unassigned).toHaveLength(1);
		expect(skipped.servicesInserted).toHaveLength(0);
		expect(await Service.countDocuments()).toBe(0);
		expect(await Vehicle.countDocuments()).toBe(0);

		const included = await importReceipts({
			userId: user._id,
			payload: payload([record], []),
			includeUnassigned: true,
		});
		expect(included.servicesInserted).toHaveLength(1);
		const bucket = await Vehicle.findOne({ userId: user._id, vehicleTitle: "Unassigned" });
		expect(bucket).toBeTruthy();
		const service = await Service.findOne({ emailId: "loose-email" });
		expect(String(service.vehicleId)).toBe(String(bucket._id));

		const again = await importReceipts({
			userId: user._id,
			payload: payload([record], []),
			includeUnassigned: true,
		});
		expect(again.servicesSkipped).toHaveLength(1);
		expect(await Service.countDocuments()).toBe(1);
		expect(await Vehicle.countDocuments({ vehicleTitle: "Unassigned" })).toBe(1);
	});

	it("does not write during a dry run", async () => {
		const result = await importReceipts({
			userId: user._id,
			payload: payload([sampleRecord()]),
			dryRun: true,
		});
		expect(result.dryRun).toBe(true);
		expect(result.vehiclesCreated).toHaveLength(1);
		expect(result.servicesInserted).toHaveLength(1);
		expect(await Vehicle.countDocuments()).toBe(0);
		expect(await Service.countDocuments()).toBe(0);
	});
});
