import { useEffect, useState } from 'react';
import { request } from '../api.js';
import DataTable from '../components/DataTable.jsx';

export default function ConditionsPage() {
  const [travel, setTravel] = useState([]);
  const [conditions, setConditions] = useState([]);

  useEffect(() => {
    Promise.all([request('/travel'), request('/conditions')]).then(([travelData, conditionData]) => {
      setTravel(travelData);
      setConditions(conditionData);
    });
  }, []);

  return (
    <div>
      <h1>Travel Log & Vehicle Condition Monitoring</h1>
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
        data={travel.slice(0, 60)}
      />
      <DataTable
        title="Vehicle Condition Data"
        columns={[
          { key: 'reading_time', label: 'Reading Time' },
          { key: 'registration_no', label: 'Vehicle' },
          { key: 'tyre_pressure_psi', label: 'Tyre PSI' },
          { key: 'fuel_level_percent', label: 'Fuel %' },
          { key: 'engine_temp_c', label: 'Engine °C' },
          { key: 'overspeed_events', label: 'Overspeed' },
          { key: 'battery_voltage', label: 'Battery V' },
          { key: 'coolant_level_percent', label: 'Coolant %' }
        ]}
        data={conditions.slice(0, 60)}
      />
    </div>
  );
}
