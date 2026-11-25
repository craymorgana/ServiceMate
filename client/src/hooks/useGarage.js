import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { ADD_VEHICLE, REMOVE_VEHICLE, QUERY_ME } from "@shared/graphql/operations";
import { useVehicleCatalog } from "./useVehicleCatalog";

export function useGarage() {
	const [selectedYear, setSelectedYear] = useState("");
	const [selectedMake, setSelectedMake] = useState("");
	const [selectedModel, setSelectedModel] = useState("");
	const [vehicleError, setVehicleError] = useState("");
	const [removeError, setRemoveError] = useState("");
	const [pendingRemoveId, setPendingRemoveId] = useState("");
	const [removingVehicleId, setRemovingVehicleId] = useState("");
	const catalog = useVehicleCatalog(selectedYear, selectedMake);

	const currentYear = new Date().getFullYear();
	const yearOptions = Array.from({ length: currentYear - 1940 + 1 }, (_, index) =>
		String(currentYear - index)
	);

	const [addVehicle] = useMutation(ADD_VEHICLE, {
		refetchQueries: [{ query: QUERY_ME }],
	});
	const [removeVehicle] = useMutation(REMOVE_VEHICLE, {
		refetchQueries: [{ query: QUERY_ME }],
	});
	const { loading, data, error } = useQuery(QUERY_ME);
	const vehicles = data?.me?.vehicles || [];

	const chooseYear = (year) => {
		setSelectedYear(year);
		setSelectedMake("");
		setSelectedModel("");
		setVehicleError("");
	};

	const chooseMake = (make) => {
		setSelectedMake(make);
		setSelectedModel("");
		setVehicleError("");
	};

	const handleAddVehicle = async (event) => {
		event.preventDefault();
		if (!selectedYear || !selectedMake || !selectedModel) {
			setVehicleError("Select year, make, and model before saving.");
			return;
		}

		try {
			await addVehicle({
				variables: { vehicleTitle: `${selectedYear} ${selectedMake} ${selectedModel}` },
			});
			setSelectedYear("");
			setSelectedMake("");
			setSelectedModel("");
			setVehicleError("");
			setRemoveError("");
		} catch (err) {
			console.error(err);
			setVehicleError("Unable to save this car right now.");
		}
	};

	const handleConfirmRemove = async (vehicleId) => {
		setRemovingVehicleId(vehicleId);
		setRemoveError("");
		try {
			await removeVehicle({ variables: { vehicleId } });
			setPendingRemoveId("");
		} catch (err) {
			console.error(err);
			setRemoveError("Unable to remove this car right now.");
		} finally {
			setRemovingVehicleId("");
		}
	};

	return {
		selectedYear,
		selectedMake,
		selectedModel,
		setSelectedModel,
		yearOptions,
		chooseYear,
		chooseMake,
		vehicles,
		loading,
		queryError: error,
		vehicleError: vehicleError || catalog.catalogError,
		removeError,
		pendingRemoveId,
		removingVehicleId,
		setPendingRemoveId,
		setRemoveError,
		handleAddVehicle,
		handleConfirmRemove,
		...catalog,
	};
}
