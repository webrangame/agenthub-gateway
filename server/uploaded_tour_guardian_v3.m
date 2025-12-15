agent TripGuardianV3 {
  // v3 goal: ZERO HALLUCINATION - ask for missing data instead of inventing it
  // Strict rule: if data is not from a tool or user, explicitly state "MISSING" and ask

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

    // 1. Extract what the user provided + identify what's MISSING
    llm ExtractDetails {
      model: "gemini-flash-latest"
      prompt: "Extract trip details from: '${input}'.

Output format:
- Destination: [city name or 'MISSING']
- Duration: [nights/days or 'MISSING']
- Start Date: [specific date or 'MISSING']
- End Date: [specific date or 'MISSING']
- Specific venues/events: [list or 'MISSING']
- Budget: [amount or 'MISSING']
- Interests: [list or 'MISSING']

CRITICAL RULE: If the user did NOT provide a specific piece of information, write 'MISSING' for that field. DO NOT guess or infer dates, times, or other specifics."
    }

    // 2. Extract Destination City
    llm ExtractCity {
      model: "gemini-flash-latest"
      prompt: "Extract just the main destination city name from: '${input}'. Return ONLY the city name (e.g., 'Delhi'). If no city is mentioned, return 'MISSING'."
    }

    // 3. Sky Watch (Direct Fetch) - only if city is known
    http_request CheckWeather {
      url: "https://wttr.in/${ExtractCity_output}?format=3"
      method: "GET"
      timeout: 30
      optional: "true"
    }

    // 4. Logistical Validation - list what's missing to validate timing
    llm KnowledgeCheck {
      model: "gemini-flash-latest"
      prompt: "You are a Logistical Validator for ${ExtractCity_output}.

User trip details: ${ExtractDetails_output}
Current date (UTC): ${GetDate_output}

Task:
1. Identify MISSING critical information needed to validate timing:
   - Exact start date (for holiday/closure checks)
   - Specific venue names (for opening hours validation)
   - Arrival/departure times (for last train / connection checks)

2. For any MISSING data, output:
   '⚠️ MISSING: [item]'
   'REQUIRED: [specific question to ask user]'

3. ONLY if you have complete data, provide timing warnings (e.g., 'Museum X closed on Mondays').

CRITICAL RULE: DO NOT invent specific opening hours, closure days, or travel times. If you don't have verified info, say 'MISSING: specific venue hours' and ask the user to clarify which venues they plan to visit."
    }

    // 5. Real Review Analysis (Google Places)
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

    // 6. Review Summarizer - acknowledge if data is unavailable
    llm ReviewSummarizer {
      model: "gemini-flash-latest"
      prompt: "Review Data Analysis for ${ExtractCity_output}.

Review data: ${FetchReviews_output}
User trip: ${input}

Task:
1. Check if review data is valid (not an API error).
2. If data is MISSING/invalid, output:
   '⚠️ MISSING: Live review data'
   'IMPACT: Cannot provide insider tips or hidden warnings from recent travelers'
   'FALLBACK: Providing general travel advice (not verified by recent reviews)'

3. ONLY if reviews are valid, extract:
   - Insider Tips (specific, actionable)
   - Hidden Warnings (complaints, issues)
   - Real Vibe (touristy vs authentic)

CRITICAL RULE: Do NOT invent review content or pretend you have live data when you don't."
    }

    // 7. Safety Briefing - acknowledge limits of non-live data
    llm NewsAlert {
      model: "gemini-flash-latest"
      prompt: "Safety Briefing for ${ExtractCity_output}.

User trip: ${input}
Extracted details: ${ExtractDetails_output}

Task:
1. State clearly: 'No verified live news data available in this run (as of execution time).'
2. List what's MISSING to provide accurate safety alerts:
   - Exact travel dates (for current event/strike checks)
   - Specific neighborhoods (for localized risk assessment)

3. Provide ONLY:
   - Common, well-known safety risks for ${ExtractCity_output} (e.g., pickpocketing in X area)
   - Emergency numbers (police, ambulance)
   - General transport safety tips

CRITICAL RULE: DO NOT invent breaking news, current strikes, or recent disasters. If you don't have live data, explicitly say so."
    }

    // 8. Cultural Wisdom - focus on timeless facts, not current events
    llm GeniusLoci {
      model: "gemini-flash-latest"
      prompt: "Cultural Wisdom for ${ExtractCity_output}.

User trip: ${input}

Provide timeless, well-established cultural guidance for ${ExtractCity_output}:
1. Behavior: Dress codes, etiquette (at religious sites, on public transport, etc.)
2. Connection: A verified historical fact about ${ExtractCity_output}
3. Local Secret: A known local custom or hidden spot (not invented)

CRITICAL RULE: Focus ONLY on ${ExtractCity_output}. Do NOT invent customs. If you're uncertain, say 'General cultural guideline' instead of claiming it's specific to this city."
    }

    // 9. Final Report - compile missing data list + what's available
    llm GenerateReport {
      model: "gemini-flash-latest"
      prompt: "Trip Guardian Report for ${ExtractCity_output}.

User input: ${input}
Extracted details: ${ExtractDetails_output}

Data sources:
- Logistics: ${KnowledgeCheck_output}
- Reviews: ${ReviewSummarizer_output}
- Safety: ${NewsAlert_output}
- Culture: ${GeniusLoci_output}
- Weather: ${CheckWeather_output}

STRUCTURE YOUR OUTPUT EXACTLY AS FOLLOWS (use these exact section headers):

═══════════════════════════════════════════
SECTION 1: MISSING DATA - ACTION REQUIRED
═══════════════════════════════════════════

[List each missing item on a NEW LINE with clear formatting:]
⚠️ MISSING: [item name]
→ Question: [specific question for user]
→ Why needed: [brief explanation]

[Repeat for each missing item]

═══════════════════════════════════════════
SECTION 2: WEATHER BRIEFING
═══════════════════════════════════════════

[If weather data exists from ${CheckWeather_output}:]
Current Conditions: [state exactly what the tool returned]
Impact: [explain how this affects the trip]
Preparation: [what to pack/prepare]

[If weather data is missing:]
⚠️ Weather data unavailable - check wttr.in/${ExtractCity_output} manually

═══════════════════════════════════════════
SECTION 3: SAFETY BRIEFING
═══════════════════════════════════════════

[From ${NewsAlert_output}, include ONLY:]
- Common risks (pickpocketing, scams, etc.)
- Emergency numbers
- Transport safety tips

DO NOT invent current events or breaking news.

═══════════════════════════════════════════
SECTION 4: CULTURAL GUIDANCE
═══════════════════════════════════════════

[From ${GeniusLoci_output}, include:]
1. Dress codes and etiquette
2. Historical fact
3. Local secret/custom

═══════════════════════════════════════════
SECTION 5: LOGISTICS VALIDATION
═══════════════════════════════════════════

[From ${KnowledgeCheck_output}:]
[If insufficient data, state:]
Insufficient data - see MISSING DATA section above

[If data is complete, provide warnings]

═══════════════════════════════════════════

CRITICAL RULES:
- Use these exact section headers with the ═══ delimiters
- Keep sections clearly separated
- Do NOT mix content from different sections
- If a section has no data, explicitly state 'No data available'
- Do NOT use complex markdown tables (use simple bullet lists instead)"
    }
  }

  edges {
    START -> GetDate
    START -> ExtractDetails
    START -> ExtractCity

    ExtractCity -> CheckWeather
    ExtractCity -> KnowledgeCheck
    ExtractCity -> FetchReviews
    ExtractCity -> NewsAlert
    ExtractCity -> GeniusLoci

    ExtractDetails -> KnowledgeCheck

    FetchReviews -> ReviewSummarizer

    GetDate -> KnowledgeCheck

    CheckWeather -> GenerateReport
    KnowledgeCheck -> GenerateReport
    ReviewSummarizer -> GenerateReport
    NewsAlert -> GenerateReport
    GeniusLoci -> GenerateReport
    GenerateReport -> END
  }
}
