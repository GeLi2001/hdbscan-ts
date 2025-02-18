import { max } from "mathjs";

export interface HDBSCANParams {
  debugMode?:boolean
  minClusterSize?: number;
  minSamples?: number;
  alpha?: number;
  metric?: 'euclidean';
  algorithm?: 'best' | 'generic' | 'prims';
  leafSize?: number;
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
}

interface Cluster {
  id: number;
  children: number[];
  distance: number;
  size: number;
  stability?: number;
  maxEdgeWeight?: number;  // ε_max for the cluster
  leaveEdgeWeight:number;
  minReachabilityMap?: Map<number, number>;  // ε_min for each point
  leftChild?: Cluster;   // Add these to track binary tree structure
  rightChild?: Cluster;
}

export class HDBSCAN {
  private debugMode: boolean;
  private minClusterSize: number;
  private minSamples: number;

  public labels_: number[];
  public probabilities_: number[];
  
  private clusterMap: Map<number, Cluster> = new Map();
  private nextClusterId: number = 0;
  
  constructor({
    minClusterSize = 5,
    minSamples = 5,
    debugMode = false
  }: HDBSCANParams = {}) {
    // Add parameter validation
    if (minClusterSize <= 0) {
      throw new Error('minClusterSize must be greater than 0');
    }
    if (minSamples <= 0) {
      throw new Error('minSamples must be greater than 0');
    }
    
    this.minClusterSize = minClusterSize;
    this.minSamples = minSamples || minClusterSize;
    this.labels_ = [];
    this.probabilities_ = [];
    this.debugMode = debugMode
  }


  // Step 1: Transform space using mutual reachability distance
  private computeMutualReachabilityDistance(data: number[][]): number[][] {
    const n = data.length;
    const distanceMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
    const coreDistances = new Array(n).fill(0);

    // Calculate core distances more efficiently using k-nearest neighbors
    for (let i = 0; i < n; i++) {
      const pointDistances = [];
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          pointDistances.push({
            index: j,
            distance: euclideanDistance(data[i], data[j])
          });
        }
      }
      // Sort by distance and get kth nearest neighbor distance
      pointDistances.sort((a, b) => a.distance - b.distance);
      coreDistances[i] = pointDistances[Math.min(this.minSamples - 1, pointDistances.length - 1)].distance;
    }

    // Calculate mutual reachability distances
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const directDistance = euclideanDistance(data[i], data[j]);
        distanceMatrix[i][j] = Math.max(
          directDistance,
          coreDistances[i],
          coreDistances[j]
        );
      }
    }

    return distanceMatrix;
  }

  // Step 2: Build minimum spanning tree
  private buildMinimumSpanningTree(distances: number[][]): [number, number, number][] {
    const n = distances.length;
    // edges defined as [source, destination, weight]
    const edges: [number, number, number][] = [];
    const visited = new Set<number>();
    // minEdges[i] is the minimum edge weight from vertex i to any visited vertex
    const minEdges = new Array(n).fill(Infinity);
    // minEdgeConnections[i] is the vertex that is connected to vertex i by the minimum edge weight
    const minEdgeConnections = new Array(n).fill(-1);
    
    // Start with vertex 0
    visited.add(0);
    
    // Update min edges from starting vertex
    for (let i = 1; i < n; i++) {
        minEdges[i] = distances[0][i];
        minEdgeConnections[i] = 0;
    }

    // Build MST with n-1 edges
    while (visited.size < n) {
        // Find minimum edge connecting to unvisited vertex
        let minDist = Infinity;
        let nextVertex = -1;
        
        for (let i = 0; i < n; i++) {
            if (!visited.has(i) && minEdges[i] < minDist) {
                minDist = minEdges[i];
                nextVertex = i;
            }
        }

        // Add edge to MST
        if (nextVertex !== -1) {
            edges.push([minEdgeConnections[nextVertex], nextVertex, minDist]);
            visited.add(nextVertex);

            // Update min edges from new vertex
            for (let i = 0; i < n; i++) {
              // if i is not visited and the 
              // edge from nextVertex to i is smaller than the current minimum edge weight from i to any visited vertex
                if (!visited.has(i) && distances[nextVertex][i] < minEdges[i]) {
                    minEdges[i] = distances[nextVertex][i];
                    minEdgeConnections[i] = nextVertex;
                }
            }
        } 
    }

    return edges;
  }

  // Step 3: Build cluster hierarchy
  private buildClusterHierarchy(mst: [number, number, number][]): Cluster[] {
    const n = mst.length + 1;
    const hierarchy: Cluster[] = [];
    // sort edges by weight in descending order
    const sortedEdges = [...mst].sort((a, b) => b[2] - a[2]);
    
    this.log("\nInitial MST edges (sorted by distance):", 
        sortedEdges.map(([s, d, w]) => ({
            source: s,
            dest: d,
            weight: w
        }))
    );
    
    const allPoints = Array.from({length: n}, (_, i) => i);
    
    // Create root cluster
    const rootCluster = this.createCluster(allPoints, sortedEdges[0][2], sortedEdges);
    hierarchy.push(rootCluster);

    this.log('sorted edges: ', sortedEdges);

    // Process edges in decreasing order to build binary tree
    for (let index = 1; index < sortedEdges.length; index++) {
        this.log('processing edge: ', sortedEdges[index]);
        const [src, dst, distance] = sortedEdges[index];

        // Find current cluster containing these points
        const parentCluster = this.findClusterContainingPoints([src, dst], hierarchy);
        if (!parentCluster || parentCluster.leftChild) continue;

        // Split cluster into two based on this edge
        const components = this.splitClusterAtEdge(parentCluster.children, distance, sortedEdges);
        if (components.length === 2) {
            const [leftPoints, rightPoints] = components;
            
            if (leftPoints.length >= this.minClusterSize) {
                const leftCluster = this.createCluster(leftPoints, distance, sortedEdges);
                hierarchy.push(leftCluster);
                parentCluster.leftChild = leftCluster;
            }
            
            if (rightPoints.length >= this.minClusterSize) {
                const rightCluster = this.createCluster(rightPoints, distance, sortedEdges);
                hierarchy.push(rightCluster);
                parentCluster.rightChild = rightCluster;
            }
        }
    }

    this.log("Built hierarchy:", hierarchy.map(h => ({
        id: h.id,
        size: h.size,
        children: h.children,
        leftChild: h.leftChild?.id,
        rightChild: h.rightChild?.id
    })));

    return hierarchy;
  }

  private createCluster(points: number[], distance: number, sortedEdges: [number, number, number][]): Cluster {
    const minReachMap = new Map<number, number>();
    let leaveEdgeWeight = 0;
    points.forEach(p => {
        const minReach = this.getMinReachability(p, points, sortedEdges);
        minReachMap.set(p, minReach);
        leaveEdgeWeight = max(leaveEdgeWeight, minReach)
    });

    const cluster: Cluster = {
        id: this.nextClusterId++,
        children: points,
        distance: distance,
        size: points.length,
        maxEdgeWeight: distance,
        minReachabilityMap: minReachMap,
        leaveEdgeWeight
    };
    
    this.clusterMap.set(cluster.id, cluster);
    return cluster;
  }

  private splitClusterAtEdge(points: number[], distance: number, sortedEdges: [number, number, number][]): number[][] {
    const parent = Array.from(points, (_, i) => i);
    this.log('split cluster at edge: ', points, distance, sortedEdges);
    // Only union points connected by edges with weight >= distance
    sortedEdges
        .filter(([,, w]) => w <= distance)
        .forEach(([s, d]) => {
            if (points.includes(s) && points.includes(d)) {
                const rootX = this.find(s, parent);
                const rootY = this.find(d, parent);
                if (rootX !== rootY) {
                    parent[rootY] = rootX;
                }
            }
        });

    // Find components
    const components = new Map<number, number[]>();
    points.forEach(point => {
        const root = this.find(point, parent);
        if (!components.has(root)) {
            components.set(root, []);
        }
        components.get(root)!.push(point);
    });

    return Array.from(components.values());
  }

  // Helper function for finding root in disjoint set
  private find(x: number, parent: number[]): number {
    if (parent[x] !== x) {
        parent[x] = this.find(parent[x], parent);
    }
    return parent[x];
  }

  // Step 4: Condense cluster hierarchy
  private condenseHierarchy(hierarchy: Cluster[]): Cluster[] {
    const condensed = hierarchy.filter(cluster => {
        // Get actual points in this cluster
        const clusterPoints = this.getClusterPoints(cluster);
        // Only keep clusters that have enough actual points
        return clusterPoints.size >= this.minClusterSize;
    });

    this.log("Condensed hierarchy:", 
        condensed.map(c => ({
            id: c.id,
            pointCount: this.getClusterPoints(c).size,
            size: c.size,
            minRequired: this.minClusterSize
        }))
    );

    return condensed;
  }

  // Step 5: Extract stable clusters
  private extractClusters(condensedHierarchy: Cluster[], data: number[][]): void {
    this.log("\nStarting cluster extraction:");
    this.log("Full hierarchy:", 
        condensedHierarchy.map(c => ({
            id: c.id,
            size: c.size,
            distance: c.distance,
            children: c.children,
            maxEdgeWeight: c.maxEdgeWeight,
            minReachabilities: Array.from(c.minReachabilityMap!.entries())
        }))
    );

    const selectedClusters = new Set<Cluster>();

    const discardedClusters = new Set<number>();
    
    const processCluster = (cluster: Cluster) => {
      if (discardedClusters.has(cluster.id)){
        return
      }
        this.log(`\nProcessing cluster ${cluster.id}:`, {
            children: cluster.children,
            distance: cluster.distance,
            maxEdgeWeight: cluster.maxEdgeWeight,
            discardedClusters:discardedClusters
        });
        
        const clusterPoints = this.getClusterPoints(cluster);
        const stability = this.calculateClusterStability(cluster, clusterPoints);
        
        // Find immediate children in hierarchy (including same distance level)
        const childClusters = condensedHierarchy.filter(c => 
            c.id !== cluster.id &&  // Exclude self
            c.distance <= cluster.distance &&  // Include same level
            c.children.every(p => cluster.children.includes(p))  // Must be subset
        );
        
        this.log(`Found ${childClusters.length} immediate children:`,
            childClusters.map(c => ({
                id: c.id,
                children: c.children,
                distance: c.distance,
                maxEdgeWeight: c.maxEdgeWeight
            }))
        );
        
        const childrenStabilities = childClusters.map(c => {
            const stability = this.calculateClusterStability(c, this.getClusterPoints(c));
            return { id: c.id, stability };
        });
        
        const childrenStability = childrenStabilities.reduce((sum, c) => sum + c.stability, 0);
        
        this.log("Stability comparison:", {
            currentCluster: { id: cluster.id, stability },
            childrenStabilities,
            totalChildrenStability: childrenStability
        });

        cluster.stability = stability;

        if (stability >= childrenStability && 
            clusterPoints.size >= this.minClusterSize) {
            this.log(`Selected cluster ${cluster.id} - better stability than children`);
            selectedClusters.add(cluster);
            childClusters.map((cc)=>discardedClusters.add(cc.id))
        } else {
            discardedClusters.add(cluster.id)
            this.log(`Processing children of cluster ${cluster.id} - children have better stability`);
            childClusters
                .filter(c => c.size >= this.minClusterSize && !discardedClusters.has(c.id))
                .forEach(processCluster);
        }
    };

    if (condensedHierarchy.length > 0) {
        processCluster(condensedHierarchy[0]);
    }

    this.log("\nFinal selected clusters:", 
        Array.from(selectedClusters).map(c => ({
            id: c.id,
            size: c.size,
            stability: c.stability,
            children: c.children,
            maxEdgeWeight: c.maxEdgeWeight
        }))
    );

    this.assignClusterLabels(selectedClusters, data);
  }

  private calculateClusterStability(cluster: Cluster, points: Set<number>): number {
    let stability = 0;
    const epsilon_max = cluster.maxEdgeWeight!;
    
    // S(C_i) = Σ (1/ε_min(x_j, C_i) - 1/ε_max(C_i))
    points.forEach(point => {
        const epsilon_min = cluster.minReachabilityMap!.get(point)!;
        stability += (1/cluster.leaveEdgeWeight - 1/epsilon_max);
    });
    
    this.log(`Stability calculation for cluster ${cluster.id}:`, {
        pointsCount: points.size,
        epsilon_max,
        minReachabilities: Array.from(cluster.minReachabilityMap!.entries()),
        stability
    });
    
    return stability;
  }


  private assignClusterLabels(selectedClusters: Set<Cluster>, data: number[][]): void {
    const n = data.length;
    this.labels_ = new Array(n).fill(-1);
    this.probabilities_ = new Array(n).fill(0);

    let currentLabel = 0;
    selectedClusters.forEach(cluster => {
        const points = this.getClusterPoints(cluster);
        // Only assign labels if we have enough points
        if (points.size >= this.minClusterSize) {
            points.forEach(point => {
                this.labels_[point] = currentLabel;
                this.probabilities_[point] = this.calculateMembership(point, cluster);
            });
            currentLabel++;
        }
    });

    this.log("Assigning labels:", {
        selectedClusters: Array.from(selectedClusters).map(c => ({
            id: c.id,
            points: Array.from(this.getClusterPoints(c)),
            size: this.getClusterPoints(c).size,
            minRequired: this.minClusterSize
        }))
    });
  }

  private getClusterPoints(cluster: Cluster): Set<number> {
    // Since we now store points directly in children, just return them as a Set
    return new Set(cluster.children);
  }

  private calculateMembership(point: number, cluster: Cluster): number {
    // Calculate probability based on the point's relative density in the cluster
    const epsilon_min = cluster.minReachabilityMap!.get(point)!;
    const epsilon_max = cluster.maxEdgeWeight!;
    
    // Membership is based on how close the point's min distance is to the cluster's max
    return 1 - (epsilon_min / epsilon_max);
  }

  private getMinReachability(point: number, clusterPoints: number[], sortedEdges: [number, number, number][]): number {
    this.log(`\nFinding min reachability for point ${point} in cluster ${clusterPoints}:`);
    
    const relevantEdges = sortedEdges
        .filter(([s, d]) => 
            (s === point || d === point) && // Edge connects to this point
            clusterPoints.includes(s) && clusterPoints.includes(d) // Both points in cluster
        );
    
    this.log("Relevant edges:", 
        relevantEdges.map(([s, d, w]) => ({
            source: s,
            dest: d,
            weight: w
        }))
    );
    
    const minEdge = relevantEdges.reduce((min, [s,d, w]) => {
        if (s === point || d === point) {
            return Math.min(min, w);
        }
        return min;
    }, Infinity);
    
    this.log(`Min edge weight found: ${minEdge}`);
    return minEdge;
  }

  private findClusterContainingPoints(points: number[], hierarchy: Cluster[]): Cluster | null {
    // Search from newest to oldest clusters to find the smallest containing cluster
    for (let i = hierarchy.length - 1; i >= 0; i--) {
        const cluster = hierarchy[i];
        if (points.every(p => cluster.children.includes(p))) {
            return cluster;
        }
    }
    return null;
  }

  // Main fit method
  public fit(data: number[][]): this {
    // Step 1: Transform space
    const mutualReachabilityDist = this.computeMutualReachabilityDistance(data);

    // Step 2: Build MST
    const mst = this.buildMinimumSpanningTree(mutualReachabilityDist);

    // Step 3: Build hierarchy
    const hierarchy = this.buildClusterHierarchy(mst);
    
    // Step 4: Condense hierarchy
    const condensedHierarchy = this.condenseHierarchy(hierarchy);
    
    // Step 5: Extract clusters
    this.extractClusters(condensedHierarchy, data);
    
    return this;
  }

    private log(...args: any[]) {
    if (this.debugMode) {
      this.log("[MyService]", ...args);
    }
  }
}
