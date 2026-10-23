const { body } = require('express-validator');
const { handleValidation } = require('./authValidators');
const { VOYAGE_STATUSES } = require('../models/Voyage');

const voyageRules = [
  body('vessel').notEmpty().withMessage('Vessel is required'),
  body('origin').trim().notEmpty().withMessage('Origin is required'),
  body('destination').trim().notEmpty().withMessage('Destination is required'),
  body('departureDate').isISO8601().withMessage('A valid departure date is required'),
  body('expectedArrival').isISO8601().withMessage('A valid expected arrival date is required'),
  body('distance').isNumeric().withMessage('Distance must be a number'),
  body('status').optional().isIn(VOYAGE_STATUSES).withMessage('Invalid voyage status'),
  handleValidation,
];

module.exports = { voyageRules };
