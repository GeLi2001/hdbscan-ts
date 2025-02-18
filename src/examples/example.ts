import { HDBSCAN } from '../hdbscan/core';

// Define your entity type
interface Customer {
  id: string;
  name: string;
  purchaseFrequency: number;
  orderValue: number;
  loyaltyScore: number;
}

// Sample customer data
const customers: Customer[] = [
  { id: 'c1', name: 'Alice', purchaseFrequency: 0.8, orderValue: 120, loyaltyScore: 0.9 },
  { id: 'c2', name: 'Bob', purchaseFrequency: 0.7, orderValue: 150, loyaltyScore: 0.85 },
  { id: 'c3', name: 'Charlie', purchaseFrequency: 0.2, orderValue: 30, loyaltyScore: 0.3 },
  { id: 'c4', name: 'David', purchaseFrequency: 0.9, orderValue: 200, loyaltyScore: 0.95 },
  { id: 'c5', name: 'Eve', purchaseFrequency: 0.1, orderValue: 25, loyaltyScore: 0.2 },
  { id: 'c6', name: 'Frank', purchaseFrequency: 0.75, orderValue: 130, loyaltyScore: 0.88 },
  { id: 'c7', name: 'Grace', purchaseFrequency: 0.3, orderValue: 50, loyaltyScore: 0.4 },
  { id: 'c8', name: 'Hank', purchaseFrequency: 0.85, orderValue: 180, loyaltyScore: 0.92 },
  { id: 'c9', name: 'Ivy', purchaseFrequency: 0.4, orderValue: 70, loyaltyScore: 0.5 },
  { id: 'c10', name: 'Jack', purchaseFrequency: 0.05, orderValue: 15, loyaltyScore: 0.1 },
];

// Expected Output (Example based on HDBSCAN clustering)

// Cluster 0 customers: Alice, Bob, Frank, Hank
// Cluster 1 customers: David
// Cluster 2 customers: Charlie, Grace, Ivy
// Outlier customers: Eve, Jack

// Convert customers to feature vectors
const dataset = customers.map(customer => [
  customer.purchaseFrequency,
  customer.orderValue,
  customer.loyaltyScore
]);

// Run clustering
const hdbscan = new HDBSCAN({
  minSamples: 2,
  minClusterSize: 2
});

// Map clusters back to customers
const labels = hdbscan.fit(dataset).labels_;

// Map cluster labels back to customers
const clusteredCustomers: Map<number, Customer[]> = new Map();

// Assign customers to their respective clusters
labels.forEach((label, index) => {
  if (!clusteredCustomers.has(label)) {
    clusteredCustomers.set(label, []);
  }
  clusteredCustomers.get(label)!.push(customers[index]);
});

// Print clusters
clusteredCustomers.forEach((cluster, label) => {
  if (label === -1) {
    console.log('Outlier customers:', cluster.map(c => c.name));
  } else {
    console.log(`Cluster ${label} customers:`, cluster.map(c => c.name));
  }
});