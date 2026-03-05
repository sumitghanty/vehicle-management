import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { request } from '../api.js';
import DataTable from '../components/DataTable.jsx';

export default function ConditionsPage() {
  const [travel, setTravel] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [fuelMeasurements, setFuelMeasurements] = useState([]);
  const location = useLocation();

  const query = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.toString() ? `?${params.toString()}` : '';
  }, [location.search]);

  useEffect(() => {
    Promise.all([request(`/travel${query}`), request(`/conditions${query}`), request(`/fuel-efficiency${query}`)]).then(
      ([travelData, conditionData, fuelData]) => {
        setTravel(travelData);
        setConditions(conditionData);
        setFuelMeasurements(fuelData);
      }
    );
  }, [query]);

  return (
    <div>
      <h1>Travel Log & Vehicle Condition Monitoring</h1>
      {query && <p className="active-filter">Showing filtered data for: {query.replace('?', '')}</p>}

      <DataTable
        title="Travel Logs"
        columns={[
          { key: 'trip_date', label: 'Date' },
          { key: 'registration_no', label: 'Vehicle' },
          { key: 'origin', label: 'Origin' },
          { key: 'destination', label: 'Destination' },
          { key: 'distance_km', label: 'Distance' },
          { key: 'avg_speed_kmph', label: 'Avg Speed' },
          { key: 'max_speed_kmph', label: 'Max Speed' },
          { key: 'fuel_consumed_l', label: 'Fuel(L)' }
        ]}
        data={travel.slice(0, 120)}
      />

      <DataTable
        title="Vehicle Condition Data"
        columns={[
          { key: 'trip_date', label: 'Trip Date' },
          { key: 'measurement_point', label: 'Point' },
          { key: 'reading_time', label: 'Reading Time' },
          { key: 'registration_no', label: 'Vehicle' },
          { key: 'engine_temp_c', label: 'Engine °C' },
          { key: 'overspeed_events', label: 'Overspeed' },
          { key: 'tyre_pressure_psi', label: 'Tyre PSI' },
          { key: 'battery_voltage', label: 'Battery V' },
          { key: 'coolant_level_percent', label: 'Coolant %' }
        ]}
        data={conditions.slice(0, 120)}
      />

      <DataTable
        title="Fuel Efficiency Measurements (Start / Mid / End)"
        columns={[
          { key: 'trip_date', label: 'Trip Date' },
          { key: 'registration_no', label: 'Vehicle' },
          { key: 'measurement_point', label: 'Point' },
          { key: 'distance_covered_km', label: 'Distance Covered KM' },
          { key: 'fuel_used_l', label: 'Fuel Used (L)' },
          { key: 'fuel_efficiency_kmpl', label: 'Efficiency KM/L' },
          { key: 'fuel_level_percent', label: 'Fuel %' },
          { key: 'engine_temp_c', label: 'Engine °C' },
          { key: 'overspeed_events', label: 'Overspeed Events' },
          { key: 'odometer_km', label: 'Odometer KM' }
        ]}
        data={fuelMeasurements.slice(0, 120)}
      />
    </div>
  );
}
