interface StockIndicatorProps {
  inventoryCount: number;
  backorderEnabled: boolean;
  lowStockThreshold: number;
}

export function StockIndicator({
  inventoryCount,
  backorderEnabled,
  lowStockThreshold,
}: StockIndicatorProps) {
  if (inventoryCount === 0 && backorderEnabled) {
    return (
      <p className="text-sm text-blue-600 font-medium">
        📦 Available on backorder
      </p>
    );
  }

  if (inventoryCount === 0) {
    return <p className="text-sm text-red-500 font-medium">✕ Out of stock</p>;
  }

  if (inventoryCount <= lowStockThreshold) {
    return (
      <p className="text-sm text-orange-500 font-medium">
        ⚡ Only {inventoryCount} left in stock
      </p>
    );
  }

  return <p className="text-sm text-green-600 font-medium">✓ In stock</p>;
}
