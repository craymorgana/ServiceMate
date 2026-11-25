const fs = require("fs");
const path = require("path");
const { User } = require("../models");
const { importReceipts } = require("../utils/importReceipts");

function parseArgs(argv) {
	const args = {
		file: "",
		user: "",
		dryRun: false,
		includeUnassigned: false,
		help: false,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--dry-run") args.dryRun = true;
		else if (arg === "--include-unassigned") args.includeUnassigned = true;
		else if (arg === "--help" || arg === "-h") args.help = true;
		else if (arg === "--file") args.file = argv[(index += 1)] || "";
		else if (arg === "--user") args.user = argv[(index += 1)] || "";
		else if (arg.startsWith("--file=")) args.file = arg.slice("--file=".length);
		else if (arg.startsWith("--user=")) args.user = arg.slice("--user=".length);
		else throw new Error(`Unknown argument: ${arg}`);
	}
	return args;
}

function usage() {
	return [
		"Usage: npm run seed:receipts -- --file <path> --user <email or username> [--dry-run] [--include-unassigned]",
		"Reads a local JSON file and upserts vehicles and service records for an existing user.",
		"Records with a null vehicleId are skipped and listed unless --include-unassigned is set.",
	].join("\n");
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help || !args.file || !args.user) {
		console.log(usage());
		process.exit(args.help ? 0 : 1);
	}

	const filePath = path.resolve(args.file);
	const raw = fs.readFileSync(filePath, "utf8");
	const payload = JSON.parse(raw);
	const db = require("../config/connection");

	await new Promise((resolve, reject) => {
		if (db.readyState === 1) {
			resolve();
			return;
		}
		db.once("open", resolve);
		db.once("error", reject);
	});

	const userKey = args.user.trim();
	const user = await User.findOne({
		$or: [{ email: userKey.toLowerCase() }, { username: userKey }],
	});
	if (!user) {
		console.error("No user matched that email or username.");
		process.exit(1);
	}

	const summary = await importReceipts({
		userId: user._id,
		payload,
		dryRun: args.dryRun,
		includeUnassigned: args.includeUnassigned,
	});

	console.log(args.dryRun ? "Receipt import dry run" : "Receipt import complete");
	console.log(`User: ${user.email}`);
	console.log(
		`Vehicles: ${summary.vehiclesCreated.length} created, ${summary.vehiclesUpdated.length} matched`
	);
	console.log(
		`Services: ${summary.servicesInserted.length} ${args.dryRun ? "would insert" : "inserted"}, ${summary.servicesSkipped.length} already present`
	);
	console.log(`Unassigned records skipped or listed: ${summary.unassigned.length}`);
	if (summary.unknownVehicle.length) {
		console.log(`Records with an unknown vehicle id: ${summary.unknownVehicle.length}`);
	}
	console.log(JSON.stringify(summary, null, 2));
	process.exit(0);
}

main().catch((err) => {
	console.error(err.message || err);
	process.exit(1);
});
