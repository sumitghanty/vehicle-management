import React from 'react';
import { useEffect, useState } from 'react';
import { request } from '../api.js';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    request('/dashboard').then(setDashboard);
  }, []);

  if (!dashboard) return <p>Loading dashboard...</p>;

  const cards = [
    ['Vehicles', dashboard.vehicleCount],
    ['Drivers', dashboard.driverCount],
    ['Total Distance (km)', dashboard.totalDistance],
    ['Total Fuel (L)', dashboard.totalFuel],
    ['Condition Alerts', dashboard.conditionAlerts]
  ];

  return (
    <div>
      <h1>Vehicle Condition Management Dashboard</h1>
      <p>
        Overview of fleet operations around Kolkata and India freight corridors, covering approximately 4500+ km route
        combinations.
      </p>
      <div className="kpi-grid">
        {cards.map(([label, value]) => (
          <article className="kpi" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <section className="panel">
        <h3>Top Travel Routes</h3>
        <ul>
          {dashboard.topRoutes.map((route) => (
            <li key={`${route.origin}-${route.destination}`}>
              {route.origin} → {route.destination}: {route.trips} trips ({route.distance} km)
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
