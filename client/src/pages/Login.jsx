import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApolloClient, useMutation } from "@apollo/client";
import { LOGIN_USER } from "@shared/graphql/operations";
import Auth from "../utils/auth";

const Login = (props) => {
	const [email, setEmail] = useState("");
	const [password, setPass] = useState("");
	const [login, { error, data }] = useMutation(LOGIN_USER);
	const navigate = useNavigate();
	const client = useApolloClient();

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const { data: result } = await login({
				variables: { email, password },
			});
			Auth.login(result.login.token);
			await client.resetStore();
			navigate("/dashboard");
		} catch (err) {
			console.error(err);
		}
	};

	return (
		<div className="auth-page">
			<section className="auth-hero">
				<div className="hero-content auth-copy">
					<p className="hero-kicker">Welcome back</p>
					<h1 className="hero-title">Log in to ServiceMate</h1>
					<p className="hero-subtitle">
						Pick up where you left off and keep your vehicle history organized.
					</p>
					<div className="hero-stats">
						<div className="stat">
							<span className="stat-value">1 dashboard</span>
							<span className="stat-label">for every vehicle record</span>
						</div>
						<div className="stat">
							<span className="stat-value">Fast</span>
							<span className="stat-label">service entry workflow</span>
						</div>
					</div>
				</div>

				<div className="hero-card auth-card">
					<h2>Log in</h2>
					{data ? (
						<p className="auth-success">Logging in...</p>
					) : (
						<form className="auth-form-modern" onSubmit={handleSubmit}>
							<label htmlFor="email">Email</label>
							<input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								type="email"
								placeholder="you@example.com"
								id="email"
								required
							/>
							<label htmlFor="password">Password</label>
							<input
								value={password}
								onChange={(e) => setPass(e.target.value)}
								type="password"
								placeholder="••••••••"
								id="password"
								required
							/>
							<button className="btn-hero primary auth-submit" type="submit">
								Log In
							</button>
						</form>
					)}
					<Link className="auth-switch" to="/signup">
						Don&apos;t have an account? Create one
					</Link>
					{error && (
						<p className="auth-error" role="alert">
							{error.message}
						</p>
					)}
				</div>
			</section>
		</div>
	);
};

export default Login;
