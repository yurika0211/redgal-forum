package cache

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"time"
)

const l1RedisHitTTL = 5 * time.Second

type MultiLevel struct {
	namespace string
	l1        *memoryCache
	redis     *Client
}

func NewMultiLevel(namespace string, redis *Client) *MultiLevel {
	return &MultiLevel{
		namespace: strings.TrimSpace(namespace),
		l1:        newMemoryCache(),
		redis:     redis,
	}
}

func (c *MultiLevel) GetJSON(ctx context.Context, key string, dest any) (bool, error) {
	if c == nil {
		return false, nil
	}

	fullKey := c.key(key)
	if payload, ok := c.l1.Get(fullKey); ok {
		if err := json.Unmarshal(payload, dest); err != nil {
			c.l1.Delete(fullKey)
			return false, err
		}
		return true, nil
	}

	if c.redis != nil && c.redis.Available() {
		payload, ok, err := c.redis.Get(ctx, fullKey)
		if err == nil && ok {
			c.l1.Set(fullKey, payload, l1RedisHitTTL)
			if unmarshalErr := json.Unmarshal(payload, dest); unmarshalErr == nil {
				return true, nil
			}
		}
	}

	return false, nil
}

func (c *MultiLevel) SetJSON(ctx context.Context, key string, value any, ttl time.Duration) error {
	if c == nil {
		return nil
	}
	if ttl <= 0 {
		return nil
	}

	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}

	fullKey := c.key(key)
	c.l1.Set(fullKey, payload, ttl)

	if c.redis != nil && c.redis.Available() {
		_ = c.redis.SetEX(ctx, fullKey, payload, ttl)
	}

	return nil
}

func (c *MultiLevel) Delete(ctx context.Context, key string) {
	if c == nil {
		return
	}

	fullKey := c.key(key)
	c.l1.Delete(fullKey)
	if c.redis != nil && c.redis.Available() {
		_ = c.redis.Del(ctx, fullKey)
	}
}

func (c *MultiLevel) key(raw string) string {
	key := strings.TrimSpace(raw)
	if c.namespace == "" {
		return key
	}
	if key == "" {
		return c.namespace
	}
	return c.namespace + ":" + key
}

type memoryCache struct {
	mu    sync.RWMutex
	items map[string]memoryCacheEntry
}

type memoryCacheEntry struct {
	payload   []byte
	expiresAt time.Time
}

func newMemoryCache() *memoryCache {
	return &memoryCache{items: make(map[string]memoryCacheEntry)}
}

func (c *memoryCache) Get(key string) ([]byte, bool) {
	now := time.Now()

	c.mu.RLock()
	entry, ok := c.items[key]
	c.mu.RUnlock()
	if !ok {
		return nil, false
	}
	if !entry.expiresAt.IsZero() && now.After(entry.expiresAt) {
		c.Delete(key)
		return nil, false
	}

	copyPayload := make([]byte, len(entry.payload))
	copy(copyPayload, entry.payload)
	return copyPayload, true
}

func (c *memoryCache) Set(key string, payload []byte, ttl time.Duration) {
	entry := memoryCacheEntry{}
	entry.payload = make([]byte, len(payload))
	copy(entry.payload, payload)
	if ttl > 0 {
		entry.expiresAt = time.Now().Add(ttl)
	}

	c.mu.Lock()
	c.items[key] = entry
	c.mu.Unlock()
}

func (c *memoryCache) Delete(key string) {
	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
}
