require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Vessel = require('../models/Vessel');
const Voyage = require('../models/Voyage');
const FuelRecord = require('../models/FuelRecord');
const Maintenance = require('../models/Maintenance');
const Cargo = require('../models/Cargo');
const Alert = require('../models/Alert');
const VesselLocation = require('../models/VesselLocation');

const DEMO_PASSWORD = 'Password123!';

const PORTS = {
  Chennai: [13.0827, 80.2707],
  Rotterdam: [51.9244, 4.4777],
  Singapore: [1.3521, 103.8198],
  Dubai: [25.2048, 55.2708],
  Mumbai: [19.076, 72.8777],
  Shanghai: [31.2304, 121.4737],
  Colombo: [6.9271, 79.8612],
  Hamburg: [53.5511, 9.9937],
  LosAngeles: [33.7405, -118.276],
  Sydney: [-33.8688, 151.2093],
};

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function seed() {
  await connectDB();
  console.log('[seed] Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Vessel.deleteMany({}),
    Voyage.deleteMany({}),
    FuelRecord.deleteMany({}),
    Maintenance.deleteMany({}),
    Cargo.deleteMany({}),
    Alert.deleteMany({}),
    VesselLocation.deleteMany({}),
  ]);

  console.log('[seed] Creating users...');
  const users = await User.create([
    { name: 'Alex Morgan', email: 'admin@fleetflow.com', password: DEMO_PASSWORD, role: 'ADMIN' },
    { name: 'Priya Nair', email: 'manager@fleetflow.com', password: DEMO_PASSWORD, role: 'FLEET_MANAGER' },
    { name: 'Daniel Osei', email: 'manager2@fleetflow.com', password: DEMO_PASSWORD, role: 'FLEET_MANAGER' },
    { name: 'Lucas Ferreira', email: 'maintenance@fleetflow.com', password: DEMO_PASSWORD, role: 'MAINTENANCE_MANAGER' },
    { name: 'Captain Rao', email: 'captain@fleetflow.com', password: DEMO_PASSWORD, role: 'CAPTAIN' },
    { name: 'Captain Silva', email: 'captain2@fleetflow.com', password: DEMO_PASSWORD, role: 'CAPTAIN' },
    { name: 'Captain Chen', email: 'captain3@fleetflow.com', password: DEMO_PASSWORD, role: 'CAPTAIN' },
  ]);

  console.log('[seed] Creating vessels...');
  const vesselDefs = [
    { name: 'Ocean Star', type: 'Container Ship', flag: 'Panama', yearBuilt: 2015, capacity: 8000, fuelCapacity: 3200 },
    { name: 'Sea Voyager', type: 'Bulk Carrier', flag: 'Liberia', yearBuilt: 2012, capacity: 65000, fuelCapacity: 2800 },
    { name: 'Blue Horizon', type: 'Tanker', flag: 'Marshall Islands', yearBuilt: 2018, capacity: 110000, fuelCapacity: 4500 },
    { name: 'Pacific Wind', type: 'Container Ship', flag: 'Singapore', yearBuilt: 2019, capacity: 12000, fuelCapacity: 3600 },
    { name: 'Atlantic Grace', type: 'General Cargo', flag: 'Malta', yearBuilt: 2010, capacity: 15000, fuelCapacity: 2100 },
    { name: 'Marine Falcon', type: 'Ro-Ro', flag: 'Bahamas', yearBuilt: 2016, capacity: 4500, fuelCapacity: 1800 },
    { name: 'Eastern Pearl', type: 'Bulk Carrier', flag: 'Hong Kong', yearBuilt: 2013, capacity: 82000, fuelCapacity: 3100 },
    { name: 'Global Trader', type: 'Container Ship', flag: 'Panama', yearBuilt: 2021, capacity: 14500, fuelCapacity: 3900 },
    { name: 'Ocean Majesty', type: 'Cargo Ship', flag: 'Cyprus', yearBuilt: 2011, capacity: 22000, fuelCapacity: 2400 },
    { name: 'Northern Light', type: 'Tanker', flag: 'Norway', yearBuilt: 2017, capacity: 95000, fuelCapacity: 4100 },
  ];

  const statuses = ['Active', 'Active', 'Active', 'Idle', 'Maintenance', 'Active', 'Idle', 'Active', 'Offline', 'Active'];
  const vessels = [];
  for (let i = 0; i < vesselDefs.length; i++) {
    const def = vesselDefs[i];
    const [lat, lng] = Object.values(PORTS)[i % 10];
    const vessel = await Vessel.create({
      ...def,
      imoNumber: `92${(30000 + i * 137).toString()}`,
      engineType: i % 2 === 0 ? 'MAN B&W Diesel' : 'Wartsila Diesel',
      status: statuses[i],
      currentLatitude: lat + (Math.random() - 0.5) * 5,
      currentLongitude: lng + (Math.random() - 0.5) * 5,
      currentSpeed: statuses[i] === 'Active' ? +(12 + Math.random() * 8).toFixed(1) : 0,
      currentHeading: Math.floor(Math.random() * 360),
      currentFuel: def.fuelCapacity * (0.3 + Math.random() * 0.6),
      lastLocationUpdate: new Date(),
    });
    vessels.push(vessel);
  }

  // Assign captains to vessels
  await User.findByIdAndUpdate(users[4]._id, { assignedVessel: vessels[0]._id });
  await User.findByIdAndUpdate(users[5]._id, { assignedVessel: vessels[3]._id });
  await User.findByIdAndUpdate(users[6]._id, { assignedVessel: vessels[7]._id });

  console.log('[seed] Creating voyages...');
  const routeDefs = [
    ['Chennai', 'Rotterdam', 8430],
    ['Singapore', 'Chennai', 1610],
    ['Dubai', 'Mumbai', 1180],
    ['Shanghai', 'Singapore', 2370],
    ['Colombo', 'Chennai', 460],
    ['Mumbai', 'Dubai', 1180],
    ['Rotterdam', 'Hamburg', 300],
    ['LosAngeles', 'Shanghai', 6480],
    ['Sydney', 'Singapore', 3900],
    ['Hamburg', 'Chennai', 7200],
    ['Chennai', 'Singapore', 1610],
    ['Mumbai', 'Colombo', 900],
    ['Dubai', 'Rotterdam', 6300],
    ['Singapore', 'Sydney', 3900],
    ['Shanghai', 'LosAngeles', 6480],
    ['Chennai', 'Dubai', 2200],
  ];

  const voyageStatuses = [
    'In Transit', 'Delayed', 'Completed', 'Scheduled', 'In Transit',
    'Completed', 'Loading', 'In Transit', 'Delayed', 'Completed',
    'Scheduled', 'In Transit', 'Completed', 'Departed', 'Scheduled', 'Completed',
  ];

  const voyages = [];
  for (let i = 0; i < routeDefs.length; i++) {
    const [originKey, destKey, distance] = routeDefs[i];
    const vessel = vessels[i % vessels.length];
    const status = voyageStatuses[i];
    const departureOffset = status === 'Completed' ? -20 - i : status === 'Scheduled' ? 5 + i : -3 - i;
    const arrivalOffset = departureOffset + Math.round(distance / 350);

    const voyage = await Voyage.create({
      vessel: vessel._id,
      origin: originKey,
      originLat: PORTS[originKey][0],
      originLng: PORTS[originKey][1],
      destination: destKey,
      destinationLat: PORTS[destKey][0],
      destinationLng: PORTS[destKey][1],
      departureDate: daysFromNow(departureOffset),
      expectedArrival: daysFromNow(arrivalOffset),
      actualArrival: status === 'Completed' ? daysFromNow(arrivalOffset + (i % 3)) : null,
      distance,
      distanceTravelled: status === 'Completed' ? distance : status === 'In Transit' ? Math.round(distance * 0.5) : 0,
      status,
      fuelBudget: Math.round(distance * 0.045),
      notes: '',
    });
    voyages.push(voyage);
  }

  console.log('[seed] Creating maintenance tasks...');
  const categories = ['Engine', 'Propeller', 'Hull', 'Electrical', 'Navigation', 'Safety', 'Fuel System', 'Other'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const maintStatuses = ['Scheduled', 'Assigned', 'In Progress', 'Completed', 'Completed', 'Completed'];
  const maintTitles = [
    'Main engine inspection', 'Propeller shaft alignment', 'Hull anti-fouling coat',
    'Navigation radar calibration', 'Fire suppression system check', 'Fuel injector cleaning',
    'Ballast pump overhaul', 'Electrical panel inspection', 'Lifeboat drill and inspection',
    'Bilge pump servicing', 'Anchor windlass maintenance', 'Generator overhaul',
    'Steering gear inspection', 'Bow thruster servicing', 'Deck crane inspection',
  ];

  for (let i = 0; i < 16; i++) {
    const vessel = vessels[i % vessels.length];
    const status = maintStatuses[i % maintStatuses.length];
    const scheduledOffset = status === 'Completed' ? -30 + i : (i % 4 === 0 ? -2 : 3 + i);
    await Maintenance.create({
      vessel: vessel._id,
      title: maintTitles[i % maintTitles.length],
      description: `Routine ${maintTitles[i % maintTitles.length].toLowerCase()} per maintenance schedule.`,
      category: categories[i % categories.length],
      priority: priorities[i % priorities.length],
      scheduledDate: daysFromNow(scheduledOffset),
      startDate: status !== 'Scheduled' ? daysFromNow(scheduledOffset) : null,
      completionDate: status === 'Completed' ? daysFromNow(scheduledOffset + 1) : null,
      assignedTechnician: ['R. Kumar', 'J. Alvarez', 'M. Petrov', 'S. Tan'][i % 4],
      cost: status === 'Completed' ? Math.round(2000 + Math.random() * 15000) : 0,
      status,
    });
  }

  console.log('[seed] Creating cargo records...');
  const cargoTypes = ['Electronics', 'Textiles', 'Machinery', 'Grain', 'Crude Oil', 'Automobiles', 'Furniture', 'Chemicals'];
  const cargoStatuses = ['Booked', 'Loading', 'Loaded', 'In Transit', 'Arrived', 'Delivered', 'Delayed'];

  for (let i = 0; i < 22; i++) {
    const voyage = voyages[i % voyages.length];
    await Cargo.create({
      cargoId: `CRG-${(1000 + i).toString()}`,
      voyage: voyage._id,
      cargoType: cargoTypes[i % cargoTypes.length],
      weight: Math.round(500 + Math.random() * 5000),
      containerCount: Math.round(10 + Math.random() * 200),
      origin: voyage.origin,
      destination: voyage.destination,
      loadingDate: voyage.departureDate,
      expectedDelivery: voyage.expectedArrival,
      actualDelivery: voyage.status === 'Completed' ? voyage.actualArrival : null,
      status: voyage.status === 'Completed' ? 'Delivered' : cargoStatuses[i % cargoStatuses.length],
    });
  }

  console.log('[seed] Creating fuel records...');
  for (const vessel of vessels) {
    let remaining = vessel.fuelCapacity * 0.95;
    let distanceCum = 0;
    for (let day = 20; day >= 0; day -= 2) {
      const consumed = +(15 + Math.random() * 10).toFixed(1);
      const distance = +(consumed * (14 + Math.random() * 3)).toFixed(0);
      remaining = Math.max(0, remaining - consumed);
      distanceCum += distance;
      await FuelRecord.create({
        vessel: vessel._id,
        fuelConsumed: consumed,
        fuelRemaining: +remaining.toFixed(1),
        distanceTravelled: distance,
        expectedFuelConsumed: +(consumed * 0.92).toFixed(1),
        recordedAt: daysFromNow(-day),
      });
    }
    vessel.currentFuel = +remaining.toFixed(1);
    await vessel.save();
  }

  console.log('[seed] Creating vessel location history...');
  for (const vessel of vessels.filter((v) => v.status === 'Active')) {
    for (let i = 10; i >= 0; i--) {
      await VesselLocation.create({
        vessel: vessel._id,
        latitude: vessel.currentLatitude + (Math.random() - 0.5) * 2,
        longitude: vessel.currentLongitude + (Math.random() - 0.5) * 2,
        speed: +(10 + Math.random() * 10).toFixed(1),
        heading: Math.floor(Math.random() * 360),
        timestamp: new Date(Date.now() - i * 3600 * 1000),
      });
    }
  }

  console.log('[seed] Creating alerts...');
  const offlineVessel = vessels.find((v) => v.status === 'Offline');
  const maintenanceVessel = vessels.find((v) => v.status === 'Maintenance');
  const delayedVoyage = voyages.find((v) => v.status === 'Delayed');

  await Alert.create([
    {
      vessel: vessels[0]._id,
      type: 'Engine Warning',
      severity: 'Critical',
      message: `${vessels[0].name}: engine temperature above normal operating range.`,
      status: 'Unread',
      dedupeKey: `ENGINE_WARN:${vessels[0]._id}`,
    },
    {
      vessel: vessels[1]._id,
      type: 'Fuel Warning',
      severity: 'Warning',
      message: `${vessels[1].name}: fuel consumption above expected baseline.`,
      status: 'Unread',
      dedupeKey: `FUEL_OVER:${vessels[1]._id}`,
    },
    {
      vessel: maintenanceVessel?._id,
      type: 'Maintenance Due',
      severity: 'Warning',
      message: `${maintenanceVessel?.name}: scheduled maintenance due in 3 days.`,
      status: 'Read',
      dedupeKey: `MAINT_DUE:${maintenanceVessel?._id}`,
    },
    {
      vessel: delayedVoyage?.vessel,
      voyage: delayedVoyage?._id,
      type: 'Voyage Delay',
      severity: 'Critical',
      message: `Voyage ${delayedVoyage?.origin} → ${delayedVoyage?.destination} is delayed.`,
      status: 'Unread',
      dedupeKey: `VOYAGE_DELAY:${delayedVoyage?._id}`,
    },
    {
      vessel: offlineVessel?._id,
      type: 'Vessel Offline',
      severity: 'Critical',
      message: `${offlineVessel?.name}: no location update received in over 6 hours.`,
      status: 'Unread',
      dedupeKey: `OFFLINE:${offlineVessel?._id}`,
    },
  ]);

  console.log('\n[seed] Done.');
  console.log('[seed] Demo accounts (password for all: ' + DEMO_PASSWORD + '):');
  users.forEach((u) => console.log(`  ${u.role.padEnd(20)} ${u.email}`));

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
