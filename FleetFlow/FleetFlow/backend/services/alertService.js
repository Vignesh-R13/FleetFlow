const Alert = require('../models/Alert');

// Creates an alert unless an unresolved alert with the same dedupeKey already exists.
// This is what stops the system from spamming a new "low fuel" alert every time
// a fuel record comes in while the vessel is still low on fuel.
async function raiseAlert({ vessel, voyage, type, severity, message, dedupeKey }, io) {
  if (dedupeKey) {
    const existing = await Alert.findOne({ dedupeKey, status: { $ne: 'Resolved' } });
    if (existing) return existing;
  }

  const alert = await Alert.create({ vessel, voyage, type, severity, message, dedupeKey });

  if (io) {
    io.emit('alert:new', alert);
  }

  return alert;
}

// Resolves any open alert matching a dedupeKey — used when the underlying
// condition clears (e.g. fuel tops back up above the low-fuel threshold).
async function resolveAlertByKey(dedupeKey) {
  await Alert.updateMany(
    { dedupeKey, status: { $ne: 'Resolved' } },
    { status: 'Resolved', resolvedAt: new Date() }
  );
}

module.exports = { raiseAlert, resolveAlertByKey };
