import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api.js';

function ChartCard({ title, subtitle, points, valueKey, labelKey = 'month', colorClass = '', onPointClick }) {
  const maxValue = useMemo(() => Math.max(...points.map((point) => Number(point[valueKey]) || 0), 1), [points, valueKey]);

  return (
    <article className="panel chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="chart-bars">
        {points.map((point) => {
          const value = Number(point[valueKey]) || 0;
          const height = Math.max((value / maxValue) * 100, 6);
          const label = point[labelKey];
          return (
            <button className="chart-col chart-bar-btn" key={`${label}-${title}`} onClick={() => onPointClick?.(point)}>
              <div className={`chart-bar ${colorClass}`} style={{ height: `${height}%` }} title={`${label}: ${value}`} />
              <small>{String(label).slice(2)}</small>
              <span>{value}</span>
            </button>
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
      <section className="hero panel">
        <h1>Vehicle Condition Management Dashboard</h1>
        <p>Click a specific bar in any chart to navigate to detail page with filtered records.</p>
        <span className="hero-chip">Interactive drill-down enabled</span>
      </section>

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
          title="Overspeed Vehicles"
          subtitle="Click month bar to view overspeed records"
          points={insights.overspeedByMonth}
          valueKey="vehicles_crossed"
          colorClass="bar-red"
          onPointClick={(point) => navigate(`/conditions?month=${point.month}&filter=overspeed`)}
        />

        <ChartCard
          title="Fuel Efficient Vehicle"
          subtitle="Click month bar to inspect fuel logs"
          points={monthlyBestFuel}
          valueKey="kmpl"
          colorClass="bar-green"
          onPointClick={(point) => navigate(`/conditions?month=${point.month}&vehicle=${point.registration_no}`)}
        />

        <ChartCard
          title="Engine Temperature"
          subtitle="Click month bar to inspect high engine readings"
          points={insights.avgEngineTempByMonth}
          valueKey="avg_engine_temp"
          colorClass="bar-orange"
          onPointClick={(point) => navigate(`/conditions?month=${point.month}&filter=hotEngine`)}
        />

        <ChartCard
          title="Distance Covered"
          subtitle="Click month bar to inspect travel logs"
          points={insights.distanceByMonth}
          valueKey="total_distance"
          colorClass="bar-blue"
          onPointClick={(point) => navigate(`/conditions?month=${point.month}`)}
        />

        <ChartCard
          title="Delayed Trips"
          subtitle="Click month bar to view delayed freight"
          points={insights.tripStatusByMonth}
          valueKey="delayed"
          colorClass="bar-purple"
          onPointClick={(point) => navigate(`/freight?month=${point.month}&status=Delayed`)}
        />

        <ChartCard
          title="Alerts by Vehicle"
          subtitle="Click vehicle bar to view alert-only condition logs"
          points={insights.alertByVehicle.map((row) => ({ ...row, vehicle: row.registration_no }))}
          labelKey="vehicle"
          valueKey="alerts"
          colorClass="bar-red"
          onPointClick={(point) => navigate(`/conditions?vehicle=${point.vehicle}&filter=alerts`)}
        />

        <ChartCard
          title="Fuel Efficiency by Trip Point"
          subtitle="Start / Mid / End efficiency measurement"
          points={insights.fuelEfficiencyByPoint}
          labelKey="point"
          valueKey="avg_kmpl"
          colorClass="bar-teal"
          onPointClick={(point) => navigate(`/conditions?point=${point.point}`)}
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
