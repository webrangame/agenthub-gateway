agent TripGuardian {
  network {
    registry: "http://3.208.94.148:8080"
    capabilities: ["trip-guardian", "travel-assistant", "weather-monitoring", "safety-alerts"]
  }

  schedule {
    interval: "1m"
    mode: "proactive"
  }

  nodes {
    // 0. The Chronometer (Time Awareness)
    // We use common logic to get "Today" without changing the framework.
    // 0. The Chronometer (Time Awareness)
    // We use common logic to get "Today" without changing the framework.
    http_request GetDate {
      url: "https://timeapi.io/api/Time/current/zone?timeZone=UTC"
      method: "GET"
    }

    // 1. Extract Itinerary Details
    llm ExtractDetails {
      model: "gpt-4"
      prompt: "Extract the core events from this itinerary: '${input}'. Return a JSON list with 'event', 'location', 'time', and 'date'. If information is missing, infer it or mark as 'unknown'."
    }

    // 2. Check Weather (Parallel)
    // We assume the user creates a 'WeatherAgent' separately, or we use a direct HTTP call if preferred.
    // Here we use the Registry to find the WeatherAgent we saw earlier.
    // 2. Sky Watch (Direct Fetch)
    // We switched to direct fetch for the launch to avoid dependency on an external agent running.
    
    // Retrying extraction to get just City for simple weather check
    llm ExtractCity {
       model: "gpt-3.5-turbo"
       prompt: "Extract just the main city name from this text: '${input}'. Return only the city name."
    }

    http_request CheckWeather {
      url: "https://wttr.in/${ExtractCity_output}?format=3"
      method: "GET"
    }

    // 3. Knowledge Check (Logistical Wisdom)
    llm KnowledgeCheck {
      model: "gpt-4"
      prompt: "You are a Logistical Master. Review strict facts for: '${input}'. \nContext: Today is ${GetDate_output}. \nCheck for: 1. Start/End times vs Opening Hours. 2. Holidays/Closures. \nOutput as 'Travel Wisdom': Warn about tight connections, closed venues, or timing traps."
    }

    // A. Real Review Analysis (Google Places)
    // Step 1: Search for the place to get reviews
    // We search for the *text* input directly (e.g. "Hotel X in Paris")
    http_request FetchReviews {
      url: "https://places.googleapis.com/v1/places:searchText"
      method: "POST"
      headers: {
        "Content-Type": "application/json"
        "X-Goog-Api-Key": "${env.GOOGLE_MAPS_KEY}" 
        "X-Goog-FieldMask": "places.displayName,places.rating,places.reviews"
      }
      body: "{\"textQuery\": \"${input}\"}"
    }

    // Step 2: Digest the raw JSON reviews
    // Step 2: Digest the raw JSON reviews (Experience Wisdom)
    llm ReviewSummarizer {
      model: "gpt-4"
      prompt: "Analyze these Google Reviews for '${input}': '${FetchReviews_output}'. \nProvide 'Experience Wisdom':\n1. Insider Tips (e.g. 'Ask for a room on the top floor').\n2. Hidden Warnings (e.g. 'Construction noise starts at 7AM').\n3. The 'Real' Vibe (is it touristy or authentic?)."
    }

    // B. News & Safety Beacon
    // B. News & Safety Beacon
    llm NewsAlert {
      model: "gpt-3.5-turbo"
      prompt: "Check for any recent breaking news, natural disasters (floods, cyclones), strikes, protests, or safety alerts for the location in: '${input}'. Provide a 'Safety Briefing'."
    }

    // C. The "Spirit of the Place" (AI Guide)
    // C. The "Spirit of the Place" (Cultural Wisdom)
    llm GeniusLoci {
      model: "gpt-4"
      prompt: "You are the 'Genius Loci' (Spirit of the Place). For: '${input}'. \nProvide 'Cultural Wisdom':\n1. Behavior: How to dress/act to show respect (e.g. 'Cover knees at temple').\n2. Connection: A deep historical fact that connects the traveler to the soul of the place.\n3. Local Secret: One thing only locals do here."
    }

    // 4. Final Report
    llm GenerateReport {
      model: "gpt-4"
      prompt: "Synthesize a 'Trip Guardian Report' for '${input}'. \n\nInputs:\n1. 🔍 Vibe: ${ReviewSummarizer_output}\n2. 🛡️ Safety: ${NewsAlert_output}\n3. 🧞 Context: ${GeniusLoci_output}\n4. 🌦️ Weather: ${CheckWeather_output}\n\nTask: Combine these into a strategic guide.\n- 🌦️ Sky Watch: Don't just list weather. Explain IMPACT on the plan (e.g. 'Heavy rain makes the monastery path slippery'). practical 'PREPARATION' (Pack leech socks, umbrella).\n- 🛡️ Safety: Highlight Natural Disasters or Unrest with 🛑.\n- 🧞 Norms: How to behave."
    }
  }

  edges {
    START -> GetDate
    START -> ExtractDetails
    START -> ExtractCity
    
    ExtractCity -> CheckWeather

    ExtractDetails -> KnowledgeCheck
    
    // New Parallel Branches
    ExtractDetails -> FetchReviews
    FetchReviews -> ReviewSummarizer
    ExtractDetails -> NewsAlert
    ExtractDetails -> GeniusLoci

    // Temporal Dependencies (Must know date before checking facts)
    GetDate -> KnowledgeCheck
    GetDate -> GeniusLoci
    
    // Final Synthesis
    CheckWeather -> GenerateReport
    KnowledgeCheck -> GenerateReport
    ReviewSummarizer -> GenerateReport
    NewsAlert -> GenerateReport
    GeniusLoci -> GenerateReport
    GenerateReport -> END
  }
}
