const { gql } = require("graphql-tag");

const typeDefs = gql`
	enum ServiceColumn {
		TODO
		IN_PROGRESS
		DONE
	}

	enum VehicleStatus {
		active
		sold
	}

	enum ServiceCategory {
		parts
		service
		tires
		fluids
		insurance
		registration
		other
	}

	type ServiceItem {
		name: String
		partNumber: String
		qty: Float
		unitPrice: Float
	}

	type User {
		_id: ID
		username: String
		email: String
		vehicles: [Vehicle!]!
	}

	type Vehicle {
		_id: ID
		vehicleTitle: String
		userId: ID
		mileage: Int
		year: Int
		make: String
		model: String
		trim: String
		vin: String
		plate: String
		nickname: String
		status: VehicleStatus
		source: String
		costTotal: Float
		services: [Service!]!
		createdAt: String
		updatedAt: String
	}

	type Service {
		_id: ID!
		serviceType: String!
		serviceDescription: String!
		description: String
		mileage: Int
		columnId: ServiceColumn!
		vehicleId: ID!
		date: String
		vendor: String
		category: ServiceCategory
		items: [ServiceItem!]!
		total: Float
		currency: String
		orderNumber: String
		source: String
		emailId: String
		createdAt: String
		updatedAt: String
	}

	type PageInfo {
		endCursor: ID
		hasNextPage: Boolean!
	}

	type VehiclePage {
		items: [Vehicle!]!
		pageInfo: PageInfo!
	}

	type ServicePage {
		items: [Service!]!
		pageInfo: PageInfo!
	}

	type Auth {
		token: String!
		user: User
	}

	type Query {
		user(username: String!): User
		vehicles(first: Int, after: ID): VehiclePage!
		vehicle(vehicleId: ID!): Vehicle
		service(vehicleId: ID!, first: Int, after: ID): ServicePage!
		me: User
	}

	type Mutation {
		addVehicle(vehicleTitle: String!): Vehicle
		removeVehicle(vehicleId: ID!): Vehicle
		updateVehicleMileage(vehicleId: ID!, mileage: Int!): Vehicle
		addService(
			vehicleId: ID!
			serviceType: String!
			serviceDescription: String!
			mileage: Int!
			columnId: ServiceColumn!
		): Service
		updateService(serviceId: ID!, columnId: ServiceColumn!): Service
		removeService(serviceId: ID!): Service
		addUser(username: String!, email: String!, password: String!): Auth
		login(email: String!, password: String!): Auth
	}
`;

module.exports = typeDefs;
