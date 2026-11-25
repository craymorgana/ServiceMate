import { Link } from "react-router-dom";
import { useGarage } from "../hooks/useGarage";

const Dashboard = () => {
	const {
		selectedYear,
		selectedMake,
		selectedModel,
		setSelectedModel,
		yearOptions,
		chooseYear,
		chooseMake,
		vehicles,
		loading,
		queryError,
		vehicleError,
		removeError,
		pendingRemoveId,
		removingVehicleId,
		setPendingRemoveId,
		setRemoveError,
		handleAddVehicle,
		handleConfirmRemove,
		makes,
		models,
		loadingMakes,
		loadingModels,
	} = useGarage();

	if (loading) {
		return <div role="status">Loading...</div>;
	}

	if (queryError) {
		return <p role="alert">Error: {queryError.message}</p>;
	}

	return (
		<div className="dashboard-page">
			<section className="dashboard-hero">
				<div className="hero-content dashboard-copy">
					<p className="hero-kicker">Your garage</p>
					<h1 className="hero-title">Dashboard</h1>
					<p className="hero-subtitle">
						Manage your cars and open each car&apos;s service board to track maintenance work.
					</p>
				</div>

				<div className="hero-card dashboard-card">
					<h2>My Cars</h2>
					<div className="dashboard-list-wrap">
						{!vehicles.length ? (
							<p className="dashboard-empty">Add your first car to start tracking service.</p>
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
															onClick={() => {
																setPendingRemoveId("");
																setRemoveError("");
															}}
															disabled={isRemoving}
														>
															Cancel
														</button>
													</>
												) : (
													<button
														type="button"
														className="car-btn car-btn-remove"
														onClick={() => {
															setPendingRemoveId(vehicle._id);
															setRemoveError("");
														}}
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
						{removeError && (
							<p className="dashboard-form-error" role="alert">
								{removeError}
							</p>
						)}
					</div>

					<form className="dashboard-form" onSubmit={handleAddVehicle}>
						<label htmlFor="carYear">Year</label>
						<select id="carYear" value={selectedYear} onChange={(event) => chooseYear(event.target.value)}>
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
									onChange={(event) => chooseMake(event.target.value)}
									disabled={loadingMakes || !makes.length}
								>
									<option value="">{loadingMakes ? "Loading makes..." : "Select make"}</option>
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
									<option value="">{loadingModels ? "Loading models..." : "Select model"}</option>
									{models.map((model) => (
										<option key={model} value={model}>
											{model}
										</option>
									))}
								</select>
								{!loadingModels && !models.length && (
									<p className="dashboard-form-error">No models were found for that year and make.</p>
								)}
							</>
						)}

						{vehicleError && (
							<p className="dashboard-form-error" role="alert">
								{vehicleError}
							</p>
						)}

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
