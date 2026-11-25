import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequireAuth from "../components/RequireAuth";
import Auth from "../utils/auth";

vi.mock("jwt-decode", () => ({
	jwtDecode: () => ({
		exp: Math.floor(Date.now() / 1000) + 3600,
		data: { username: "ada" },
	}),
}));

function renderAt(path) {
	return render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/login" element={<p>Login screen</p>} />
				<Route
					path="/dashboard"
					element={
						<RequireAuth>
							<p>Garage</p>
						</RequireAuth>
					}
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe("RequireAuth", () => {
	beforeEach(() => {
		Auth.logout();
	});

	it("sends anonymous visitors to login", () => {
		renderAt("/dashboard");
		expect(screen.getByText("Login screen")).toBeInTheDocument();
	});

	it("renders the page when a session token is stored", () => {
		Auth.login("session-token");
		renderAt("/dashboard");
		expect(screen.getByText("Garage")).toBeInTheDocument();
	});
});
