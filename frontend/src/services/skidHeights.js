export const itemHeight = (item, heights) =>
  item.equipmentId === "tank"
    ? (heights.tank?.[item.capacityKL] ?? 2)
    : (heights[item.equipmentId] ?? 0.5);

export function tallestItem(layout, heights) {
  return layout.items.reduce((tallest, item) => {
    const height = itemHeight(item, heights) + (heights.frame ?? 0);
    return !tallest || height > tallest.height
      ? { name: item.name, height }
      : tallest;
  }, null);
}
