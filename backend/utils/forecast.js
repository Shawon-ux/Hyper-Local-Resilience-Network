export const calculateForecast = (resource) => {
  const remaining = resource.stock - resource.demand;

  const percentUsed =
    resource.stock === 0 ? 0 : (resource.demand / resource.stock) * 100;

  let status = "LOW";

  if (percentUsed >= 80) status = "HIGH";
  else if (percentUsed >= 40) status = "MEDIUM";

  return {
    ...resource.toObject(),
    remaining,
    percentUsed: Number(percentUsed.toFixed(2)),
    status,
  };
};