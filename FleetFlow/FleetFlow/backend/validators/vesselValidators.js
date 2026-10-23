const { body } = require('express-validator');
const { handleValidation } = require('./authValidators');
const { VESSEL_TYPES, VESSEL_STATUSES } = require('../models/Vessel');

const vesselRules = [
  body('name').trim().notEmpty().withMessage('Vessel name is required'),
  body('imoNumber').trim().notEmpty().withMessage('IMO number is required'),
  body('type').optional().isIn(VESSEL_TYPES).withMessage('Invalid vessel type'),
  body('status').optional().isIn(VESSEL_STATUSES).withMessage('Invalid vessel status'),
  body('flag').trim().notEmpty().withMessage('Flag is required'),
  body('capacity').optional().isNumeric().withMessage('Capacity must be a number'),
  body('fuelCapacity').optional().isNumeric().withMessage('Fuel capacity must be a number'),
  handleValidation,
];

module.exports = { vesselRules };
