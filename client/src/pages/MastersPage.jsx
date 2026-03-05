import { useEffect, useState } from 'react';
import { request } from '../api.js';
import DataTable from '../components/DataTable.jsx';

export default function MastersPage() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const load = async () => {
    const [vehiclesData, driversData] = await Promise.all([request('/vehicles'), request('/drivers')]);
    setVehicles(vehiclesData);
    setDrivers(driversData);
  };

  useEffect(() => {
    load();
  }, []);

  const updateVehicle = async (vehicle) => {
    await request(`/vehicles/${vehicle.id}`, {
      method: 'PUT',
      body: JSON.stringify(vehicle)
    });
    await load();
  };

  const updateDriver = async (driver) => {
    await request(`/drivers/${driver.id}`, {
      method: 'PUT',
      body: JSON.stringify(driver)
    });
    await load();
  };

  return (
    <div>
      <h1>Vehicle Master & Driver Master</h1>
      <p>Editable master data including key vehicle metadata and driver details.</p>
      <DataTable
        title="Vehicle Master"
        columns={[
          { key: 'registration_no', label: 'Reg No' },
          { key: 'make', label: 'Make' },
          { key: 'model', label: 'Model' },
          { key: 'year', label: 'Year' },
          { key: 'capacity_ton', label: 'Capacity(Ton)' },
          { key: 'status', label: 'Status' },
          { key: 'base_location', label: 'Base' }
        ]}
        data={vehicles}
      />
      <button className="btn" onClick={() => updateVehicle({ ...vehicles[0], status: 'Active' })}>
        Quick Fix First Vehicle Status
      </button>
      <DataTable
        title="Driver Master"
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'license_no', label: 'License' },
          { key: 'phone', label: 'Phone' },
          { key: 'experience_years', label: 'Experience' },
          { key: 'address', label: 'Address' },
          { key: 'status', label: 'Status' }
        ]}
        data={drivers}
      />
      <button className="btn" onClick={() => updateDriver({ ...drivers[2], status: 'Active' })}>
        Mark Third Driver Active
      </button>
    </div>
  );
}
