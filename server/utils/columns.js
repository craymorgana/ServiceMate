const SERVICE_COLUMNS = ["TODO", "IN_PROGRESS", "DONE"];

const LEGACY_COLUMNS = {
	"To Do": "TODO",
	"In Progress": "IN_PROGRESS",
	Done: "DONE",
	planned: "TODO",
	completed: "DONE",
	TODO: "TODO",
	IN_PROGRESS: "IN_PROGRESS",
	DONE: "DONE",
};

function normalizeColumn(value) {
	return LEGACY_COLUMNS[value] || null;
}

module.exports = { SERVICE_COLUMNS, normalizeColumn };
