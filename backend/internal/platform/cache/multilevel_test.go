package cache

import (
	"context"
	"testing"
	"time"
)

type cacheTestPayload struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

func TestMultiLevelSetAndGetJSON(t *testing.T) {
	cache := NewMultiLevel("test", nil)
	ctx := context.Background()
	key := "payload"
	value := cacheTestPayload{Name: "rubedo", Count: 3}

	if err := cache.SetJSON(ctx, key, value, time.Second); err != nil {
		t.Fatalf("SetJSON failed: %v", err)
	}

	var got cacheTestPayload
	hit, err := cache.GetJSON(ctx, key, &got)
	if err != nil {
		t.Fatalf("GetJSON failed: %v", err)
	}
	if !hit {
		t.Fatalf("expected cache hit")
	}
	if got != value {
		t.Fatalf("unexpected cache value: got=%+v want=%+v", got, value)
	}
}

func TestMultiLevelDelete(t *testing.T) {
	cache := NewMultiLevel("test", nil)
	ctx := context.Background()

	if err := cache.SetJSON(ctx, "k", cacheTestPayload{Name: "x"}, time.Second); err != nil {
		t.Fatalf("SetJSON failed: %v", err)
	}
	cache.Delete(ctx, "k")

	var got cacheTestPayload
	hit, err := cache.GetJSON(ctx, "k", &got)
	if err != nil {
		t.Fatalf("GetJSON failed: %v", err)
	}
	if hit {
		t.Fatalf("expected cache miss after delete")
	}
}

func TestMultiLevelTTLExpiry(t *testing.T) {
	cache := NewMultiLevel("test", nil)
	ctx := context.Background()

	if err := cache.SetJSON(ctx, "k", cacheTestPayload{Name: "x"}, 25*time.Millisecond); err != nil {
		t.Fatalf("SetJSON failed: %v", err)
	}

	time.Sleep(35 * time.Millisecond)

	var got cacheTestPayload
	hit, err := cache.GetJSON(ctx, "k", &got)
	if err != nil {
		t.Fatalf("GetJSON failed: %v", err)
	}
	if hit {
		t.Fatalf("expected cache miss after ttl expiry")
	}
}
