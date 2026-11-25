const CATEGORY_LABELS = {
	parts: "Parts",
	service: "Service",
	tires: "Tires",
	fluids: "Fluids",
	insurance: "Insurance",
	registration: "Registration",
	other: "Other",
};

export function formatMoney(amount, currency) {
	if (typeof amount !== "number") return "—";
	const code = currency || "USD";
	try {
		return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(amount);
	} catch {
		return `${amount.toFixed(2)} ${code}`;
	}
}

function formatWhen(value) {
	if (!value) return "No date";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "No date";
	return parsed.toLocaleDateString(undefined, { timeZone: "UTC" });
}

export function receiptTotal(services) {
	return services.reduce((sum, service) => sum + (typeof service.total === "number" ? service.total : 0), 0);
}

export function receiptCurrency(services) {
	const currencies = new Set(services.map((service) => service.currency).filter(Boolean));
	return currencies.size === 1 ? [...currencies][0] : "USD";
}

function ServiceHistory({ services, costTotal }) {
	const rows = [...services].sort((left, right) => {
		const leftTime = Date.parse(left.date || left.createdAt || "") || 0;
		const rightTime = Date.parse(right.date || right.createdAt || "") || 0;
		return rightTime - leftTime;
	});
	const total = typeof costTotal === "number" ? costTotal : receiptTotal(rows);
	const currency = receiptCurrency(rows);

	return (
		<section className="receipt-history" aria-labelledby="receipt-history-title">
			<div className="receipt-history-header">
				<h2 id="receipt-history-title">Service history</h2>
				<p>
					Vehicle total <strong>{formatMoney(total, currency)}</strong>
				</p>
			</div>
			{rows.length === 0 ? (
				<p className="task-empty">No service records yet.</p>
			) : (
				<ul className="receipt-list">
					{rows.map((row) => {
						const label = row.description || row.serviceDescription || row.serviceType;
						const category = CATEGORY_LABELS[row.category] || "Service";
						return (
							<li key={row._id} className="receipt-row">
								<div className="receipt-row-main">
									<time dateTime={row.date || undefined}>{formatWhen(row.date || row.createdAt)}</time>
									<strong>{row.vendor || "Unknown vendor"}</strong>
									<span className="receipt-category">{category}</span>
									<span className="receipt-total">{formatMoney(row.total, row.currency)}</span>
								</div>
								<p>{label}</p>
								{Array.isArray(row.items) && row.items.length > 0 && (
									<details>
										<summary>
											{row.items.length} line {row.items.length === 1 ? "item" : "items"}
										</summary>
										<ul>
											{row.items.map((item, index) => (
												<li key={`${row._id}-${index}`}>
													{item.name || "Item"}
													{item.partNumber ? ` (${item.partNumber})` : ""}
													{typeof item.qty === "number" ? ` × ${item.qty}` : ""}
													{typeof item.unitPrice === "number"
														? ` ${formatMoney(item.unitPrice, row.currency)}`
														: ""}
												</li>
											))}
										</ul>
									</details>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}

export default ServiceHistory;
