const Vessel = require('../models/Vessel');
const Voyage = require('../models/Voyage');
const Maintenance = require('../models/Maintenance');
const FuelRecord = require('../models/FuelRecord');
const Alert = require('../models/Alert');
const { computeFleetHealth } = require('./fleetHealthService');
const { computeRiskIntelligence } = require('./riskScoringService');

// Builds a compact snapshot of current fleet state to ground any answer in
// real data — whether that answer comes from the rule-based fallback below
// or gets handed to an LLM as context. Never invent numbers the caller didn't
// provide here.
async function buildFleetSnapshot() {
  const [vessels, activeVoyages, delayedVoyages, upcomingMaintenance, overdueMaintenance, recentFuel, openAlerts] =
    await Promise.all([
      Vessel.find().select('name status currentFuel fuelCapacity currentSpeed'),
      Voyage.find({ status: { $in: ['Departed', 'In Transit', 'Loading'] } }).populate('vessel', 'name'),
      Voyage.find({ status: 'Delayed' }).populate('vessel', 'name'),
      Maintenance.find({ status: { $in: ['Scheduled', 'Assigned'] } }).populate('vessel', 'name').sort('scheduledDate').limit(10),
      Maintenance.find({ status: 'Overdue' }).populate('vessel', 'name'),
      FuelRecord.find().sort('-recordedAt').limit(50).populate('vessel', 'name'),
      Alert.find({ status: { $ne: 'Resolved' } }).populate('vessel', 'name').sort('-createdAt').limit(20),
    ]);

  // Per-vessel fuel consumption totals from recent records, for "highest consumption" style questions.
  const consumptionByVessel = {};
  for (const r of recentFuel) {
    const name = r.vessel?.name || 'Unknown';
    consumptionByVessel[name] = (consumptionByVessel[name] || 0) + r.fuelConsumed;
  }

  return {
    vessels: vessels.map((v) => ({ name: v.name, status: v.status, fuelPct: v.fuelCapacity ? Math.round((v.currentFuel / v.fuelCapacity) * 100) : null })),
    activeVoyages: activeVoyages.map((v) => ({ vessel: v.vessel?.name, route: `${v.origin} -> ${v.destination}`, status: v.status })),
    delayedVoyages: delayedVoyages.map((v) => ({ vessel: v.vessel?.name, route: `${v.origin} -> ${v.destination}` })),
    upcomingMaintenance: upcomingMaintenance.map((m) => ({ vessel: m.vessel?.name, title: m.title, scheduledDate: m.scheduledDate, priority: m.priority })),
    overdueMaintenance: overdueMaintenance.map((m) => ({ vessel: m.vessel?.name, title: m.title, scheduledDate: m.scheduledDate })),
    consumptionByVessel,
    openAlerts: openAlerts.map((a) => ({ vessel: a.vessel?.name, type: a.type, severity: a.severity, message: a.message })),
  };
}

function daysUntil(date) {
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}

// Extends the base fleet snapshot with the deterministic health/risk scores
// from the intelligence engines, for the Command Advisor specifically. Kept
// separate from buildFleetSnapshot (used by the plain Q&A assistant) so a
// simple question doesn't pay for two extra aggregation passes it won't use.
async function buildIntelligenceSnapshot() {
  const [snapshot, vessels] = await Promise.all([buildFleetSnapshot(), Vessel.find()]);
  const [health, risks] = await Promise.all([computeFleetHealth(vessels), computeRiskIntelligence(vessels)]);

  return {
    ...snapshot,
    fleetHealth: {
      average: health.fleetAverage,
      distribution: health.distribution,
      atRiskVessels: health.vessels
        .filter((v) => v.overall < 60)
        .sort((a, b) => a.overall - b.overall)
        .map((v) => ({ name: v.name, score: v.overall })),
    },
    topRisks: risks.slice(0, 5).map((r) => ({
      vessel: r.vesselName,
      type: r.type,
      title: r.title,
      severity: r.severity,
      recommendedAction: r.recommendedAction,
    })),
  };
}

// Rule-based fallback for the Command Advisor — mirrors the same structured
// format the LLM path is asked to produce, so the UI never has to know
// which path answered. Deterministic: same fleet state -> same summary.
function ruleBasedCommandSummary(snapshot) {
  const { fleetHealth, topRisks } = snapshot;
  const attentionCount = fleetHealth.atRiskVessels.length;

  const lines = [];
  lines.push(
    attentionCount === 0
      ? `Fleet conditions are stable overall (average health ${fleetHealth.average}/100).`
      : `Fleet conditions need attention — average health is ${fleetHealth.average}/100, with ${attentionCount} vessel${attentionCount === 1 ? '' : 's'} scoring below 60.`
  );

  if (topRisks.length > 0) {
    lines.push('');
    lines.push(`${topRisks.length} priority item${topRisks.length === 1 ? '' : 's'} identified:`);
    topRisks.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.vessel || 'Fleet-wide'} — ${r.title}`);
    });
    lines.push('');
    lines.push(`Recommended priority: ${topRisks[0].recommendedAction} (${topRisks[0].vessel || 'fleet-wide'}).`);
  } else {
    lines.push('No elevated risks detected right now.');
  }

  return lines.join('\n');
}

async function llmCommandSummary(snapshot) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const systemPrompt = `You are the FleetFlow AI Command Advisor, embedded in a maritime operations command center.
Summarize the current fleet condition and top priorities using ONLY the data JSON below — this data already
contains deterministic health and risk SCORES computed by the application's own rules engine; your job is to
explain and prioritize them in plain language, not to invent or recalculate any numbers.
Structure your answer as: 1) one-line overall fleet condition, 2) up to 3 numbered priority items (vessel + issue),
3) one final "Recommended priority" line naming the single most urgent action. Keep it concise.

FLEET INTELLIGENCE DATA:
${JSON.stringify(snapshot)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Summarize the fleet and tell me what to prioritize.' }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.map((block) => block.text || '').join('\n').trim();
  return text || 'The assistant did not return a summary.';
}

// GET-able summary for the Command Center's "AI Command Advisor" panel.
async function getCommandSummary() {
  const snapshot = await buildIntelligenceSnapshot();
  const aiConfigured = !!process.env.ANTHROPIC_API_KEY;

  if (!aiConfigured) {
    return { summary: ruleBasedCommandSummary(snapshot), mode: 'rule-based', fleetHealth: snapshot.fleetHealth, topRisks: snapshot.topRisks };
  }

  try {
    const summary = await llmCommandSummary(snapshot);
    return { summary, mode: 'ai', fleetHealth: snapshot.fleetHealth, topRisks: snapshot.topRisks };
  } catch (err) {
    return {
      summary: ruleBasedCommandSummary(snapshot),
      mode: 'rule-based-fallback',
      error: err.message,
      fleetHealth: snapshot.fleetHealth,
      topRisks: snapshot.topRisks,
    };
  }
}

// Rule-based fallback: pattern-matches a handful of the question shapes from
// the spec against the live snapshot. Used whenever ANTHROPIC_API_KEY isn't set.
function ruleBasedAnswer(question, snapshot) {
  const q = question.toLowerCase();

  if (q.includes('maintenance') && (q.includes('week') || q.includes('due') || q.includes('upcoming'))) {
    const upcoming = snapshot.upcomingMaintenance.filter((m) => daysUntil(m.scheduledDate) <= 7);
    if (upcoming.length === 0) return "No vessels have maintenance scheduled in the next 7 days.";
    return `Maintenance due this week: ${upcoming.map((m) => `${m.vessel} — ${m.title} (${new Date(m.scheduledDate).toLocaleDateString()})`).join('; ')}.`;
  }

  if (q.includes('overdue')) {
    if (snapshot.overdueMaintenance.length === 0) return 'No overdue maintenance tasks right now.';
    return `Overdue maintenance: ${snapshot.overdueMaintenance.map((m) => `${m.vessel} — ${m.title}`).join('; ')}.`;
  }

  if (q.includes('fuel') && (q.includes('highest') || q.includes('most') || q.includes('worst'))) {
    const entries = Object.entries(snapshot.consumptionByVessel).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return 'No recent fuel records to compare.';
    const [name, total] = entries[0];
    return `${name} has the highest recent fuel consumption at ${total.toFixed(1)} tons across recent records.`;
  }

  if (q.includes('efficien')) {
    const entries = Object.entries(snapshot.consumptionByVessel).sort((a, b) => a[1] - b[1]);
    if (entries.length === 0) return 'No recent fuel records to compare.';
    return `Based on recent fuel records, the lowest consumers (a proxy for efficiency) are: ${entries.slice(0, 3).map(([n, t]) => `${n} (${t.toFixed(1)}t)`).join(', ')}.`;
  }

  if (q.includes('delay')) {
    if (snapshot.delayedVoyages.length === 0) return 'No voyages are currently marked as delayed.';
    return `Delayed voyages: ${snapshot.delayedVoyages.map((v) => `${v.vessel} (${v.route})`).join('; ')}.`;
  }

  if (q.includes('alert') || q.includes('critical') || q.includes('warning')) {
    if (snapshot.openAlerts.length === 0) return 'No open alerts right now.';
    return `Open alerts: ${snapshot.openAlerts.slice(0, 5).map((a) => `[${a.severity}] ${a.vessel || 'Fleet'} — ${a.type}`).join('; ')}.`;
  }

  // Generic "why is X performing poorly" style — point at whatever data exists rather than guessing.
  const mentionedVessel = snapshot.vessels.find((v) => q.includes(v.name.toLowerCase()));
  if (mentionedVessel) {
    const alertsForVessel = snapshot.openAlerts.filter((a) => a.vessel === mentionedVessel.name);
    if (alertsForVessel.length > 0) {
      return `${mentionedVessel.name} currently has ${alertsForVessel.length} open alert(s): ${alertsForVessel.map((a) => a.type).join(', ')}. Fuel level is at ${mentionedVessel.fuelPct ?? '—'}% of capacity.`;
    }
    return `${mentionedVessel.name} is currently ${mentionedVessel.status} with no open alerts. Fuel level is at ${mentionedVessel.fuelPct ?? '—'}% of capacity.`;
  }

  return "I can answer questions about maintenance schedules, fuel consumption, delayed voyages, and open alerts based on current fleet data. Try asking something like \"which vessels need maintenance this week?\" or \"which vessel has the highest fuel consumption?\"";
}

// LLM path: only used if ANTHROPIC_API_KEY is set. Grounds the model strictly
// in the snapshot — the prompt explicitly forbids inventing data not present in it.
async function llmAnswer(question, snapshot) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const systemPrompt = `You are the FleetFlow AI Assistant, embedded in a maritime fleet management dashboard.
Answer the user's question using ONLY the fleet data JSON provided below. Do not invent vessels, numbers, or events not present in the data.
If the data doesn't contain the answer, say so plainly rather than guessing. Keep answers concise (2-4 sentences).

FLEET DATA:
${JSON.stringify(snapshot)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.map((block) => block.text || '').join('\n').trim();
  return text || 'The assistant did not return an answer.';
}

async function answerQuestion(question) {
  const snapshot = await buildFleetSnapshot();
  const aiConfigured = !!process.env.ANTHROPIC_API_KEY;

  if (!aiConfigured) {
    return { answer: ruleBasedAnswer(question, snapshot), mode: 'rule-based' };
  }

  try {
    const answer = await llmAnswer(question, snapshot);
    return { answer, mode: 'ai' };
  } catch (err) {
    // Graceful degradation rather than a broken assistant if the API call fails.
    return { answer: ruleBasedAnswer(question, snapshot), mode: 'rule-based-fallback', error: err.message };
  }
}

module.exports = { answerQuestion, buildFleetSnapshot, getCommandSummary };
