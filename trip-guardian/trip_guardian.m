agent TripGuardian {
//   network {
//     registry: "http://3.208.94.148:8080"
//     capabilities: ["trip-guardian", "travel-assistant", "weather-monitoring", "safety-alerts"]
//   }

  schedule {
    interval: "1m"
    mode: "proactive"
  }

  nodes {
    // 0. The Chronometer (Time Awareness)
    // We use common logic to get "Today" without changing the framework.
    // 0. The Chronometer (Time Awareness)
    // We use common logic to get "Today" without changing the framework.
    // 0. The Chronometer (Time Awareness)
    // Switched to a simple echo for stability during demo (TimeAPI is flaky)
    // 0. The Chronometer (Time Awareness)
    // Switched to a simple LLM mock for stability (exec is not supported)
    llm GetDate {
      model: "gpt-3.5-turbo"
      prompt: "You are a system clock. Output exactly this date and nothing else: 2025-05-21"
    }

    // 1. Extract Itinerary Details
    llm ExtractDetails {
      model: "gpt-3.5-turbo"
      prompt: "Extract the core events from this itinerary: '${input}'. Return a JSON list with 'event', 'location', 'time', and 'date'. If information is missing, infer it or mark as 'unknown'."
    }

    // 2. Check Weather (Parallel)
    // We assume the user creates a 'WeatherAgent' separately, or we use a direct HTTP call if preferred.
    // Here we use the Registry to find the WeatherAgent we saw earlier.
    // 2. Sky Watch (Direct Fetch)
    // We switched to direct fetch for the launch to avoid dependency on an external agent running.
    
    // 2. Sky Watch (Direct Fetch)
    llm ExtractCity {
       model: "gpt-3.5-turbo"
       prompt: "Extract just the main city name from this text: '${input}'. Return only the city name."
    }

    // DEMO MODE: Mock Weather to avoid timeouts
    llm CheckWeather {
      model: "gpt-3.5-turbo"
      prompt: "Simulate a current weather report for '${ExtractCity_output}' in 3 lines. Include temp and condition. Start with 'CheckWeather_output:'"
    }

    // 3. Knowledge Check (Logistical Wisdom)
    llm KnowledgeCheck {
      model: "gpt-3.5-turbo"
      prompt: "You are a Logistical Master. Review strict facts for: '${input}'. \nContext: Today is ${GetDate_output}. \nCheck for: 1. Start/End times vs Opening Hours. 2. Holidays/Closures. \nOutput as 'Travel Wisdom': Warn about tight connections, closed venues, or timing traps."
    }

    // A. Real Review Analysis (Google Places)
    // Step 1: Search for the place to get reviews
    // We search for the *text* input directly (e.g. "Hotel X in Paris")
    // A. Real Review Analysis (Google Places)
    // Step 1: Search for the place to get reviews
    // We search for the *text* input directly (e.g. "Hotel X in Paris")
    // A. Real Review Analysis (Google Places)
    // Step 1: Search for Reviews
    // DEMO MODE: Mock Reviews
    llm FetchReviews {
      model: "gpt-3.5-turbo"
      prompt: "Generate 3 realistic fake reviews for '${input}'. Return them as text. Start with 'FetchReviews_output:'"
    }

    // Step 2: Digest the raw JSON reviews (Experience Wisdom)
    llm ReviewSummarizer {
      model: "gpt-3.5-turbo"
      prompt: "Analyze these Google Reviews for '${input}': '${FetchReviews_output}'. \nProvide 'Experience Wisdom'.\nIMPORTANT: Start your response with 'REVIEW:'.\n1. Insider Tips.\n2. Hidden Warnings.\n3. The 'Real' Vibe."
    }

    // B. News & Safety Beacon
    // B. News & Safety Beacon
    llm NewsAlert {
      model: "gpt-3.5-turbo"
      prompt: "Check for any recent breaking news, natural disasters (floods, cyclones), strikes, protests, or safety alerts for the location in: '${input}'. Provide a 'Safety Briefing'.\nIMPORTANT: Start your response with 'SAFETY:'."
    }

    // C. The "Spirit of the Place" (AI Guide)
    // C. The "Spirit of the Place" (Cultural Wisdom)
    // C. The "Spirit of the Place" (Cultural Wisdom)
    llm GeniusLoci {
      model: "gpt-3.5-turbo"
      prompt: "You are the 'Genius Loci' (Spirit of the Place). For: '${input}'. \nProvide 'Cultural Wisdom'.\nIMPORTANT: Start your response with 'CULTURE:'.\n1. Behavior: How to dress/act to show respect.\n2. Connection: A deep historical fact.\n3. Local Secret: One thing only locals do here."
    }

    // 4. Final Report
    // 4. Final Report
    llm GenerateReport {
      model: "gpt-3.5-turbo"
      prompt: "Synthesize a 'Trip Guardian Report' for '${input}'. \n\nInputs:\n1. 🔍 Vibe: ${ReviewSummarizer_output}\n2. 🛡️ Safety: ${NewsAlert_output}\n3. 🧞 Context: ${GeniusLoci_output}\n4. 🌦️ Weather: ${CheckWeather_output}\n\nTask: Combine these into a strategic guide.\nIMPORTANT: Start your response with 'REPORT:'.\n- 🌦️ Sky Watch: Don't just list weather. Explain IMPACT on the plan.\n- 🛡️ Safety: Highlight Natural Disasters/Unrest.\n- 🧞 Norms: How to behave."
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
