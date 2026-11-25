import { adjacentColumn } from "@shared/graphql/columns";

function ServiceCard({ tasks, columnId, onMove, movingId }) {
	const filteredTasks = tasks.filter((task) => task.columnId === columnId);

	if (!filteredTasks.length) {
		return <p className="task-empty">No services in this column yet.</p>;
	}

	return (
		<div className="card-body p-2">
			{filteredTasks.map((task) => {
				const back = adjacentColumn(task.columnId, -1);
				const forward = adjacentColumn(task.columnId, 1);
				const busy = movingId === task._id;
				return (
					<div key={task._id} className="task">
						<div className="card-title">{task.serviceType}</div>
						<p>{task.serviceDescription}</p>
						{typeof task.mileage === "number" && (
							<p className="task-mileage">Mileage: {task.mileage.toLocaleString()} mi</p>
						)}
						{task.createdAt && (
							<p className="task-mileage">Logged {new Date(task.createdAt).toLocaleDateString()}</p>
						)}
						<div className="buttons">
							<button
								className="btn btn-danger btn-sm"
								type="button"
								disabled={!back || busy}
								aria-label={`Move ${task.serviceType} back`}
								onClick={() => onMove(task, back)}
							>
								Move back
							</button>
							<button
								className="btn btn-success btn-sm"
								type="button"
								disabled={!forward || busy}
								aria-label={`Move ${task.serviceType} forward`}
								onClick={() => onMove(task, forward)}
							>
								Move up
							</button>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default ServiceCard;
