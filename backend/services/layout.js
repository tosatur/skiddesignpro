import { designConfig } from "../config/designConfig.js";
import { drawLayout } from "./layoutDrawing.js";

const roundUp = (value, increment) =>
  Number((Math.ceil((value - 1e-9) / increment) * increment).toFixed(6));

function physicalEquipment(equipment, config) {
  const footprints = {
    tank: config.tankFootprints[equipment.tank.sizeKL],
    feedPump: config.pumpFootprints[equipment.pump.flowKLH],
    dischargePump: config.pumpFootprints[equipment.pump.flowKLH],
    dosingPump: config.dosingPumpFootprint,
    controlPanel: config.controlPanelFootprint,
  };
  const mountedLabels = {
    agitator: "Agitator",
    phProbe: "pH",
    levelProbe: "Level",
  };
  const mounted = equipment.items.filter((item) => item.id in mountedLabels);
  const items = [],
    missing = [];
  for (const item of equipment.items.filter((item) => item.id in footprints)) {
    const footprint = footprints[item.id];
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 0 ||
      !Number.isFinite(footprint?.length) ||
      footprint.length <= 0 ||
      !Number.isFinite(footprint?.width) ||
      footprint.width <= 0
    ) {
      missing.push(item.name);
      continue;
    }
    for (let index = 0; index < item.quantity; index++) {
      items.push({
        key: `${item.id}-${index + 1}`,
        equipmentId: item.id,
        name: item.id === "tank" ? `Tank ${index + 1}` : item.name,
        rating: item.rating,
        details: item.details,
        length: footprint.length,
        width: footprint.width,
        ...(item.id === "tank" && {
          capacityKL: equipment.tank.sizeKL,
          // Distribute the selected tank-mounted equipment, never fixed symbols.
          annotations: mounted
            .map((entry) => ({
              equipmentId: entry.id,
              label: mountedLabels[entry.id],
              quantity:
                Math.floor(entry.quantity / item.quantity) +
                (index < entry.quantity % item.quantity ? 1 : 0),
            }))
            .filter((entry) => entry.quantity > 0),
        }),
      });
    }
  }
  return { items, missing };
}

// A row or column is just a group of non-overlapping equipment footprints.
function group(items, vertical, gap) {
  const along = vertical ? "width" : "length";
  const across = vertical ? "length" : "width";
  const breadth = Math.max(0, ...items.map((item) => item[across]));
  let cursor = 0;
  const placed = items.map((item) => {
    const offset = (breadth - item[across]) / 2;
    const position = vertical
      ? { x: offset, y: cursor }
      : { x: cursor, y: offset };
    cursor += item[along] + gap;
    return { ...item, ...position };
  });
  return {
    items: placed,
    [along]: Math.max(0, cursor - gap),
    [across]: breadth,
  };
}

const place = (group, x, y) =>
  group.items.map((item) => ({
    ...item,
    x: item.x + x,
    y: item.y + y,
  }));

function frame(arrangement, items, config) {
  const margin = config.frameMargins;
  return {
    arrangement,
    items: items.map((item) => ({
      ...item,
      x: item.x + margin.length,
      y: item.y + margin.width,
    })),
    dimensions: {
      length: roundUp(
        Math.max(...items.map((item) => item.x + item.length)) +
          2 * margin.length,
        config.dimensionIncrement,
      ),
      width: roundUp(
        Math.max(...items.map((item) => item.y + item.width)) +
          2 * margin.width,
        config.dimensionIncrement,
      ),
    },
  };
}

function layoutCandidates(items, config) {
  const select = (...ids) =>
    ids.flatMap((id) => items.filter((item) => item.equipmentId === id));
  const gap = config.spacing.betweenItems;
  const rowGap = config.spacing.betweenRows;
  const tanks = group(select("tank"), false, gap);
  const auxiliary = group(
    select("feedPump", "dosingPump", "controlPanel", "dischargePump"),
    false,
    gap,
  );
  const innerLength = Math.max(tanks.length, auxiliary.length);
  const below = frame(
    "auxiliaries-below",
    [
      ...place(tanks, (innerLength - tanks.length) / 2, 0),
      ...place(
        auxiliary,
        (innerLength - auxiliary.length) / 2,
        tanks.width + rowGap,
      ),
    ],
    config,
  );

  const left = group(select("feedPump", "dosingPump"), true, gap);
  const right = group(select("dischargePump", "controlPanel"), true, gap);
  const innerWidth = Math.max(tanks.width, left.width, right.width);
  const tankX = left.items.length ? left.length + rowGap : 0;
  const ends = frame(
    "auxiliaries-at-ends",
    [
      ...place(left, 0, (innerWidth - left.width) / 2),
      ...place(tanks, tankX, (innerWidth - tanks.width) / 2),
      ...place(
        right,
        tankX + tanks.length + rowGap,
        (innerWidth - right.width) / 2,
      ),
    ],
    config,
  );
  return [below, ends];
}

function processConnections(items) {
  const tanks = items.filter((item) => item.equipmentId === "tank");
  if (!tanks.length) return [];
  const connections = [];
  const add = (from, to, kind = "process") =>
    connections.push({ from, to, kind });
  tanks.slice(1).forEach((tank, index) => add(tanks[index].key, tank.key));
  for (const item of items) {
    if (item.equipmentId === "feedPump") {
      add("inlet", item.key);
      add(item.key, tanks[0].key);
    }
    if (item.equipmentId === "dischargePump") {
      add(tanks.at(-1).key, item.key);
      add(item.key, "outlet");
    }
    if (item.equipmentId === "dosingPump")
      add(item.key, tanks[0].key, "chemical");
  }
  return connections;
}

export function availableSpace(constraint, defaultMaximum) {
  const available = constraint.type === "custom" ? constraint : defaultMaximum;
  return { length: available.length, width: available.width };
}

function checkOrientation(dimensions, maximum) {
  const axes = ["length", "width"].map((key) => {
    const calculated = dimensions?.[key] ?? null;
    const limit = maximum[key];
    const overBy =
      calculated == null
        ? null
        : Number(Math.max(0, calculated - limit).toFixed(6));
    return {
      key,
      calculated,
      maximum: limit,
      overBy,
      status:
        calculated == null
          ? "Unavailable"
          : overBy > 0
            ? "Exceeds limit"
            : "Within limit",
    };
  });
  const exceeds = axes.filter((axis) => axis.overBy > 0);
  const known = axes.every((axis) => axis.calculated !== null);
  return {
    ...Object.fromEntries(axes.map((axis) => [axis.key, axis.status])),
    axes,
    tone: exceeds.length ? "outside" : known ? "within" : "unknown",
    status: exceeds.length
      ? `Layout exceeds configured ${exceeds.map((axis) => axis.key).join(" and ")}`
      : known
        ? "Fits configured footprint"
        : "Footprint unavailable: equipment selection or size missing",
  };
}

export function checkSpace(dimensions, maximum) {
  // Rotate the complete skid only for the comparison. Physical dimensions,
  // equipment positions and the drawing stay in their calculated orientation.
  const orientations = [
    { rotation: 0, ...checkOrientation(dimensions, maximum) },
    {
      rotation: 90,
      ...checkOrientation(
        dimensions && { length: dimensions.width, width: dimensions.length },
        maximum,
      ),
    },
  ];
  const neitherFits = orientations.every((check) => check.tone === "outside");
  const complete = orientations[0].axes.every((axis) => axis.overBy !== null);
  const totalExcess = (check) =>
    Number(
      check.axes.reduce((total, axis) => total + axis.overBy, 0).toFixed(6),
    );
  // Keep successful fits unchanged. For a near-miss, use the least combined
  // length/width excess; retain 0° on a tie or when dimensions are incomplete.
  const closest =
    neitherFits &&
    complete &&
    totalExcess(orientations[1]) < totalExcess(orientations[0])
      ? orientations[1]
      : orientations[0];
  const selected =
    orientations.find((check) => check.tone === "within") ?? closest;
  return {
    ...selected,
    maximum: { length: maximum.length, width: maximum.width },
    orientations,
    status:
      selected.rotation === 90
        ? `${selected.status} (90° rotation)`
        : selected.status,
    orientationNote:
      neitherFits && complete
        ? `Best orientation: ${selected.rotation}° rotation. The drawing shows the unrotated layout.`
        : selected.rotation === 90
          ? "Fit requires a 90° rotation of the complete skid. The drawing shows the calculated, unrotated layout."
          : null,
  };
}

export function generateLayout(inputs, equipment) {
  const config = designConfig.layout;
  const maximum = availableSpace(inputs.spaceConstraint, designConfig.space);
  const { items, missing } = physicalEquipment(equipment, config);
  const candidates =
    missing.length || !items.length ? [] : layoutCandidates(items, config);
  const fits = (candidate) =>
    checkSpace(candidate.dimensions, maximum).tone === "within";
  const area = (candidate) =>
    candidate.dimensions.length * candidate.dimensions.width;
  // Try both templates in both orientations; prefer the smallest fitting one.
  candidates.sort(
    (a, b) => Number(fits(b)) - Number(fits(a)) || area(a) - area(b),
  );
  const selected = candidates[0] ?? {
    dimensions: null,
    items: [],
    arrangement: null,
  };
  const layout = {
    ...selected,
    maximum,
    missing,
    alternatives: candidates.map(({ arrangement, dimensions }) => ({
      arrangement,
      dimensions,
    })),
    connections: processConnections(selected.items),
    spaceCheck: checkSpace(selected.dimensions, maximum),
  };
  layout.drawing = drawLayout(layout);
  return layout;
}
