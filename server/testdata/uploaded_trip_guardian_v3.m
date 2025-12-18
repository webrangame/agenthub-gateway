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
      url: "https://timeapi.io/api/Time/current/zone?timeZone=Asia/Colombo"
      method: "GET"
      timeout: 30
      optional: "true"
    }

    // 1. Extract what the user provided + identify what's MISSING
    llm ExtractDetails {
      model: "gemini-flash-latest"
      prompt: "CURRENT DATE/TIME: ${GetDate_output}

Extract trip details from: '${input}'.

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
      prompt: "CURRENT DATE/TIME: ${GetDate_output}

Extract just the main destination city name from: '${input}'. Return ONLY the city name (e.g., 'Delhi'). If no city is mentioned, return 'MISSING'."
    }

    // 3. Sky Watch (Direct Fetch) - only if city is known
    http_request CheckWeather {
      url: "https://wttr.in/${ExtractCity_output}?format=3"
      method: "GET"
      timeout: 30
      optional: "true"
    }

    // 4. Logistical Validation - provide timing warnings based on available data
    llm KnowledgeCheck {
      model: "gemini-flash-latest"
      prompt: "CURRENT DATE/TIME: ${GetDate_output}

You are a Logistical Validator for ${ExtractCity_output}.

User trip details: ${ExtractDetails_output}

Check if the destination is valid:
- If '${ExtractCity_output}' is 'MISSING' or 'unknown', output:
  'Cannot provide logistics advice without a destination.'

If destination is valid, provide timing warnings and logistics advice based on the information available:
- If start date is provided: Check for holidays, peak seasons, closure periods
- If venues are provided: Provide timing advice (best time to visit, avoid crowds)
- If arrival/departure times are provided: Advise on transport connections, rush hours

IMPORTANT: Work with whatever information is available. If some details are missing, provide general logistics advice for the city.

CRITICAL RULE: DO NOT invent specific opening hours, closure days, or travel times. Only provide validated, well-known information."
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
      prompt: "CURRENT DATE/TIME: ${GetDate_output}

Review Data Analysis for ${ExtractCity_output}.

Review data: ${FetchReviews_output}
User trip: ${input}

FIRST, check if the destination is valid:
- If '${ExtractCity_output}' is 'MISSING' or 'unknown', output ONLY:
  '⚠️ MISSING: Destination city'
  'Cannot analyze reviews without knowing the destination.'
  
THEN check if review data is valid (not an API error):
- If data is MISSING/invalid/API error, output:
  '⚠️ MISSING: Live review data'
  'IMPACT: Cannot provide insider tips or hidden warnings from recent travelers'

- ONLY if reviews are valid, extract:
  - Insider Tips (specific, actionable)
  - Hidden Warnings (complaints, issues)
  - Real Vibe (touristy vs authentic)

CRITICAL RULE: Do NOT invent review content or try to analyze reviews for 'MISSING' destinations."
    }

    // 7. Safety Briefing - acknowledge limits of non-live data
    llm NewsAlert {
      model: "gemini-flash-latest"
      prompt: "CURRENT DATE/TIME: ${GetDate_output}

Safety Briefing for ${ExtractCity_output}.

User trip: ${input}
Extracted details: ${ExtractDetails_output}

FIRST, check if the destination is valid:
- If '${ExtractCity_output}' is 'MISSING' or 'unknown', output ONLY:
  '⚠️ MISSING: Destination city'
  'Cannot provide safety briefing without knowing the destination.'
  'Please specify: Which city are you traveling to?'

- If '${ExtractCity_output}' is a valid city, provide:
  1. Statement: 'No verified live news data available in this run (as of execution time).'
  2. MISSING data needed for accurate alerts (dates, neighborhoods)
  3. Common, well-known safety risks for ${ExtractCity_output}
  4. Emergency numbers (police, ambulance)
  5. General transport safety tips

OUTPUT FORMAT:
Use simple markdown with complete sentences:
- Use bullet points (- item)
- Use bold for emphasis (**text**)
- NEVER use pipe tables (| col | col |)
- Keep paragraphs short (2-3 sentences max)

CRITICAL COMPLETION RULE: 
- ALWAYS finish every sentence completely
- NEVER end mid-word or mid-phrase (e.g., 'prior to and' is FORBIDDEN)
- If you reach output limit, end with the LAST complete sentence
- Better to omit a section than leave incomplete text

CRITICAL RULE: DO NOT invent breaking news or try to provide safety guidance for 'MISSING' destinations."
    }

    // 8. Cultural Wisdom - focus on timeless facts, not current events
    llm GeniusLoci {
      model: "gemini-flash-latest"
      prompt: "CURRENT DATE/TIME: ${GetDate_output}

Cultural Wisdom for ${ExtractCity_output}.

User trip: ${input}

FIRST, check if the destination is valid:
- If '${ExtractCity_output}' is 'MISSING' or 'unknown' or empty, output ONLY:
  '⚠️ MISSING: Destination city'
  'Cannot provide cultural guidance without knowing the destination.'
  'Please specify: Which city are you traveling to?'
  
- If '${ExtractCity_output}' is a valid city name, provide timeless, well-established cultural guidance:
  1. Behavior: Dress codes, etiquette (at religious sites, on public transport, etc.)
  2. Connection: A verified historical fact about ${ExtractCity_output}
  3. Local Secret: A known local custom or hidden spot (not invented)

CRITICAL RULE: Do NOT try to provide cultural wisdom for 'MISSING' or invalid destinations. Do NOT invent customs."
    }

    // 9. Final Report - compile missing data list + what's available
    llm GenerateReport {
      model: "gemini-flash-latest"
      prompt: "CURRENT DATE/TIME: ${GetDate_output}

Trip Guardian Report for ${ExtractCity_output}.

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
SECTION 1: WEATHER BRIEFING
═══════════════════════════════════════════

[If weather data exists from ${CheckWeather_output}:]
**Current Conditions:** [state exactly what the tool returned]

**Impact:** [explain how this affects the trip in 1-2 complete sentences]

**Preparation:** [what to pack/prepare - use bullet list if multiple items]

[If weather data is missing:]
⚠️ Weather data unavailable - check wttr.in/${ExtractCity_output} manually

FORMATTING RULES FOR THIS SECTION:
- Use bullet points for lists (- item)
- Keep each paragraph to 2-3 complete sentences maximum
- NEVER end mid-sentence
- If reaching output limit, end with last complete sentence

═══════════════════════════════════════════
SECTION 2: SAFETY BRIEFING
═══════════════════════════════════════════

[From ${NewsAlert_output}, include ONLY:]
- Common risks (pickpocketing, scams, etc.)
- Emergency numbers
- Transport safety tips

FORMATTING RULES FOR THIS SECTION:
- Use bullet points for lists
- Use bold for risk names
- Keep descriptions to 1-2 complete sentences
- NEVER use pipe tables
- ALWAYS complete every sentence - no mid-sentence cutoffs
- If text looks incomplete, mark as INCOMPLETE

DO NOT invent current events or breaking news.

═══════════════════════════════════════════
SECTION 3: CULTURAL GUIDANCE
═══════════════════════════════════════════

[From ${GeniusLoci_output}, include:]
1. Dress codes and etiquette
2. Historical fact
3. Local secret/custom

═══════════════════════════════════════════
SECTION 4: LOGISTICS & TIMING ADVICE
═══════════════════════════════════════════

[From ${KnowledgeCheck_output}:]
[Provide any available logistics advice, timing warnings, or general tips]
[If no specific logistics data available, provide general city-level advice]

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

    // GetDate provides temporal context to all LLM nodes
    GetDate -> ExtractDetails
    GetDate -> ExtractCity
    GetDate -> KnowledgeCheck
    GetDate -> ReviewSummarizer
    GetDate -> NewsAlert
    GetDate -> GeniusLoci
    GetDate -> GenerateReport

    ExtractCity -> CheckWeather
    ExtractCity -> KnowledgeCheck
    ExtractCity -> FetchReviews
    ExtractCity -> NewsAlert
    ExtractCity -> GeniusLoci

    ExtractDetails -> KnowledgeCheck

    FetchReviews -> ReviewSummarizer

    CheckWeather -> GenerateReport
    KnowledgeCheck -> GenerateReport
    ReviewSummarizer -> GenerateReport
    NewsAlert -> GenerateReport
    GeniusLoci -> GenerateReport
    GenerateReport -> END
  }
}
