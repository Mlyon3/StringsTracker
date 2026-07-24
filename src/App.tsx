import { Link, NavLink, Route, Routes } from 'react-router-dom';
import {
  ArchivedPage,
  DashboardPage,
  NewAssetPage,
  ProfilePage,
} from './features/assets/AssetPages';
import { BackupPage } from './features/backup/BackupPage';
import { MaintenancePage } from './features/maintenance/MaintenancePage';
import { RemindersPage } from './features/reminders/RemindersPage';
import { StringChangePage } from './features/strings/StringChangePage';

function Layout() {
  return (
    <>
      <header>
        <Link to="/" className="brand">
          String Ledger
        </Link>
        <nav>
          <NavLink to="/reminders">Reminders</NavLink>
          <NavLink to="/archived">Archived</NavLink>
          <NavLink to="/backup">Backup</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/new" element={<NewAssetPage />} />
          <Route path="/assets/:id" element={<ProfilePage />} />
          <Route path="/assets/:id/strings" element={<StringChangePage />} />
          <Route path="/assets/:id/maintenance" element={<MaintenancePage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/archived" element={<ArchivedPage />} />
          <Route path="/backup" element={<BackupPage />} />
        </Routes>
      </main>
    </>
  );
}

export function App() {
  return <Layout />;
}
