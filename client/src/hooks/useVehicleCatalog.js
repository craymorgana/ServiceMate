import { useEffect, useState } from "react";

function menuValues(payload) {
	const item = payload?.menuItem;
	const list = !item ? [] : Array.isArray(item) ? item : [item];
	return Array.from(
		new Set(
			list
				.map((entry) => (typeof entry?.value === "string" ? entry.value.trim() : ""))
				.filter(Boolean)
		)
	).sort((first, second) => first.localeCompare(second));
}

async function readMenu(url, signal) {
	const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
	if (!response.ok) throw new Error("Catalog request failed");
	return menuValues(await response.json());
}

export function useVehicleCatalog(year, make) {
	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);
	const [loadingMakes, setLoadingMakes] = useState(false);
	const [loadingModels, setLoadingModels] = useState(false);
	const [catalogError, setCatalogError] = useState("");

	useEffect(() => {
		if (!year) {
			setMakes([]);
			setModels([]);
			return undefined;
		}

		const controller = new AbortController();
		setCatalogError("");
		setLoadingMakes(true);
		setMakes([]);
		setModels([]);

		readMenu(
			`https://www.fueleconomy.gov/ws/rest/vehicle/menu/make?year=${encodeURIComponent(year)}`,
			controller.signal
		)
			.then((values) => {
				if (!controller.signal.aborted) setMakes(values);
			})
			.catch((error) => {
				if (error.name === "AbortError") return;
				console.error(error);
				if (!controller.signal.aborted) setCatalogError("Could not load vehicle makes. Try again.");
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoadingMakes(false);
			});

		return () => controller.abort();
	}, [year]);

	useEffect(() => {
		if (!year || !make) {
			setModels([]);
			return undefined;
		}

		const controller = new AbortController();
		setCatalogError("");
		setLoadingModels(true);
		setModels([]);

		readMenu(
			`https://www.fueleconomy.gov/ws/rest/vehicle/menu/model?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}`,
			controller.signal
		)
			.then((values) => {
				if (!controller.signal.aborted) setModels(values);
			})
			.catch((error) => {
				if (error.name === "AbortError") return;
				console.error(error);
				if (!controller.signal.aborted) {
					setCatalogError("Could not load models for that make and year.");
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoadingModels(false);
			});

		return () => controller.abort();
	}, [year, make]);

	return { makes, models, loadingMakes, loadingModels, catalogError };
}
