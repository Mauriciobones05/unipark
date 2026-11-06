import { Activity, DoorOpen, FlaskConical, LayoutDashboard, ListChecks, SquareParking, type LucideIcon } from 'lucide-react';

export interface NavItem { to: string; label: string; icon: LucideIcon; onlySimulator?: boolean }

export const NAV: NavItem[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/estacionamento', label: 'Estacionamento', icon: SquareParking },
  { to: '/cancela', label: 'Cancela', icon: DoorOpen },
  { to: '/eventos', label: 'Eventos', icon: ListChecks },
  { to: '/desempenho', label: 'Desempenho', icon: Activity },
  { to: '/simulador', label: 'Simulador', icon: FlaskConical, onlySimulator: true },
];
