export const TOKEN_KEY = "id_token";

export function createAuth(storage, { decode, now = () => Date.now() } = {}) {
	function getToken() {
		return storage.getItem(TOKEN_KEY);
	}

	function logout() {
		storage.removeItem(TOKEN_KEY);
	}

	function isTokenExpired(token) {
		if (!decode) return false;
		try {
			const decoded = decode(token);
			if (!decoded?.exp || decoded.exp < now() / 1000) {
				logout();
				return true;
			}
			return false;
		} catch {
			logout();
			return true;
		}
	}

	return {
		getToken,
		login(idToken) {
			storage.setItem(TOKEN_KEY, idToken);
		},
		logout,
		getProfile() {
			const token = getToken();
			if (!token || !decode) return null;
			try {
				return decode(token);
			} catch {
				return null;
			}
		},
		isTokenExpired,
		loggedIn() {
			const token = getToken();
			return Boolean(token) && !isTokenExpired(token);
		},
	};
}
