// Tests for wallet store mode transitions: mock ↔ live switching, session
// restoration, and disconnect behavior.
//
// The wallet store imports walletKit for the real kit and stellar for
// balance — we mock those at the module level so no actual wallet or
// Horizon network is touched.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// --------------- hoisted mocks ---------------

const mocks = vi.hoisted(() => ({
  openWalletModal: vi.fn(),
  signTransactionXdr: vi.fn(),
  disconnectWallet: vi.fn(),
  selectWallet: vi.fn(),
  getKitAddress: vi.fn(),
  fetchXlmBalance: vi.fn(),
}));

vi.mock('../lib/walletKit', () => ({
  openWalletModal: mocks.openWalletModal,
  signTransactionXdr: mocks.signTransactionXdr,
  disconnectWallet: mocks.disconnectWallet,
  selectWallet: mocks.selectWallet,
  getKitAddress: mocks.getKitAddress,
}));

vi.mock('../lib/stellar', () => ({
  fetchXlmBalance: mocks.fetchXlmBalance,
}));

// Mock constants so we can control hasContractId per test
vi.mock('../lib/constants', () => ({
  CONTRACT_ID: 'CDUMMYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  IS_MOCK: false,
  NETWORK: 'TESTNET',
  NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
  HORIZON_URL: 'https://horizon-testnet.stellar.org',
  IS_TESTNET: true,
  EXPLORER_TX_BASE: 'https://stellar.expert/explorer/testnet/tx',
  CADENCES: [],
  ASSETS: ['XLM', 'USDC', 'EURC'],
}));

import { useWalletStore } from './wallet';
import { useMockModeStore } from './mockMode';
import { useStreamsStore } from './streams';

const WALLET_ADDR = 'GB2Y4P4QW5X6E7R2T3Y4U5I6O7P2A3S4D5F6G7H2J3K4L5M6N7O2P3Q4';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useWalletStore.setState({
    publicKey: null,
    walletId: null,
    connecting: false,
    balance: null,
    funded: false,
    balanceLoading: false,
  });
  useMockModeStore.setState({ isMock: true });
  useStreamsStore.setState({
    schedules: [],
    events: [],
    loading: false,
    loaded: false,
    generation: 0,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wallet mode transitions', () => {
  it('stays in mock mode on connect when VITE_CONTRACT_ID is missing', async () => {
    // Override mock mode store to simulate missing contract ID
    useMockModeStore.setState({ isMock: true, hasContractId: false });

    mocks.openWalletModal.mockResolvedValue({
      address: WALLET_ADDR,
      walletId: 'freighter',
    });
    mocks.fetchXlmBalance.mockResolvedValue({ xlm: 5000, funded: true });

    await useWalletStore.getState().connect();

    // Wallet should be connected
    expect(useWalletStore.getState().publicKey).toBe(WALLET_ADDR);
    // But mode stays mock because no contract ID
    expect(useMockModeStore.getState().isMock).toBe(true);
  });

  it('switches to live mode on connect when contract ID is present', async () => {
    useMockModeStore.setState({ isMock: true, hasContractId: true });

    mocks.openWalletModal.mockResolvedValue({
      address: WALLET_ADDR,
      walletId: 'freighter',
    });
    mocks.fetchXlmBalance.mockResolvedValue({ xlm: 5000, funded: true });

    await useWalletStore.getState().connect();

    expect(useWalletStore.getState().publicKey).toBe(WALLET_ADDR);
    expect(useMockModeStore.getState().isMock).toBe(false);
  });

  it('returns to mock mode on disconnect with contract ID', async () => {
    // Start in live mode with a wallet connected
    useMockModeStore.setState({ isMock: false, hasContractId: true });
    useWalletStore.setState({
      publicKey: WALLET_ADDR,
      walletId: 'freighter',
      balance: 5000,
      funded: true,
    });
    mocks.disconnectWallet.mockResolvedValue(undefined);

    await useWalletStore.getState().disconnect();

    // Wallet state cleared
    expect(useWalletStore.getState().publicKey).toBeNull();
    // Returns to mock mode
    expect(useMockModeStore.getState().isMock).toBe(true);
  });

  it('restore switches to live mode when stored wallet and contract ID exist', async () => {
    useMockModeStore.setState({ isMock: true, hasContractId: true });
    localStorage.setItem('streampay:wallet', 'freighter');

    // Simulating successful kit address resolution
    mocks.selectWallet.mockImplementation(() => {});
    mocks.getKitAddress.mockResolvedValue(WALLET_ADDR);
    mocks.fetchXlmBalance.mockResolvedValue({ xlm: 5000, funded: true });

    await useWalletStore.getState().restore();

    expect(useWalletStore.getState().publicKey).toBe(WALLET_ADDR);
    expect(useMockModeStore.getState().isMock).toBe(false);
  });

  it('restore stays in mock mode when no contract ID exists', async () => {
    useMockModeStore.setState({ isMock: true, hasContractId: false });
    localStorage.setItem('streampay:wallet', 'freighter');

    mocks.selectWallet.mockImplementation(() => {});
    mocks.getKitAddress.mockResolvedValue(WALLET_ADDR);
    mocks.fetchXlmBalance.mockResolvedValue({ xlm: 5000, funded: true });

    await useWalletStore.getState().restore();

    // Wallet restored
    expect(useWalletStore.getState().publicKey).toBe(WALLET_ADDR);
    // But stays in mock mode because no contract
    expect(useMockModeStore.getState().isMock).toBe(true);
  });
});
