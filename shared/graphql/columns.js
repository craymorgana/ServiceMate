export const SERVICE_COLUMNS = [
	{ id: "TODO", label: "To Do" },
	{ id: "IN_PROGRESS", label: "In Progress" },
	{ id: "DONE", label: "Done" },
];

export function adjacentColumn(columnId, direction) {
	const index = SERVICE_COLUMNS.findIndex((column) => column.id === columnId);
	if (index < 0) return null;
	const nextIndex = index + direction;
	if (nextIndex < 0 || nextIndex >= SERVICE_COLUMNS.length) return null;
	return SERVICE_COLUMNS[nextIndex].id;
}
