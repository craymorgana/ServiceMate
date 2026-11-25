const crypto = require("crypto");
const mongoose = require("mongoose");
const { Vehicle, Service } = require("../models");

const CATEGORIES = new Set([
	"parts",
	"service",
	"tires",
	"fluids",
	"insurance",
	"registration",
	"other",
]);

const UNASSIGNED_TITLE = "Unassigned";

function clean(value) {
	if (value == null) return "";
	return String(value).trim();
}

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeVin(value) {
	const vin = clean(value).toUpperCase().replace(/\s+/g, "");
	return vin || null;
}

function normalizeYear(value) {
	if (value == null || value === "") return null;
	const year = Number(value);
	if (!Number.isInteger(year) || year < 1886 || year > 2100) return null;
	return year;
}

function normalizeCategory(value) {
	const category = clean(value).toLowerCase();
	return CATEGORIES.has(category) ? category : "other";
}

function dateKey(value) {
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
	const parsed = parseDate(value);
	return parsed ? parsed.toISOString().slice(0, 10) : null;
}

function parseDate(value) {
	if (value == null || value === "") return null;
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return new Date(`${value}T00:00:00.000Z`);
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
}

function numberOrNull(value) {
	if (value == null || value === "") return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function vehicleIdentity(input) {
	if (input.vin) return `vin:${input.vin}`;
	if (input.year && input.make && input.model) {
		return `ymm:${input.year}|${input.make.toLowerCase()}|${input.model.toLowerCase()}`;
	}
	return "unassigned";
}

function dedupeKey(record, identity) {
	const emailId = clean(record.emailId);
	if (emailId) return `email:${emailId}`;
	const orderNumber = clean(record.orderNumber);
	const day = dateKey(record.date);
	if (orderNumber && day) return `order:${identity}:${orderNumber}:${day}`;
	const fingerprint = JSON.stringify({
		identity,
		date: day,
		vendor: clean(record.vendor),
		description: clean(record.description),
		total: numberOrNull(record.total),
		mileage: numberOrNull(record.mileage),
	});
	return `fp:${crypto.createHash("sha256").update(fingerprint).digest("hex")}`;
}

function dedupeReason(key) {
	if (key.startsWith("email:")) return "emailId";
	if (key.startsWith("order:")) return "orderNumber+date";
	return "fingerprint";
}

function brief(record) {
	return {
		vehicleId: record.vehicleId ?? null,
		date: dateKey(record.date),
		vendor: clean(record.vendor) || null,
		description: clean(record.description) || null,
		emailId: clean(record.emailId) || null,
		orderNumber: clean(record.orderNumber) || null,
	};
}

function titleFrom(input) {
	const parts = [input.year, input.make, input.model, input.trim]
		.map((part) => (part == null ? "" : String(part).trim()))
		.filter(Boolean);
	return parts.join(" ") || clean(input.nickname) || "Vehicle";
}

function normalizeVehicle(input) {
	if (!input || input.id == null || input.id === "") return null;
	const vin = normalizeVin(input.vin);
	const year = normalizeYear(input.year);
	const make = clean(input.make);
	const model = clean(input.model);
	if (!vin && !(year && make && model)) return null;
	return {
		localId: String(input.id),
		year,
		make: make || null,
		model: model || null,
		trim: clean(input.trim) || null,
		vin,
		nickname: clean(input.nickname) || null,
		source: clean(input.source) || null,
		plate: clean(input.plate) || null,
		status: clean(input.status) === "sold" ? "sold" : "active",
		vehicleTitle: titleFrom({
			year,
			make,
			model,
			trim: clean(input.trim),
			nickname: clean(input.nickname),
		}),
	};
}

function normalizeItems(items) {
	if (!Array.isArray(items)) return [];
	return items.slice(0, 200).map((item) => ({
		name: clean(item?.name),
		partNumber: clean(item?.partNumber),
		qty: numberOrNull(item?.qty),
		unitPrice: numberOrNull(item?.unitPrice),
	}));
}

function serviceFields(record, vehicleId, identity) {
	const description = clean(record.description);
	const vendor = clean(record.vendor);
	const category = normalizeCategory(record.category);
	const title = (description || vendor || category || "Receipt").slice(0, 120);
	const details = (description || vendor || "Imported receipt").slice(0, 8000);
	const mileage = numberOrNull(record.mileage);
	const total = numberOrNull(record.total);
	const emailId = clean(record.emailId) || null;
	return {
		vehicleId,
		serviceType: title,
		serviceDescription: details,
		description: description || null,
		columnId: "DONE",
		mileage: mileage != null && mileage >= 0 ? mileage : undefined,
		date: parseDate(record.date),
		vendor: vendor || null,
		category,
		items: normalizeItems(record.items),
		total: total != null ? total : undefined,
		currency: clean(record.currency) || "USD",
		orderNumber: clean(record.orderNumber) || null,
		source: emailId ? "email" : "import",
		emailId,
		emailSubject: clean(record.emailSubject) || null,
		emailReceivedAt: parseDate(record.emailReceivedAt),
		dedupeKey: dedupeKey(record, identity),
	};
}

async function findExistingVehicle(userId, prepared) {
	if (prepared.vin) {
		const byVin = await Vehicle.findOne({ userId, vin: prepared.vin });
		if (byVin) return { vehicle: byVin, matchedBy: "vin" };
	}
	if (prepared.year && prepared.make && prepared.model) {
		const byYmm = await Vehicle.findOne({
			userId,
			year: prepared.year,
			make: new RegExp(`^${escapeRegex(prepared.make)}$`, "i"),
			model: new RegExp(`^${escapeRegex(prepared.model)}$`, "i"),
		});
		if (byYmm) return { vehicle: byYmm, matchedBy: "year+make+model" };
	}
	return null;
}

function vehicleDocument(prepared, userId) {
	const doc = {
		userId,
		mileage: 0,
		status: prepared.status || "active",
		vehicleTitle: prepared.vehicleTitle,
	};
	for (const field of ["year", "make", "model", "trim", "vin", "nickname", "source", "plate"]) {
		if (prepared[field] != null && prepared[field] !== "") doc[field] = prepared[field];
	}
	return doc;
}

function changesFor(existing, prepared) {
	const changes = {};
	for (const field of ["year", "make", "model", "trim", "vin", "nickname", "source", "plate"]) {
		if (prepared[field] != null && prepared[field] !== existing[field]) {
			changes[field] = prepared[field];
		}
	}
	if (prepared.status && prepared.status !== existing.status) changes.status = prepared.status;
	return changes;
}

async function findUnassigned(userId) {
	return Vehicle.findOne({
		userId,
		vehicleTitle: UNASSIGNED_TITLE,
		nickname: UNASSIGNED_TITLE,
		vin: null,
		year: null,
	});
}

async function duplicateReason(record, identity, vehicleId) {
	const key = dedupeKey(record, identity);
	if (clean(record.emailId)) {
		const byEmail = await Service.findOne({ emailId: clean(record.emailId) });
		if (byEmail) return "emailId";
	}
	const orderNumber = clean(record.orderNumber);
	const day = dateKey(record.date);
	if (orderNumber && day && mongoose.isValidObjectId(vehicleId)) {
		const start = parseDate(day);
		const end = new Date(start.getTime());
		end.setUTCDate(end.getUTCDate() + 1);
		const byOrder = await Service.findOne({
			vehicleId,
			orderNumber,
			date: { $gte: start, $lt: end },
		});
		if (byOrder) return "orderNumber+date";
	}
	const byKey = await Service.findOne({ dedupeKey: key });
	if (byKey) return dedupeReason(key);
	return null;
}

async function importReceipts({ userId, payload, dryRun = false, includeUnassigned = false }) {
	const vehicles = Array.isArray(payload?.vehicles) ? payload.vehicles : [];
	const records = Array.isArray(payload?.records) ? payload.records : [];
	const localToId = new Map();
	const localIdentity = new Map();
	const summary = {
		dryRun,
		vehiclesCreated: [],
		vehiclesUpdated: [],
		servicesInserted: [],
		servicesSkipped: [],
		unassigned: [],
		unknownVehicle: [],
		skippedVehicles: [],
	};
	const seen = new Set();

	for (const input of vehicles) {
		const prepared = normalizeVehicle(input);
		if (!prepared) {
			summary.skippedVehicles.push({
				id: input?.id ?? null,
				reason: "Need a VIN or year, make, and model",
			});
			continue;
		}
		const match = await findExistingVehicle(userId, prepared);
		if (match) {
			const changes = changesFor(match.vehicle, prepared);
			summary.vehiclesUpdated.push({
				id: prepared.localId,
				vehicleId: String(match.vehicle._id),
				matchedBy: match.matchedBy,
				changes: Object.keys(changes),
			});
			if (!dryRun && Object.keys(changes).length) {
				await Vehicle.updateOne({ _id: match.vehicle._id }, { $set: changes });
			}
			localToId.set(prepared.localId, match.vehicle._id);
		} else {
			summary.vehiclesCreated.push({
				id: prepared.localId,
				title: prepared.vehicleTitle,
				vin: prepared.vin,
				matchedBy: prepared.vin ? "vin" : "year+make+model",
			});
			if (dryRun) {
				localToId.set(prepared.localId, null);
			} else {
				const created = await Vehicle.create(vehicleDocument(prepared, userId));
				localToId.set(prepared.localId, created._id);
			}
		}
		localIdentity.set(prepared.localId, vehicleIdentity(prepared));
	}

	let unassignedId;
	async function unassignedVehicleId() {
		if (unassignedId !== undefined) return unassignedId;
		const existing = await findUnassigned(userId);
		if (existing) {
			unassignedId = existing._id;
			return unassignedId;
		}
		summary.vehiclesCreated.push({
			id: null,
			title: UNASSIGNED_TITLE,
			vin: null,
			matchedBy: "unassigned",
		});
		if (dryRun) {
			unassignedId = null;
			return unassignedId;
		}
		const created = await Vehicle.create({
			userId,
			vehicleTitle: UNASSIGNED_TITLE,
			nickname: UNASSIGNED_TITLE,
			status: "active",
			mileage: 0,
		});
		unassignedId = created._id;
		return unassignedId;
	}

	for (const record of records) {
		const localId = record?.vehicleId;
		const missingVehicle = localId == null || localId === "";
		let vehicleId = null;
		let identity = "unassigned";
		if (missingVehicle) {
			summary.unassigned.push(brief(record || {}));
			if (!includeUnassigned) continue;
			vehicleId = await unassignedVehicleId();
		} else if (!localIdentity.has(String(localId))) {
			summary.unknownVehicle.push({ ...brief(record || {}), vehicleId: localId });
			continue;
		} else {
			vehicleId = localToId.get(String(localId));
			identity = localIdentity.get(String(localId));
		}

		const key = dedupeKey(record, identity);
		if (seen.has(key)) {
			summary.servicesSkipped.push({ ...brief(record), reason: dedupeReason(key) });
			continue;
		}
		const existingReason = await duplicateReason(record, identity, vehicleId);
		if (existingReason) {
			seen.add(key);
			summary.servicesSkipped.push({ ...brief(record), reason: existingReason });
			continue;
		}
		seen.add(key);
		summary.servicesInserted.push(brief(record));
		if (dryRun || !vehicleId) continue;

		const fields = serviceFields(record, vehicleId, identity);
		try {
			await Service.create(fields);
		} catch (err) {
			if (err.code === 11000) {
				summary.servicesInserted.pop();
				summary.servicesSkipped.push({ ...brief(record), reason: dedupeReason(key) });
				continue;
			}
			throw err;
		}
		const mileage = numberOrNull(record.mileage);
		if (mileage != null && mileage >= 0) {
			await Vehicle.updateOne(
				{ _id: vehicleId, mileage: { $lt: mileage } },
				{ $set: { mileage } }
			);
		}
	}

	return summary;
}

module.exports = {
	importReceipts,
	normalizeVehicle,
	dedupeKey,
	UNASSIGNED_TITLE,
};
