import React from "react";
import Auth from "../utils/auth";

const Home = () => {
	const logout = (event) => {
		event.preventDefault();
		Auth.logout();
	};
	return (
		<div id="container" className="container">
			<h1 className="kanban display-1 m-4 text-center">ServiceMate</h1>
			<h2 id="motto" className="m-5 text-center">
				Track your service
			</h2>
		</div>
	);
};

export default Home;
