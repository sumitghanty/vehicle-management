import express from 'express';
import cors from 'cors';
import { all, get, run } from './db.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const toMonthCondition = (column, month, params) => {
  if (!month) return '';
  params.push(month);
  return `strftime('%Y-%m', ${column}) = ?`;
};

const toVehicleCondition = (column, vehicle, params) => {
  if (!vehicle) return '';
  params.push(vehicle);
  return `${column} = ?`;
};

const composeWhere = (conditions) => {
  const filtered = conditions.filter(Boolean);
  return filtered.length ? `WHERE ${filtered.join(' AND ')}` : '';
};

app.get('/api/dashboard', async (_req, res) => {
  try {
    const [vehicleCount, driverCount, freightKpi, conditionAlerts] = await Promise.all([
      get('SELECT COUNT(*) AS count FROM vehicles'),
      get('SELECT COUNT(*) AS count FROM drivers'),
      get(`SELECT ROUND(SUM(distance_km), 2) AS totalDistance, ROUND(SUM(fuel_consumed_l), 2) AS totalFuel FROM travel_logs`),
      get(`SELECT COUNT(*) AS alerts FROM vehicle_conditions WHERE engine_temp_c > 100 OR overspeed_events >= 4 OR tyre_pressure_psi < 92`)
    ]);

    const topRoutes = await all(`
      SELECT origin, destination, COUNT(*) AS trips, ROUND(SUM(distance_km),2) AS distance
      FROM travel_logs
      GROUP BY origin, destination
      ORDER BY trips DESC
      LIMIT 5
    `);

    res.json({
      vehicleCount: vehicleCount.count,
      driverCount: driverCount.count,
      totalDistance: freightKpi.totalDistance,
      totalFuel: freightKpi.totalFuel,
      conditionAlerts: conditionAlerts.alerts,
      topRoutes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/insights', async (_req, res) => {
  try {
    const [overspeedByMonth, fuelEfficiencyByMonth, avgEngineTempByMonth, distanceByMonth, tripStatusByMonth, alertByVehicle, fuelEfficiencyByPoint] =
      await Promise.all([
        all(`
          SELECT strftime('%Y-%m', reading_time) AS month, SUM(CASE WHEN overspeed_events > 0 THEN 1 ELSE 0 END) AS vehicles_crossed
          FROM vehicle_conditions
          GROUP BY month
          ORDER BY month
        `),
        all(`
          SELECT strftime('%Y-%m', trip_date) AS month, v.registration_no, ROUND(SUM(distance_km) / NULLIF(SUM(fuel_consumed_l), 0), 2) AS kmpl
          FROM travel_logs t
          JOIN vehicles v ON v.id = t.vehicle_id
          GROUP BY month, v.registration_no
          ORDER BY month, kmpl DESC
        `),
        all(`
          SELECT strftime('%Y-%m', reading_time) AS month, ROUND(AVG(engine_temp_c), 2) AS avg_engine_temp
          FROM vehicle_conditions
          GROUP BY month
          ORDER BY month
        `),
        all(`
          SELECT strftime('%Y-%m', trip_date) AS month, ROUND(SUM(distance_km), 2) AS total_distance
          FROM travel_logs
          GROUP BY month
          ORDER BY month
        `),
        all(`
          SELECT strftime('%Y-%m', trip_date) AS month,
            SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END) AS delayed
          FROM freight_details
          GROUP BY month
          ORDER BY month
        `),
        all(`
          SELECT v.registration_no,
            SUM(CASE WHEN c.engine_temp_c > 100 OR c.overspeed_events >= 4 OR c.tyre_pressure_psi < 92 THEN 1 ELSE 0 END) AS alerts
          FROM vehicle_conditions c
          JOIN vehicles v ON v.id = c.vehicle_id
          GROUP BY v.registration_no
          ORDER BY alerts DESC
        `),
        all(`
          SELECT measurement_point AS point, ROUND(AVG(fuel_efficiency_kmpl), 2) AS avg_kmpl
          FROM vehicle_conditions
          GROUP BY measurement_point
          ORDER BY CASE measurement_point WHEN 'Start' THEN 1 WHEN 'Mid' THEN 2 WHEN 'End' THEN 3 ELSE 4 END
        `)
      ]);

    res.json({
      overspeedByMonth,
      fuelEfficiencyByMonth,
      avgEngineTempByMonth,
      distanceByMonth,
      tripStatusByMonth,
      alertByVehicle,
      fuelEfficiencyByPoint
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vehicles', async (_req, res) => {
  res.json(await all('SELECT * FROM vehicles ORDER BY id'));
});

app.post('/api/vehicles', async (req, res) => {
  const { registration_no, make, model, year, capacity_ton, fuel_type, status, base_location } = req.body;
  const result = await run(
    `INSERT INTO vehicles(registration_no, make, model, year, capacity_ton, fuel_type, status, base_location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [registration_no, make, model, year, capacity_ton, fuel_type, status, base_location]
  );
  res.status(201).json(await get('SELECT * FROM vehicles WHERE id=?', [result.lastID]));
});

app.put('/api/vehicles/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { make, model, year, capacity_ton, fuel_type, status, base_location } = req.body;
  await run(
    `UPDATE vehicles SET make=?, model=?, year=?, capacity_ton=?, fuel_type=?, status=?, base_location=? WHERE id=?`,
    [make, model, year, capacity_ton, fuel_type, status, base_location, id]
  );
  res.json(await get('SELECT * FROM vehicles WHERE id=?', [id]));
});

app.get('/api/drivers', async (_req, res) => {
  res.json(await all('SELECT * FROM drivers ORDER BY id'));
});

app.post('/api/drivers', async (req, res) => {
  const { name, license_no, phone, experience_years, address, status } = req.body;
  const result = await run(
    `INSERT INTO drivers(name, license_no, phone, experience_years, address, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, license_no, phone, experience_years, address, status]
  );
  res.status(201).json(await get('SELECT * FROM drivers WHERE id=?', [result.lastID]));
});

app.put('/api/drivers/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, phone, experience_years, address, status } = req.body;
  await run(
    `UPDATE drivers SET name=?, phone=?, experience_years=?, address=?, status=? WHERE id=?`,
    [name, phone, experience_years, address, status, id]
  );
  res.json(await get('SELECT * FROM drivers WHERE id=?', [id]));
});

app.get('/api/mappings', async (_req, res) => {
  res.json(
    await all(`
      SELECT m.*, v.registration_no, d.name AS driver_name
      FROM vehicle_driver_mapping m
      JOIN vehicles v ON m.vehicle_id = v.id
      JOIN drivers d ON m.driver_id = d.id
      ORDER BY m.id
    `)
  );
});

app.post('/api/mappings', async (req, res) => {
  const { vehicle_id, driver_id, assigned_from, assigned_to, shift_type } = req.body;
  const result = await run(
    `INSERT INTO vehicle_driver_mapping(vehicle_id, driver_id, assigned_from, assigned_to, shift_type)
     VALUES(?, ?, ?, ?, ?)`,
    [vehicle_id, driver_id, assigned_from, assigned_to, shift_type]
  );
  res.status(201).json(await get('SELECT * FROM vehicle_driver_mapping WHERE id=?', [result.lastID]));
});

app.get('/api/freight', async (req, res) => {
  const { month, vehicle, status } = req.query;
  const params = [];
  const where = composeWhere([
    toMonthCondition('f.trip_date', month, params),
    toVehicleCondition('v.registration_no', vehicle, params),
    status ? (params.push(status), 'f.status = ?') : ''
  ]);

  res.json(
    await all(
      `SELECT f.*, v.registration_no, d.name AS driver_name
       FROM freight_details f
       JOIN vehicles v ON v.id = f.vehicle_id
       JOIN drivers d ON d.id = f.driver_id
       ${where}
       ORDER BY trip_date DESC
       LIMIT 500`,
      params
    )
  );
});

app.get('/api/travel', async (req, res) => {
  const { month, vehicle } = req.query;
  const params = [];
  const where = composeWhere([toMonthCondition('t.trip_date', month, params), toVehicleCondition('v.registration_no', vehicle, params)]);

  res.json(
    await all(
      `SELECT t.*, v.registration_no
       FROM travel_logs t
       JOIN vehicles v ON v.id = t.vehicle_id
       ${where}
       ORDER BY trip_date DESC
       LIMIT 500`,
      params
    )
  );
});

app.get('/api/conditions', async (req, res) => {
  const { month, vehicle, filter, point } = req.query;
  const params = [];
  const conditions = [toMonthCondition('c.reading_time', month, params), toVehicleCondition('v.registration_no', vehicle, params)];

  if (point) {
    params.push(point);
    conditions.push('c.measurement_point = ?');
  }

  if (filter === 'overspeed') conditions.push('c.overspeed_events > 0');
  if (filter === 'alerts') conditions.push('(c.engine_temp_c > 100 OR c.overspeed_events >= 4 OR c.tyre_pressure_psi < 92)');
  if (filter === 'hotEngine') conditions.push('c.engine_temp_c > 100');

  const where = composeWhere(conditions);

  res.json(
    await all(
      `SELECT c.*, v.registration_no
       FROM vehicle_conditions c
       JOIN vehicles v ON v.id = c.vehicle_id
       ${where}
       ORDER BY reading_time DESC
       LIMIT 500`,
      params
    )
  );
});

app.get('/api/fuel-efficiency', async (req, res) => {
  const { month, vehicle, point } = req.query;
  const params = [];
  const where = composeWhere([
    toMonthCondition('c.reading_time', month, params),
    toVehicleCondition('v.registration_no', vehicle, params),
    point ? (params.push(point), 'c.measurement_point = ?') : ''
  ]);

  res.json(
    await all(
      `SELECT c.id, c.trip_date, c.measurement_point, c.reading_time, c.distance_covered_km, c.fuel_used_l, c.fuel_efficiency_kmpl,
              c.tyre_pressure_psi, c.fuel_level_percent, c.engine_temp_c, c.overspeed_events, c.battery_voltage, c.coolant_level_percent,
              c.odometer_km, v.registration_no
       FROM vehicle_conditions c
       JOIN vehicles v ON v.id = c.vehicle_id
       ${where}
       ORDER BY c.trip_date DESC, CASE c.measurement_point WHEN 'Start' THEN 1 WHEN 'Mid' THEN 2 WHEN 'End' THEN 3 ELSE 4 END`,
      params
    )
  );
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
