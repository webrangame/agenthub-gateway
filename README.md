# AI Guardian 🛡️

> **Proactive AI Agent Platform with Server-Driven UI**  
> A split-screen interface where autonomous agents deliver real-time insights while you chat.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features](#features)
- [Quick Start](#quick-start)
- [Development](#development)
- [Components](#components)
- [API Reference](#api-reference)
- [Contributing](#contributing)

---

## 🎯 Overview

**AI Guardian** is a proactive AI agent platform that runs autonomous M Language agents to provide real-time insights in a beautiful split-screen interface:

- **Left Panel**: Traditional chat interface for direct user interaction
- **Right Panel (Insight Stream)**: Proactive feed where agents publish real-time cards with actionable insights

### Key Concept

Unlike traditional chatbots that only respond when asked, AI Guardian agents can **proactively monitor, analyze, and alert** you about important information without being prompted.

**Example Use Case**: The Trip Guardian agent continuously monitors:
- Current weather conditions
- Safety alerts and news
- Cultural tips and local customs
- Travel recommendations

All presented as elegant, categorized cards in the Insight Stream.

---

## 🏗️ Architecture

```
                                User
                                  |
                    +-------------+-------------+
                    |                           |
              Chat Panel                 Insight Stream
            (Interactive)                 (Proactive)
                    |                           |
                    +-------------+-------------+
                                  |
                        AI Guardian Frontend
                          (React + Vite)
                                  |
                         HTTP/REST API
                                  |
                        Guardian Gateway
                          (Go Backend)
                                  |
                    +-------------+-------------+
                    |                           |
            Event Listener              FastGraph Runtime
                    |                     (M Language)
                    |                           |
                    +---------> Agents <--------+
                                  |
                       (Weather, News, Culture, etc.)
```

### Technology Stack

**Frontend**:
- ⚛️ React 18 with TypeScript
- ⚡ Vite for blazing fast dev experience
- 🎨 TailwindCSS for premium UI
- 🎭 Framer Motion for smooth animations
- 🔤 Google Fonts (Inter family)

**Backend**:
- 🔷 Go 1.21+ for high performance
- 🍸 Gin framework for HTTP routing
- 🤖 FastGraph Runtime (M Language execution engine)
- 📡 Server-Sent Events for real-time updates

---

## 📂 Project Structure

```
AiGuardian/
├── client/                    # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ArticleCard.tsx       # News article-style cards with full text
│   │   │   ├── WeatherCard.tsx       # Dynamic weather displays
│   │   │   ├── AlertWidget.tsx       # Gradient alert banners
│   │   │   ├── VideoCard.tsx         # YouTube embed support
│   │   │   ├── ChatPanel.tsx         # Left: interactive chat
│   │   │   ├── FeedPanel.tsx         # Right: proactive insights
│   │   │   └── DragDropZone.tsx      # Agent upload interface
│   │   ├── layouts/          # Layout components (Split, Single Col)
│   │   ├── App.tsx           # Root component
│   │   ├── index.css         # Premium gradient design system
│   │   └── main.tsx          # App entry point
│   ├── public/               # Static assets
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.ts        # Vite configuration
│   └── tailwind.config.js    # TailwindCSS config
│
├── server/                    # Go backend gateway
│   ├── main.go               # Gateway server with intelligent filtering
│   ├── pkg/
│   │   └── fastgraph/        # FastGraph runtime integration
│   │       └── runtime/      # M Language execution engine
│   ├── .env                  # Environment variables (API keys, etc.)
│   ├── go.mod                # Go module dependencies
│   └── fastgraph.exe         # Compiled FastGraph CLI
│
├── trip-guardian/            # Example agent: Trip Guardian
│   └── trip_guardian.m       # M Language agent definition
│
├── docs/                     # Documentation
│   └── interface_contract.md # API contract between frontend & backend
│
├── installer_v0.2.0/         # Historical: Installer packages (v0.2.0)
├── installer_v0.3.0/         # Historical: Installer packages (v0.3.0)
│
└── package.json              # Root workspace config
```

### Why These Folders Exist

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `client/` | **Frontend UI** - The visual interface users interact with | `App.tsx`, `*.tsx` components |
| `server/` | **Backend Gateway** - Bridges frontend ↔ agents, filters events | `main.go` |
| `server/pkg/fastgraph/` | **M Language Runtime** - Executes agent logic | Runtime engine |
| `trip-guardian/` | **Example Agent** - Demonstrates M Language agent capabilities | `trip_guardian.m` |
| `docs/` | **API Contracts** - Shared brain between frontend & backend teams | `interface_contract.md` |
| `installer_*/` | **Distribution** - Packaged installers for different versions | Installers |

---

## ✨ Features

### Premium UI Design
- 🎨 **Vibrant Gradients** - 7 custom gradient themes for different card types
- 📄 **Full Text Display** - No truncation, see complete agent messages
- 🖼️ **Rich Media** - Hero images (800px wide from Unsplash), YouTube videos
- 🏷️ **Category Badges** - Color-coded labels (Safety, Weather, Culture, Tips, Report)
- ⏰ **Timestamps** - See when each insight was generated
- ✨ **Smooth Animations** - Hover effects, card entrances, image zoom
- 📱 **Responsive** - Adapts to different screen sizes

### Intelligent Message Filtering
The backend automatically filters out noise:
- ❌ Empty messages
- ❌ Raw JSON logs (`{"type": "log", "message": ""}`)
- ❌ Trivial system messages (INIT, DEBUG, TRACE)
- ❌ Horizontal lines and formatting characters
- ❌ Messages shorter than 15 characters

Only **meaningful, user-facing insights** make it to the feed.

### Agent Capabilities
- 🌤️ **Weather Monitoring** - Real-time conditions with dynamic gradients
- 🚨 **Safety Alerts** - High-priority warnings with animated icons
- 🏛️ **Cultural Tips** - Local customs with optional video embeds
- 📰 **News Integration** - Breaking news and travel advisories
- 📊 **Synthesized Reports** - Comprehensive trip summaries

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Go** 1.21+ 
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/niyogen/agenthub-gateway.git
cd agenthub-gateway
```

### 2. Setup Backend

```bash
cd server

# Install Go dependencies
go mod download

# Create .env file with your API keys
cp .env.example .env
# Edit .env and add:
# OPENAI_API_KEY=your_openai_key
# GOOGLE_PLACES_API_KEY=your_google_key (optional)

# Run the server
go run main.go
```

Server will start on `http://localhost:8081`

### 3. Setup Frontend

```bash
cd ../client

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will start on `http://localhost:5174`

### 4. Test It Out

1. Open `http://localhost:5174` in your browser
2. You should see the split-screen interface
3. Drag and drop an agent file (e.g., `trip-guardian/trip_guardian.m`) into the upload zone
4. Watch the Insight Stream populate with proactive cards!

---

##  Development

### Running in Development Mode

**Backend** (Terminal 1):
```bash
cd server
go run main.go
```

**Frontend** (Terminal 2):
```bash
cd client
npm run dev
```

### Building for Production

**Backend**:
```bash
cd server
go build -o guardian-gateway main.go
```

**Frontend**:
```bash
cd client
npm run build
# Output: client/dist/
```

### Cleaning up (make the repo lean again)

On Windows (PowerShell):

```powershell
.\scripts\clean.ps1
# or (also removes local log/output artifacts):
.\scripts\clean.ps1 -Deep
```

### Environment Variables

Create `server/.env`:

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
GOOGLE_PLACES_API_KEY=AIza...
NEWS_API_KEY=...
PORT=8081
```

### Code Style

**Frontend**:
- TypeScript strict mode
- ESLint with React rules
- Prettier for formatting

**Backend**:
- `gofmt` for formatting
- `golangci-lint` for linting

---

## 🧩 Components

### Frontend Components

#### ArticleCard
**Purpose**: Display agent messages as elegant news articles  
**Features**: Full text, hero images, video embeds, category badges, timestamps  
**Used For**: General insights, cultural tips, reports

#### WeatherCard
**Purpose**: Show current weather with dynamic visuals  
**Features**: Condition-based gradients, decorative icons, full descriptions  
**Used For**: Real-time weather updates

#### AlertWidget
**Purpose**: Display urgent safety information  
**Features**: Vibrant gradients, animated icons, full alert text  
**Used For**: Warnings, breaking news, critical alerts

#### FeedPanel
**Purpose**: Container for proactive agent insights (right panel)  
**Features**: Auto-refresh, debug toggle, smooth animations  
**Polls**: `GET /api/feed` every 3 seconds

#### ChatPanel
**Purpose**: Traditional chat interface (left panel)  
**Status**: Placeholder for future chat implementation

### Backend Components

#### Guardian Gateway (`server/main.go`)
**Purpose**: HTTP server bridging frontend ↔ FastGraph agents

**Key Responsibilities**:
1. **Event Listener**: Captures agent output from FastGraph Runtime
2. **Intelligent Filtering**: Blocks empty/trivial messages
3. **Heuristic Mapping**: Categorizes messages → card types
4. **Rich Metadata**: Adds images, videos, categories, timestamps
5. **REST API**: Serves feed data to frontend

**Endpoints**:
- `GET /api/feed` - Retrieve current insights
- `DELETE /api/feed` - Clear all cards
- `POST /api/agent/upload` - Upload and execute agent files
- `GET /health` - Health check

#### FastGraph Runtime
**Purpose**: Execute M Language agents

**Location**: `server/pkg/fastgraph/runtime/`

**What It Does**:
- Parses `.m` agent files
- Executes agent logic (LLM calls, tool usage)
- Emits structured events
- Handles state management

---

## 📡 API Reference

### GET /api/feed

**Description**: Retrieve all current feed items

**Response**:
```json
[
  {
    "id": "evt-1733934123000",
    "card_type": "article",
    "priority": "medium",
    "timestamp": "2025-12-11T21:35:23+05:30",
    "data": {
      "title": "Travel Wisdom",
      "summary": "In Kyoto, it's crucial to adhere to the local culture...",
      "source": "Genius Loci",
      "category": "Culture",
      "colorTheme": "purple",
      "imageUrl": "https://images.unsplash.com/...",
      "videoUrl": "https://www.youtube.com/embed/..."
    }
  }
]
```

### DELETE /api/feed

**Description**: Clear all feed items

**Response**:
```json
{
  "status": "cleared",
  "message": "Feed has been reset"
}
```

### POST /api/agent/upload

**Description**: Upload and execute an agent file

**Request**: `multipart/form-data` with file

**Response**:
```json
{
  "status": "success",
  "message": "Agent uploaded and execution started",
  "filename": "uploaded_trip_guardian.m",
  "capabilities": ["trip-guardian"]
}
```

---

## 🎨 Design System

### Gradient Classes

Custom utility classes in `client/src/index.css`:

- `.gradient-safety` - Purple gradient for safety content
- `.gradient-weather` - Cyan/blue for weather
- `.gradient-culture` - Pink/purple for cultural tips
- `.gradient-wisdom` - Blue/cyan for wisdom
- `.gradient-alert-danger` - Red/yellow for critical alerts
- `.gradient-alert-warning` - Orange/yellow for warnings
- `.gradient-default` - Soft pastel for general content

### Typography

- **Font Family**: Inter (Google Fonts, 400-900 weights)
- **Headings**: Bold (700-900), tracking-tight
- **Body**: Regular (400-500), leading-relaxed
- **Labels**: Uppercase, tracking-wide, font-bold

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **FastGraph Runtime** - M Language execution engine
- **Unsplash** - Free high-quality images
- **Lucide Icons** - Beautiful open-source icons
- **Framer Motion** - Smooth React animations

---

## 📞 Support

- **Issues**: https://github.com/niyogen/agenthub-gateway/issues
- **Docs**: `/docs/interface_contract.md`

---

**Built with ❤️ for proactive AI experiences**

## How to run project
cd "E:\Tuor agent\agenthub-gateway\server"
powershell -ExecutionPolicy Bypass -File .\start-server.ps1

cd "E:\Tuor agent\agenthub-gateway\server"
go run main.go

cd "E:\Tuor agent\agenthub-gateway\client-next"
npm run dev
