import React, { useState } from "react";
import { useMutation } from "@apollo/client";
import { ADD_SERVICE } from "../../utils/mutations";
import { useParams } from "react-router-dom";

const AddTask = (props) => {
	const { closeModal, vehicleId: propVehicleId } = props;
	const [task, setTask] = useState("");
	const [taskDescription, setDescription] = useState("");
	const [mileage, setMileage] = useState("");
	const [columnId, setColumnId] = useState("");
	const { vehicleId: routeVehicleId } = useParams();
	const vehicleId = propVehicleId || routeVehicleId;

	const [addService, { error }] = useMutation(ADD_SERVICE, {});

	const handleInputChange = (event) => {
		const { name, value } = event.target;

		if (name === "task") {
			setTask(value);
		} else if (name === "taskDescription") {
			setDescription(value);
		} else if (name === "mileage") {
			setMileage(value);
		} else if (name === "columnId") {
			setColumnId(value);
		}
	};

	const handleFormSubmit = async (event) => {
		event.preventDefault();
		try {
			await addService({
				variables: {
					vehicleId,
					serviceType: task,
					serviceDescription: taskDescription,
					mileage: Number(mileage),
					columnId,
				},
			});
			closeModal();
			window.location.reload();
		} catch (err) {
			console.error(err);
		}
	};

	return (
		<div className="d-flex justify-content-center">
			<div className="task-form">
				<h3>Add Service</h3>
				<form onSubmit={handleFormSubmit}>
					<div className="form-group">
						<label htmlFor="task">Service title:</label>
						<input
							type="text"
							className="form-control"
							id="task"
							name="task"
							placeholder="Enter service title"
							value={task}
							onChange={handleInputChange}
						/>
					</div>
					<div className="form-group">
						<label htmlFor="taskDescription">Service details:</label>
						<input
							type="text"
							className="form-control"
							id="taskDescription"
							name="taskDescription"
							placeholder="Enter service description"
							value={taskDescription}
							onChange={handleInputChange}
						/>
					</div>
					<div className="form-group">
						<label htmlFor="mileage">Mileage:</label>
						<input
							type="number"
							className="form-control"
							id="mileage"
							name="mileage"
							placeholder="Enter current mileage"
							value={mileage}
							onChange={handleInputChange}
							min="0"
							required
						/>
					</div>
					<div className="form-group">
						<label htmlFor="columnId">
							Select a board column:
						</label>
						<select
							className="form-control"
							id="columnId"
							name="columnId"
							value={columnId}
							onChange={handleInputChange}
						>
							<option value="">Select a column</option>
							<option value="To Do">To Do</option>
							<option value="In Progress">In Progress</option>
							<option value="Done">Done</option>
						</select>
					</div>
					<button type="submit" className="btn">
						Submit
					</button>
				</form>
				{error && <div>Error: {error.message}</div>}
			</div>
		</div>
	);
};

export default AddTask;