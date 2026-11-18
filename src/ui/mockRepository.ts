export interface TrackedProduct {
  id: string;
  title: string;
  brand: string;
  retailer: string;
  variant: string;
  image: string;
  currentPrice: number;
  previousPrice: number;
  targetPrice: number;
  mrp: number;
  dealScore: number;
  status: "active" | "paused" | "blocked";
  lastChecked: string;
  spark: number[];
}

const names = [
  ["Sony WH-1000XM5", "Sony", "Amazon", "Black"],
  ["iPhone 15", "Apple", "Flipkart", "128 GB · Blue"],
  ["Samsung Galaxy S24", "Samsung", "Croma", "256 GB · Grey"],
  ["Logitech MX Master 3S", "Logitech", "Amazon", "Graphite"],
  ["Nike Air Max 270", "Nike", "Myntra", "UK 9"],
  ["Dyson V12 Detect", "Dyson", "Reliance Digital", "Silver"],
] as const;

export function createMockProducts(): TrackedProduct[] {
  return names.map((name, index) => {
    const current = [24999, 62990, 71999, 7995, 8495, 44999][index];
    return {
      id: `mock-${index + 1}`,
      title: name[0],
      brand: name[1],
      retailer: name[2],
      variant: name[3],
      image: `https://placehold.co/160x160/1D1814/F5EFE8/png?text=${encodeURIComponent(name[0].split(" ")[0])}`,
      currentPrice: current,
      previousPrice: current + [1200, 2500, 1800, 400, 300, 3500][index],
      targetPrice: current - [1500, 3000, 4000, 800, 600, 2500][index],
      mrp: current + [5000, 10000, 14000, 2000, 2500, 7000][index],
      dealScore: [92, 78, 84, 68, 91, 73][index],
      status: index === 5 ? "blocked" : index === 4 ? "paused" : "active",
      lastChecked: index === 0 ? "12 min ago" : `${index * 18 + 6} min ago`,
      spark: Array.from({ length: 24 }, (_, point) =>
        Math.round(current * (1 + Math.sin(point / 3) * 0.035 + point * 0.0008)),
      ),
    };
  });
}
