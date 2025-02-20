// generate a big set of data with various density and cluster sizes

import { HDBSCAN } from "../hdbscan/core";

function generateBigSet(
  numPoints: number,
  minClusterSize: number,
  maxClusterSize: number
): number[][] {
  const points: number[][] = [];
  let remainingPoints = numPoints;

  // Generate clusters of random sizes
  while (remainingPoints > 0) {
    // Random cluster size between min and max
    const clusterSize = Math.min(
      remainingPoints,
      Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1)) +
        minClusterSize
    );

    // Random cluster center
    const centerX = Math.random() * 100;
    const centerY = Math.random() * 100;

    // Random cluster density (spread)
    const spread = Math.random() * 5 + 1;

    // Generate points for this cluster
    for (let i = 0; i < clusterSize; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

      points.push([centerX + z1 * spread, centerY + z2 * spread]);
    }

    remainingPoints -= clusterSize;
  }

  return points;
}

const data = generateBigSet(100, 5, 15);
const hdbscan = new HDBSCAN({
  minClusterSize: 3,
  minSamples: 2,
  debugMode: true
});
const labels = hdbscan.fit(data);

console.log(labels);
