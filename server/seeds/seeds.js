const db = require("../config/connection");
const { User, Service, Vehicle } = require("../models");

const seedUsers = [
	{
		username: "aaron",
		email: "aaron@example.com",
		password: "password123",
	},
	{
		username: "taylor",
		email: "taylor@example.com",
		password: "password123",
	},
];

const seedVehicles = [
	{
		username: "aaron",
		vehicleTitle: "2018 Honda Civic",
	},
	{
		username: "aaron",
		vehicleTitle: "2020 Subaru Outback",
	},
	{
		username: "taylor",
		vehicleTitle: "2016 Ford F-150",
	},
];

const seedServices = [
	{
		username: "aaron",
		vehicleTitle: "2018 Honda Civic",
		serviceType: "Oil change",
		serviceDescription: "Synthetic 0W-20 and filter",
		mileage: 45210,
		columnId: "completed",
	},
	{
		username: "aaron",
		vehicleTitle: "2018 Honda Civic",
		serviceType: "Tire rotation",
		serviceDescription: "Rotated front to rear",
		mileage: 45210,
		columnId: "completed",
	},
	{
		username: "aaron",
		vehicleTitle: "2020 Subaru Outback",
		serviceType: "Brake pads",
		serviceDescription: "Front pads replaced",
		mileage: 31500,
		columnId: "completed",
	},
	{
		username: "taylor",
		vehicleTitle: "2016 Ford F-150",
		serviceType: "Battery",
		serviceDescription: "Replaced with AGM battery",
		mileage: 81200,
		columnId: "completed",
	},
	{
		username: "taylor",
		vehicleTitle: "2016 Ford F-150",
		serviceType: "Transmission service",
		serviceDescription: "Fluid and filter",
		mileage: 82000,
		columnId: "planned",
	},
];

db.once("open", async () => {
	try {
		await User.deleteMany({});
		await Service.deleteMany({});
		await Vehicle.deleteMany({});

		const createdUsers = await User.create(seedUsers);
		const userIdMap = createdUsers.reduce((map, user) => {
			map[user.username] = user._id;
			return map;
		}, {});

		const createdVehicles = await Vehicle.create(
			seedVehicles.map((vehicle) => ({
				vehicleTitle: vehicle.vehicleTitle,
				userId: userIdMap[vehicle.username],
			}))
		);

		const vehicleIdMap = createdVehicles.reduce((map, vehicle) => {
			map[`${vehicle.userId}:${vehicle.vehicleTitle}`] = vehicle._id;
			return map;
		}, {});

		const createdServices = await Service.create(
			seedServices.map((service) => ({
				serviceType: service.serviceType,
				serviceDescription: service.serviceDescription,
				mileage: service.mileage,
				columnId: service.columnId,
				vehicleId: vehicleIdMap[
					`${userIdMap[service.username]}:${service.vehicleTitle}`
				],
			}))
		);

		const servicesByVehicle = createdServices.reduce((map, service) => {
			const key = String(service.vehicleId);
			if (!map[key]) {
				map[key] = [];
			}
			map[key].push(service._id);
			return map;
		}, {});

		await Promise.all(
			Object.entries(servicesByVehicle).map(([vehicleId, serviceIds]) =>
				Vehicle.findByIdAndUpdate(
					{ _id: vehicleId },
					{ $set: { service: serviceIds } }
				)
			)
		);

		await Promise.all(
			Object.entries(userIdMap).map(([username, userId]) =>
				User.findByIdAndUpdate(
					{ _id: userId },
					{
						$set: {
							vehicles: createdVehicles
								.filter((vehicle) => String(vehicle.userId) === String(userId))
								.map((vehicle) => vehicle._id),
						},
					}
				)
			)
		);

		console.log("Seeding complete!");
		process.exit(0);
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
});
