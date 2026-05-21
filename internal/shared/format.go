package shared

import "time"

// FormatTime renders a time as RFC3339, or an empty string for the zero value
// (so the frontend can treat "unset" times uniformly).
func FormatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format(time.RFC3339)
}
