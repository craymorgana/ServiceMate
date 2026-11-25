import { Navigate, useLocation } from "react-router-dom";
import Auth from "../utils/auth";

export default function RequireAuth({ children }) {
	const location = useLocation();
	if (!Auth.loggedIn()) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}
	return children;
}
