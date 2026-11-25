import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
	return (
		<div className="home">
			<section className="home-hero">
				<div className="hero-content">
					<p className="hero-kicker">Your car, your records</p>
					<h1 className="hero-title">ServiceMate</h1>
					<p className="hero-subtitle">
						A personal service history that follows your car. Log maintenance,
						track mileage, and download the record when you need it.
					</p>
					<div className="hero-actions">
						<Link className="btn-hero primary" to="/signup">
							Create free account
						</Link>
						<Link className="btn-hero ghost" to="/login">
							Log in
						</Link>
					</div>
					<div className="hero-stats">
						<div className="stat">
							<span className="stat-value">Garage</span>
							<span className="stat-label">one board per car</span>
						</div>
						<div className="stat">
							<span className="stat-value">Mileage</span>
							<span className="stat-label">saved with each service</span>
						</div>
						<div className="stat">
							<span className="stat-value">Download</span>
							<span className="stat-label">your history as a file</span>
						</div>
					</div>
				</div>
				<div className="hero-card">
					<div className="card-header">
						<span>2018 Honda Civic</span>
						<span className="pill">45210 mi</span>
					</div>
					<ul className="card-list">
						<li>
							<span>Oil change</span>
							<em>Completed</em>
						</li>
						<li>
							<span>Tire rotation</span>
							<em>Completed</em>
						</li>
						<li>
							<span>Brake pads</span>
							<em>Scheduled</em>
						</li>
					</ul>
					<div className="card-footer">
						<span>Next due</span>
						<strong>+3,000 mi</strong>
					</div>
				</div>
			</section>
			<section className="home-features">
				<div className="feature">
					<h3>Easy logging</h3>
					<p>
						Add service entries in seconds and keep mileage snapshots for every
						visit.
					</p>
				</div>
				<div className="feature">
					<h3>Service board</h3>
					<p>
						Move work from to-do, to in progress, to done as the job moves along.
					</p>
				</div>
				<div className="feature">
					<h3>Downloadable history</h3>
					<p>
						Save the services and mileage for a car as a JSON file from its board.
					</p>
				</div>
			</section>
		</div>
	);
};

export default Home;
