const asyncHandler = require('../utils/asyncHandler');
const { answerQuestion, buildFleetSnapshot, getCommandSummary } = require('../services/aiAssistant');

// POST /api/assistant/ask   body: { question: string }
const ask = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'A question is required.' });
  }

  const result = await answerQuestion(question.trim());
  res.json({ success: true, data: result });
});

// GET /api/assistant/insights — a few auto-generated, clearly-labeled-as-estimate
// observations derived from real data (not sensor telemetry), per Section 36.
const getInsights = asyncHandler(async (req, res) => {
  const snapshot = await buildFleetSnapshot();
  const insights = [];

  const entries = Object.entries(snapshot.consumptionByVessel).sort((a, b) => b[1] - a[1]);
  if (entries.length > 1) {
    const [topName, topTotal] = entries[0];
    const avg = entries.reduce((sum, [, t]) => sum + t, 0) / entries.length;
    if (avg > 0 && topTotal > avg * 1.1) {
      const pctOver = Math.round(((topTotal - avg) / avg) * 100);
      insights.push({
        type: 'Fuel Insight',
        severity: 'warning',
        title: `${topName} is consuming ${pctOver}% more fuel than the fleet average`,
        detail:
          'Possible contributing factors: higher average speed, increased cargo load, or route deviation. This is an estimate based on recent fuel records, not sensor telemetry.',
      });
    }
  }

  if (snapshot.overdueMaintenance.length > 0) {
    insights.push({
      type: 'Maintenance Insight',
      severity: 'critical',
      title: `${snapshot.overdueMaintenance.length} vessel(s) have overdue maintenance`,
      detail: `Affected: ${snapshot.overdueMaintenance.map((m) => m.vessel).join(', ')}. Estimate based on scheduled dates in the maintenance log.`,
    });
  }

  if (snapshot.delayedVoyages.length > 0) {
    insights.push({
      type: 'Schedule Insight',
      severity: 'warning',
      title: `${snapshot.delayedVoyages.length} voyage(s) are currently delayed`,
      detail: `${snapshot.delayedVoyages.map((v) => `${v.vessel} (${v.route})`).join(', ')}. Estimate based on voyage status, not live ETA recalculation.`,
    });
  }

  res.json({ success: true, data: insights });
});

// GET /api/assistant/command-summary — powers the Command Center's
// "AI Command Advisor" panel. Reuses the same assistant service/AI path as
// the Ask endpoint (Section 23: "do not create a completely separate AI
// architecture"), just grounded in the richer health/risk snapshot.
const commandSummary = asyncHandler(async (req, res) => {
  const result = await getCommandSummary();
  res.json({ success: true, data: result });
});

module.exports = { ask, getInsights, commandSummary };
