import { Link, useNavigate } from "react-router-dom";
import { useApolloClient } from "@apollo/client";
import Auth from "../utils/auth";

const Header = () => {
	const navigate = useNavigate();
	const client = useApolloClient();
	const profile = Auth.loggedIn() ? Auth.getProfile() : null;

	const logout = async (event) => {
		event.preventDefault();
		Auth.logout();
		await client.clearStore();
		navigate("/");
	};

	return (
		<header className="fixed-top">
			<div className="d-flex justify-content-around ">
				{profile ? (
					<>
						<Link className="header-link" to="/dashboard">
							Home
						</Link>
						<Link className="header-link" to="/dashboard">
							{profile.data?.username}'s Dashboard
						</Link>
						<button className="header-link header-button" type="button" onClick={logout}>
							Logout
						</button>
					</>
				) : (
					<>
						<Link className="header-link" to="/">
							Home
						</Link>
						<Link className="header-link" to="/login">
							Login
						</Link>
					</>
				)}
			</div>
		</header>
	);
};

export default Header;
