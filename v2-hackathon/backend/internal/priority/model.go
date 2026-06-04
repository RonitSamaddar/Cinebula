package priority

// Score holds the computed priority score for a piece of content.
type Score struct {
	ContentName string  `json:"content_name"`
	Priority    float64 `json:"priority"`
}
