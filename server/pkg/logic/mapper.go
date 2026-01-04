package logic

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// MapToCard converts a raw message (from an agent node) into card properties.
func MapToCard(message string, destination string) (string, string, map[string]interface{}) {
	var cardType = "article"
	var priority = "medium"
	var data = map[string]interface{}{
		"summary": message,
	}

	// PREFIX DETECTION LOGIC
	// We check for "NodeName: Content" pattern
	prefixMap := map[string]string{
		"NewsAlert:":        "NewsAlert",
		"CheckWeather:":     "CheckWeather",
		"KnowledgeCheck:":   "KnowledgeCheck",
		"ReviewSummarizer:": "ReviewSummarizer",
		"GeniusLoci:":       "GeniusLoci",
		"GenerateReport:":   "GenerateReport",
	}

	for prefix, nodeTitle := range prefixMap {
		if strings.HasPrefix(strings.TrimSpace(message), prefix) || strings.Contains(message, prefix) {
			data["title"] = nodeTitle
			// Clean the message by removing the prefix
			cleanMsg := strings.Replace(message, prefix, "", 1)
			data["summary"] = strings.TrimSpace(cleanMsg)
			message = cleanMsg // Update for further processing
			break
		}
	}

	// CARD TYPE MAPPING (based on the now-known title or content)
	title, _ := data["title"].(string)

	if title == "NewsAlert" || contains(message, "SAFETY:") || contains(message, "Warning") {
		cardType = "safe_alert"
		priority = "high"
		data["message"] = data["summary"]
		data["level"] = "warning"
		data["category"] = "Safety"
		data["colorTheme"] = "red"
	} else if title == "CheckWeather" || contains(message, "Weather") {
		cardType = "weather"
		data["source"] = "Weather Agent"
		data["category"] = "Weather"
		data["colorTheme"] = "blue"
		data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		data["description"] = data["summary"]
		data["temp"] = "22°C"
		data["location"] = "Destination"
		data["condition"] = "Cloudy"
		// Extract country from destination (e.g., "Delhi, India" -> "India")
		country := ExtractCountry(destination)
		query := "landscape"
		if country != "" {
			query = country // Just the country name
		}
		fmt.Printf("DEBUG: Unsplash Weather Query: '%s' (Country: '%s')\n", query, country)
		if img, name, link := FetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		}
	} else if title == "GeniusLoci" || title == "KnowledgeCheck" || title == "ReviewSummarizer" {
		cardType = "cultural_tip"
		data["source"] = "Genius Loci"
		data["category"] = "Culture"
		data["colorTheme"] = "purple"

		country := ExtractCountry(destination)
		query := "culture"
		if country != "" {
			query = country // Just the country name
		}
		fmt.Printf("DEBUG: Unsplash Culture Query: '%s' (Country: '%s')\n", query, country)
		if img, name, link := FetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?auto=format&fit=crop&w=800&q=80"
		}
	} else if title == "GenerateReport" {
		cardType = "article"
		data["source"] = "Final Synthesis"
		data["category"] = "Report"
		data["colorTheme"] = "green"

		country := ExtractCountry(destination)
		query := "travel"
		if country != "" {
			query = country // Just the country name
		}
		fmt.Printf("DEBUG: Unsplash Report Query: '%s' (Country: '%s')\n", query, country)
		if img, name, link := FetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"
		}
	}

	return cardType, priority, data
}

// RefineCardType updates card properties in-place based on refined analysis
func RefineCardType(title string, message string, cardType *string, priority *string, data map[string]interface{}, destination string) {
	if title == "newsAlert" || title == "NewsAlert" || contains(message, "SAFETY:") || contains(message, "Warning") {
		*cardType = "safe_alert"
		*priority = "high"
		data["message"] = data["summary"]
		data["level"] = "warning"
		data["category"] = "Safety"
		data["colorTheme"] = "red"
	} else if title == "checkWeather" || title == "CheckWeather" || contains(message, "Weather") {
		*cardType = "weather"
		data["source"] = "Weather Agent"
		data["category"] = "Weather"
		data["colorTheme"] = "blue"
		data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		data["description"] = data["summary"]
		data["temp"] = "22°C"
		data["location"] = "Destination"
		data["condition"] = "Cloudy"
		country := ExtractCountry(destination)
		query := "landscape"
		if country != "" {
			query = country // Just the country name
		}
		if img, name, link := FetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		}
	} else if title == "geniusLoci" || title == "GeniusLoci" || title == "knowledgeCheck" || title == "KnowledgeCheck" || title == "reviewSummarizer" || title == "ReviewSummarizer" {
		*cardType = "cultural_tip"
		data["source"] = "Genius Loci"
		data["category"] = "Culture"
		data["colorTheme"] = "purple"
		country := ExtractCountry(destination)
		query := "culture"
		if country != "" {
			query = country // Just the country name
		}
		if img, name, link := FetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?auto=format&fit=crop&w=800&q=80"
		}
	} else if title == "generateReport" || title == "GenerateReport" {
		*cardType = "article"
		data["source"] = "Final Synthesis"
		data["category"] = "Report"
		data["colorTheme"] = "green"
		country := ExtractCountry(destination)
		query := "travel landscape"
		if country != "" {
			query = country + " travel landscape"
		}
		if img, name, link := FetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"
		}
	}
}

// FetchUnsplashImage queries the Unsplash API for a random photo matching the query.
// It returns the photo URL, photographer name, and profile link (or empty strings).
func FetchUnsplashImage(query string) (string, string, string) {
	fmt.Printf("🔍 fetchUnsplashImage called with query: '%s'\n", query)
	apiKey := os.Getenv("UNSPLASH_ACCESS_KEY")
	if apiKey == "" {
		fmt.Println("❌ UNSPLASH_ACCESS_KEY not set!")
		return "", "", ""
	}

	// Construct URL
	// Endpoint: https://api.unsplash.com/photos/random
	// Params: query, orientation=landscape, count=1
	url := fmt.Sprintf("https://api.unsplash.com/photos/random?query=%s&orientation=landscape&client_id=%s",
		strings.ReplaceAll(query, " ", "%20"), apiKey)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		fmt.Printf("⚠️ Unsplash API Error: %v\n", err)
		return "", "", ""
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		// Query too specific, try simpler fallback
		fmt.Printf("⚠️ Unsplash returned 404 for '%s', trying simpler query...\n", query)

		// Extract just the destination (remove ", Sri Lanka" or similar patterns)
		simplifiedQuery := query
		if idx := strings.Index(query, ","); idx > 0 {
			simplifiedQuery = strings.TrimSpace(query[:idx])
		}
		// Remove very specific terms
		simplifiedQuery = strings.ReplaceAll(simplifiedQuery, " culture tradition", " travel")
		simplifiedQuery = strings.ReplaceAll(simplifiedQuery, " weather sky", " landscape")

		if simplifiedQuery != query {
			fmt.Printf("🔄 Retrying with: '%s'\n", simplifiedQuery)
			// Recursive retry with simplified query
			return FetchUnsplashImage(simplifiedQuery)
		}

		fmt.Printf("⚠️ Unsplash API Returned: 404 (No images found)\n")
		return "", "", ""
	}

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("⚠️ Unsplash API Returned: %d\n", resp.StatusCode)
		return "", "", ""
	}

	var result struct {
		Urls struct {
			Regular string `json:"regular"`
			Small   string `json:"small"`
		} `json:"urls"`
		Links struct {
			DownloadLocation string `json:"download_location"`
		} `json:"links"`
		User struct {
			Name  string `json:"name"`
			Links struct {
				Html string `json:"html"`
			} `json:"links"`
		} `json:"user"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		fmt.Printf("⚠️ Unsplash Decode Error: %v\n", err)
		return "", "", ""
	}

	// Trigger download tracking (required by Unsplash API guidelines)
	// Run asynchronously with timeout to prevent blocking if Unsplash is down
	if result.Links.DownloadLocation != "" {
		fmt.Printf("📸 Unsplash: Triggering download for image...\n")
		go func(downloadURL, clientID string) {
			// Append client_id to download URL (required for authentication)
			if !strings.Contains(downloadURL, "client_id=") {
				separator := "?"
				if strings.Contains(downloadURL, "?") {
					separator = "&"
				}
				downloadURL = fmt.Sprintf("%s%sclient_id=%s", downloadURL, separator, clientID)
			}

			trackClient := &http.Client{Timeout: 2 * time.Second}
			trackResp, err := trackClient.Get(downloadURL)
			if err != nil {
				fmt.Printf("⚠️ Unsplash download tracking failed (non-critical): %v\n", err)
				return
			}
			defer trackResp.Body.Close()
			fmt.Printf("✅ Unsplash download tracked! (Status: %d)\n", trackResp.StatusCode)
		}(result.Links.DownloadLocation, apiKey)
	}

	return result.Urls.Regular, result.User.Name, result.User.Links.Html
}

func CleanMessage(msg string) string {
	// Remove common prefixes
	prefixes := []string{
		"CheckWeather_output:", "GeniusLoci_output:", "NewsAlert_output:", "GenerateReport_output:", "output:", "result:",
		"SAFETY:", "CULTURE:", "REPORT:", "REVIEW:",
	}
	for _, p := range prefixes {
		msg = strings.ReplaceAll(msg, p, "")
	}
	return msg
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

// ExtractCountry extracts the country from a destination string
// Examples: "Delhi, India" -> "India", "Pasikuda, Sri Lanka" -> "Sri Lanka"
func ExtractCountry(destination string) string {
	if destination == "" {
		return ""
	}

	// Check if destination contains a comma (e.g., "City, Country")
	if idx := strings.LastIndex(destination, ","); idx > 0 && idx < len(destination)-1 {
		country := strings.TrimSpace(destination[idx+1:])
		return country
	}

	// If no comma, assume the whole destination is the country/region
	return destination
}

// ShouldSkipMessage determines if an event should be ignored (logs, system messages, etc)
func ShouldSkipMessage(message, eventType, nodeName string) bool {
	// Skip logs (unless specific node needs debugging, for now skip all)
	if eventType == "log" && nodeName != "CheckWeather" {
		return true
	}

	// Skip empty
	if strings.TrimSpace(message) == "" {
		return true
	}

	// Skip system messages
	if strings.HasPrefix(message, "INIT") || strings.HasPrefix(message, "---") {
		return true
	}

	// Skip raw JSON if somehow passed as message
	if strings.HasPrefix(strings.TrimSpace(message), "{") && strings.HasSuffix(strings.TrimSpace(message), "}") {
		return true
	}

	// Skip too short
	if len(strings.TrimSpace(message)) < 3 {
		return true
	}

	return false
}

// ExtractTextFromEvent extracts text from event JSON
func ExtractTextFromEvent(eventJSON string) string {
	var evt struct {
		Message string `json:"message"`
	}
	if err := json.Unmarshal([]byte(eventJSON), &evt); err == nil {
		var nodeInfo struct {
			Text string `json:"text"`
		}
		if err := json.Unmarshal([]byte(evt.Message), &nodeInfo); err == nil && nodeInfo.Text != "" {
			return nodeInfo.Text
		}
		return evt.Message
	}
	return ""
}
