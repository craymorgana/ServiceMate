const { gql } = require("apollo-server-express");

const typeDefs = gql`
	type User {
		_id: ID
		username: String
		email: String
		password: String
		vehicle: [Vehicle!]!
	}

	type Vehicle {
		_id: ID
		vehicleTitle: String
		userId: ID
		user: User
		service: [Service]
		title: String
	}

	type Service {
		_id: ID!
		service: String!
		serviceDescription: String
		columnId: String!
		vehicleId: ID
	}

	type Auth {
		token: ID!
		user: User
	}

	type Query {
		user(username: String!): User
		vehicles(vehicleId: ID!): [Vehicle!]!
		vehicle(vehicleId: ID!): Vehicle
		service(vehicleId: ID!): [Service]
		me: User
	}

	type Mutation {
		addVehicle(vehicleTitle: String!): Vehicle
		addService(
			service: String!
			projectId: ID!
			serviceDescription: String!
			columnId: String!
		): Service
		addUser(username: String!, email: String!, password: String!): Auth
		login(email: String!, password: String!): Auth
	}
`;

module.exports = typeDefs;
