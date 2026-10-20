# The Consensus

A play-money online casino: five-reel slots, classic blackjack, and a European single-zero wheel. There are no deposits, withdrawals, or prizes of value. The stack lives in the browser.

## Games

- **Night Orchard** — 5 reels, 3 paylines, left-to-right pays.
- **Salon Privé** — S17 blackjack, 3:2, dealer peek, double down.
- **Single Zero** — 37-pocket roulette with a full outside board.

House rules and paytables are on each table. Outcomes use the browser RNG; this is entertainment, not a licensed operator.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test    # paytable, blackjack, roulette, and bankroll checks
npm run build
```

Starting stack is 1,000 chips. The cashier window adds another 1,000 whenever the tray runs light.
