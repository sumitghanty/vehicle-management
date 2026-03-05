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
  },
  {
    registration_no: 'WB24CD5678',
    make: 'Ashok Leyland',
    model: '2820 Tipper',
    year: 2020,
    capacity_ton: 25,
    fuel_type: 'Diesel',
    status: 'Active',
    base_location: 'Howrah'
  },
  {
    registration_no: 'WB26EF9012',
    make: 'Mahindra',
    model: 'Blazo X 48',
    year: 2022,
    capacity_ton: 31,
    fuel_type: 'Diesel',
    status: 'Maintenance',
    base_location: 'Dankuni'
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
  },
  {
    name: 'Rakesh Singh',
    license_no: 'WB2019456123789',
    phone: '+91-9874409988',
    experience_years: 11,
    address: 'Bally, Howrah',
    status: 'Active'
  },
  {
    name: 'Md. Imran Ali',
    license_no: 'WB2021567894321',
    phone: '+91-9051102244',
    experience_years: 6,
    address: 'Barasat, North 24 Parganas',
    status: 'On Leave'
  }
];

const routes = [
  ['Kolkata', 'Siliguri', 575],
  ['Kolkata', 'Asansol', 205],
  ['Kolkata', 'Durgapur', 170],
  ['Kolkata', 'Bhubaneswar', 440],
  ['Kolkata', 'Patna', 580],
  ['Kolkata', 'Ranchi', 410],
  ['Howrah', 'Guwahati', 1020],
  ['Dankuni', 'Jamshedpur', 290]
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
  for (const vehicle of vehicles) {
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
  }

  for (const driver of drivers) {
    await run(
      `INSERT INTO drivers(name, license_no, phone, experience_years, address, status)
       VALUES(?, ?, ?, ?, ?, ?)`,
      [driver.name, driver.license_no, driver.phone, driver.experience_years, driver.address, driver.status]
    );
  }

  await run(`
    INSERT INTO vehicle_driver_mapping(vehicle_id, driver_id, assigned_from, assigned_to, shift_type)
    VALUES
      (1, 1, '2022-01-01', NULL, 'Day'),
      (2, 2, '2022-01-15', NULL, 'Night'),
      (3, 3, '2022-03-01', '2023-11-30', 'Flexible')
  `);
}

async function seedOperationalData() {
  const start = new Date('2022-01-01');
  const end = new Date('2023-12-31');
  const cargoTypes = ['Steel Coils', 'Cement Bags', 'Electronics', 'Textiles', 'FMCG'];

  const odo = { 1: 122000, 2: 98000, 3: 64000 };

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 14)) {
    const dateStr = date.toISOString().slice(0, 10);

    for (let vehicleId = 1; vehicleId <= 3; vehicleId += 1) {
      const driverId = vehicleId;
      const route = routes[Math.floor(Math.random() * routes.length)];
      const [origin, destination, distance] = route;
      const seasonalFactor = date.getMonth() >= 5 && date.getMonth() <= 8 ? 1.12 : 1;
      const actualDistance = Number((distance * randomRange(0.95, 1.08)).toFixed(2));
      const avgSpeed = Number(randomRange(42, 64).toFixed(2));
      const maxSpeed = Number((avgSpeed + randomRange(12, 30)).toFixed(2));
      const fuelUsed = Number((actualDistance / randomRange(3.2, 4.8)).toFixed(2));

      odo[vehicleId] += actualDistance;

      await run(
        `INSERT INTO freight_details(vehicle_id, driver_id, origin, destination, cargo_type, cargo_weight_ton,
          freight_amount_inr, planned_distance_km, trip_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vehicleId,
          driverId,
          origin,
          destination,
          cargoTypes[Math.floor(Math.random() * cargoTypes.length)],
          Number(randomRange(8, 26).toFixed(2)),
          Number((distance * randomRange(95, 130) * seasonalFactor).toFixed(2)),
          distance,
          dateStr,
          Math.random() > 0.08 ? 'Delivered' : 'Delayed'
        ]
      );

      await run(
        `INSERT INTO travel_logs(vehicle_id, trip_date, distance_km, avg_speed_kmph, max_speed_kmph, fuel_consumed_l, origin, destination)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [vehicleId, dateStr, actualDistance, avgSpeed, maxSpeed, fuelUsed, origin, destination]
      );

      await run(
        `INSERT INTO vehicle_conditions(vehicle_id, reading_time, tyre_pressure_psi, fuel_level_percent,
          engine_temp_c, overspeed_events, battery_voltage, coolant_level_percent, odometer_km)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vehicleId,
          `${dateStr}T08:00:00.000Z`,
          Number(randomRange(88, 115).toFixed(2)),
          Number(randomRange(20, 95).toFixed(2)),
          Number(randomRange(78, 108).toFixed(2)),
          Math.floor(randomRange(0, 6)),
          Number(randomRange(11.8, 14.2).toFixed(2)),
          Number(randomRange(55, 100).toFixed(2)),
          Number(odo[vehicleId].toFixed(2))
        ]
      );
    }
  }
}

(async () => {
  try {
    await setupSchema();
    await seedMasterData();
    await seedOperationalData();
    console.log('Database seeded successfully with 2022-2023 dummy data for 3 vehicles.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
