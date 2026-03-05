import { db, run } from './db.js';

const vehicles = [
  {
    registration_no: 'WB20AB1234',
    make: 'Tata Motors',
    model: 'Prima 5530.S',
    year: 2021,
    capacity_ton: 28,
    fuel_type: 'Diesel',
    status: 'Active',
    base_location: 'Kolkata'
  }
];

const drivers = [
  {
    name: 'Anup Ghosh',
    license_no: 'WB2020123456789',
    phone: '+91-9830011122',
    experience_years: 8,
    address: 'Behala, Kolkata',
    status: 'Active'
  }
];

const randomRange = (min, max) => Math.random() * (max - min) + min;

async function setupSchema() {
  await run('PRAGMA foreign_keys = ON');

  await run('DROP TABLE IF EXISTS vehicle_conditions');
  await run('DROP TABLE IF EXISTS travel_logs');
  await run('DROP TABLE IF EXISTS freight_details');
  await run('DROP TABLE IF EXISTS vehicle_driver_mapping');
  await run('DROP TABLE IF EXISTS drivers');
  await run('DROP TABLE IF EXISTS vehicles');

  await run(`
    CREATE TABLE vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_no TEXT UNIQUE NOT NULL,
      make TEXT,
      model TEXT,
      year INTEGER,
      capacity_ton REAL,
      fuel_type TEXT,
      status TEXT,
      base_location TEXT
    )
  `);

  await run(`
    CREATE TABLE drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      license_no TEXT UNIQUE NOT NULL,
      phone TEXT,
      experience_years INTEGER,
      address TEXT,
      status TEXT
    )
  `);

  await run(`
    CREATE TABLE vehicle_driver_mapping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      assigned_from TEXT,
      assigned_to TEXT,
      shift_type TEXT,
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY(driver_id) REFERENCES drivers(id)
    )
  `);

  await run(`
    CREATE TABLE freight_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER,
      driver_id INTEGER,
      origin TEXT,
      destination TEXT,
      cargo_type TEXT,
      cargo_weight_ton REAL,
      freight_amount_inr REAL,
      planned_distance_km REAL,
      trip_date TEXT,
      status TEXT,
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY(driver_id) REFERENCES drivers(id)
    )
  `);

  await run(`
    CREATE TABLE travel_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER,
      trip_date TEXT,
      distance_km REAL,
      avg_speed_kmph REAL,
      max_speed_kmph REAL,
      fuel_consumed_l REAL,
      origin TEXT,
      destination TEXT,
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
    )
  `);

  await run(`
    CREATE TABLE vehicle_conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER,
      reading_time TEXT,
      tyre_pressure_psi REAL,
      fuel_level_percent REAL,
      engine_temp_c REAL,
      overspeed_events INTEGER,
      battery_voltage REAL,
      coolant_level_percent REAL,
      odometer_km REAL,
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
    )
  `);
}

async function seedMasterData() {
  const vehicle = vehicles[0];
  await run(
    `INSERT INTO vehicles(registration_no, make, model, year, capacity_ton, fuel_type, status, base_location)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      vehicle.registration_no,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.capacity_ton,
      vehicle.fuel_type,
      vehicle.status,
      vehicle.base_location
    ]
  );

  const driver = drivers[0];
  await run(
    `INSERT INTO drivers(name, license_no, phone, experience_years, address, status)
     VALUES(?, ?, ?, ?, ?, ?)`,
    [driver.name, driver.license_no, driver.phone, driver.experience_years, driver.address, driver.status]
  );

  await run(
    `INSERT INTO vehicle_driver_mapping(vehicle_id, driver_id, assigned_from, assigned_to, shift_type)
     VALUES(1, 1, '2022-01-01', NULL, 'Day')`
  );
}

async function seedOperationalData() {
  const tripDate = '2022-01-01';
  const origin = 'Kolkata';
  const destination = 'Ranchi';
  const distance = 410;

  const actualDistance = Number((distance * randomRange(0.95, 1.08)).toFixed(2));
  const avgSpeed = Number(randomRange(42, 64).toFixed(2));
  const maxSpeed = Number((avgSpeed + randomRange(12, 30)).toFixed(2));
  const fuelUsed = Number((actualDistance / randomRange(3.2, 4.8)).toFixed(2));
  const odometer = Number((122000 + actualDistance).toFixed(2));

  await run(
    `INSERT INTO freight_details(vehicle_id, driver_id, origin, destination, cargo_type, cargo_weight_ton,
      freight_amount_inr, planned_distance_km, trip_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      1,
      origin,
      destination,
      'Steel Coils',
      Number(randomRange(8, 26).toFixed(2)),
      Number((distance * randomRange(95, 130)).toFixed(2)),
      distance,
      tripDate,
      'Delivered'
    ]
  );

  await run(
    `INSERT INTO travel_logs(vehicle_id, trip_date, distance_km, avg_speed_kmph, max_speed_kmph, fuel_consumed_l, origin, destination)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, tripDate, actualDistance, avgSpeed, maxSpeed, fuelUsed, origin, destination]
  );

  await run(
    `INSERT INTO vehicle_conditions(vehicle_id, reading_time, tyre_pressure_psi, fuel_level_percent,
      engine_temp_c, overspeed_events, battery_voltage, coolant_level_percent, odometer_km)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      `${tripDate}T08:00:00.000Z`,
      Number(randomRange(88, 115).toFixed(2)),
      Number(randomRange(20, 95).toFixed(2)),
      Number(randomRange(78, 108).toFixed(2)),
      Math.floor(randomRange(0, 6)),
      Number(randomRange(11.8, 14.2).toFixed(2)),
      Number(randomRange(55, 100).toFixed(2)),
      odometer
    ]
  );
}

(async () => {
  try {
    await setupSchema();
    await seedMasterData();
    await seedOperationalData();
    console.log('Database seeded successfully with one sample row per table.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
