const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const Groq = require("groq-sdk");

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 4000;

function normalizeOrigin(origin) {
  return origin?.replace(/\/+$/, '');
}

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean).map(normalizeOrigin);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
        return callback(null, true);
      }

      console.warn(`[cors] blocked request from origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true
  })
);
app.use(express.json());

function logError(scope, err, extra = {}) {
  console.error(scope, {
    ...extra,
    message: err.message,
    stack: err.stack,
  });
}

// ─── Groq API call ────────────────────────────────────────────────
let groqClient;
let groqApiKey;

function getGroqApiKey() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it to backend/.env or the runtime environment.');
  }
  return apiKey;
}

function getGroqClient() {
  const groqKey = getGroqApiKey();
  if (!groqClient || groqApiKey !== groqKey) {
    groqClient = new Groq({
      apiKey: groqKey,
    });
    groqApiKey = groqKey;
  }
  return groqClient;
}

async function callGroq(systemPrompt, userPrompt, useWebSearch = false) {
  // Note: Groq doesn't natively support Google Search, so useWebSearch is ignored here.
  const response = await getGroqClient().chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2
  });

  const text = response.choices[0].message.content;
  if (!text) {
    throw new Error('Groq returned an empty response.');
  }

  return text;
}

// ─── Agent Nodes (LangGraph-style sequential pipeline) ─────────────────────

async function nodeResearchCompany(company, onStep) {
  onStep({ step: 'research', status: 'running', message: `Researching ${company}...` });

  const systemPrompt = `You are a senior equity research analyst. Use web search to gather factual, up-to-date information about a company. Be thorough and precise. Always include data points with numbers where available.`;

  const userPrompt = `Search the web and gather comprehensive research on "${company}". Include:
1. Business overview – what the company does, its products/services, market position
2. Key financial metrics – revenue, revenue growth YoY, EBITDA/net income, EPS, debt levels (use latest available data)
3. Competitive landscape – main competitors, market share, moats
4. Recent news & events – last 6 months: earnings, product launches, regulatory issues, leadership changes
5. Valuation – P/E ratio, EV/EBITDA, Price-to-Sales compared to sector peers
6. Growth drivers and risks

Return a structured JSON object with these exact keys:
{
  "company_name": "...",
  "sector": "...",
  "business_overview": "...",
  "financials": { "revenue": "...", "revenue_growth": "...", "net_income": "...", "debt": "..." },
  "valuation": { "pe_ratio": "...", "ev_ebitda": "...", "price_to_sales": "..." },
  "competitive_position": "...",
  "recent_news": [...],
  "growth_drivers": [...],
  "key_risks": [...],
  "data_quality_notes": "..."
}
Return only valid JSON, no markdown fences.`;

  const raw = await callGroq(systemPrompt, userPrompt, true);

  try {
    // Strip any markdown fences if present
    const clean = raw.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);
    onStep({ step: 'research', status: 'done', data });
    return data;
  } catch {
    // If JSON parsing fails, return a structured fallback
    const fallback = {
      company_name: company,
      sector: 'Unknown',
      business_overview: raw.slice(0, 500),
      financials: {},
      valuation: {},
      competitive_position: 'See overview',
      recent_news: [],
      growth_drivers: [],
      key_risks: [],
      data_quality_notes: 'Raw research (JSON parse failed)',
      raw_research: raw,
    };
    onStep({ step: 'research', status: 'done', data: fallback });
    return fallback;
  }
}

async function nodeSentimentAnalysis(company, researchData, onStep) {
  onStep({ step: 'sentiment', status: 'running', message: 'Analyzing market sentiment...' });

  const systemPrompt = `You are a market sentiment analyst who evaluates analyst consensus, social signals, and news tone. Be objective and quantitative.`;

  const userPrompt = `Based on the following research data about "${company}", and using web search to find analyst ratings, price targets, and investor sentiment:

Research data: ${JSON.stringify(researchData, null, 2)}

Analyze:
1. Wall Street analyst consensus (Buy/Hold/Sell ratings count if available)
2. Average analyst price target vs current price
3. Institutional ownership trend (increasing or decreasing)
4. Recent insider buying/selling
5. Overall news sentiment (positive/neutral/negative ratio)
6. Social media / retail investor sentiment

Return JSON only:
{
  "analyst_consensus": "Buy|Hold|Sell|Mixed",
  "analyst_count": "...",
  "avg_price_target": "...",
  "current_price": "...",
  "upside_downside": "...",
  "institutional_trend": "Increasing|Decreasing|Stable",
  "insider_activity": "Buying|Selling|Neutral",
  "news_sentiment_score": 0.0,
  "sentiment_summary": "...",
  "notable_analysts": [...]
}
Return only valid JSON.`;

  const raw = await callGroq(systemPrompt, userPrompt, true);

  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);
    onStep({ step: 'sentiment', status: 'done', data });
    return data;
  } catch {
    const fallback = { sentiment_summary: raw.slice(0, 300), analyst_consensus: 'Unknown' };
    onStep({ step: 'sentiment', status: 'done', data: fallback });
    return fallback;
  }
}

async function nodeScoreCard(company, researchData, sentimentData, onStep) {
  onStep({ step: 'scorecard', status: 'running', message: 'Building investment scorecard...' });

  const systemPrompt = `You are a quantitative investment analyst who scores companies on multiple dimensions to guide investment decisions.`;

  const userPrompt = `Score "${company}" on these investment dimensions using the research and sentiment data provided.

Research: ${JSON.stringify(researchData, null, 2)}
Sentiment: ${JSON.stringify(sentimentData, null, 2)}

Score each dimension from 0–10 (10 = best). Be analytical and harsh — most companies should not score above 7.

Return JSON only:
{
  "scores": {
    "revenue_growth": { "score": 0, "rationale": "..." },
    "profitability": { "score": 0, "rationale": "..." },
    "balance_sheet": { "score": 0, "rationale": "..." },
    "competitive_moat": { "score": 0, "rationale": "..." },
    "valuation": { "score": 0, "rationale": "..." },
    "management_quality": { "score": 0, "rationale": "..." },
    "market_sentiment": { "score": 0, "rationale": "..." },
    "growth_runway": { "score": 0, "rationale": "..." }
  },
  "weighted_total": 0.0,
  "scorecard_summary": "..."
}
Return only valid JSON.`;

  const raw = await callGroq(systemPrompt, userPrompt, false);

  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);
    onStep({ step: 'scorecard', status: 'done', data });
    return data;
  } catch {
    const fallback = { scores: {}, scorecard_summary: raw.slice(0, 300) };
    onStep({ step: 'scorecard', status: 'done', data: fallback });
    return fallback;
  }
}

async function nodeDecision(company, researchData, sentimentData, scorecardData, onStep) {
  onStep({ step: 'decision', status: 'running', message: 'Generating investment decision...' });

  const systemPrompt = `You are a Chief Investment Officer making final investment recommendations. You are rigorous, objective, and willing to say "Pass" even on popular companies if the data doesn't support investing. Your decisions must be defensible.`;

  const userPrompt = `Make a final investment decision on "${company}" based on all research gathered.

Research summary: ${JSON.stringify(researchData, null, 2)}
Sentiment data: ${JSON.stringify(sentimentData, null, 2)}
Scorecard: ${JSON.stringify(scorecardData, null, 2)}

Provide a comprehensive investment thesis. Be specific. Use the actual data points.

Return JSON only:
{
  "verdict": "INVEST" | "PASS" | "WATCH",
  "conviction": "High" | "Medium" | "Low",
  "target_horizon": "...",
  "executive_summary": "...",
  "bull_case": "...",
  "bear_case": "...",
  "key_catalysts": [...],
  "key_risks": [...],
  "suggested_position_size": "...",
  "price_entry_notes": "...",
  "monitoring_triggers": [...],
  "disclaimer": "This is AI-generated analysis for educational purposes only. Not financial advice."
}
Return only valid JSON.`;

  const raw = await callGroq(systemPrompt, userPrompt, false);

  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);
    onStep({ step: 'decision', status: 'done', data });
    return data;
  } catch {
    const fallback = {
      verdict: 'WATCH',
      conviction: 'Low',
      executive_summary: raw.slice(0, 500),
      disclaimer: 'This is AI-generated analysis for educational purposes only. Not financial advice.',
    };
    onStep({ step: 'decision', status: 'done', data: fallback });
    return fallback;
  }
}

// Deployment and health endpoints
app.get("/", (_, res) => {
  res.json({
    status: "running",
    service: "Argos Investment Research Agent API",
    version: "1.0.0"
  });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

// SSE Streaming Endpoint
app.get('/api/analyze', async (req, res) => {
  const { company } = req.query;
  if (!company) return res.status(400).json({ error: 'company query param required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const onStep = (stepData) => send(stepData);

  try {
    const research = await nodeResearchCompany(company, onStep);
    const sentiment = await nodeSentimentAnalysis(company, research, onStep);
    const scorecard = await nodeScoreCard(company, research, sentiment, onStep);
    const decision = await nodeDecision(company, research, sentiment, scorecard, onStep);

    send({
      step: 'complete',
      status: 'done',
      data: { research, sentiment, scorecard, decision },
    });
  } catch (err) {
    const status = err.status || err.response?.status;
    const responseData = err.response?.data;
    const apiMessage = responseData?.error?.message || responseData?.message || err.message;
    const message = err.message?.startsWith('GROQ_API_KEY is not set')
      ? err.message
      : status === 401 || status === 403
        ? 'Groq rejected the API key. Check GROQ_API_KEY in backend/.env.'
        : apiMessage || 'Analysis failed. Check the backend logs for details.';

    logError('[analyze] request failed', err, {
      status,
      groqMessage: apiMessage,
      groqErrorType: responseData?.error?.type,
    });

    send({ step: 'error', status: 'error', message });
  }

  res.end();
});

const server = app.listen(PORT, () => console.log(`Backend running on :${PORT}`));
server.timeout = 120000;
