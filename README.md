# Argos: AI-Powered Investment Research Agent

<div align="center">
  <h3>World-Class Equity Research, Automated.</h3>
  <p>Argos is an AI-powered quantitative investment analysis agent that conducts comprehensive market research, evaluates market sentiment, generates investment scorecards, and delivers actionable investment verdicts.</p>
</div>

---

## 1. Project Title

**Argos - Investment Research Agent**  
*World-Class Equity Research, Automated.*

**Project Objective:**  
To automate the arduous process of equity research by utilizing advanced Large Language Models (LLMs) to synthesize disparate data sources into a unified, actionable investment thesis.

**Problem Statement:**  
Retail and institutional investors spend countless hours reading earnings reports, evaluating sentiment, and calculating financial metrics. There is a need for an automated agent that can synthesize web data, analyze fundamentals, and present a rigorous, data-driven investment decision in seconds.

**Why this project exists:**  
Argos was built to democratize institutional-grade equity research. By leveraging Groq's high-speed inference and LLaMA 3.3, it provides unbiased, quantitative, and qualitative analysis at a fraction of the time and cost.

---

## 2. Features

**Current Features:**
*   **Automated Market Research:** Synthesizes business overviews, competitive landscapes, and recent news.
*   **Financial Analysis:** Extracts key metrics like YoY revenue growth, EBITDA, EPS, and debt levels.
*   **Sentiment Analysis:** Analyzes Wall Street consensus, institutional ownership trends, and social sentiment.
*   **Quantitative Scorecard:** Scores companies across 8 dimensions (profitability, moat, valuation, etc.) out of 10.
*   **Investment Verdict:** Delivers a strict INVEST, PASS, or WATCH decision with conviction levels, target horizons, and position sizing.
*   **Real-time Streaming:** Uses Server-Sent Events (SSE) to stream the LangGraph-style sequential pipeline steps directly to the frontend.

**Future Scope:**
*   **Portfolio Tracking:** Allow users to build and track a portfolio based on Argos' recommendations.
*   **PDF Report Generation:** Export findings to professional PDF tear sheets.
*   **Historical Backtesting:** Test how Argos' verdicts would have performed over the last 5 years.

---

## 3. Architecture Overview

Argos follows a decoupled Client-Server architecture with a sequential AI processing pipeline.

**Data Flow:**
`Frontend` → `Backend API (/api/analyze)` → `AI Layer (Groq)` → `Structured JSON Pipeline` → `SSE Stream` → `Frontend`

1.  **Client (React):** Handles user input, displays loading states via SSE, and renders the complex JSON response into a beautiful dashboard.
2.  **API (Express):** Exposes an SSE endpoint (`/api/analyze`) that accepts the company name.
3.  **Business Logic:** Orchestrates the multi-step AI pipeline (Research → Sentiment → Scorecard → Decision).
4.  **AI Layer (Groq):** Executes prompts using `llama-3.3-70b-versatile` at high speed.
5.  **Response Layer:** Parses the LLM's markdown/JSON output, handles errors, and streams updates back to the client.

---

## 4. Folder Structure

```text
investment-agent/
├── backend/                  # Express.js API Server
│   ├── .env                  # Environment variables (API keys, ports)
│   ├── package.json          # Backend dependencies (express, cors, groq-sdk)
│   └── src/
│       └── server.js         # Main application entry point, routes, and AI nodes
└── frontend/                 # React SPA Client
    ├── package.json          # Frontend dependencies
    ├── public/               # Static assets
    └── src/
        ├── App.css           # Global styles and component styling
        ├── App.js            # Main React component, state management, and UI rendering
        └── index.js          # React DOM entry point
```

**Backend Details:**
*   `server.js`: The heart of the backend. Contains the Express server setup, SSE streaming logic, Groq client instantiation, and the four AI processing nodes (`nodeResearchCompany`, `nodeSentimentAnalysis`, `nodeScoreCard`, `nodeDecision`).

**Frontend Details:**
*   `App.js`: Contains all React components (`ScoreBar`, `SectionCard`, `VerdictBanner`, `ScorecardSection`, `Pipeline`). Manages the `EventSource` connection for SSE streaming.
*   `App.css`: Implements a world-class, responsive, and visually appealing UI with custom CSS variables and animations.

---

## 5. Technology Stack

*   **Node.js & Express.js:** Chosen for the backend due to its lightweight nature, excellent asynchronous I/O capabilities, and native support for Server-Sent Events (SSE).
*   **React:** Chosen for the frontend to build a modular, reactive UI capable of updating in real-time as SSE messages arrive.
*   **Groq SDK:** Replaced the Gemini SDK to utilize LPUs (Language Processing Units) for ultra-fast, deterministic LLM inference using LLaMA models.
*   **dotenv:** For managing secrets (API keys) securely outside of the source code.
*   **CORS:** To allow the frontend (running on a different port) to communicate with the Express backend safely.

---

## 6. Request Lifecycle

1.  **User Input:** User types a company name (e.g., "Nvidia") and clicks "Analyze".
2.  **SSE Connection:** React creates an `EventSource` connected to `GET /api/analyze?company=Nvidia`.
3.  **Request Reception:** Express receives the request, sets SSE headers (`Content-Type: text/event-stream`).
4.  **Pipeline Execution:**
    *   *Step 1 (Research):* Backend sends a prompt to Groq. Result is parsed as JSON. SSE emits `running` then `done`.
    *   *Step 2 (Sentiment):* Groq analyzes the research data to determine sentiment.
    *   *Step 3 (Scorecard):* Groq scores the company on 8 dimensions using previous context.
    *   *Step 4 (Decision):* Groq acts as CIO to issue a final verdict.
5.  **Data Streaming:** Backend sends the final aggregated payload via SSE (`step: 'complete'`).
6.  **UI Rendering:** React parses the final payload, updates state, and renders the dynamic dashboard.

---

## 7. Backend Explanation

**Core Module (`src/server.js`):**

*   **Initialization & Middleware:** Loads `.env`, initializes Express, applies CORS, and parses JSON.
*   **Groq Client (`getGroqClient`):** A singleton pattern to initialize the Groq SDK using `process.env.GROQ_API_KEY`.
*   **LLM Helper (`callGroq`):** An asynchronous wrapper that sends system and user prompts to Groq with a temperature of 0.2 for deterministic, analytical outputs.
*   **LangGraph-style Nodes:**
    *   `nodeResearchCompany`: Extracts fundamentals.
    *   `nodeSentimentAnalysis`: Evaluates market consensus.
    *   `nodeScoreCard`: Assigns 1-10 scores.
    *   `nodeDecision`: Final thesis generation.
*   **Response Parsing:** Every node wraps the LLM output in a `try/catch` block. It cleans the output by removing markdown fences (```json) and uses `JSON.parse()`. If parsing fails, a structured fallback object is returned to prevent application crashes.
*   **SSE Streaming Endpoint (`/api/analyze`):** Uses `res.write()` to push state updates continuously to the client without closing the HTTP connection until the pipeline finishes or errors.

---

## 8. Frontend Explanation

**Core Module (`src/App.js`):**

*   **State Management:** Uses `useState` for `query`, `loading`, `stepStatuses`, `result`, and `error`.
*   **API Calls (`analyze`):** Instantiates `new EventSource(...)`. Listens to `onmessage` and updates `stepStatuses` to show the real-time LangGraph pipeline.
*   **Components:**
    *   `VerdictBanner`: Displays the final decision (Invest/Pass/Watch) with color-coded styling.
    *   `ScorecardSection`: Maps over the 8 dimensions and renders visual `ScoreBar` components.
    *   `ResearchSection` & `SentimentSection`: Displays grids and lists of financial data.
    *   `Pipeline`: A visual stepper showing the active AI node.
*   **User Interactions:** Pre-built example chips (e.g., "Apple", "Nvidia") allow one-click analysis.

---

## 9. AI Integration

*   **Provider:** Groq
*   **Model:** `llama-3.3-70b-versatile` (configurable via `.env`).
*   **Why Groq?** Groq's LPUs provide significantly faster tokens-per-second than traditional GPU-based APIs, which is critical for a 4-step sequential pipeline that would otherwise cause high user wait times.
*   **Prompt Engineering:**
    *   *System Prompts:* Defines the persona (e.g., "Senior Equity Research Analyst", "Chief Investment Officer").
    *   *Output Formatting:* Explicitly requests strict JSON formats.
    *   *Temperature:* Kept low (0.2) to reduce hallucinations and enforce strict JSON schemas.
*   **Error Handling:** The backend attempts to parse JSON. If the LLM hallucinates non-JSON text, the `catch` block generates a fallback JSON object containing the raw text to ensure the UI still renders gracefully.

---

## 10. API Documentation

### `GET /api/analyze`

**Purpose:** Executes the sequential AI pipeline for a given company and streams the results.

**Headers:**
*   `Accept: text/event-stream`

**Query Parameters:**
*   `company` (string, required): The name of the company to analyze.

**Example Request:**
`GET http://localhost:4000/api/analyze?company=Tesla`

**Example Response (Streamed):**
```text
data: {"step":"research","status":"running","message":"Researching Tesla..."}

data: {"step":"research","status":"done","data":{"company_name":"Tesla"...}}

data: {"step":"complete","status":"done","data":{"research":{...}, "decision":{...}}}
```

**Status Codes:**
*   `200 OK` (Stream opened successfully)
*   `400 Bad Request` (Missing company parameter)

### `GET /api/health`

**Purpose:** Health check endpoint.
**Response:** `{"ok": true}`

---

## 11. Configuration

The backend relies on environment variables managed via a `.env` file.

```env
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
PORT=4000
```

*   `GROQ_API_KEY`: Required to authenticate with the Groq API.
*   `GROQ_MODEL`: Specifies the LLM model. Defaults to `llama-3.3-70b-versatile` if omitted.
*   `PORT`: The port the Express server will listen on.

---

## 12. Installation Guide

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/investment-agent.git
cd investment-agent
```

**2. Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and insert your GROQ_API_KEY
npm start
```
*The backend will run on http://localhost:4000*

**3. Frontend Setup**
Open a new terminal window.
```bash
cd frontend
npm install
npm start
```
*The React app will open automatically at http://localhost:3000*

**4. Verify**
Enter "Apple" in the search bar and verify the pipeline executes successfully.

---

## 13. Error Handling

*   **API Key Missing:** If `GROQ_API_KEY` is not set, `server.js` catches the initialization error and streams a user-friendly error message to the frontend.
*   **JSON Parse Failures:** The LLM occasionally outputs markdown (```json). The backend strips this via `.replace(/```json|```/g, '')`. If parsing still fails, a hardcoded fallback object is generated so the frontend doesn't crash.
*   **Network Timeouts:** The `EventSource` on the frontend includes an `onerror` handler that alerts the user if the backend connection drops.
*   **401/403 Groq Errors:** Caught by the backend's master `catch` block and mapped to a friendly "Groq rejected the API key" message.

---

## 14. Security

*   **Secrets Management:** The `GROQ_API_KEY` is strictly kept on the backend in the `.env` file. The frontend never accesses this key directly, preventing exposure to end-users.
*   `.gitignore`: The `.env` file and `node_modules` are git-ignored to prevent accidental credential leaks.
*   **CORS:** Cross-Origin Resource Sharing is enabled but can be restricted to specific frontend domains in production via `app.use(cors({ origin: 'https://mydomain.com' }))`.

---

## 15. Performance

*   **Latency Mitigation:** By using Groq (LPU), the inference speed is highly optimized.
*   **Streaming UI:** Instead of waiting 15-20 seconds for all 4 LLM calls to finish, SSE is used to show immediate progress (`Running Market Research...`), reducing perceived latency drastically.
*   **Optimization Opportunities:** Implementing Redis to cache analyses for popular companies (e.g., "Apple") for 24 hours would reduce LLM API costs and drop response times to ~50ms.

---

## 16. Scalability

To scale this to an Enterprise SaaS:
1.  **Database:** Store historical analyses in PostgreSQL.
2.  **Authentication:** Add JWT or NextAuth to gate access and monetize.
3.  **Caching:** Use Redis to cache company reports.
4.  **Web Scraping / RAG:** Integrate a vector database (Pinecone) and scraping tools (Tavily/Puppeteer) to feed real-time financial SEC filings to the LLM instead of relying on the LLM's internal knowledge base.
5.  **Dockerization:** Containerize frontend and backend using Docker for seamless Kubernetes deployment.

---

## 17. Future Enhancements

*   **Beginner:** Add more predefined example chips.
*   **Intermediate:** Export the final dashboard as a PDF or Image.
*   **Advanced:** Connect to Yahoo Finance API (e.g., `yfinance`) to fetch exact, real-time stock prices and P/E ratios to inject into the Groq prompt.
*   **Production:** Implement Redis caching and user authentication.

---

## 18. Sequence Diagram

```text
User            Frontend (React)         Backend (Express)            Groq API
 |                     |                         |                        |
 |--- Type company --->|                         |                        |
 |                     |--- GET /api/analyze --->|                        |
 |                     |<--- SSE Connection -----|                        |
 |                     |                         |                        |
 |                     |                         |--- Prompt 1 (Res) ---->|
 |                     |                         |<-- JSON Response 1 ----|
 |                     |<-- Emit 'Research' -----|                        |
 |                     |                         |                        |
 |                     |                         |--- Prompt 2 (Sent) --->|
 |                     |                         |<-- JSON Response 2 ----|
 |                     |<-- Emit 'Sentiment' ----|                        |
 |                     |                         |                        |
 |                     |                         |--- Prompt 3 (Score) -->|
 |                     |                         |<-- JSON Response 3 ----|
 |                     |<-- Emit 'Scorecard' ----|                        |
 |                     |                         |                        |
 |                     |                         |--- Prompt 4 (Dec) ---->|
 |                     |                         |<-- JSON Response 4 ----|
 |                     |<-- Emit 'complete' -----|                        |
 |<-- Render UI -------|                         |                        |
```

---

## 19. Component Interaction Diagram

```text
App.js
 ├── Header
 ├── Hero Section (Input Form)
 ├── Pipeline (SSE Status indicators)
 └── Results Container
      ├── VerdictBanner (Displays INVEST/PASS)
      ├── ScorecardSection (Renders ScoreBars)
      ├── SentimentSection (Renders Sentiment Pills)
      ├── ResearchSection (Renders Business Info)
      └── DecisionDetails (Bull/Bear cases)
```

---

## 20. Architecture Diagram

```text
+-------------------+        +--------------------+       +-------------------+
|                   |        |                    |       |                   |
|   React SPA       +-------->  Express.js API    +------->    Groq API       |
|  (Port 3000)      |  SSE   |   (Port 4000)      | HTTP  | (LLaMA 3.3 70B)   |
|                   <--------+                    <-------+                   |
+-------------------+        +--------------------+       +-------------------+
```

---

## 21. Development Workflow

*   **New AI Prompt:** Add a new `async function nodeNewTask(company, data, onStep)` in `backend/src/server.js`.
*   **New API Endpoint:** Define a new `app.get('/api/new')` or `app.post` inside `server.js`.
*   **New Frontend Page:** Create a new component in `frontend/src/` and integrate React Router if multi-page routing is needed.
*   **Modifying Pipeline:** Add your new node to the `/api/analyze` `try/catch` execution chain and update the `PIPELINE_STEPS` constant in `frontend/src/App.js` to render it in the UI.

---

## 22. Deployment Guide

**Backend (Render / Railway):**
1.  Connect your GitHub repository.
2.  Set Root Directory to `backend`.
3.  Set Build Command: `npm install`.
4.  Set Start Command: `npm start`.
5.  Add Environment Variable: `GROQ_API_KEY`.

**Frontend (Vercel / Netlify):**
1.  Connect your GitHub repository.
2.  Set Root Directory to `frontend`.
3.  Set Build Command: `npm run build`.
4.  Set Output Directory to `build`.
5.  *Important:* Update the hardcoded `http://localhost:4000` inside `App.js` to point to your deployed backend URL.

---

## 23. Troubleshooting

*   **Error: "GROQ_API_KEY missing"**
    *Fix:* Ensure `.env` exists in the `backend` folder and contains a valid key. Restart the backend.
*   **Frontend shows "Connection lost"**
    *Fix:* Ensure your backend is running on port 4000 (`npm start` in the backend folder). Check for CORS issues if accessing from a different IP.
*   **Data missing in UI (empty boxes)**
    *Fix:* The LLM might have hallucinated formatting. Check the backend console logs. Groq usually enforces JSON well, but lowering the temperature parameter can increase stability.

---

## 24. Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

Please ensure all new backend nodes implement fallback JSON parsing to prevent UI crashes.

---

## 25. License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 26. Credits

*   **React:** Frontend library.
*   **Express:** Web framework for Node.js.
*   **Groq:** Ultra-fast AI inference platform.
*   **LLaMA 3.3:** Open-weights foundational model by Meta.

---

## 27. Conclusion

Argos represents the next generation of financial software—shifting from passive dashboards to active, intelligent agents. By orchestrating complex chains of thought through high-speed LLMs and streaming the results via an intuitive reactive interface, Argos sets a new standard for AI-assisted equity research.

---

## 28. Example Runs

### Example 1

**Input**
> Company: Nvidia

**Output**
> **Recommendation:** INVEST
> **Overall Score:** 9.1/10
> 
> **Strengths**
> • Strong AI leadership
> • High revenue growth
> • Excellent margins
> 
> **Risks**
> • Premium valuation
> • Semiconductor cyclicality
> 
> **Suggested Holding Period**
> Long Term

### Example 2

**Input**
> Company: Tesla

**Output**
> **Recommendation:** WATCH
> **Overall Score:** 7.4/10
> 
> **Strengths**
> • EV market leader
> • Strong brand
> 
> **Risks**
> • Valuation
> • Increasing competition

### Example 3

**Input**
> Company: Apple

**Output**
> **Recommendation:** PASS
> 
> **Reason**
> Limited upside compared to valuation.
> Strong fundamentals but slower expected growth.
