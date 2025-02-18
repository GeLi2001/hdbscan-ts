# hdbscan-ts

A TypeScript implementation of the HDBSCAN (Hierarchical Density-Based Spatial Clustering of Applications with Noise) clustering algorithm. This implementation is inspired by research in density-based clustering methods, including the work on hybrid approaches to hierarchical density-based cluster selection ([Malzer & Baum, 2019](https://arxiv.org/abs/1911.02282)).

HDBSCAN is particularly effective at:

- Detecting clusters of varying densities
- Identifying noise points
- Handling clusters of different shapes
- Providing cluster membership probabilities

## Installation

```bash
npm install hdbscan-ts
```

## Usage

```ts
import { HDBSCAN } from "hdbscan-ts";
const data = [
  [1, 2],
  [2, 3],
  [100, 100]
  // ... more points
];
const hdbscan = new HDBSCAN({
  minClusterSize: 3,
  minSamples: 2
});
const labels = hdbscan.fit(data);
console.log(labels);
```

## API

### HDBSCAN

#### Constructor Options

- `minClusterSize` (default: 5): Minimum size of clusters
- `minSamples` (default: 5): Minimum number of samples in neighborhood
- `debugMode` (default: false): Enable debug logging

#### Methods

- `fit(data: number[][]): HDBSCAN`
- `labels_: number[]`
- `probabilities_: number[]`

## License

MIT
