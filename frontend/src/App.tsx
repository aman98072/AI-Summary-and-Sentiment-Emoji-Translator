import React, { useState } from "react";

type Highlight = {
  sentence: string;
  emoji: string;
};

type AnalysisResult = {
  summary: string;
  sentiment: "positive" | "neutral" | "negative" | "";
  highlights: Highlight[];
};

const API_BASE_URL = "http://localhost:8000";

export const App: React.FC = () => {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = text.trim().length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const sentimentLabel = (sentiment: AnalysisResult["sentiment"]) => {
    switch (sentiment) {
      case "positive":
        return "Positive";
      case "negative":
        return "Negative";
      case "neutral":
        return "Neutral";
      default:
        return "";
    }
  };

  return (
    <div className="app-shell">
      <header className="header">
        <h1>AI Summary & Sentiment</h1>
        <p>
          Paste up to a couple of pages and get a 4-line summary, sentiment,
          and key highlights with emojis.
        </p>
      </header>

      <main className="layout">
        <section className="card input-card">
          <form onSubmit={handleSubmit} className="form">
            <label className="label" htmlFor="input-text">
              Input text
            </label>
            <textarea
              id="input-text"
              className="textarea"
              placeholder="Paste your text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
            />

            <div className="actions-row">
              <button
                type="submit"
                className="primary-button"
                disabled={!canSubmit}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
              <span className="hint">
                The model will create a short summary, sentiment, and emoji
                highlights.
              </span>
            </div>

            {error && <p className="error-text">{error}</p>}
          </form>
        </section>

        <section className="card results-card">
          <h2 className="section-title">Results</h2>

          {!result && !loading && !error && (
            <p className="muted">
              Results will appear here after you run an analysis.
            </p>
          )}

          {result && (
            <>
              <div className="summary-block">
                <h3>Summary</h3>
                <p className="summary-text">
                  {result.summary.split("\n").map((line, idx) => (
                    <span key={idx} className="summary-line">
                      {line}
                    </span>
                  ))}
                </p>
              </div>

              <div className="sentiment-block">
                <h3>Sentiment</h3>
                <span className={`pill pill-${result.sentiment || "neutral"}`}>
                  {sentimentLabel(result.sentiment)}
                </span>
              </div>

              <div className="highlights-block">
                <h3>Highlights</h3>
                {result.highlights.length === 0 ? (
                  <p className="muted">No highlights returned.</p>
                ) : (
                  <ul className="highlights-list">
                    {result.highlights.map((h, idx) => (
                      <li key={idx} className="highlight-item">
                        <span className="highlight-emoji">{h.emoji}</span>
                        <span className="highlight-text">{h.sentence}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

