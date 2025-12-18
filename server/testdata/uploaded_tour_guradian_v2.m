agent TripGuardianV2 {
  // v2 goal: reduce hallucinations by anchoring all LLM nodes to structured outputs,
  // especially the extracted city name.

  schedule {
    interval: "30m"
    mode: "proactive"
  }

  nodes {
    // 0. The Chronometer (Time Awareness)
    http_request GetDate {
      url: "https://timeapi.io/api/Time/current/zone?timeZone=UTC"
      method: "GET"
      timeout: 30
      optional: "true"
    }

    // 1. Extract Itinerary Details (kept, but no longer the only context driver)
    llm ExtractDetails {
      model: "gemini-flash-latest"
      prompt: "Extract the core events from this itinerary: '${input}'. Return a JSON list with 'event', 'location', 'time', and 'date'. If information is missing, mark as 'unknown' (do NOT invent specific facts)."
    }

    // 2. Extract Destination City (anchor for all other LLM prompts)
    llm ExtractCity {
      model: "gemini-flash-latest"
      prompt: "Extract just the main destination city name from this text: '${input}'. Return ONLY the city name (e.g., 'Delhi')."
    }

    // 3. Sky Watch (Direct Fetch)
    http_request CheckWeather {
      url: "https://wttr.in/${ExtractCity_output}?format=3"
      method: "GET"
      timeout: 30
      optional: "true"
    }

    // 4. Knowledge Check (Logistical Wisdom) - now anchored to city
    llm KnowledgeCheck {
      model: "gemini-flash-latest"
      prompt: "You are a Logistical Master for ${ExtractCity_output}.\n\nUser Context (trip plan): ${input}\nToday's date info (UTC): ${GetDate_output}\n\nCheck for: 1) Start/End times vs typical opening hours, 2) seasonal/holiday timing traps.\n\nOutput as 'Travel Wisdom' with clear warnings.\nIMPORTANT: If a fact is uncertain, state uncertainty and ask a clarifying question instead of inventing specifics."
    }

    // 5. Real Review Analysis (Google Places) - query anchored to extracted city
    http_request FetchReviews {
      url: "https://places.googleapis.com/v1/places:searchText"
      method: "POST"
      headers: {
        "Content-Type": "application/json"
        "X-Goog-Api-Key": "${env.GOOGLE_MAPS_KEY}"
        "X-Goog-FieldMask": "places.displayName,places.rating,places.reviews"
      }
      body: "{\"textQuery\": \"${ExtractCity_output}\"}"
      timeout: 30
      optional: "true"
    }

    // 6. Digest Reviews - add city anchoring + keep user context
    llm ReviewSummarizer {
      model: "gemini-flash-latest"
      prompt: "Analyze these Google Reviews for ${ExtractCity_output}.\n\nReview data: ${FetchReviews_output}\nUser trip plan: ${input}\n\nProvide 'Experience Wisdom' SPECIFICALLY for ${ExtractCity_output}:\n1. Insider Tips\n2. Hidden Warnings\n3. The 'Real' Vibe\n\nIMPORTANT: Focus ONLY on ${ExtractCity_output}. If reviews are missing/empty, explicitly say so and provide general-but-labeled guidance (e.g., 'General tip (not from reviews): ...')."
    }

    // 7. News & Safety Beacon - city anchored + non-verified disclaimer to reduce fabrication
    llm NewsAlert {
      model: "gemini-flash-latest"
      prompt: "Safety Briefing for ${ExtractCity_output}.\n\nUser Context (trip plan): ${input}\n\nTask:\n- If you do NOT have real-time, verifiable news in your context, DO NOT invent breaking events.\n- Instead, state: 'No verified live alerts available in this run.'\n- Then provide: (a) common safety risks for ${ExtractCity_output}, (b) practical precautions, (c) emergency numbers and transport advice.\n\nIMPORTANT: Focus ONLY on ${ExtractCity_output}. Do not discuss unrelated places or abstract topics."
    }

    // 8. The "Spirit of the Place" (Cultural Wisdom) - city anchored (core fix)
    llm GeniusLoci {
      model: "gemini-flash-latest"
      prompt: "You are the 'Genius Loci' (Spirit of the Place) for ${ExtractCity_output}.\n\nContext - User's trip plan: ${input}\n\nProvide Cultural Wisdom SPECIFICALLY for ${ExtractCity_output}:\n1. Behavior: How to dress/act to show respect\n2. Connection: A deep historical fact about ${ExtractCity_output}\n3. Local Secret: One thing only locals do in ${ExtractCity_output}\n\nIMPORTANT: Focus ONLY on ${ExtractCity_output}. Do not provide generic travel advice and do not talk about unrelated topics."
    }

    // 9. Final Report (synthesis) - anchored + includes KnowledgeCheck + itinerary extraction
    llm GenerateReport {
      model: "gemini-flash-latest"
      prompt: "Synthesize a 'Trip Guardian Report' for ${ExtractCity_output}.\n\nUser Trip Plan: ${input}\n\nInputs:\n1. 🗺️ Itinerary Extraction: ${ExtractDetails_output}\n2. 🔬 Travel Wisdom (Logistics): ${KnowledgeCheck_output}\n3. 🔍 Vibe (Reviews): ${ReviewSummarizer_output}\n4. 🛡️ Safety Briefing: ${NewsAlert_output}\n5. 🧞 Cultural Wisdom: ${GeniusLoci_output}\n6. 🌦️ Weather: ${CheckWeather_output}\n\nTask: Combine these into a strategic, practical guide.\n- Keep everything SPECIFIC to ${ExtractCity_output}.\n- If an input is missing or looks like an error, label it and avoid making up replacements.\n- For Weather: explain impact + preparation.\n- For Safety: highlight any critical warnings with 🛑.\n- For Culture: actionable norms + one local secret."
    }
  }

  edges {
    START -> GetDate
    START -> ExtractDetails
    START -> ExtractCity

    // Ensure structured city context is available before downstream nodes that reference it
    ExtractCity -> CheckWeather
    ExtractCity -> KnowledgeCheck
    ExtractCity -> FetchReviews
    ExtractCity -> NewsAlert
    ExtractCity -> GeniusLoci

    // Keep itinerary influence where helpful
    ExtractDetails -> KnowledgeCheck

    // Reviews path
    FetchReviews -> ReviewSummarizer

    // Temporal dependency for logistics
    GetDate -> KnowledgeCheck

    // Final synthesis
    CheckWeather -> GenerateReport
    KnowledgeCheck -> GenerateReport
    ReviewSummarizer -> GenerateReport
    NewsAlert -> GenerateReport
    GeniusLoci -> GenerateReport
    GenerateReport -> END
  }
}

