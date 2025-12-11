# Trip Guardian (v0.3.1) 🛡️

Trip Guardian is an AI-powered travel assistant that "stress-tests" your itinerary against real-world data to find hidden risks, logistical traps, and cultural nuances.

**NEW in v0.3.1:**  
- 📅 **Proactive Mode:** Runs automatically at scheduled intervals to monitor your trip
- 💬 **Reactive Mode:** Interactive execution for on-demand trip analysis
- 🔄 **Dual-Mode Operation:** Supports both scheduled insights and one-time queries
- 🌊 **Streaming Output:** Real-time LLM responses with progressive updates

## 🌟 Features

* **🔍 Vibe Check:** Fetches **Real Google Reviews** to tell you if a hotel is noisy or a site is a tourist trap.
* **🛡️ Safety Beacon:** Checks for **Natural Disasters**, strikes, and safety alerts in real-time.
* **🌦️ Sky Watch:** Checks specific weather forecasts and advises on **logistics** (e.g., "Pack leech socks for the rain").
* **🧞 Genius Loci:** Provides "Insider Wisdom" on culture, dress codes, and local secrets.
* **🕰️ Chronometer:** Temporally aware of holidays and closures.

## 🚀 Quick Start

### 1. Prerequisites
* [FastGraph-Go](https://github.com/niyogen/fastgraph-go) v0.3.1 or later
* API Keys for **OpenAI** and **Google Maps**

### 2. Setup API Keys

**Option 1: Environment Variables (Recommended)**
```powershell
# Windows PowerShell
$env:OPENAI_API_KEY = "sk-your-key-here"
$env:GOOGLE_MAPS_KEY = "your-google-maps-key"
```

```bash
# Mac/Linux
export OPENAI_API_KEY="sk-your-key-here"
export GOOGLE_MAPS_KEY="your-google-maps-key"
```

**Option 2: .env File**
```powershell
# Create .env in this directory
copy .env.example .env
# Edit .env and add your keys
```

**Note:** FastGraph CLI reads environment variables directly. The `.env` file is for reference only.

### 3. Usage

#### Reactive Mode (One-Time Execution)
Standard trip analysis:
```powershell
fastgraph run trip_guardian.m --input "Planning a 3-day trip to Paris, staying at Hotel Le Marais, visiting Eiffel Tower and Louvre"
```

#### Proactive Mode (Scheduled Monitoring)
The agent's `schedule` block defines automatic execution:
```m
schedule {
  interval: "30m"  # Runs every 30 minutes
  mode: "proactive"
}
```

**For continuous monitoring:** Use with a scheduler (cron, Task Scheduler, or gateway) that triggers the agent periodically.

## 🌊 Streaming Behavior

### Real-Time LLM Responses
Trip Guardian uses **OpenAI streaming** - you'll see progressive output as nodes execute:

```
Running agent: TripGuardian
Input: Paris 3-day trip, Eiffel Tower

ExtractCity: Extracting city...
Paris ✓

CheckWeather: Fetching forecast...
Paris: 🌧️ Rainy +8°C ✓

GenerateReport: Creating your personalized report...
🛡️ TRIP GUARDIAN REPORT

Sky Watch 🌦️
• Paris is experiencing rainy conditions at 8°C
• Impact: Eiffel Tower observation deck may have reduced visibility
• Preparation: Pack waterproof jacket and indoor backup plans
...
```

### Streaming Benefits
- **Progressive updates** - See results as they arrive
- **Real-time feedback** - No waiting for full completion  
- **Better UX** - Especially for multi-node parallel agents
- **Word-by-word** - LLM responses stream progressively

### Node Streaming Support
- ✅ **LLM nodes** (ExtractDetails, KnowledgeCheck, GenerateReport) - Full streaming
- ⚠️ **HTTP nodes** (CheckWeather, FetchReviews) - Returns complete response
- ✅ **Report generation** - Streamed as AI writes

## 🧩 Architecture

### Parallel Execution Flow
```
START
  ├─> GetDate (TimeAPI)
  ├─> ExtractDetails (GPT-4)
  └─> ExtractCity (GPT-3.5)
       └─> CheckWeather (Wttr.in)

ExtractDetails branches to:
  ├─> KnowledgeCheck (GPT-4)
  ├─> FetchReviews → ReviewSummarizer (GPT-4)
  ├─> NewsAlert (GPT-3.5)
  └─> GeniusLoci (GPT-4)

All converge to:
  └─> GenerateReport (GPT-4 Streaming)
       └─> END
```

### Schedule Configuration
```m
agent TripGuardian {
  network {
    registry: "http://3.208.94.148:8080"
    capabilities: ["trip-guardian", "travel-assistant", "weather-monitoring", "safety-alerts"]
  }

  schedule {
    interval: "30m"
    mode: "proactive"
  }
  
  nodes { ... }
  edges { ... }
}
```

## 🧪 Testing

### Fast Testing (10-second interval)
For rapid testing, edit `trip_guardian.m`:
```m
schedule {
  interval: "10s"  # Fast testing
  mode: "proactive"
}
```

Then run:
```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:GOOGLE_MAPS_KEY = "..."
fastgraph run trip_guardian.m --input "Paris trip"
```

### Production Mode
```m
schedule {
  interval: "30m"  # Production
  mode: "proactive"
}
```

## 📄 Sample Output

```
🛡️ TRIP GUARDIAN REPORT

Sky Watch 🌦️
• Paris: Rainy, 8°C
• Impact: Eiffel Tower summit may close in heavy rain
• Preparation: Waterproof jacket, umbrella, indoor alternatives

Safety Briefing 🛡️
• No critical safety alerts
• Minor: Metro Line 13 reduced service (strike)

Experience Wisdom 🔍
• Hotel Le Marais: 4.7★ (Excellent)
• Insider Tip: Request courtyard room (quieter than street-facing)
• Real Vibe: Authentic Marais charm, loved by locals

Cultural Wisdom 🧞
• Etiquette: Always greet with "Bonjour" before asking
• History: Le Marais was aristocratic quarter in 1600s
• Local Secret: Hidden garden at M usée Carnavalet (free)
```

## 🔧 Troubleshooting

**Issue**: API key errors  
**Solution**: Set environment variables in PowerShell/terminal before running

**Issue**: Schedule not executing automatically  
**Solution**: Schedule block is metadata - use cron/Task Scheduler for automatic execution

**Issue**: Network timeouts (TimeAPI, Google Maps)  
**Solution**: Check firewall settings, try again (external API issue)

**Issue**: Streaming not visible  
**Solution**: Ensure using OpenAI models (`gpt-4`, `gpt-3.5-turbo`)

## 📚 Learn More

- [M Language Specification](../../docs/m_language_spec.md)
- [Interface Contract](../../docs/specs/interface_contract.md)
- [Streaming Production Readiness](../../docs/streaming_production_readiness.md)

## 🎯 Next Steps

1. **Try it now:** Set your API keys and run!
2. **Customize:** Modify nodes for your specific travel needs
3. **Schedule:** Set up with gateway for automatic monitoring
4. **Extend:** Add nodes for flights, hotels, or local events
