"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  REFILL_AMOUNT,
  STARTING_BANKROLL,
  STORAGE_KEY,
  canAfford as canAffordChips,
  credit as creditChips,
  debit as debitChips,
  parseStoredBalance,
} from "@/lib/bankroll";

type BankrollContextValue = {
  balance: number;
  ready: boolean;
  canAfford: (amount: number) => boolean;
  debit: (amount: number) => boolean;
  credit: (amount: number) => void;
  refill: () => void;
};

const BankrollContext = createContext<BankrollContextValue | null>(null);

export function BankrollProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(STARTING_BANKROLL);
  const [ready, setReady] = useState(false);
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  useEffect(() => {
    const stored = parseStoredBalance(window.localStorage.getItem(STORAGE_KEY));
    if (stored !== null) {
      balanceRef.current = stored;
      setBalance(stored);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(balance));
  }, [balance, ready]);

  const debit = useCallback((amount: number) => {
    if (!canAffordChips(balanceRef.current, amount)) return false;
    const next = debitChips(balanceRef.current, amount);
    balanceRef.current = next;
    setBalance(next);
    return true;
  }, []);

  const credit = useCallback((amount: number) => {
    if (amount <= 0) return;
    const next = creditChips(balanceRef.current, amount);
    balanceRef.current = next;
    setBalance(next);
  }, []);

  const refill = useCallback(() => {
    const next = creditChips(balanceRef.current, REFILL_AMOUNT);
    balanceRef.current = next;
    setBalance(next);
  }, []);

  const value = useMemo(
    () => ({
      balance,
      ready,
      canAfford: (amount: number) => canAffordChips(balance, amount),
      debit,
      credit,
      refill,
    }),
    [balance, ready, debit, credit, refill],
  );

  return <BankrollContext.Provider value={value}>{children}</BankrollContext.Provider>;
}

export function useBankroll() {
  const ctx = useContext(BankrollContext);
  if (!ctx) throw new Error("useBankroll must be used within BankrollProvider");
  return ctx;
}
