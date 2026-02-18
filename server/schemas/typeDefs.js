const { gql } = require("apollo-server-express");

const typeDefs = gql`
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
		user: User
		service: [Service]
		title: String
	}

	type Service {
		_id: ID!
		serviceType: String!
		serviceDescription: String!
		mileage: Int!
		columnId: String!
		vehicleId: ID!
	}

	type Auth {
		token: ID!
		user: User
	}

	type Query {
		user(username: String!): User
		vehicles: [Vehicle!]!
		vehicle(vehicleId: ID!): Vehicle
		service(vehicleId: ID!): [Service]
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
			columnId: String!
		): Service
		addUser(username: String!, email: String!, password: String!): Auth
		login(email: String!, password: String!): Auth
	}
`;

module.exports = typeDefs;
