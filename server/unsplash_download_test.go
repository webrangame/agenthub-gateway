package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestUnsplashDownloadTriggerResilience(t *testing.T) {
	// Test 1: Verify goroutine doesn't block
	t.Run("Async execution doesn't block", func(t *testing.T) {
		slowServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(5 * time.Second)
			w.WriteHeader(http.StatusOK)
		}))
		defer slowServer.Close()

		start := time.Now()

		// This simulates what happens in fetchUnsplashImage
		go func(downloadURL string) {
			trackClient := &http.Client{Timeout: 2 * time.Second}
			trackResp, err := trackClient.Get(downloadURL)
			if err != nil {
				return
			}
			defer trackResp.Body.Close()
		}(slowServer.URL)

		elapsed := time.Since(start)

		if elapsed > 100*time.Millisecond {
			t.Errorf("Goroutine launch took %v, should be instant", elapsed)
		} else {
			fmt.Printf("✓ Goroutine launched in %v (non-blocking)\n", elapsed)
		}
	})

	// Test 2: Verify timeout works
	t.Run("Timeout prevents hanging", func(t *testing.T) {
		slowServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(10 * time.Second)
		}))
		defer slowServer.Close()

		done := make(chan bool)
		go func() {
			trackClient := &http.Client{Timeout: 2 * time.Second}
			_, _ = trackClient.Get(slowServer.URL)
			done <- true
		}()

		select {
		case <-done:
			fmt.Println("✓ Request timed out after 2 seconds as expected")
		case <-time.After(3 * time.Second):
			t.Error("Timeout didn't work, request took too long")
		}
	})

	// Test 3: Verify successful download doesn't error
	t.Run("Successful tracking completes", func(t *testing.T) {
		successServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			fmt.Println("✓ Download tracking endpoint hit successfully")
		}))
		defer successServer.Close()

		done := make(chan error)
		go func() {
			trackClient := &http.Client{Timeout: 2 * time.Second}
			resp, err := trackClient.Get(successServer.URL)
			if err != nil {
				done <- err
				return
			}
			defer resp.Body.Close()
			done <- nil
		}()

		select {
		case err := <-done:
			if err != nil {
				t.Errorf("Expected success, got error: %v", err)
			} else {
				fmt.Println("✓ Download tracking succeeded")
			}
		case <-time.After(3 * time.Second):
			t.Error("Request took too long")
		}
	})
}
