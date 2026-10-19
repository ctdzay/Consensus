import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const JUPITER_SWAP_URL = "https://api.jup.ag/swap/v2";
export const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

const SLIPPAGE_FLOOR_BPS = 50;
const SLIPPAGE_CAP_BPS = 200;

export type LiveConfig = {
  armed: boolean;
  reason: string | null;
  publicKey: string | null;
  rpcUrl: string;
};

export type SwapRequest = {
  inputMint: string;
  outputMint: string;
  amountRaw: string;
  slippageBps: number;
};

export type SwapSuccess = {
  ok: true;
  signature: string;
  inputAmountRaw: string;
  outputAmountRaw: string;
};

export type SwapResult = SwapSuccess | { ok: false; error: string };

export function clampSlippageBps(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 100;
  return Math.min(SLIPPAGE_CAP_BPS, Math.max(SLIPPAGE_FLOOR_BPS, Math.round(value)));
}

export function usdcRaw(notionalUsd: number): string | null {
  if (!Number.isFinite(notionalUsd) || notionalUsd <= 0) return null;
  return BigInt(Math.round(notionalUsd * 1_000_000)).toString();
}

export function readLiveConfig(env: NodeJS.ProcessEnv = process.env): LiveConfig {
  const rpcUrl = env.SOLANA_RPC_URL?.trim() || DEFAULT_RPC_URL;
  const flag = env.LIVE_TRADING === "1" || env.LIVE_TRADING === "true";
  if (!flag) {
    return { armed: false, reason: "LIVE_TRADING is off", publicKey: null, rpcUrl };
  }
  const secret = env.SOLANA_SECRET_KEY?.trim();
  if (!secret) {
    return {
      armed: false,
      reason: "SOLANA_SECRET_KEY is not set",
      publicKey: null,
      rpcUrl,
    };
  }
  try {
    return {
      armed: true,
      reason: null,
      publicKey: loadKeypair(secret).publicKey.toBase58(),
      rpcUrl,
    };
  } catch {
    return {
      armed: false,
      reason: "SOLANA_SECRET_KEY is not a Solana keypair",
      publicKey: null,
      rpcUrl,
    };
  }
}

export function loadKeypair(secret: string): Keypair {
  const trimmed = secret.trim();
  const bytes = trimmed.startsWith("[")
    ? Uint8Array.from(JSON.parse(trimmed) as number[])
    : bs58.decode(trimmed);
  if (bytes.length !== 64) throw new Error("keypair must be 64 bytes");
  return Keypair.fromSecretKey(bytes);
}

export async function swapExactIn(
  request: SwapRequest,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<SwapResult> {
  const config = readLiveConfig(env);
  if (!config.armed || !config.publicKey) {
    return { ok: false, error: config.reason ?? "live_trading_off" };
  }
  if (!/^[1-9][0-9]*$/.test(request.amountRaw)) {
    return { ok: false, error: "amount_not_positive_integer" };
  }
  const secret = env.SOLANA_SECRET_KEY?.trim();
  if (!secret) return { ok: false, error: "SOLANA_SECRET_KEY is not set" };

  const headers: Record<string, string> = { accept: "application/json" };
  const apiKey = env.JUPITER_API_KEY?.trim();
  if (apiKey) headers["x-api-key"] = apiKey;

  const url = new URL(`${JUPITER_SWAP_URL}/order`);
  url.searchParams.set("inputMint", request.inputMint);
  url.searchParams.set("outputMint", request.outputMint);
  url.searchParams.set("amount", request.amountRaw);
  url.searchParams.set("taker", config.publicKey);
  url.searchParams.set("slippageBps", String(clampSlippageBps(request.slippageBps)));

  let order: {
    transaction?: string | null;
    requestId?: string;
    lastValidBlockHeight?: string | number | null;
    errorMessage?: string;
    errorCode?: number;
  };
  try {
    const response = await fetchImpl(url, { headers });
    if (!response.ok) {
      return { ok: false, error: `jupiter_order_${response.status}` };
    }
    order = (await response.json()) as typeof order;
  } catch {
    return { ok: false, error: "jupiter_order_unreachable" };
  }
  if (!order.transaction || !order.requestId) {
    return {
      ok: false,
      error: order.errorMessage || `jupiter_order_${order.errorCode ?? "empty"}`,
    };
  }

  let signed: string;
  try {
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(order.transaction, "base64"),
    );
    transaction.sign([loadKeypair(secret)]);
    signed = Buffer.from(transaction.serialize()).toString("base64");
  } catch {
    return { ok: false, error: "transaction_sign_failed" };
  }

  let executed: {
    status?: string;
    signature?: string;
    totalInputAmount?: string;
    totalOutputAmount?: string;
    error?: string;
  };
  try {
    const response = await fetchImpl(`${JUPITER_SWAP_URL}/execute`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({
      signedTransaction: signed,
      requestId: order.requestId,
      ...(order.lastValidBlockHeight != null
        ? { lastValidBlockHeight: String(order.lastValidBlockHeight) }
        : {}),
    }),
    });
    if (!response.ok) return { ok: false, error: `jupiter_execute_${response.status}` };
    executed = (await response.json()) as typeof executed;
  } catch {
    return { ok: false, error: "jupiter_execute_unreachable" };
  }
  if (executed.status !== "Success" || !executed.signature) {
    return { ok: false, error: executed.error || executed.status || "jupiter_execute_failed" };
  }
  return {
    ok: true,
    signature: executed.signature,
    inputAmountRaw: executed.totalInputAmount || request.amountRaw,
    outputAmountRaw: executed.totalOutputAmount || "0",
  };
}

export async function ownerTokenRaw(
  owner: string,
  mint: string,
  rpcUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [owner, { mint }, { encoding: "jsonParsed" }],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      result?: { value?: Array<{ account?: { data?: { parsed?: { info?: { tokenAmount?: { amount?: string } } } } } }> };
    };
    let total = 0n;
    for (const row of payload.result?.value ?? []) {
      const amount = row.account?.data?.parsed?.info?.tokenAmount?.amount;
      if (amount && /^[0-9]+$/.test(amount)) total += BigInt(amount);
    }
    return total.toString();
  } catch {
    return null;
  }
}

export async function mintDecimals(
  mint: string,
  rpcUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number | null> {
  try {
    const response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [mint, { encoding: "base64" }],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      result?: { value?: { data?: [string, string] } | null };
    };
    const encoded = payload.result?.value?.data?.[0];
    if (!encoded) return null;
    const data = Buffer.from(encoded, "base64");
    const decimals = data[44];
    return decimals == null ? null : decimals;
  } catch {
    return null;
  }
}
