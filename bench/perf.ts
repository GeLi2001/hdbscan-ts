import { HDBSCAN } from "../src/hdbscan/core";

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function generateData(n: number, dims: number, seed = 1337): number[][] {
  const rand = seededRandom(seed);
  const data: number[][] = [];
  for (let i = 0; i < n; i++) {
    const point: number[] = [];
    for (let d = 0; d < dims; d++) {
      point.push(rand());
    }
    data.push(point);
  }
  return data;
}

function timeMs(fn: () => void): number {
  const start = process.hrtime.bigint();
  fn();
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000;
}

function bench(n: number, dims: number): void {
  const data = generateData(n, dims, 1337);
  const hdbscan = new HDBSCAN({
    minClusterSize: 5,
    minSamples: 5,
    debugMode: false,
  });
  const ms = timeMs(() => hdbscan.fit(data));
  console.log(
    `n=${n}, dims=${dims}, time=${ms.toFixed(2)}ms, clusters=${new Set(hdbscan.labels_).size}`,
  );
}

const sizes = [200, 400, 800];
const dims = Number(process.env.DIMS ?? "16");
sizes.forEach((n) => bench(n, dims));
