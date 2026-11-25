const { User, Vehicle, Service } = require("../models");
const { signToken } = require("../utils/auth");
const { badInput, forbidden, unauthenticated } = require("../utils/errors");
const { clientIp, rateLimit } = require("../utils/rateLimit");
const { normalizeColumn } = require("../utils/columns");

const MAX_PAGE = 100;
const LOGIN_ERROR = "Incorrect email or password";

function validationMessage(err) {
	return Object.values(err.errors || {})
		.map((item) => item.message)
		.join(" ");
}

function requireUser(context) {
	if (!context.user) throw unauthenticated();
	return context.user;
}

function pageArgs(first, after) {
	const size = Math.min(Math.max(Number.isInteger(first) ? first : 50, 1), MAX_PAGE);
	return { size, after: after || null };
}

function pageInfo(docs, size) {
	const hasNextPage = docs.length > size;
	const items = hasNextPage ? docs.slice(0, size) : docs;
	return {
		items,
		pageInfo: {
			hasNextPage,
			endCursor: items.length ? String(items[items.length - 1]._id) : null,
		},
	};
}

async function loadOwnVehicle(vehicleId, userId) {
	if (!vehicleId) throw badInput("Vehicle id is required");
	let vehicle;
	try {
		vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
	} catch (err) {
		if (err.name === "CastError") throw badInput("Vehicle id is invalid");
		throw err;
	}
	if (!vehicle) throw badInput("Vehicle not found");
	return vehicle;
}

async function loadOwnService(serviceId, userId) {
	if (!serviceId) throw badInput("Service id is required");
	let service;
	try {
		service = await Service.findById(serviceId);
	} catch (err) {
		if (err.name === "CastError") throw badInput("Service id is invalid");
		throw err;
	}
	if (!service) throw badInput("Service not found");
	await loadOwnVehicle(service.vehicleId, userId);
	return service;
}

function iso(value) {
	if (!value) return null;
	return value instanceof Date ? value.toISOString() : null;
}

const resolvers = {
	User: {
		vehicles: (user) => Vehicle.find({ userId: user._id }).sort({ _id: 1 }).limit(MAX_PAGE).exec(),
	},
	Vehicle: {
		services: (vehicle) => {
			if (Array.isArray(vehicle.services)) return vehicle.services;
			return Service.find({ vehicleId: vehicle._id }).sort({ _id: 1 }).limit(MAX_PAGE).exec();
		},
		createdAt: (vehicle) => iso(vehicle.createdAt),
		updatedAt: (vehicle) => iso(vehicle.updatedAt),
	},
	Service: {
		columnId: (service) => {
			const column = normalizeColumn(service.columnId);
			if (!column) throw badInput("Service column is invalid");
			return column;
		},
		createdAt: (service) => iso(service.createdAt),
		updatedAt: (service) => iso(service.updatedAt),
	},
	Query: {
		user: async (_parent, { username }, context) => {
			const caller = requireUser(context);
			if (caller.username !== username) throw forbidden();
			return User.findOne({ username });
		},
		vehicles: async (_parent, { first, after }, context) => {
			const caller = requireUser(context);
			const { size, after: cursor } = pageArgs(first, after);
			const filter = { userId: caller._id };
			if (cursor) filter._id = { $gt: cursor };
			let docs;
			try {
				docs = await Vehicle.find(filter)
					.sort({ _id: 1 })
					.limit(size + 1);
			} catch (err) {
				if (err.name === "CastError") throw badInput("Cursor is invalid");
				throw err;
			}
			return pageInfo(docs, size);
		},
		vehicle: async (_parent, { vehicleId }, context) => {
			const caller = requireUser(context);
			return loadOwnVehicle(vehicleId, caller._id);
		},
		service: async (_parent, { vehicleId, first, after }, context) => {
			const caller = requireUser(context);
			await loadOwnVehicle(vehicleId, caller._id);
			const { size, after: cursor } = pageArgs(first, after);
			const filter = { vehicleId };
			if (cursor) filter._id = { $gt: cursor };
			let docs;
			try {
				docs = await Service.find(filter)
					.sort({ _id: 1 })
					.limit(size + 1);
			} catch (err) {
				if (err.name === "CastError") throw badInput("Cursor is invalid");
				throw err;
			}
			return pageInfo(docs, size);
		},
		me: async (_parent, _args, context) => {
			const caller = requireUser(context);
			return User.findById(caller._id);
		},
	},
	Mutation: {
		addVehicle: async (_parent, { vehicleTitle }, context) => {
			const caller = requireUser(context);
			const title = (vehicleTitle || "").trim();
			if (!title) throw badInput("Vehicle title is required");
			return Vehicle.create({ vehicleTitle: title, userId: caller._id });
		},
		removeVehicle: async (_parent, { vehicleId }, context) => {
			const caller = requireUser(context);
			const vehicle = await loadOwnVehicle(vehicleId, caller._id);
			await Service.deleteMany({ vehicleId: vehicle._id });
			await User.updateOne({ _id: caller._id }, { $pull: { vehicles: vehicle._id } });
			await Vehicle.deleteOne({ _id: vehicle._id });
			return vehicle;
		},
		updateVehicleMileage: async (_parent, { vehicleId, mileage }, context) => {
			const caller = requireUser(context);
			if (!Number.isInteger(mileage) || mileage < 0) {
				throw badInput("Mileage must be a non-negative integer");
			}
			const vehicle = await Vehicle.findOneAndUpdate(
				{ _id: vehicleId, userId: caller._id },
				{ $set: { mileage } },
				{ new: true }
			);
			if (!vehicle) throw badInput("Vehicle not found");
			return vehicle;
		},
		addService: async (
			_parent,
			{ vehicleId, serviceType, serviceDescription, mileage, columnId },
			context
		) => {
			const caller = requireUser(context);
			const vehicle = await loadOwnVehicle(vehicleId, caller._id);
			if (!Number.isInteger(mileage) || mileage < 0) {
				throw badInput("Mileage must be a non-negative integer");
			}
			const column = normalizeColumn(columnId);
			if (!column) throw badInput("Service column is invalid");
			try {
				return await Service.create({
					vehicleId: vehicle._id,
					serviceType,
					serviceDescription,
					mileage,
					columnId: column,
				});
			} catch (err) {
				if (err.name === "ValidationError") {
					throw badInput(validationMessage(err) || "Service details are invalid");
				}
				throw err;
			}
		},
		updateService: async (_parent, { serviceId, columnId }, context) => {
			const caller = requireUser(context);
			const service = await loadOwnService(serviceId, caller._id);
			const column = normalizeColumn(columnId);
			if (!column) throw badInput("Service column is invalid");
			service.columnId = column;
			await service.save();
			return service;
		},
		removeService: async (_parent, { serviceId }, context) => {
			const caller = requireUser(context);
			const service = await loadOwnService(serviceId, caller._id);
			await Service.deleteOne({ _id: service._id });
			await Vehicle.updateOne({ _id: service.vehicleId }, { $pull: { service: service._id } });
			return service;
		},
		login: async (_parent, { email, password }, context) => {
			rateLimit(`login:${clientIp(context.req)}`);
			const user = await User.findOne({ email: String(email || "").trim().toLowerCase() });
			const correctPw = user ? await user.isCorrectPassword(password) : false;
			if (!user || !correctPw) throw unauthenticated(LOGIN_ERROR);
			return { token: signToken(user), user };
		},
		addUser: async (_parent, { username, email, password }, context) => {
			rateLimit(`addUser:${clientIp(context.req)}`);
			try {
				const user = await User.create({
					username: String(username || "").trim(),
					email: String(email || "").trim().toLowerCase(),
					password,
				});
				return { token: signToken(user), user };
			} catch (err) {
				if (err.code === 11000) {
					throw badInput("An account with that email or username already exists");
				}
				if (err.name === "ValidationError") {
					throw badInput(validationMessage(err) || "Account details are invalid");
				}
				throw err;
			}
		},
	},
};

module.exports = resolvers;
