import { HDBSCAN } from "../core";

const debugMode = true;
describe("HDBSCAN", () => {
  // Test basic initialization
  test("should initialize with default parameters", () => {
    const hdbscan = new HDBSCAN({ debugMode });
    expect(hdbscan).toBeDefined();
    expect(hdbscan.labels_).toEqual([]);
    expect(hdbscan.probabilities_).toEqual([]);
  });

  // Test simple 2D clustering case
  test("should correctly cluster simple 2D data", () => {
    const data = [
      [1, 1],
      [1.5, 1],
      [1, 1.5],
      [1.2, 1.1], // Cluster 1
      [5, 5],
      [5.65, 4.87],
      [5.12, 5.59],
      [4.9, 5.6], // Cluster 2
      [3, 3] // Noise point
    ];

    const hdbscan = new HDBSCAN({
      minClusterSize: 3,
      minSamples: 2,
      debugMode
    });
    hdbscan.fit(data);

    // Should find 2 clusters and 1 noise point
    expect(new Set(hdbscan.labels_).size).toBeGreaterThan(1);
    expect(hdbscan.labels_).toHaveLength(data.length);
  });

  // Test handling of single cluster
  test("should identify single cluster", () => {
    const data = [
      [1, 1],
      [1.2, 1],
      [1, 1.2],
      [1.1, 1.1],
      [1.2, 1.2]
    ];

    const hdbscan = new HDBSCAN({
      minClusterSize: 3,
      minSamples: 2,
      debugMode
    });
    hdbscan.fit(data);

    // All points should be in the same cluster
    const uniqueLabels = new Set(hdbscan.labels_);
    expect(uniqueLabels.size).toBe(1);
    expect(hdbscan.labels_).not.toContain(-1); // No noise points
  });

  // Test handling of all noise points
  test("should handle all noise points", () => {
    const data = [
      [1, 1],
      [5, 5],
      [10, 10],
      [15, 15],
      [20, 20]
    ];

    const hdbscan = new HDBSCAN({ minClusterSize: 3, debugMode });
    hdbscan.fit(data);

    // No sub clusters should be identified
    expect(hdbscan.labels_.includes(-1)).toBe(true);
  });

  // Test cluster probabilities
  test("should assign meaningful probabilities", () => {
    const data = [
      [1, 1],
      [1.1, 1],
      [1, 1.1], // Clear cluster
      [5, 5] // Noise point
    ];

    const hdbscan = new HDBSCAN({ minClusterSize: 3, debugMode });
    hdbscan.fit(data);

    expect(hdbscan.probabilities_).toHaveLength(data.length);
    hdbscan.probabilities_.forEach((prob) => {
      expect(prob).toBeGreaterThanOrEqual(0);
      expect(prob).toBeLessThanOrEqual(1);
    });
  });

  // Test with varying dimensions
  test("should handle different dimensional data", () => {
    const data3D = [
      [1, 1.9, 1],
      [1.3, 1, 1.1],
      [1.5, 1.2, 1],
      [1.7, 1.3, 1],
      [30, 39, 30],
      [33, 30, 31],
      [35, 32, 30],
      [37, 33, 30],
      [100, 100, 100],
      [102, 100, 100],
      [100, 101, 100],
      [102, 101, 100]
    ];

    const hdbscan = new HDBSCAN({
      minClusterSize: 3,
      minSamples: 2,
      debugMode
    });
    hdbscan.fit(data3D);

    console.log(hdbscan.labels_);

    expect(hdbscan.labels_).toHaveLength(data3D.length);
    expect(new Set(hdbscan.labels_).size).toBeGreaterThan(1);
  });

  // Test parameter validation
  test("should handle invalid parameters gracefully", () => {
    expect(() => {
      new HDBSCAN({ minClusterSize: 0, debugMode });
    }).toThrow();

    expect(() => {
      new HDBSCAN({ minClusterSize: -1, debugMode });
    }).toThrow();
  });

  test("should handle 0.1 diff cases", () => {
    const hdbscan = new HDBSCAN({ minClusterSize: 2, debugMode });
    const data = [
      // [1.1, 2.1],
      [1.1, 2.1],
      [2.1, 1.1],
      [1.1, 1.1],
      [0.1, 1.1],
      [10.1, 11.1],
      [11.1, 10.1],
      [10.1, 10.1]
    ];

    const labels = hdbscan.fit(data);
    console.log(labels);
    expect(labels).toHaveLength(data.length);
    expect(new Set(labels).size).toBeGreaterThan(1);
  });

  test("should handle patterned data", () => {
    const data = [
      [1, 1],
      [1.1, 1],
      [1, 1.1],
      [10, 10],
      [10.1, 10],
      [10, 10.1],
      [9, 11],
      [11, 9]
    ];

    const hdbscan = new HDBSCAN({ minClusterSize: 2, debugMode });
    const labels = hdbscan.fit(data);
    console.log(labels);
    expect(labels).toHaveLength(data.length);
    expect(new Set(labels).size).toBeGreaterThan(1);
  });

  test("should handle big numbers", () => {
    const data = [
      [1, 1],
      [1.1, 1],
      [1, 1.1],
      [10, 10],
      [11, 10],
      [12, 9],
      [9, 11],
      [100, 100],
      [101, 100],
      [100, 101],
      [98, 102],
      [103, 99]
    ];

    const hdbscan = new HDBSCAN({ minClusterSize: 3, debugMode });
    hdbscan.fit(data);

    expect(hdbscan.labels_).toHaveLength(data.length);
    expect(new Set(hdbscan.labels_).size).toBeGreaterThan(1);
  });
});
