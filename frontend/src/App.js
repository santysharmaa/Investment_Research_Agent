import React, { useState, useRef } from 'react';
import './App.css';

// ── Constants ────────────────────────────────────────────────────────────────
const EXAMPLES = ['Apple', 'Nvidia', 'Tesla', 'Microsoft', 'Amazon', 'Meta'];

const API_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000";

const PIPELINE_STEPS = [
  { key: 'research',  name: 'Market Research',    icon: '🔍' },
  { key: 'sentiment', name: 'Sentiment Analysis', icon: '📊' },
  { key: 'scorecard', name: 'Scorecard',          icon: '◈' },
  { key: 'decision',  name: 'Decision',           icon: '⚡' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 7) return 'score-bar-high';
  if (score >= 5) return 'score-bar-mid';
  return 'score-bar-low';
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Animated progress bar for scorecard */
function ScoreBar({ score }) {
  const pct = (score / 10) * 100;
  return (
    <div className="score-bar-track">
      <div
        className={`score-bar-fill ${scoreColor(score)}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Generic section card with header */
function SectionCard({ icon, title, badge, children }) {
  return (
    <div className="section-card">
      <div className="section-header">
        <div className="section-header-lhs">
          <span className="section-icon">{icon}</span>
          <span className="section-title">{title}</span>
        </div>
        {badge && <span className="section-badge">{badge}</span>}
      </div>
      <div className="section-body">{children}</div>
    </div>
  );
}

/** Top verdict banner */
function VerdictBanner({ decision }) {
  if (!decision) return null;
  const {
    verdict, conviction, executive_summary,
    key_catalysts = [], target_horizon,
  } = decision;
  const cls = `verdict-banner verdict-${verdict}`;
  return (
    <div className={cls}>
      <div className="verdict-header">
        <div className="verdict-lhs">
          <span className="verdict-eyebrow">Recommendation</span>
          <div className="verdict-word">{verdict}</div>
        </div>
        <div className="verdict-meta">
          {conviction && (
            <div className="verdict-chip">{conviction} Conviction</div>
          )}
          {target_horizon && (
            <div className="conviction-block">
              <div className="conviction-label">Horizon</div>
              <div className="conviction-value">{target_horizon}</div>
            </div>
          )}
        </div>
      </div>
      {executive_summary && (
        <p className="verdict-summary">{executive_summary}</p>
      )}
      {key_catalysts.length > 0 && (
        <div className="verdict-tags">
          {key_catalysts.slice(0, 5).map((c, i) => (
            <span key={i} className="vtag">{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Scorecard section – score bars + rationale */
function ScorecardSection({ scorecard }) {
  if (!scorecard?.scores) return null;
  const entries = Object.entries(scorecard.scores);
  const total = scorecard.weighted_total;
  return (
    <SectionCard icon="◈" title="Investment Scorecard">
      <div className="score-grid">
        {entries.map(([key, val]) => (
          <div key={key} className="score-item">
            <div className="score-item-header">
              <span className="score-label">{key.replace(/_/g, ' ')}</span>
              <div className="score-number-wrap">
                <span className="score-number">{val.score}</span>
                <span className="score-denom">/10</span>
              </div>
            </div>
            <ScoreBar score={val.score} />
            {val.rationale && (
              <div className="score-rationale">{val.rationale}</div>
            )}
          </div>
        ))}
      </div>
      {total !== undefined && (
        <div className="total-score-card">
          <span className="total-label">Weighted Total Score</span>
          <span className="total-value">
            {Number(total).toFixed(1)}<span style={{ fontSize: 14, opacity: 0.4 }}>/10</span>
          </span>
        </div>
      )}
    </SectionCard>
  );
}

/** Business overview + financials + drivers/risks */
function ResearchSection({ research }) {
  if (!research) return null;
  const {
    business_overview, financials = {}, valuation = {},
    competitive_position, growth_drivers = [], key_risks = [],
    sector,
  } = research;

  const allMetrics = { ...financials, ...valuation };

  return (
    <>
      <SectionCard icon="◉" title="Business Overview" badge={sector}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-2)', marginBottom: competitive_position ? 12 : 0 }}>
          {business_overview}
        </p>
        {competitive_position && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            {competitive_position}
          </p>
        )}
      </SectionCard>

      {Object.keys(allMetrics).length > 0 && (
        <SectionCard icon="◐" title="Financials & Valuation">
          <div className="stat-grid">
            {Object.entries(allMetrics).map(([k, v]) => (
              <div key={k} className="stat-card">
                <div className="stat-key">{k.replace(/_/g, ' ')}</div>
                <div className="stat-val">{v || '—'}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {(growth_drivers.length > 0 || key_risks.length > 0) && (
        <SectionCard icon="◑" title="Drivers & Risks">
          <div className="bull-bear">
            <div className="case-block case-bull">
              <div className="case-title">
                <span className="case-icon">📈</span> Growth Drivers
              </div>
              <ul className="items-list">
                {(growth_drivers.length ? growth_drivers : ['No drivers listed']).map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
            <div className="case-block case-bear">
              <div className="case-title">
                <span className="case-icon">⚠️</span> Key Risks
              </div>
              <ul className="items-list">
                {(key_risks.length ? key_risks : ['No risks listed']).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>
      )}
    </>
  );
}

/** Sentiment analysis section */
function SentimentSection({ sentiment }) {
  if (!sentiment) return null;
  const pills = [
    { key: 'Analyst Consensus',   val: sentiment.analyst_consensus },
    { key: 'Analysts',            val: sentiment.analyst_count },
    { key: 'Avg Price Target',    val: sentiment.avg_price_target },
    { key: 'Current Price',       val: sentiment.current_price },
    { key: 'Upside / Downside',   val: sentiment.upside_downside },
    { key: 'Institutional Trend', val: sentiment.institutional_trend },
    { key: 'Insider Activity',    val: sentiment.insider_activity },
    { key: 'Sentiment Score',     val: sentiment.news_sentiment_score !== undefined ? String(sentiment.news_sentiment_score) : null },
  ].filter(p => p.val && p.val !== 'Unknown' && p.val !== '...');

  return (
    <SectionCard icon="◍" title="Market Sentiment">
      {pills.length > 0 && (
        <div className="sentiment-grid">
          {pills.map((p, i) => (
            <div key={i} className="sentiment-card">
              <div className="sentiment-card-key">{p.key}</div>
              <div className="sentiment-card-val">{p.val}</div>
            </div>
          ))}
        </div>
      )}
      {sentiment.sentiment_summary && (
        <div className="sentiment-summary-text">{sentiment.sentiment_summary}</div>
      )}
    </SectionCard>
  );
}

/** Decision bull/bear + guidance cards */
function DecisionDetails({ decision }) {
  if (!decision) return null;
  const {
    bull_case, bear_case,
    monitoring_triggers = [],
    suggested_position_size, price_entry_notes, disclaimer,
  } = decision;

  return (
    <>
      {(bull_case || bear_case) && (
        <SectionCard icon="◎" title="Bull & Bear Case">
          <div className="bull-bear">
            {bull_case && (
              <div className="case-block case-bull">
                <div className="case-title">
                  <span className="case-icon">🟢</span> Bull Case
                </div>
                <div className="case-text">{bull_case}</div>
              </div>
            )}
            {bear_case && (
              <div className="case-block case-bear">
                <div className="case-title">
                  <span className="case-icon">🔴</span> Bear Case
                </div>
                <div className="case-text">{bear_case}</div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {(suggested_position_size || price_entry_notes) && (
        <SectionCard icon="◇" title="Position Guidance">
          <div className="guidance-grid">
            {suggested_position_size && (
              <div className="guidance-row">
                <div className="guidance-key">Suggested Position Size</div>
                <div className="guidance-val">{suggested_position_size}</div>
              </div>
            )}
            {price_entry_notes && (
              <div className="guidance-row">
                <div className="guidance-key">Entry Notes</div>
                <div className="guidance-val">{price_entry_notes}</div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {monitoring_triggers.length > 0 && (
        <SectionCard icon="◌" title="Monitoring Triggers">
          <div className="trigger-list">
            {monitoring_triggers.map((t, i) => (
              <div key={i} className="trigger-item">
                <div className="trigger-bullet" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {disclaimer && <div className="disclaimer">{disclaimer}</div>}
    </>
  );
}

/** AI pipeline stepper */
function Pipeline({ steps }) {
  return (
    <div className="pipeline">
      <div className="pipeline-label">AI Pipeline</div>
      <div className="pipeline-steps">
        {PIPELINE_STEPS.map(s => {
          const st = steps[s.key] || 'idle';
          const isRunning = st === 'running';
          const isDone    = st === 'done';
          return (
            <div key={s.key} className={`pipeline-step ${st}`}>
              <div className="step-icon-wrap">
                {isDone  ? '✓' : isRunning ? <div className="spinner" /> : s.icon}
              </div>
              <div className="step-text">
                <div className="step-label">
                  {isDone ? 'Done' : isRunning ? 'Running' : 'Pending'}
                </div>
                <div className="step-name">{s.name}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Hero feature cards shown before any analysis */
function FeatureCards() {
  const features = [
    { icon: '🔍', title: 'Deep Research',      desc: 'Scans company fundamentals, financials, and competitive landscape.' },
    { icon: '📈', title: 'Sentiment Analysis', desc: 'Evaluates analyst consensus, institutional trends, and news tone.' },
    { icon: '⚡', title: 'Instant Verdict',    desc: 'Delivers INVEST, PASS, or WATCH with conviction level and reasoning.' },
  ];
  return (
    <div className="hero-features">
      {features.map(f => (
        <div key={f.title} className="feature-card">
          <div className="feature-icon">{f.icon}</div>
          <div className="feature-title">{f.title}</div>
          <div className="feature-desc">{f.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [query,       setQuery]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState(null);
  const resultsRef = useRef(null);

  const analyze = async (company) => {
    if (!company.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setStepStatuses({});

    try {
      const es = new EventSource(
        `${API_URL}/api/analyze?company=${encodeURIComponent(company)}`
      );

      es.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.step === 'complete') {
          setResult(msg.data);
          setLoading(false);
          es.close();
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } else if (msg.step === 'error') {
          setError(msg.message);
          setLoading(false);
          es.close();
        } else {
          setStepStatuses(prev => ({ ...prev, [msg.step]: msg.status }));
        }
      };

      es.onerror = () => {
        setError(`Connection lost. Make sure the backend is reachable at ${API_URL}.`);
        setLoading(false);
        es.close();
      };
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); analyze(query); };

  const showPipeline = loading || Object.keys(stepStatuses).length > 0;

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">A</div>
          <div>
            <h1>Argos</h1>
            <div className="header-brand-sub">Investment Research Agent</div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-badge">AI-Powered · LangGraph Architecture</div>
          <div className="header-status-dot" title="Online" />
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="hero">
          <h2>
            Research any company.<br />
            <em>Invest or pass.</em>
          </h2>
          <p className="hero-sub">
            Enter a company name. The agent searches the web, analyzes financials and sentiment,
            scores the investment across 8 dimensions, and delivers a reasoned verdict.
          </p>

          <form className="search-form" onSubmit={handleSubmit}>
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="e.g. Reliance Industries, Tesla, Zomato..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button className="search-btn" type="submit" disabled={loading || !query.trim()}>
              {loading
                ? <><div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white', width: 12, height: 12 }} /> Analyzing</>
                : <>Analyze →</>
              }
            </button>
          </form>

          <div className="example-chips">
            <span className="example-label">Try</span>
            {EXAMPLES.map(ex => (
              <button key={ex} className="chip" onClick={() => { setQuery(ex); analyze(ex); }}>
                {ex}
              </button>
            ))}
          </div>

          {!result && !loading && !error && <FeatureCards />}
        </section>

        {/* ── Pipeline Stepper ── */}
        {showPipeline && <Pipeline steps={stepStatuses} />}

        {/* ── Error ── */}
        {error && (
          <div className="results">
            <div className="error-box">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ── Results Dashboard ── */}
        {result && (
          <div className="results" ref={resultsRef}>
            {/* Verdict banner stretches full width */}
            <VerdictBanner decision={result.decision} />

            {/* Two-column grid */}
            <div className="results-grid">
              {/* Left: research + sentiment */}
              <div className="results-left">
                <ResearchSection  research={result.research} />
                <SentimentSection sentiment={result.sentiment} />
                <DecisionDetails  decision={result.decision} />
              </div>

              {/* Right: scorecard + position guidance */}
              <div className="results-right">
                <ScorecardSection scorecard={result.scorecard} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
