// Seed data for MOCK MODE. Timestamps are relative to load time so the
// dashboard always looks "live" (recent events, upcoming disbursements).

import type { Schedule, StreamEvent } from './types';

const nowSecs = () => Math.floor(Date.now() / 1000);

const G = (seed: string) =>
  `G${seed.toUpperCase().padEnd(55, 'X').slice(0, 55)}`;

export function seedSchedules(): Schedule[] {
  const now = nowSecs();
  return [
    {
      id: '1',
      label: 'Design contractor retainer',
      sender: G('SENDERDEMO'),
      recipient: G('ALICEPAYEE'),
      amount: 500,
      asset: 'USDC',
      cadenceSecs: 604800, // weekly
      totalCount: 12,
      paidCount: 4,
      lastPaidTs: now - 3 * 86400,
      deposit: 4000,
      status: 'Active',
      createdTs: now - 31 * 86400,
    },
    {
      id: '2',
      label: 'Team payroll — Bob',
      sender: G('SENDERDEMO'),
      recipient: G('BOBPAYEE'),
      amount: 2000,
      asset: 'USDC',
      cadenceSecs: 2629800, // monthly
      totalCount: 6,
      paidCount: 2,
      lastPaidTs: now - 20 * 86400,
      deposit: 8000,
      status: 'Active',
      createdTs: now - 60 * 86400,
    },
    {
      id: '3',
      label: 'SaaS subscription',
      sender: G('SENDERDEMO'),
      recipient: G('CARLASAAS'),
      amount: 30,
      asset: 'XLM',
      cadenceSecs: 2629800,
      totalCount: 24,
      paidCount: 24,
      lastPaidTs: now - 2 * 86400,
      deposit: 0,
      status: 'Ended',
      createdTs: now - 720 * 86400,
    },
    {
      id: '4',
      label: 'Grant milestone payout',
      sender: G('SENDERDEMO'),
      recipient: G('DAOFUND'),
      amount: 1500,
      asset: 'EURC',
      cadenceSecs: 1209600, // bi-weekly
      totalCount: 8,
      paidCount: 3,
      lastPaidTs: now - 10 * 86400,
      deposit: 7500,
      status: 'Paused',
      createdTs: now - 45 * 86400,
    },
  ];
}

export function seedEvents(): StreamEvent[] {
  const now = nowSecs();
  const hash = (s: string) => s.padEnd(64, '0').slice(0, 64);
  return [
    { id: 'e1', type: 'payment', scheduleId: '1', amount: 500, asset: 'USDC', txHash: hash('aa11'), ts: now - 3 * 86400 },
    { id: 'e2', type: 'payment', scheduleId: '2', amount: 2000, asset: 'USDC', txHash: hash('bb22'), ts: now - 20 * 86400 },
    { id: 'e3', type: 'pause', scheduleId: '4', txHash: hash('cc33'), ts: now - 5 * 86400 },
    { id: 'e4', type: 'payment', scheduleId: '3', amount: 30, asset: 'XLM', txHash: hash('dd44'), ts: now - 2 * 86400 },
    { id: 'e5', type: 'created', scheduleId: '4', txHash: hash('ee55'), ts: now - 45 * 86400 },
    { id: 'e6', type: 'deposit', scheduleId: '1', amount: 6000, asset: 'USDC', txHash: hash('ff66'), ts: now - 31 * 86400 },
  ];
}
