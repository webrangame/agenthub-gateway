# Trip Guardian (V1) 🛡️

Trip Guardian is an AI-powered travel assistant that "stress-tests" your itinerary against real-world data to find hidden risks, logistical traps, and cultural nuances.

## 🌟 Features

*   **🔍 Vibe Check:** Fetches **Real Google Reviews** to tell you if a hotel is noisy or a site is a tourist trap.
*   **🛡️ Safety Beacon:** Checks for **Natural Disasters**, strikes, and safety alerts in real-time.
*   **🌦️ Sky Watch:** Checks specific weather forecasts and advises on **logistics** (e.g., "Pack leech socks for the rain").
*   **🧞 Genius Loci:** Provides "Insider Wisdom" on culture, dress codes, and local secrets.
*   **🕰️ Chronometer:** Temporally aware of holidays and closures.

## 🚀 Quick Start

### 1. Prerequisites
*   [FastGraph-Go](https://github.com/fastgraph/fastgraph) installed.
*   API Keys for **OpenAI** and **Google Maps**.

### 2. Setup
1.  Navigate to this directory:
    ```powershell
    cd examples/trip-guardian
    ```
2.  Create a `.env` file (copy from `.env.example`):
    ```powershell
    copy .env.example .env
    ```
3.  Add your keys to `.env`:
    ```ini
    OPENAI_API_KEY=sk-...
    GOOGLE_MAPS_KEY=AIza...
    ```

### 3. Usage
Run the guardian with your text itinerary:

```powershell
fastgraph run trip_guardian.m --input "I am going to Paris for 5 days staying at the Ritz. Visiting the Louvre and Eiffel Tower."
```

## 🧩 Architecture
This agent is built using **M-Language** and uses a parallel execution flow:
*   `GetDate` (TimeAPI)
*   `CheckWeather` (Wttr.in)
*   `FetchReviews` (Google Places API)
*   `LLM Nodes` (GPT-4 Analysis)

## 📄 Output
You will receive a **Trip Guardian Report** highlighting:
*   🛑 **Critical Risks**
*   ⚠️ **Logistical Warnings**
*   ✅ **Cultural Tips**
