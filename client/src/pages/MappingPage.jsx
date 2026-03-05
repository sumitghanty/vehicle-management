import React from 'react';
import { useEffect, useState } from 'react';
import { request } from '../api.js';
import DataTable from '../components/DataTable.jsx';

export default function MappingPage() {
  const [mappings, setMappings] = useState([]);

  useEffect(() => {
    request('/mappings').then(setMappings);
  }, []);

  return (
    <div>
      <h1>Vehicle and Driver Mapping</h1>
      <DataTable
        title="Assignment Matrix"
        columns={[
          { key: 'registration_no', label: 'Vehicle' },
          { key: 'driver_name', label: 'Driver' },
          { key: 'assigned_from', label: 'Assigned From' },
          { key: 'assigned_to', label: 'Assigned To' },
          { key: 'shift_type', label: 'Shift' }
        ]}
        data={mappings}
      />
    </div>
  );
}
