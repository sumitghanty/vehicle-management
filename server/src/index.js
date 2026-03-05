import express from 'express';
import cors from 'cors';
import { all, get, run } from './db.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

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
    const [overspeedByMonth, fuelEfficiencyByMonth, avgEngineTempByMonth, distanceByMonth, tripStatusByMonth, alertByVehicle] =
      await Promise.all([
        all(`
          SELECT strftime('%Y-%m', reading_time) AS month, SUM(CASE WHEN overspeed_events > 0 THEN 1 ELSE 0 END) AS vehicles_crossed
          FROM vehicle_conditions
          GROUP BY month
          ORDER BY month
        `),
        all(`
          SELECT strftime('%Y-%m', t.trip_date) AS month, v.registration_no, ROUND(SUM(t.distance_km) / NULLIF(SUM(t.fuel_consumed_l), 0), 2) AS kmpl
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
        `)
      ]);

    res.json({
      overspeedByMonth,
      fuelEfficiencyByMonth,
      avgEngineTempByMonth,
      distanceByMonth,
      tripStatusByMonth,
      alertByVehicle
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

app.get('/api/freight', async (_req, res) => {
  res.json(
    await all(`
      SELECT f.*, v.registration_no, d.name AS driver_name
      FROM freight_details f
      JOIN vehicles v ON v.id = f.vehicle_id
      JOIN drivers d ON d.id = f.driver_id
      ORDER BY trip_date DESC
      LIMIT 200
    `)
  );
});

app.get('/api/travel', async (_req, res) => {
  res.json(
    await all(`
      SELECT t.*, v.registration_no
      FROM travel_logs t
      JOIN vehicles v ON v.id = t.vehicle_id
      ORDER BY trip_date DESC
      LIMIT 200
    `)
  );
});

app.get('/api/conditions', async (_req, res) => {
  res.json(
    await all(`
      SELECT c.*, v.registration_no
      FROM vehicle_conditions c
      JOIN vehicles v ON v.id = c.vehicle_id
      ORDER BY reading_time DESC
      LIMIT 200
    `)
  );
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
