package dataservice

import (
	"sync"
	"time"
)

// cacheEntry holds a cached MoviesResponse with an expiry time.
type cacheEntry struct {
	data      *MoviesResponse
	expiresAt time.Time
}

// responseCache is a simple in-memory cache keyed by the full query string.
var responseCache = struct {
	sync.RWMutex
	items map[string]cacheEntry
}{items: make(map[string]cacheEntry)}

// cacheTTL controls how long cached responses are considered fresh.
const cacheTTL = 5 * time.Minute

// cacheGet retrieves a cached response for the given key if it exists and is not expired.
func cacheGet(key string) (*MoviesResponse, bool) {
	responseCache.RLock()
	entry, ok := responseCache.items[key]
	responseCache.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		return nil, false
	}
	return entry.data, true
}

// cacheSet stores a response in the cache under the given key.
func cacheSet(key string, data *MoviesResponse) {
	responseCache.Lock()
	responseCache.items[key] = cacheEntry{
		data:      data,
		expiresAt: time.Now().Add(cacheTTL),
	}
	responseCache.Unlock()
}
