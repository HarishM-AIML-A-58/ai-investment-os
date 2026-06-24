import { NextResponse } from "next/server";

const SECTORS = [
  { label: "Banking",   sym: "%5ENSEBANK"   },
  { label: "IT",        sym: "%5ECNXIT"     },
  { label: "Financial", sym: "%5ECNXFIN"    },
  { label: "Mid Cap",   sym: "%5ENSMIDCP"   },
  { label: "Pharma",    sym: "%5ECNXPHARMA" },
  { label: "Auto",      sym: "%5ECNXAUTO"   },
  { label: "FMCG",      sym: "%5ECNXFMCG"   },
  { label: "Metal",     sym: "%5ECNXMETAL"  },
];

export async function GET() {
  const results = await Promise.allSettled(
    SECTORS.map(async ({ label, sym }) => {
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
      const change = price - prev;
      const changePct = prev ? (change / prev) * 100 : 0;
      return { label, changePct: parseFloat(changePct.toFixed(2)), up: change >= 0 };
    })
  );

  const data = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { label: SECTORS[i].label, changePct: 0, up: true, error: true }
  );

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, must-revalidate" },
  });
}
