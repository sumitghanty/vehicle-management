import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { request } from '../api.js';
import DataTable from '../components/DataTable.jsx';

export default function FreightPage() {
  const [freight, setFreight] = useState([]);
  const location = useLocation();

  const query = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.toString() ? `?${params.toString()}` : '';
  }, [location.search]);

  useEffect(() => {
    request(`/freight${query}`).then(setFreight);
  }, [query]);

  const totalDistance = useMemo(
    () => freight.reduce((sum, trip) => sum + Number(trip.planned_distance_km || 0), 0).toFixed(2),
    [freight]
  );

  return (
    <div>
      <h1>Freight Movement Details</h1>
      {query && <p className="active-filter">Showing filtered freight data for: {query.replace('?', '')}</p>}
      <p>Coverage includes major India routes from Kolkata clusters, totaling {totalDistance} km in shown trips.</p>
      <DataTable
        title="Freight Trips"
        columns={[
          { key: 'trip_date', label: 'Date' },
          { key: 'registration_no', label: 'Vehicle' },
          { key: 'driver_name', label: 'Driver' },
          { key: 'origin', label: 'Origin' },
          { key: 'destination', label: 'Destination' },
          { key: 'cargo_type', label: 'Cargo' },
          { key: 'planned_distance_km', label: 'Planned KM' },
          { key: 'freight_amount_inr', label: 'Freight INR' },
          { key: 'status', label: 'Status' }
        ]}
        data={freight.slice(0, 120)}
      />
    </div>
  );
}
