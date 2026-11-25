import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApolloClient, useMutation } from "@apollo/client";
import { ADD_USER } from "@shared/graphql/operations";
import Auth from "../utils/auth";

const Signup = (props) => {
	const [email, setEmail] = useState("");
	const [password, setPass] = useState("");
	const [name, setName] = useState("");
	const [addUser, { error, data }] = useMutation(ADD_USER);
	const navigate = useNavigate();
	const client = useApolloClient();

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const { data: result } = await addUser({
				variables: { email, username: name, password },
			});
			Auth.login(result.addUser.token);
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
					<p className="hero-kicker">Get started</p>
					<h1 className="hero-title">Create your account</h1>
					<p className="hero-subtitle">
						Set up ServiceMate in under a minute and start tracking maintenance
						right away.
					</p>
					<div className="hero-stats">
						<div className="stat">
							<span className="stat-value">Free</span>
							<span className="stat-label">to create an account</span>
						</div>
						<div className="stat">
							<span className="stat-value">Simple</span>
							<span className="stat-label">vehicle history management</span>
						</div>
					</div>
				</div>

				<div className="hero-card auth-card">
					<h2>Sign up</h2>
					{data ? (
						<p className="auth-success">Creating account...</p>
					) : (
						<form className="auth-form-modern" onSubmit={handleSubmit}>
							<label htmlFor="name">Name</label>
							<input
								value={name}
								onChange={(e) => setName(e.target.value)}
								type="text"
								placeholder="Username"
								id="name"
								required
							/>
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
								placeholder="At least 8 characters"
								id="password"
								minLength={8}
								required
							/>
							<button className="btn-hero primary auth-submit" type="submit">
								Sign Up
							</button>
						</form>
					)}

					<Link className="auth-switch" to="/login">
						Already have an account? Log in
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

export default Signup;
