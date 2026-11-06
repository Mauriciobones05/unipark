// Contrato da API do ESP32 (ver docs/arquitetura.md). Mantenha igual ao JSON de WebServerManager.cpp.
export type GateState = 'INICIALIZANDO' | 'FECHADA' | 'ABRINDO' | 'ABERTA' | 'FECHANDO' | 'FALHA';
export type GateMode = 'AUTOMATICO' | 'MANUAL';
export type Auth = 'NENHUMA' | 'ENTRADA' | 'SAIDA';

/** `t` = ms desde o boot da placa; `at` = relógio do navegador (só nos eventos guardados em cache) */
export interface GateEvent { t: number; msg: string; at?: number }

export interface Status {
  state: GateState;
  mode: GateMode;
  stateAgeMs: number;
  uptimeMs: number;
  fault: { code: string; message: string };
  parking: { capacity: number; occupied: number; free: number; auth: Auth; entries: number; exits: number; deniedFull: number };
  sensors: { arrival: boolean; obstacle: boolean; limit: boolean };
  servo: { angle: number; enabled: boolean };
  leds: { green: boolean; red: boolean };
  wifi: { ssid: string; stations: number; apUp: boolean };
  faultSim: { enabled: boolean; limitMasked: boolean };
  events: GateEvent[];
  /** Presentes apenas no simulador de desenvolvimento */
  simulator?: boolean;
  sim?: { car: boolean; obstacle: boolean };
}

export interface Metrics {
  openCycles: number;
  closeCycles: number;
  closeBlockedByObstacle: number;
  reversals: number;
  closeStartedWithObstacle: number;
  faults: number;
  lastFaultDetectMs: number;
  rejectedCommands: number;
  entries: number;
  exits: number;
  deniedFull: number;
  response: { total: number; samples: number; minMs: number; maxMs: number; avgMs: number; lastMs: number[] };
}

export interface ApiResult<T> { status: number; ok: boolean; body: T | null }
export interface CommandBody { ok: boolean; message: string }
