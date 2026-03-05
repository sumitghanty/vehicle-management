import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api.js';

function ChartCard({ title, points, valueKey, colorClass = '', onClick }) {
  const maxValue = useMemo(() => Math.max(...points.map((point) => Number(point[valueKey]) || 0), 1), [points, valueKey]);

  return (
    <article className={`panel chart-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <h3>{title}</h3>
      <div className="chart-bars">
        {points.map((point) => {
          const value = Number(point[valueKey]) || 0;
          const height = Math.max((value / maxValue) * 100, 6);
          return (
            <div className="chart-col" key={`${point.month}-${point.registration_no ?? title}`}>
              <div className={`chart-bar ${colorClass}`} style={{ height: `${height}%` }} title={`${point.month}: ${value}`} />
              <small>{point.month?.slice(2) ?? point.registration_no}</small>
              <span>{value}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [insights, setInsights] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([request('/dashboard'), request('/insights')]).then(([dashboardData, insightData]) => {
      setDashboard(dashboardData);
      setInsights(insightData);
    });
  }, []);

  if (!dashboard || !insights) return <p>Loading dashboard...</p>;

  const cards = [
    ['Vehicles', dashboard.vehicleCount],
    ['Drivers', dashboard.driverCount],
    ['Total Distance (km)', dashboard.totalDistance],
    ['Total Fuel (L)', dashboard.totalFuel],
    ['Condition Alerts', dashboard.conditionAlerts]
  ];

  const monthlyBestFuel = Object.values(
    insights.fuelEfficiencyByMonth.reduce((acc, row) => {
      if (!acc[row.month] || Number(row.kmpl) > Number(acc[row.month].kmpl)) {
        acc[row.month] = row;
      }
      return acc;
    }, {})
  );

  return (
    <div>
      <h1>Vehicle Condition Management Dashboard</h1>
      <p>Interactive insights for monthly travel, overspeeding, fuel efficiency and condition alerts.</p>

      <div className="kpi-grid">
        {cards.map(([label, value]) => (
          <article className="kpi" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="chart-grid">
        <ChartCard
          title="Overspeed Vehicles by Month (Red)"
          points={insights.overspeedByMonth}
          valueKey="vehicles_crossed"
          colorClass="bar-red"
          onClick={() => navigate('/conditions')}
        />

        <ChartCard
          title="Most Fuel Efficient Vehicle per Month"
          points={monthlyBestFuel}
          valueKey="kmpl"
          colorClass="bar-green"
          onClick={() => navigate('/conditions')}
        />

        <ChartCard
          title="Average Engine Temperature by Month"
          points={insights.avgEngineTempByMonth}
          valueKey="avg_engine_temp"
          colorClass="bar-orange"
          onClick={() => navigate('/conditions')}
        />

        <ChartCard
          title="Total Distance by Month"
          points={insights.distanceByMonth}
          valueKey="total_distance"
          colorClass="bar-blue"
          onClick={() => navigate('/conditions')}
        />

        <ChartCard
          title="Delayed Trips by Month"
          points={insights.tripStatusByMonth}
          valueKey="delayed"
          colorClass="bar-purple"
          onClick={() => navigate('/freight')}
        />

        <ChartCard
          title="Alerts by Vehicle"
          points={insights.alertByVehicle.map((row) => ({ ...row, month: row.registration_no }))}
          valueKey="alerts"
          colorClass="bar-red"
          onClick={() => navigate('/conditions')}
        />
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
