package filter

// FilterOption describes a single filterable dimension with its available values.
type FilterOption struct {
	ID     string   `json:"id"`
	Label  string   `json:"label"`
	Values []string `json:"values"`
}

// FiltersResponse is returned by GET /api/filters.
type FiltersResponse struct {
	Filters []FilterOption `json:"filters"`
}
