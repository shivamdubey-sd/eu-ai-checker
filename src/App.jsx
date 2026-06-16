import { useState } from "react";

const RISK_COLORS = {
  "Unacceptable": { bg: "#1a0000", badge: "#ff2d2d", text: "#ff9999", border: "#ff2d2d" },
  "High": { bg: "#1a0a00", badge: "#ff6b00", text: "#ffb366", border: "#ff6b00" },
  "Limited": { bg: "#0a0f1a", badge: "#3b82f6", text: "#93c5fd", border: "#3b82f6" },
  "Minimal": { bg: "#001a0a", badge: "#22c55e", text: "#86efac", border: "#22c55e" },
  "Unknown": { bg: "#0f0f14", badge: "#6366f1", text: "#a5b4fc", border: "#6366f1" },
};

const EXAMPLE_PRODUCTS = [
  "An AI hiring tool that screens CVs and ranks candidates automatically for job applications",
  "A chatbot that helps customers find products on an e-commerce website",
  "An AI system used by banks to approve or reject loan applications",
  "A content recommendation engine for a streaming platform",
];

// ── Your n8n Webhook URL ─────────────────────────────────────────────────────
const N8N_WEBHOOK_URL = "https://shivagh.app.n8n.cloud/webhook-test/eu-ai-act-check";

export default function EUAIActChecker() {
  const [product, setProduct] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [webhookSent, setWebhookSent] = useState(false);

  async function checkCompliance() {
    if (!product.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setWebhookSent(false);

    const prompt = `You are an expert on the EU AI Act (Regulation 2024/1689). Analyse the following AI product description and return a structured compliance assessment.

Product description: "${product}"

Respond ONLY with a valid JSON object and nothing else — no markdown, no backticks, no preamble. Use this exact structure:

{
  "riskTier": "Unacceptable | High | Limited | Minimal",
  "riskTierReason": "One sentence explaining why this tier was assigned.",
  "euAiActArticles": ["Article X – Name", "Article Y – Name"],
  "complianceGaps": [
    { "gap": "Short gap title", "detail": "Explanation of the gap and what the company must do." }
  ],
  "requiredActions": [
    "Concrete action the company must take (max 15 words each)"
  ],
  "prohibitedPractices": true,
  "prohibitedDetail": "Only if prohibitedPractices is true: explain what prohibited practice applies.",
  "registrationRequired": true,
  "registrationDetail": "Explain if/why the system must be registered in the EU database.",
  "humanOversightRequired": true,
  "timeToComply": "e.g. August 2025 (already in force) / August 2026 / 2027",
  "summaryVerdict": "2-3 sentence plain-English summary of the overall compliance situation and urgency."
}`;

    try {
      // ── Step 1: Call Claude API ──────────────────────────────────────────
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const raw = data.content?.map(i => i.text || "").join("") || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      // ── Step 2: Send result to n8n Webhook ──────────────────────────────
      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productDescription: product,
            riskTier: parsed.riskTier,
            riskTierReason: parsed.riskTierReason,
            summaryVerdict: parsed.summaryVerdict,
            complianceGaps: parsed.complianceGaps,
            requiredActions: parsed.requiredActions,
            prohibitedPractices: parsed.prohibitedPractices,
            prohibitedDetail: parsed.prohibitedDetail,
            registrationRequired: parsed.registrationRequired,
            registrationDetail: parsed.registrationDetail,
            humanOversightRequired: parsed.humanOversightRequired,
            timeToComply: parsed.timeToComply,
            euAiActArticles: parsed.euAiActArticles,
            checkedAt: new Date().toISOString(),
          }),
        });
        setWebhookSent(true);
      } catch (webhookError) {
        // Webhook failure does not break the main app
        console.log("Webhook error:", webhookError);
      }

      setResult(parsed);
    } catch (err) {
      setError("Something went wrong analysing your product. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const colors = result ? (RISK_COLORS[result.riskTier] || RISK_COLORS["Unknown"]) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: "#e2e8f0",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1e2030",
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "#0d0d14",
      }}>
        <div style={{
          width: "36px", height: "36px",
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px",
        }}>⚖️</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px" }}>EU AI Act Compliance Checker</div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>Regulation (EU) 2024/1689 · Powered by Claude · Connected to n8n</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {["In Force", "Free Tool", "Not Legal Advice"].map(tag => (
            <span key={tag} style={{
              fontSize: "10px", padding: "3px 8px",
              border: "1px solid #1e2030", borderRadius: "20px",
              color: "#64748b", background: "#0a0a0f",
            }}>{tag}</span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Hero */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{
            fontSize: "32px", fontWeight: 800, letterSpacing: "-1px",
            lineHeight: 1.15, marginBottom: "12px",
            background: "linear-gradient(135deg, #e2e8f0 60%, #6366f1)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Is your AI product<br />EU Act compliant?
          </h1>
          <p style={{ color: "#64748b", fontSize: "15px", lineHeight: 1.6, maxWidth: "520px" }}>
            Describe what your AI product does. Get an instant risk tier assessment,
            compliance gaps, and required actions under the EU AI Act.
          </p>
        </div>

        {/* Input */}
        <div style={{
          background: "#0d0d14", border: "1px solid #1e2030",
          borderRadius: "12px", padding: "20px", marginBottom: "16px",
        }}>
          <label style={{ fontSize: "12px", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
            Describe your AI product or system
          </label>
          <textarea
            value={product}
            onChange={e => setProduct(e.target.value)}
            placeholder="e.g. We use AI to automatically screen job applicants and score their CVs before a human reviews them..."
            rows={4}
            style={{
              width: "100%", background: "transparent", border: "none",
              color: "#e2e8f0", fontSize: "14px", lineHeight: 1.7,
              resize: "none", outline: "none", fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Examples */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: "#475569", marginBottom: "8px" }}>Try an example:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {EXAMPLE_PRODUCTS.map((ex, i) => (
              <button key={i} onClick={() => setProduct(ex)} style={{
                fontSize: "11px", padding: "5px 10px",
                background: "#13131f", border: "1px solid #1e2030",
                borderRadius: "6px", color: "#94a3b8", cursor: "pointer",
              }}>
                {ex.length > 50 ? ex.slice(0, 50) + "…" : ex}
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={checkCompliance}
          disabled={loading || !product.trim()}
          style={{
            width: "100%", padding: "14px",
            background: loading || !product.trim() ? "#1e2030" : "linear-gradient(135deg, #3b82f6, #6366f1)",
            border: "none", borderRadius: "10px",
            color: loading || !product.trim() ? "#475569" : "#fff",
            fontSize: "14px", fontWeight: 600,
            cursor: loading || !product.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳ Analysing compliance…" : "→ Check EU AI Act Compliance"}
        </button>

        {/* Webhook confirmation */}
        {webhookSent && (
          <div style={{
            marginTop: "12px", padding: "10px 16px",
            background: "#001a0a", border: "1px solid #22c55e",
            borderRadius: "8px", fontSize: "12px", color: "#86efac",
          }}>
            ✅ Result logged to Google Sheets and email sent via n8n
          </div>
        )}

        {error && (
          <div style={{
            marginTop: "16px", padding: "14px",
            background: "#1a0000", border: "1px solid #ff2d2d",
            borderRadius: "8px", color: "#ff9999", fontSize: "13px",
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && colors && (
          <div style={{ marginTop: "32px" }}>

            {/* Risk Tier Banner */}
            <div style={{
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: "12px", padding: "20px 24px", marginBottom: "16px",
              display: "flex", alignItems: "flex-start", gap: "16px",
            }}>
              <div style={{
                background: colors.badge, color: "#fff",
                fontWeight: 800, fontSize: "11px", letterSpacing: "1px",
                padding: "6px 12px", borderRadius: "6px", whiteSpace: "nowrap",
              }}>
                {result.riskTier?.toUpperCase()} RISK
              </div>
              <div>
                <div style={{ color: colors.text, fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
                  {result.riskTierReason}
                </div>
                <div style={{ color: "#64748b", fontSize: "12px" }}>
                  Compliance deadline: <span style={{ color: colors.text }}>{result.timeToComply}</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{
              background: "#0d0d14", border: "1px solid #1e2030",
              borderRadius: "12px", padding: "20px", marginBottom: "16px",
            }}>
              <div style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Summary</div>
              <p style={{ fontSize: "14px", lineHeight: 1.75, color: "#cbd5e1", margin: 0 }}>{result.summaryVerdict}</p>
            </div>

            {/* Flags row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {[
                { label: "Prohibited Practice", value: result.prohibitedPractices },
                { label: "Registration Required", value: result.registrationRequired },
                { label: "Human Oversight Required", value: result.humanOversightRequired },
              ].map(flag => (
                <div key={flag.label} style={{
                  background: "#0d0d14",
                  border: `1px solid ${flag.value ? "#ff6b00" : "#1e2030"}`,
                  borderRadius: "10px", padding: "14px",
                }}>
                  <div style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>{flag.label}</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: flag.value ? "#ffb366" : "#86efac" }}>
                    {flag.value ? "⚠️ Yes" : "✅ No"}
                  </div>
                </div>
              ))}
            </div>

            {/* Prohibited detail */}
            {result.prohibitedPractices && result.prohibitedDetail && (
              <div style={{
                background: "#1a0000", border: "1px solid #ff2d2d",
                borderRadius: "10px", padding: "16px", marginBottom: "16px",
              }}>
                <div style={{ fontSize: "11px", color: "#ff9999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>⚠️ Prohibited Practice Detected</div>
                <p style={{ fontSize: "13px", color: "#fca5a5", margin: 0, lineHeight: 1.6 }}>{result.prohibitedDetail}</p>
              </div>
            )}

            {/* Compliance Gaps */}
            {result.complianceGaps?.length > 0 && (
              <div style={{
                background: "#0d0d14", border: "1px solid #1e2030",
                borderRadius: "12px", padding: "20px", marginBottom: "16px",
              }}>
                <div style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>Compliance Gaps</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {result.complianceGaps.map((g, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <div style={{
                        minWidth: "22px", height: "22px",
                        background: "#1e2030", borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 700, color: "#94a3b8",
                      }}>{i + 1}</div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "3px" }}>{g.gap}</div>
                        <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>{g.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Actions */}
            {result.requiredActions?.length > 0 && (
              <div style={{
                background: "#0d0d14", border: "1px solid #1e2030",
                borderRadius: "12px", padding: "20px", marginBottom: "16px",
              }}>
                <div style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>Required Actions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {result.requiredActions.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <div style={{ color: "#3b82f6", fontSize: "14px" }}>→</div>
                      <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6 }}>{a}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Articles */}
            {result.euAiActArticles?.length > 0 && (
              <div style={{
                background: "#0d0d14", border: "1px solid #1e2030",
                borderRadius: "12px", padding: "20px",
              }}>
                <div style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Relevant EU AI Act Articles</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {result.euAiActArticles.map((a, i) => (
                    <span key={i} style={{
                      fontSize: "12px", padding: "5px 10px",
                      background: "#13131f", border: "1px solid #2d3748",
                      borderRadius: "6px", color: "#94a3b8",
                    }}>{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div style={{ marginTop: "20px", fontSize: "11px", color: "#334155", textAlign: "center", lineHeight: 1.6 }}>
              This tool provides general guidance only and does not constitute legal advice.<br />
              Consult a qualified legal professional for compliance decisions.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

