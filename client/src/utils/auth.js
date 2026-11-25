import { jwtDecode } from "jwt-decode";
import { createAuth } from "@shared/auth/createAuth";

const browserStorage = {
	getItem(key) {
		return window.localStorage.getItem(key);
	},
	setItem(key, value) {
		window.localStorage.setItem(key, value);
	},
	removeItem(key) {
		window.localStorage.removeItem(key);
	},
};

const Auth = createAuth(browserStorage, { decode: jwtDecode });

export default Auth;
