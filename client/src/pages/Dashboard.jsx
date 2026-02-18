/** @format */

import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { ADD_VEHICLE, REMOVE_VEHICLE } from "../utils/mutations";
import { QUERY_USER, QUERY_ME } from "../utils/queries";

import Auth from "../utils/auth";

const Dashboard = () => {
	const [selectedYear, setSelectedYear] = useState("");
	const [selectedMake, setSelectedMake] = useState("");
	const [selectedModel, setSelectedModel] = useState("");
	const [makes, setMakes] = useState([]);
	const [models, setModels] = useState([]);
	const [loadingMakes, setLoadingMakes] = useState(false);
	const [loadingModels, setLoadingModels] = useState(false);
	const [vehicleError, setVehicleError] = useState("");
	const [removeError, setRemoveError] = useState("");
	const [pendingRemoveId, setPendingRemoveId] = useState("");
	const [removingVehicleId, setRemovingVehicleId] = useState("");
	const { username: userParam } = useParams();
	const currentYear = new Date().getFullYear();
	const earliestYear = 1940;
	const yearOptions = Array.from({ length: currentYear - earliestYear + 1 }, (_, index) =>
		String(currentYear - index)
	);

	const [addVehicle] = useMutation(ADD_VEHICLE, {
		refetchQueries: [{ query: QUERY_ME }],
	});
	const [removeVehicle] = useMutation(REMOVE_VEHICLE, {
		refetchQueries: [{ query: QUERY_ME }],
	});

	const uniqueSortedValues = (values) =>
		Array.from(
			new Set(
				values
					.map((value) => (typeof value === "string" ? value.trim() : value))
					.filter(Boolean)
			)
		).sort((first, second) => first.localeCompare(second));

	const queryDocument = userParam ? QUERY_USER : QUERY_ME;
	const queryOptions = userParam ? { variables: { username: userParam } } : {};
	const { loading, data } = useQuery(queryDocument, queryOptions);
	const user = data?.me || data?.user || {};
	const vehicles = user.vehicles || [];

	useEffect(() => {
		const fetchMakes = async () => {
			if (!selectedYear) {
				setMakes([]);
				setSelectedMake("");
				setSelectedModel("");
				setModels([]);
				return;
			}

			setVehicleError("");
			setLoadingMakes(true);
			setSelectedMake("");
			setSelectedModel("");
			setModels([]);

			try {
				const response = await fetch(
					"https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json"
				);

				if (!response.ok) {
					throw new Error("Unable to load makes");
				}

				const result = await response.json();
				const makeNames = uniqueSortedValues(
					(result?.Results || [])
					.map((item) => item.MakeName)
				);

				setMakes(makeNames);
			} catch (error) {
				console.error(error);
				setVehicleError("Could not load vehicle makes. Try again.");
			} finally {
				setLoadingMakes(false);
			}
		};

		fetchMakes();
	}, [selectedYear]);

	useEffect(() => {
		const fetchModels = async () => {
			if (!selectedYear || !selectedMake) {
				setModels([]);
				setSelectedModel("");
				return;
			}

			setVehicleError("");
			setLoadingModels(true);
			setSelectedModel("");

			try {
				const response = await fetch(
					`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(selectedMake)}/modelyear/${selectedYear}?format=json`
				);

				if (!response.ok) {
					throw new Error("Unable to load models");
				}

				const result = await response.json();
				const modelNames = uniqueSortedValues(
					(result?.Results || [])
					.map((item) => item.Model_Name)
				);

				setModels(modelNames);
			} catch (error) {
				console.error(error);
				setVehicleError("Could not load models for that make and year.");
			} finally {
				setLoadingModels(false);
			}
		};

		fetchModels();
	}, [selectedYear, selectedMake]);

	if (loading) {
		return <div>Loading...</div>;
	}

	if (!Auth.loggedIn()) {
		return (
			<div className="auth-page">
				<section className="auth-hero">
					<div className="hero-card auth-card">
						<h2>Login required</h2>
						<p className="hero-subtitle">
							You need to be logged in to view your dashboard.
						</p>
					</div>
				</section>
			</div>
		);
	}

	const handleAddVehicle = async (event) => {
		event.preventDefault();
		if (!selectedYear || !selectedMake || !selectedModel) {
			setVehicleError("Select year, make, and model before saving.");
			return;
		}

		try {
			const vehicleTitle = `${selectedYear} ${selectedMake} ${selectedModel}`;
			await addVehicle({
				variables: {
					vehicleTitle,
				},
			});
			setSelectedYear("");
			setSelectedMake("");
			setSelectedModel("");
			setMakes([]);
			setModels([]);
			setVehicleError("");
			setRemoveError("");
		} catch (err) {
			console.error(err);
			setVehicleError("Unable to save this car right now.");
		}
	};

	const handleStartRemove = (vehicleId) => {
		setPendingRemoveId(vehicleId);
		setRemoveError("");
	};

	const handleCancelRemove = () => {
		setPendingRemoveId("");
		setRemoveError("");
	};

	const handleConfirmRemove = async (vehicleId) => {
		setRemovingVehicleId(vehicleId);
		setRemoveError("");

		try {
			await removeVehicle({
				variables: {
					vehicleId,
				},
			});
			setPendingRemoveId("");
		} catch (error) {
			console.error(error);
			setRemoveError("Unable to remove this car right now.");
		} finally {
			setRemovingVehicleId("");
		}
	};

	return (
		<div className="dashboard-page">
			<section className="dashboard-hero">
				<div className="hero-content dashboard-copy">
					<p className="hero-kicker">Your garage</p>
					<h1 className="hero-title">Dashboard</h1>
					<p className="hero-subtitle">
						Manage your cars and open each car&apos;s service board to track
						maintenance work.
					</p>
				</div>

				<div className="hero-card dashboard-card">
					<h2>My Cars</h2>
					<div className="dashboard-list-wrap">
						{!vehicles.length ? (
							<p className="dashboard-empty">
								Add your first car to start tracking service.
							</p>
						) : (
							<ul className="dashboard-list">
								{vehicles.map((vehicle) => {
									const isPendingRemove = pendingRemoveId === vehicle._id;
									const isRemoving = removingVehicleId === vehicle._id;

									return (
										<li key={vehicle._id}>
											<div className="dashboard-list-main">
												<Link className="vehicle-link" to={`/vehicles/${vehicle._id}`}>
													{vehicle.vehicleTitle}
												</Link>
												<span className="car-link-note">Open service board</span>
											</div>
											<div className="car-actions">
												{isPendingRemove ? (
													<>
														<button
															type="button"
															className="car-btn car-btn-confirm"
															onClick={() => handleConfirmRemove(vehicle._id)}
															disabled={isRemoving}
														>
															{isRemoving ? "Removing..." : "Confirm Remove"}
														</button>
														<button
															type="button"
															className="car-btn car-btn-cancel"
															onClick={handleCancelRemove}
															disabled={isRemoving}
														>
															Cancel
														</button>
													</>
												) : (
													<button
														type="button"
														className="car-btn car-btn-remove"
														onClick={() => handleStartRemove(vehicle._id)}
													>
														Remove Car
													</button>
												)}
											</div>
										</li>
									);
								})}
							</ul>
						)}

						{removeError && <p className="dashboard-form-error">{removeError}</p>}
					</div>

					<form className="dashboard-form" onSubmit={handleAddVehicle}>
						<label htmlFor="carYear">Year</label>
						<select
							id="carYear"
							value={selectedYear}
							onChange={(event) => setSelectedYear(event.target.value)}
						>
							<option value="">Select year</option>
							{yearOptions.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>

						{selectedYear && (
							<>
								<label htmlFor="carMake">Make</label>
								<select
									id="carMake"
									value={selectedMake}
									onChange={(event) => setSelectedMake(event.target.value)}
									disabled={loadingMakes || !makes.length}
								>
									<option value="">
										{loadingMakes ? "Loading makes..." : "Select make"}
									</option>
									{makes.map((make) => (
										<option key={make} value={make}>
											{make}
										</option>
									))}
								</select>
							</>
						)}

						{selectedMake && (
							<>
								<label htmlFor="carModel">Model</label>
								<select
									id="carModel"
									value={selectedModel}
									onChange={(event) => setSelectedModel(event.target.value)}
									disabled={loadingModels || !models.length}
								>
									<option value="">
										{loadingModels ? "Loading models..." : "Select model"}
									</option>
									{models.map((model) => (
										<option key={model} value={model}>
											{model}
										</option>
									))}
								</select>
								{!loadingModels && !models.length && (
									<p className="dashboard-form-error">
										No models were found for that year and make.
									</p>
								)}
							</>
						)}

						{vehicleError && <p className="dashboard-form-error">{vehicleError}</p>}

						<button className="btn-hero primary auth-submit" type="submit">
							Save Car
						</button>
					</form>
				</div>
			</section>
		</div>
	);
};

export default Dashboard;
