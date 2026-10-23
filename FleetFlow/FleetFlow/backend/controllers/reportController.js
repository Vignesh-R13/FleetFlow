const PDFDocument = require('pdfkit');
const Vessel = require('../models/Vessel');
const Voyage = require('../models/Voyage');
const Maintenance = require('../models/Maintenance');
const FuelRecord = require('../models/FuelRecord');
const asyncHandler = require('../utils/asyncHandler');
const { computeFleetProfitability } = require('../services/profitabilityService');

// Minimal CSV writer — good enough for the flat, mostly-scalar records this
// app deals with. Wraps any field containing a comma/quote/newline in quotes.
function toCsv(rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = columns.map((c) => c.label).join(',');
  const body = rows.map((row) => columns.map((c) => escape(c.value(row))).join(',')).join('\n');
  return `${header}\n${body}`;
}

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

// Renders a simple, readable tabular PDF: a title, generation timestamp, and
// one row per record with column/value pairs. Good enough for operational
// reports — not attempting pixel-perfect layout, just a clean readable export.
function sendPdf(res, filename, title, rows, columns) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(18).fillColor('#0F1D2E').text(title, { align: 'left' });
  doc.fontSize(9).fillColor('#7A8699').text(`Generated ${new Date().toLocaleString()}`, { align: 'left' });
  doc.moveDown(1);

  const colWidth = (doc.page.width - 80) / columns.length;
  const startX = doc.x;

  function drawRow(y, values, isHeader) {
    doc.fontSize(9).fillColor(isHeader ? '#0F1D2E' : '#152840');
    values.forEach((val, i) => {
      doc.text(String(val ?? ''), startX + i * colWidth, y, { width: colWidth - 6, ellipsis: true });
    });
  }

  let y = doc.y;
  drawRow(y, columns.map((c) => c.label), true);
  y += 16;
  doc.moveTo(startX, y - 4).lineTo(doc.page.width - 40, y - 4).strokeColor('#e2e8f0').stroke();

  rows.forEach((row) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.y;
    }
    drawRow(y, columns.map((c) => c.value(row)), false);
    y += 16;
  });

  doc.end();
}

// GET /api/reports/fleet
const fleetReport = asyncHandler(async (req, res) => {
  const vessels = await Vessel.find().sort('name');
  const columns = [
    { label: 'Name', value: (v) => v.name },
    { label: 'IMO Number', value: (v) => v.imoNumber },
    { label: 'Type', value: (v) => v.type },
    { label: 'Flag', value: (v) => v.flag },
    { label: 'Status', value: (v) => v.status },
    { label: 'Capacity', value: (v) => v.capacity },
    { label: 'Fuel Capacity (t)', value: (v) => v.fuelCapacity },
    { label: 'Current Fuel (t)', value: (v) => v.currentFuel },
  ];
  if (req.query.format === 'pdf') {
    return sendPdf(res, 'fleet-report.pdf', 'Fleet Report', vessels, columns);
  }
  sendCsv(res, 'fleet-report.csv', toCsv(vessels, columns));
});

// GET /api/reports/voyages
const voyageReport = asyncHandler(async (req, res) => {
  const voyages = await Voyage.find().populate('vessel', 'name').sort('-departureDate');
  const columns = [
    { label: 'Vessel', value: (v) => v.vessel?.name },
    { label: 'Origin', value: (v) => v.origin },
    { label: 'Destination', value: (v) => v.destination },
    { label: 'Departure', value: (v) => v.departureDate?.toISOString().slice(0, 10) },
    { label: 'Expected Arrival', value: (v) => v.expectedArrival?.toISOString().slice(0, 10) },
    { label: 'Status', value: (v) => v.status },
    { label: 'Distance (NM)', value: (v) => v.distance },
    { label: 'Fuel Budget (t)', value: (v) => v.fuelBudget },
  ];
  if (req.query.format === 'pdf') {
    return sendPdf(res, 'voyage-report.pdf', 'Voyage Report', voyages, columns);
  }
  sendCsv(res, 'voyage-report.csv', toCsv(voyages, columns));
});

// GET /api/reports/maintenance
const maintenanceReport = asyncHandler(async (req, res) => {
  const tasks = await Maintenance.find().populate('vessel', 'name').sort('-scheduledDate');
  const columns = [
    { label: 'Vessel', value: (t) => t.vessel?.name },
    { label: 'Title', value: (t) => t.title },
    { label: 'Category', value: (t) => t.category },
    { label: 'Priority', value: (t) => t.priority },
    { label: 'Status', value: (t) => t.status },
    { label: 'Scheduled Date', value: (t) => t.scheduledDate?.toISOString().slice(0, 10) },
    { label: 'Cost', value: (t) => t.cost },
  ];
  if (req.query.format === 'pdf') {
    return sendPdf(res, 'maintenance-report.pdf', 'Maintenance Report', tasks, columns);
  }
  sendCsv(res, 'maintenance-report.csv', toCsv(tasks, columns));
});

// GET /api/reports/fuel
const fuelReport = asyncHandler(async (req, res) => {
  const records = await FuelRecord.find().populate('vessel', 'name').sort('-recordedAt').limit(1000);
  const columns = [
    { label: 'Vessel', value: (r) => r.vessel?.name },
    { label: 'Date', value: (r) => r.recordedAt?.toISOString().slice(0, 10) },
    { label: 'Fuel Consumed (t)', value: (r) => r.fuelConsumed },
    { label: 'Fuel Remaining (t)', value: (r) => r.fuelRemaining },
    { label: 'Distance Travelled (NM)', value: (r) => r.distanceTravelled },
    { label: 'Expected Consumption (t)', value: (r) => r.expectedFuelConsumed },
  ];
  if (req.query.format === 'pdf') {
    return sendPdf(res, 'fuel-report.pdf', 'Fuel Report', records, columns);
  }
  sendCsv(res, 'fuel-report.csv', toCsv(records, columns));
});

// GET /api/reports/profitability — reuses the same profitability engine
// as the Profitability page and the What-If Simulator, so the export can
// never disagree with what's shown on screen.
const profitabilityReport = asyncHandler(async (req, res) => {
  const { voyages } = await computeFleetProfitability();
  const columns = [
    { label: 'Vessel', value: (v) => v.vessel },
    { label: 'Route', value: (v) => v.route },
    { label: 'Status', value: (v) => v.status },
    { label: 'Revenue ($)', value: (v) => v.revenue },
    { label: 'Fuel Cost ($)', value: (v) => v.fuelCost },
    { label: 'Crew Cost ($)', value: (v) => v.crewCost },
    { label: 'Port Charges ($)', value: (v) => v.portCharges },
    { label: 'Maintenance Allocation ($)', value: (v) => v.maintenanceAllocation },
    { label: 'Other Costs ($)', value: (v) => v.otherCosts },
    { label: 'Total Cost ($)', value: (v) => v.totalCost },
    { label: 'Profit ($)', value: (v) => v.profit },
    { label: 'Margin (%)', value: (v) => v.margin },
  ];
  if (req.query.format === 'pdf') {
    return sendPdf(res, 'profitability-report.pdf', 'Profitability Report (Estimates — see assumptions in app)', voyages, columns);
  }
  sendCsv(res, 'profitability-report.csv', toCsv(voyages, columns));
});

module.exports = { fleetReport, voyageReport, maintenanceReport, fuelReport, profitabilityReport };
