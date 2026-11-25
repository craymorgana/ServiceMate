import { describe, expect, it } from "vitest";
import { createAuth, TOKEN_KEY } from "@shared/auth/createAuth";
import { adjacentColumn } from "@shared/graphql/columns";

function memoryStorage() {
	const values = new Map();
	return {
		getItem: (key) => (values.has(key) ? values.get(key) : null),
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key),
	};
}

describe("createAuth", () => {
	it("stores and clears a token without touching window", () => {
		const storage = memoryStorage();
		const auth = createAuth(storage, {
			decode: () => ({ exp: 4_000_000_000, data: { username: "ada" } }),
			now: () => 1_000,
		});
		expect(auth.loggedIn()).toBe(false);
		auth.login("header.payload.sig");
		expect(storage.getItem(TOKEN_KEY)).toBe("header.payload.sig");
		expect(auth.loggedIn()).toBe(true);
		expect(auth.getProfile().data.username).toBe("ada");
		auth.logout();
		expect(auth.getToken()).toBeNull();
	});

	it("drops an expired token", () => {
		const storage = memoryStorage();
		const auth = createAuth(storage, {
			decode: () => ({ exp: 1 }),
			now: () => 5_000,
		});
		auth.login("expired");
		expect(auth.loggedIn()).toBe(false);
		expect(storage.getItem(TOKEN_KEY)).toBeNull();
	});
});

describe("service columns", () => {
	it("moves one step in each direction and stops at the ends", () => {
		expect(adjacentColumn("TODO", 1)).toBe("IN_PROGRESS");
		expect(adjacentColumn("IN_PROGRESS", -1)).toBe("TODO");
		expect(adjacentColumn("TODO", -1)).toBeNull();
		expect(adjacentColumn("DONE", 1)).toBeNull();
	});
});
