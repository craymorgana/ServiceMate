import { useState } from "react";
import { useMutation } from "@apollo/client";
import { ADD_SERVICE, QUERY_VEHICLE } from "@shared/graphql/operations";
import { SERVICE_COLUMNS } from "@shared/graphql/columns";

const AddService = ({ vehicleId, closeModal }) => {
	const [task, setTask] = useState("");
	const [taskDescription, setDescription] = useState("");
	const [mileage, setMileage] = useState("");
	const [columnId, setColumnId] = useState("TODO");
	const [formError, setFormError] = useState("");

	const [addService, { error }] = useMutation(ADD_SERVICE, {
		refetchQueries: [{ query: QUERY_VEHICLE, variables: { vehicleId } }],
	});

	const handleFormSubmit = async (event) => {
		event.preventDefault();
		if (!task.trim() || !taskDescription.trim() || mileage === "" || !columnId) {
			setFormError("Title, details, mileage, and column are required.");
			return;
		}
		try {
			await addService({
				variables: {
					vehicleId,
					serviceType: task.trim(),
					serviceDescription: taskDescription.trim(),
					mileage: Number(mileage),
					columnId,
				},
			});
			closeModal();
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
							onChange={(event) => setTask(event.target.value)}
							required
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
							onChange={(event) => setDescription(event.target.value)}
							required
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
							onChange={(event) => setMileage(event.target.value)}
							min="0"
							required
						/>
					</div>
					<div className="form-group">
						<label htmlFor="columnId">Select a board column:</label>
						<select
							className="form-control"
							id="columnId"
							name="columnId"
							value={columnId}
							onChange={(event) => setColumnId(event.target.value)}
							required
						>
							{SERVICE_COLUMNS.map((column) => (
								<option key={column.id} value={column.id}>
									{column.label}
								</option>
							))}
						</select>
					</div>
					<button type="submit" className="btn">
						Submit
					</button>
				</form>
				{(formError || error) && (
					<div role="alert">{formError || `Error: ${error.message}`}</div>
				)}
			</div>
		</div>
	);
};

export default AddService;
