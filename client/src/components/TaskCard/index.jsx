function TaskCard({ tasks, columnId }) {
	const filteredTasks = tasks.filter((task) => task.columnId === columnId);

	if (!filteredTasks.length) {
		return <p className="task-empty">No services in this column yet.</p>;
	}

	return (
		<div className="card-body p-2">
			{filteredTasks.map((task) => (
				<div key={task._id} className="task">
					<div className="card-title">{task.serviceType || task.task}</div>
					<p>{task.serviceDescription || task.taskDescription}</p>
					{typeof task.mileage === "number" && (
						<p className="task-mileage">Mileage: {task.mileage.toLocaleString()} mi</p>
					)}
					<div className="buttons">
						<button className="btn btn-danger btn-sm">Move back</button>
						<button className="btn btn-success btn-sm">Move up</button>
					</div>
				</div>
			))}
		</div>
	);
}

export default TaskCard;