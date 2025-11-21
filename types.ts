export type TransactionType = 'EARN' | 'SPEND' | 'DEPOSIT' | 'WITHDRAW' | 'ADJUSTMENT' | 'RESET';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: number;
}

export interface ShopItem {
  id: string;
  cost: number;
  minutes: number;
  label: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or SVG path ID
  unlocked: boolean;
  condition: (stats: GameStats) => boolean;
}

export interface GameStats {
  totalLifetimeEarnings: number;
  totalLifetimeSavings: number;
  currentStreak: number;
  lastDepositDate: string | null; // ISO Date string YYYY-MM-DD
}

export interface Settings {
  appTitle: string;
  studentName: string;
  currencySymbol: string;
  maxClassEarnings: number; // Max earnings per session
  shopItems: ShopItem[];
  goals: string[];
}

export interface WalletData {
  balance: number;
  savedBalance: number;
  classEarnings: number; // Earnings in current session
  history: Transaction[];
  stats: GameStats;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  appTitle: "Classroom Wallet",
  studentName: "Student",
  currencySymbol: "RM",
  maxClassEarnings: 5.00,
  shopItems: [
    { id: '1', cost: 1.00, minutes: 5, label: 'Quick Break' },
    { id: '2', cost: 3.00, minutes: 15, label: 'Short Session' },
    { id: '3', cost: 5.00, minutes: 30, label: 'Full Period' },
  ],
  goals: [
    "Complete homework on time",
    "Help a classmate",
    "Keep desk tidy"
  ]
};

export const INITIAL_WALLET_STATE: WalletData = {
  balance: 0,
  savedBalance: 0,
  classEarnings: 0,
  history: [],
  stats: {
    totalLifetimeEarnings: 0,
    totalLifetimeSavings: 0,
    currentStreak: 0,
    lastDepositDate: null,
  },
  settings: DEFAULT_SETTINGS,
};