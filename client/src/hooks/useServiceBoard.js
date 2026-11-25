import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
	QUERY_VEHICLE,
	UPDATE_SERVICE,
	UPDATE_VEHICLE_MILEAGE,
} from "@shared/graphql/operations";

export function useServiceBoard(vehicleId) {
	const [showModal, setShowModal] = useState(false);
	const [mileageInput, setMileageInput] = useState("");
	const [mileageError, setMileageError] = useState("");
	const [mileageSuccess, setMileageSuccess] = useState("");
	const [showMileageEditor, setShowMileageEditor] = useState(false);
	const [movingId, setMovingId] = useState("");
	const [moveError, setMoveError] = useState("");

	const { data, error, loading } = useQuery(QUERY_VEHICLE, {
		variables: { vehicleId },
		skip: !vehicleId,
	});

	const [updateVehicleMileage, { loading: savingMileage }] = useMutation(UPDATE_VEHICLE_MILEAGE, {
		refetchQueries: [{ query: QUERY_VEHICLE, variables: { vehicleId } }],
	});
	const [updateService] = useMutation(UPDATE_SERVICE, {
		refetchQueries: [{ query: QUERY_VEHICLE, variables: { vehicleId } }],
	});

	const vehicle = data?.vehicle;
	const tasks = vehicle?.services || [];

	const handleMileageSubmit = async (event) => {
		event.preventDefault();
		const parsedMileage = Number.parseInt(mileageInput, 10);
		if (Number.isNaN(parsedMileage) || parsedMileage < 0) {
			setMileageError("Enter a valid mileage value.");
			setMileageSuccess("");
			return;
		}
		try {
			await updateVehicleMileage({ variables: { vehicleId, mileage: parsedMileage } });
			setMileageInput("");
			setMileageError("");
			setMileageSuccess("Mileage updated.");
			setShowMileageEditor(false);
		} catch (err) {
			console.error(err);
			setMileageError("Could not update mileage right now.");
			setMileageSuccess("");
		}
	};

	const handleMove = async (service, columnId) => {
		if (!columnId) return;
		setMovingId(service._id);
		setMoveError("");
		try {
			await updateService({ variables: { serviceId: service._id, columnId } });
		} catch (err) {
			console.error(err);
			setMoveError("Could not move that service.");
		} finally {
			setMovingId("");
		}
	};

	const downloadHistory = () => {
		const payload = {
			vehicleTitle: vehicle?.vehicleTitle || "",
			mileage: vehicle?.mileage || 0,
			services: tasks,
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "service-history.json";
		link.click();
		URL.revokeObjectURL(url);
	};

	return {
		vehicle,
		tasks,
		loading,
		error,
		showModal,
		setShowModal,
		mileageInput,
		setMileageInput,
		mileageError,
		mileageSuccess,
		showMileageEditor,
		setShowMileageEditor,
		setMileageError,
		setMileageSuccess,
		savingMileage,
		handleMileageSubmit,
		handleMove,
		movingId,
		moveError,
		downloadHistory,
	};
}
