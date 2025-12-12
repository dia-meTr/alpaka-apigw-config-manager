package utils

import (
	"strconv"
)

// ParseUint parses a string to uint, returns 0 and false if invalid
func ParseUint(s string) (uint, bool) {
	val, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return 0, false
	}
	return uint(val), true
}

