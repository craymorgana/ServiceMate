import { gql } from "@apollo/client";

export const LOGIN_USER = gql`
	mutation Login($email: String!, $password: String!) {
		login(email: $email, password: $password) {
			token
			user {
				_id
				username
			}
		}
	}
`;

export const ADD_USER = gql`
	mutation addUser($username: String!, $email: String!, $password: String!) {
		addUser(username: $username, email: $email, password: $password) {
			token
			user {
				_id
				username
			}
		}
	}
`;

export const ADD_VEHICLE = gql`
	mutation addVehicle($vehicleTitle: String!) {
		addVehicle(vehicleTitle: $vehicleTitle) {
			_id
			vehicleTitle
			userId
		}
	}
`;

export const REMOVE_VEHICLE = gql`
	mutation removeVehicle($vehicleId: ID!) {
		removeVehicle(vehicleId: $vehicleId) {
			_id
			vehicleTitle
		}
	}
`;

export const UPDATE_VEHICLE_MILEAGE = gql`
	mutation updateVehicleMileage($vehicleId: ID!, $mileage: Int!) {
		updateVehicleMileage(vehicleId: $vehicleId, mileage: $mileage) {
			_id
			vehicleTitle
			mileage
		}
	}
`;

export const ADD_SERVICE = gql`
	mutation addService(
		$vehicleId: ID!
		$serviceType: String!
		$serviceDescription: String!
		$mileage: Int!
		$columnId: String!
	) {
		addService(
			vehicleId: $vehicleId
			serviceType: $serviceType
			serviceDescription: $serviceDescription
			mileage: $mileage
			columnId: $columnId
		) {
			_id
			serviceType
			serviceDescription
			mileage
			columnId
			vehicleId
		}
	}
`;
