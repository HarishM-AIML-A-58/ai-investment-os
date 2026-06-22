import { NextResponse } from "next/server";

type IndexDatum = { label: string; price: number; change: number; changePct: number; up: boolean };

const CFG = [
  { label: "NIFTY 50",   sym: "%5ENSEI"    },
  { label: "SENSEX",     sym: "%5EBSESN"   },
  { label: "BANKNIFTY",  sym: "%5ENSEBANK" },
  { label: "MIDCPNIFTY", sym: "%5ENSMIDCP" },
  { label: "FINNIFTY",   sym: "%5ECNXFIN"  },
  { label: "NIFTYIT",    sym: "%5ECNXIT"   },
];

export async function GET() {
  const results = await Promise.allSettled(
    CFG.map(async ({ label, sym }) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const meta = j?.chart?.result?.[0]?.meta;
      if (!meta) throw new Error("no meta");
      const price: number = meta.regularMarketPrice ?? 0;
      const prev: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change = parseFloat((price - prev).toFixed(2));
      const changePct = prev ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;
      return { label, price, change, changePct, up: change >= 0 } as IndexDatum;
    })
  );

  const data: IndexDatum[] = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { label: CFG[i].label, price: 0, change: 0, changePct: 0, up: true }
  );

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, must-revalidate" },
  });
}
