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
						track mileage, and keep receipts organized in one place.
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
							<span className="stat-value">3 min</span>
							<span className="stat-label">to log a service</span>
						</div>
						<div className="stat">
							<span className="stat-value">100%</span>
							<span className="stat-label">user-owned data</span>
						</div>
						<div className="stat">
							<span className="stat-value">0</span>
							<span className="stat-label">dealer lock-in</span>
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
					<h3>Maintenance timeline</h3>
					<p>
						See what was done, when it happened, and what is coming up next.
					</p>
				</div>
				<div className="feature">
					<h3>Shareable history</h3>
					<p>
						Export your records when you sell a car or hand it off to family.
					</p>
				</div>
			</section>
		</div>
	);
};

export default Home;
