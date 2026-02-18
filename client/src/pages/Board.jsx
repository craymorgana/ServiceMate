import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { UPDATE_VEHICLE_MILEAGE } from "../utils/mutations";
import { QUERY_SERVICE, QUERY_VEHICLE } from "../utils/queries";
import AddTask from "../components/AddTask";
import TaskCard from "../components/TaskCard";
import Modal from "react-modal";
import sedanImage from "../assets/vehicles/sedan.svg";
import suvImage from "../assets/vehicles/suv.svg";
import truckImage from "../assets/vehicles/truck.svg";
import classicImage from "../assets/vehicles/classic.svg";
import defaultImage from "../assets/vehicles/default.svg";

const Board = (props) => {
	const { vehicleId } = useParams();
	const [showModal, setShowModal] = useState(false);
	const [mileageInput, setMileageInput] = useState("");
	const [mileageError, setMileageError] = useState("");
	const [mileageSuccess, setMileageSuccess] = useState("");
	const [showMileageEditor, setShowMileageEditor] = useState(false);

	const {
		data: serviceData,
		error: serviceError,
		loading: loadingService,
	} = useQuery(QUERY_SERVICE, {
		variables: { vehicleId },
		skip: !vehicleId,
	});

	const {
		data: vehicleData,
		error: vehicleError,
		loading: loadingVehicle,
	} = useQuery(QUERY_VEHICLE, {
		variables: { vehicleId },
		skip: !vehicleId,
	});

	const [updateVehicleMileage, { loading: savingMileage }] = useMutation(
		UPDATE_VEHICLE_MILEAGE,
		{
			refetchQueries: [
				{ query: QUERY_VEHICLE, variables: { vehicleId } },
				{ query: QUERY_SERVICE, variables: { vehicleId } },
			],
		}
	);

	const vehicle = vehicleData?.vehicle;
	const vehicleTitle = vehicle?.vehicleTitle || "Your vehicle";

	const chooseVehicleImage = (title) => {
		const normalizedTitle = (title || "").toLowerCase();
		const year = Number.parseInt(normalizedTitle.slice(0, 4), 10);

		if (!Number.isNaN(year) && year <= 1979) {
			return classicImage;
		}

		if (
			normalizedTitle.includes("truck") ||
			normalizedTitle.includes("f-150") ||
			normalizedTitle.includes("silverado") ||
			normalizedTitle.includes("ram")
		) {
			return truckImage;
		}

		if (
			normalizedTitle.includes("suv") ||
			normalizedTitle.includes("outback") ||
			normalizedTitle.includes("rav4") ||
			normalizedTitle.includes("cr-v") ||
			normalizedTitle.includes("explorer")
		) {
			return suvImage;
		}

		if (
			normalizedTitle.includes("civic") ||
			normalizedTitle.includes("camry") ||
			normalizedTitle.includes("corolla") ||
			normalizedTitle.includes("accord") ||
			normalizedTitle.includes("sedan")
		) {
			return sedanImage;
		}

		return defaultImage;
	};

	if (serviceError || vehicleError) {
		return <p>Error: {(serviceError || vehicleError).message}</p>;
	}

	if (loadingService || loadingVehicle || !serviceData || !vehicleData) {
		return <div className="auth-page">Loading service board...</div>;
	}

	const tasks = serviceData ? serviceData.service : [];

	const handleClick = () => {
		setShowModal(true);
	};

	const closeModal = () => {
		setShowModal(false);
	};

	const handleMileageSubmit = async (event) => {
		event.preventDefault();
		const parsedMileage = Number.parseInt(mileageInput, 10);

		if (Number.isNaN(parsedMileage) || parsedMileage < 0) {
			setMileageError("Enter a valid mileage value.");
			setMileageSuccess("");
			return;
		}

		try {
			await updateVehicleMileage({
				variables: {
					vehicleId,
					mileage: parsedMileage,
				},
			});
			setMileageInput("");
			setMileageError("");
			setMileageSuccess("Mileage updated.");
			setShowMileageEditor(false);
		} catch (error) {
			console.error(error);
			setMileageError("Could not update mileage right now.");
			setMileageSuccess("");
		}
	};

	return (
		<div className="board-page">
			<section className="board-hero">
				<div className="hero-content board-copy board-header-grid">
					<div>
					<p className="hero-kicker">Vehicle maintenance</p>
					<h1 className="hero-title">Service Board</h1>
					<p className="hero-subtitle">
						Track open service items, active work, and completed maintenance.
					</p>
					</div>

					<div className="hero-card vehicle-details-card">
						<img
							className="vehicle-preview-image"
							src={chooseVehicleImage(vehicleTitle)}
							alt={`${vehicleTitle} illustration`}
						/>
						<div className="vehicle-details-content">
							<h3>{vehicleTitle}</h3>
							<p>
								Current mileage: <strong>{(vehicle?.mileage || 0).toLocaleString()} mi</strong>
							</p>
							{!showMileageEditor ? (
								<button
									type="button"
									className="btn-hero ghost mileage-save-btn"
									onClick={() => {
										setMileageInput(vehicle?.mileage ? String(vehicle.mileage) : "");
										setMileageError("");
										setMileageSuccess("");
										setShowMileageEditor(true);
									}}
								>
									Update Mileage
								</button>
							) : (
								<form className="vehicle-mileage-form" onSubmit={handleMileageSubmit}>
									<label htmlFor="vehicleMileage">Update mileage</label>
									<input
										id="vehicleMileage"
										type="number"
										min="0"
										placeholder="Enter latest odometer"
										value={mileageInput}
										onChange={(event) => setMileageInput(event.target.value)}
									/>
									<button
										type="submit"
										className="btn-hero ghost mileage-save-btn"
										disabled={savingMileage}
									>
										{savingMileage ? "Saving..." : "Save Mileage"}
									</button>
								</form>
							)}
							{mileageError && <p className="dashboard-form-error">{mileageError}</p>}
							{mileageSuccess && <p className="mileage-success">{mileageSuccess}</p>}
						</div>
					</div>
				</div>
				<div>
					<Link className="btn-hero ghost" to="/dashboard">
						← Back to Cars
					</Link>
				</div>
				<div className="board-columns">
					<div className="hero-card board-column">
						<div className="board-column-header">
							<h3>To Do</h3>
							<button
								type="button"
								className="btn-hero primary board-add-btn"
								onClick={handleClick}
							>
								+ Add service
							</button>
						</div>
						<div className="board-task-list">
							<TaskCard tasks={tasks} columnId="To Do" />
						</div>
					</div>

					<div className="hero-card board-column">
						<div className="board-column-header">
							<h3>In Progress</h3>
						</div>
						<div className="board-task-list">
							<TaskCard tasks={tasks} columnId="In Progress" />
						</div>
					</div>

					<div className="hero-card board-column">
						<div className="board-column-header">
							<h3>Completed</h3>
						</div>
						<div className="board-task-list">
							<TaskCard tasks={tasks} columnId="Done" />
						</div>
					</div>
				</div>

				<Modal
					isOpen={showModal}
					onRequestClose={closeModal}
					className="service-modal"
					overlayClassName="service-modal-overlay"
				>
					<AddTask vehicleId={vehicleId} closeModal={closeModal} />
					<button className="btn-hero ghost board-close-btn" onClick={closeModal}>
						Close
					</button>
				</Modal>
			</section>
		</div>
	);
};

export default Board;
