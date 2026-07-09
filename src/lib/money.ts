/** Money helpers. All amounts are INR numbers; round to 2dp at every boundary. */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
