import { Link, useParams } from "react-router-dom";
import Modal from "react-modal";
import AddService from "../components/AddService";
import ServiceCard from "../components/ServiceCard";
import ServiceHistory, { formatMoney, receiptCurrency } from "../components/ServiceHistory";
import { useServiceBoard } from "../hooks/useServiceBoard";
import { SERVICE_COLUMNS } from "@shared/graphql/columns";
import sedanImage from "../assets/vehicles/sedan.svg";
import suvImage from "../assets/vehicles/suv.svg";
import truckImage from "../assets/vehicles/truck.svg";
import classicImage from "../assets/vehicles/classic.svg";
import defaultImage from "../assets/vehicles/default.svg";

const chooseVehicleImage = (title) => {
	const normalizedTitle = (title || "").toLowerCase();
	const year = Number.parseInt(normalizedTitle.slice(0, 4), 10);
	if (!Number.isNaN(year) && year <= 1979) return classicImage;
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

const Board = () => {
	const { vehicleId } = useParams();
	const board = useServiceBoard(vehicleId);
	const vehicleTitle = board.vehicle?.vehicleTitle || "Your vehicle";

	if (board.error) {
		return <p role="alert">Error: {board.error.message}</p>;
	}

	if (board.loading || !board.vehicle) {
		return (
			<div className="auth-page" role="status">
				Loading service board...
			</div>
		);
	}

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
							<h3>{board.vehicle.nickname || vehicleTitle}</h3>
							{(board.vehicle.year || board.vehicle.make || board.vehicle.model) && (
								<p>
									{[board.vehicle.year, board.vehicle.make, board.vehicle.model, board.vehicle.trim]
										.filter(Boolean)
										.join(" ")}
								</p>
							)}
							<p>
								Current mileage: <strong>{(board.vehicle.mileage || 0).toLocaleString()} mi</strong>
							</p>
							<p>
								Spent: <strong>{formatMoney(board.vehicle.costTotal || 0, receiptCurrency(board.tasks))}</strong>
								{board.vehicle.status === "sold" ? " · Sold" : ""}
								{board.vehicle.plate ? ` · ${board.vehicle.plate}` : ""}
							</p>
							{!board.showMileageEditor ? (
								<button
									type="button"
									className="btn-hero ghost mileage-save-btn"
									onClick={() => {
										board.setMileageInput(board.vehicle.mileage ? String(board.vehicle.mileage) : "");
										board.setMileageError("");
										board.setMileageSuccess("");
										board.setShowMileageEditor(true);
									}}
								>
									Update Mileage
								</button>
							) : (
								<form className="vehicle-mileage-form" onSubmit={board.handleMileageSubmit}>
									<label htmlFor="vehicleMileage">Update mileage</label>
									<input
										id="vehicleMileage"
										type="number"
										min="0"
										placeholder="Enter latest odometer"
										value={board.mileageInput}
										onChange={(event) => board.setMileageInput(event.target.value)}
									/>
									<button
										type="submit"
										className="btn-hero ghost mileage-save-btn"
										disabled={board.savingMileage}
									>
										{board.savingMileage ? "Saving..." : "Save Mileage"}
									</button>
								</form>
							)}
							{board.mileageError && (
								<p className="dashboard-form-error" role="alert">
									{board.mileageError}
								</p>
							)}
							{board.mileageSuccess && <p className="mileage-success">{board.mileageSuccess}</p>}
						</div>
					</div>
				</div>
				<div className="board-toolbar">
					<Link className="btn-hero ghost" to="/dashboard">
						Back to Cars
					</Link>
					<button type="button" className="btn-hero ghost" onClick={board.downloadHistory}>
						Download history
					</button>
				</div>
				{board.moveError && (
					<p className="dashboard-form-error" role="alert">
						{board.moveError}
					</p>
				)}
				<ServiceHistory services={board.tasks} costTotal={board.vehicle.costTotal} />
				<div className="board-columns">
					{SERVICE_COLUMNS.map((column) => (
						<div className="hero-card board-column" key={column.id}>
							<div className="board-column-header">
								<h3>{column.label}</h3>
								{column.id === "TODO" && (
									<button
										type="button"
										className="btn-hero primary board-add-btn"
										onClick={() => board.setShowModal(true)}
									>
										+ Add service
									</button>
								)}
							</div>
							<div className="board-task-list">
								<ServiceCard
									tasks={board.tasks}
									columnId={column.id}
									onMove={board.handleMove}
									movingId={board.movingId}
								/>
							</div>
						</div>
					))}
				</div>
				<Modal
					isOpen={board.showModal}
					onRequestClose={() => board.setShowModal(false)}
					className="service-modal"
					overlayClassName="service-modal-overlay"
					contentLabel="Add service"
				>
					<AddService vehicleId={vehicleId} closeModal={() => board.setShowModal(false)} />
					<button
						className="btn-hero ghost board-close-btn"
						type="button"
						onClick={() => board.setShowModal(false)}
					>
						Close
					</button>
				</Modal>
			</section>
		</div>
	);
};

export default Board;
