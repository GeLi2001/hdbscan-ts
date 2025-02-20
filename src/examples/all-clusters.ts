import { HDBSCAN } from "../hdbscan/core";

// Manually create 3 distinct clusters
const dataset = [
  // Cluster 1 - top right
  [10, 10],
  [11, 11],
  [10.5, 10.5],
  [10.2, 10.8],
  [10.8, 10.2],

  // Cluster 2 - bottom left
  [0, 0.1],
  [1, 1.9],
  [0.5, 0.6],
  [0.2, 0.78],
  [0.8, 0.21],

  // Cluster 3 - top left
  [-10, 10],
  [-11, 11],
  [-10.5, 10.5],
  [-10.2, 10.8],
  [-10.8, 10.2]
];

const hdbscan = new HDBSCAN({
  minClusterSize: 2
});

const clusters = hdbscan.fit(dataset);
console.log("Cluster assignments:", clusters);
