import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Types ───

export interface Wallet {
  userId: string;
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Transaction {
  id?: string;
  userId: string;
  type: 'purchase' | 'spend' | 'refund';
  amount: number; // positive for purchase, negative for spend
  balance: number; // balance after transaction
  description: string;
  packageId?: string;
  createdAt: Timestamp;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceLabel: string;
  popular?: boolean;
  badge?: string;
  productId: string; // IAP product ID for App Store / Play Store
}

// ─── Packages ───

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'basic',
    name: 'Básico',
    credits: 40,
    price: 4.99,
    priceLabel: '$4.99',
    productId: 'zone.wee.credits.basic',
  },
  {
    id: 'plus',
    name: 'Plus',
    credits: 90,
    price: 9.99,
    priceLabel: '$9.99',
    popular: true,
    badge: 'Popular',
    productId: 'zone.wee.credits.plus',
  },
  {
    id: 'blackpro',
    name: 'Black Pro',
    credits: 200,
    price: 19.90,
    priceLabel: '$19.90',
    badge: 'Mejor valor',
    productId: 'zone.wee.credits.blackpro',
  },
];

// ─── Credit costs ───

export const CREDIT_COSTS = {
  AI_PHOTO: 1,
  AI_VIDEO: 10,
} as const;

// ─── Service ───

class CreditsService {
  /**
   * Get or create wallet for a user
   */
  async getWallet(userId: string): Promise<Wallet> {
    const walletRef = doc(db, 'wallets', userId);
    const snap = await getDoc(walletRef);

    if (snap.exists()) {
      return snap.data() as Wallet;
    }

    // Create new wallet with 0 balance
    const newWallet: Wallet = {
      userId,
      balance: 0,
      totalPurchased: 0,
      totalSpent: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(walletRef, newWallet);
    return newWallet;
  }

  /**
   * Subscribe to wallet changes (real-time balance)
   */
  subscribeToWallet(userId: string, callback: (wallet: Wallet) => void): () => void {
    const walletRef = doc(db, 'wallets', userId);
    const fallback: Wallet = { userId, balance: 0, totalPurchased: 0, totalSpent: 0, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
    return onSnapshot(walletRef, (snap) => {
      callback(snap.exists() ? snap.data() as Wallet : fallback);
    }, () => {
      // Permission denied or error — return empty wallet
      callback(fallback);
    });
  }

  /**
   * Check if user has enough credits
   */
  async hasCredits(userId: string, amount: number): Promise<boolean> {
    const wallet = await this.getWallet(userId);
    return wallet.balance >= amount;
  }

  /**
   * Spend credits (returns false if insufficient)
   */
  async spendCredits(userId: string, amount: number, description: string): Promise<boolean> {
    const walletRef = doc(db, 'wallets', userId);
    const wallet = await this.getWallet(userId);

    if (wallet.balance < amount) return false;

    const newBalance = wallet.balance - amount;

    await updateDoc(walletRef, {
      balance: increment(-amount),
      totalSpent: increment(amount),
      updatedAt: Timestamp.now(),
    });

    await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'spend',
      amount: -amount,
      balance: newBalance,
      description,
      createdAt: Timestamp.now(),
    });

    return true;
  }

  /**
   * Add credits after a purchase (called after IAP validation)
   */
  async addCredits(userId: string, packageId: string, credits: number): Promise<void> {
    const walletRef = doc(db, 'wallets', userId);
    const wallet = await this.getWallet(userId);
    const newBalance = wallet.balance + credits;

    await updateDoc(walletRef, {
      balance: increment(credits),
      totalPurchased: increment(credits),
      updatedAt: Timestamp.now(),
    });

    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);

    await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'purchase',
      amount: credits,
      balance: newBalance,
      description: `Paquete ${pkg?.name || packageId}`,
      packageId,
      createdAt: Timestamp.now(),
    });
  }

  /**
   * Get transaction history
   */
  subscribeToTransactions(
    userId: string,
    callback: (transactions: Transaction[]) => void,
    maxResults = 50,
  ): () => void {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxResults),
    );

    return onSnapshot(q, (snap) => {
      const txns: Transaction[] = [];
      snap.forEach(d => txns.push({ id: d.id, ...d.data() } as Transaction));
      callback(txns);
    }, () => {
      // Permission denied — return empty
      callback([]);
    });
  }
}

export const creditsService = new CreditsService();
