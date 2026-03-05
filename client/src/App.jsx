import { NavLink, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage.jsx';
import MastersPage from './pages/MastersPage.jsx';
import MappingPage from './pages/MappingPage.jsx';
import FreightPage from './pages/FreightPage.jsx';
import ConditionsPage from './pages/ConditionsPage.jsx';

const links = [
  ['/', 'Dashboard'],
  ['/masters', 'Vehicle & Driver Master'],
  ['/mapping', 'Vehicle Driver Mapping'],
  ['/freight', 'Freight Details'],
  ['/conditions', 'Travel & Conditions']
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Vehicle Ops</h2>
        <p>Kolkata Logistics Monitoring (2022-23)</p>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className="navlink">
            {label}
          </NavLink>
        ))}
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/masters" element={<MastersPage />} />
          <Route path="/mapping" element={<MappingPage />} />
          <Route path="/freight" element={<FreightPage />} />
          <Route path="/conditions" element={<ConditionsPage />} />
        </Routes>
      </main>
    </div>
  );
}
