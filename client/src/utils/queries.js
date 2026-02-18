import { gql } from "@apollo/client";

export const QUERY_USER = gql`
	query user($username: String!) {
		user(username: $username) {
			_id
			username
			email
			vehicles {
				_id
				vehicleTitle
			}
		}
	}
`;

export const QUERY_VEHICLE = gql`
	query vehicle($vehicleId: ID!) {
		vehicle(vehicleId: $vehicleId) {
			_id
			vehicleTitle
			userId
			mileage
		}
	}
`;

export const QUERY_SERVICE = gql`
	query service($vehicleId: ID!) {
		service(vehicleId: $vehicleId) {
			_id
			serviceType
			serviceDescription
			mileage
			columnId
			vehicleId
		}
	}
`;

export const QUERY_ME = gql`
	query me {
		me {
			_id
			username
			email
			vehicles {
				_id
				vehicleTitle
			}
		}
	}
`;
