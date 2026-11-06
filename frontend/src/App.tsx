import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { GateProvider, useGate } from '@/context/GateContext';
import { useHashRoute } from '@/lib/router';
import { AppShell } from '@/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { ParkingPage } from '@/pages/ParkingPage';
import { GatePage } from '@/pages/GatePage';
import { EventsPage } from '@/pages/EventsPage';
import { PerformancePage } from '@/pages/PerformancePage';
import { SimulatorPage } from '@/pages/SimulatorPage';

function Routes() {
  const [route] = useHashRoute('/');
  const { status } = useGate();
  let page;
  switch (route) {
    case '/estacionamento': page = <ParkingPage />; break;
    case '/cancela': page = <GatePage />; break;
    case '/eventos': page = <EventsPage />; break;
    case '/desempenho': page = <PerformancePage />; break;
    case '/simulador': page = status?.simulator ? <SimulatorPage /> : <Dashboard />; break;
    default: page = <Dashboard />;
  }
  return <AppShell route={route}>{page}</AppShell>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <GateProvider>
          <Routes />
        </GateProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
