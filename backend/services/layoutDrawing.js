// Saved vectors are shared by the browser SVG and PDF renderer.
// Coordinates below only control the drawing, not the equipment selection.
export function drawLayout(layout) {
  const shapes = [];
  const pen = {
    shapes,
    text: (x, y, text, fontSize = 16, anchor = "middle") =>
      shapes.push({
        kind: "text",
        x,
        y,
        text,
        fontSize,
        anchor,
        fill: "#303845",
      }),
    line: (x1, y1, x2, y2, style = {}) =>
      shapes.push({
        kind: "line",
        x1,
        y1,
        x2,
        y2,
        stroke: "#a5b0bd",
        strokeWidth: 1.2,
        ...style,
      }),
    rect: (x, y, width, height, fill = "#fff", equipmentId) =>
      shapes.push({
        kind: "rect",
        x,
        y,
        width,
        height,
        fill,
        stroke: "#909cab",
        radius: 4,
        equipmentId,
      }),
  };
  if (!layout.dimensions) {
    pen.text(550, 80, "Footprint unavailable", 22);
    pen.text(
      550,
      120,
      "Selection or physical size missing: " +
        (layout.missing.join(", ") || "equipment"),
    );
    return { width: 1100, height: 185, shapes };
  }
  const { length, width } = layout.dimensions;
  const scale = Math.min(880 / length, 500 / width);
  const frame = {
    left: (1100 - length * scale) / 2,
    top: 85,
    width: length * scale,
    depth: width * scale,
  };
  const boxes = Object.fromEntries(
    layout.items.map((item) => [
      item.key,
      {
        ...item,
        x: frame.left + item.x * scale,
        y: frame.top + item.y * scale,
        length: item.length * scale,
        width: item.width * scale,
      },
    ]),
  );
  drawFrame(layout.dimensions, frame, pen);
  drawConnections(layout, boxes, frame, pen);
  for (const item of Object.values(boxes)) drawEquipment(item, pen);
  return { width: 1100, height: frame.top + frame.depth + 65, shapes };
}

function drawFrame(
  dimensions,
  { left, top, width, depth },
  { line, text, rect },
) {
  const measure = (value) =>
    value.toLocaleString("en-AU", { maximumFractionDigits: 6 }) + " m";
  rect(left, top, width, depth, "#f8fafc");
  line(left, 51, left + width, 51);
  line(left, 43, left, top - 8);
  line(left + width, 43, left + width, top - 8);
  text(left + width / 2, 28, "Length: " + measure(dimensions.length));
  line(left + width + 25, top, left + width + 25, top + depth);
  line(left + width + 8, top, left + width + 32, top);
  line(left + width + 8, top + depth, left + width + 32, top + depth);
  text(
    left + width / 2,
    top + depth + 30,
    "Width: " + measure(dimensions.width),
  );
}

function port(item, side) {
  const cx = item.x + item.length / 2,
    cy = item.y + item.width / 2;
  if (item.equipmentId === "tank") {
    const radius = Math.min(item.length, item.width) / 2;
    const angles = {
      east: 0,
      south: Math.PI / 2,
      west: Math.PI,
      southwest: Math.PI * 0.75,
      southeast: Math.PI * 0.25,
    };
    return {
      x: cx + Math.cos(angles[side]) * radius,
      y: cy + Math.sin(angles[side]) * radius,
    };
  }
  return side === "north"
    ? { x: cx, y: item.y }
    : side === "west"
      ? { x: item.x, y: cy }
      : { x: item.x + item.length, y: cy };
}

function connectionPoints(from, to, arrangement, chemical) {
  if (from.equipmentId === "tank" && to.equipmentId === "tank")
    return [port(from, "east"), port(to, "west")];
  const entering = to.equipmentId === "tank";
  const tank = entering ? to : from,
    pump = entering ? from : to;
  let points;
  if (arrangement === "auxiliaries-below") {
    const tankPort = port(
      tank,
      chemical ? "south" : entering ? "southwest" : "southeast",
    );
    const pumpPort = port(pump, "north");
    const bottom = tank.y + tank.width;
    const routeY = bottom + (pump.y - bottom) * (chemical ? 0.3 : 0.7);
    points = [
      pumpPort,
      { x: pumpPort.x, y: routeY },
      { x: tankPort.x, y: routeY },
      tankPort,
    ];
  } else {
    const tankPort = port(
      tank,
      entering ? (chemical ? "southwest" : "west") : "east",
    );
    const pumpPort = port(pump, entering ? "east" : "west");
    const routeX = entering
      ? (pumpPort.x + tank.x) / 2
      : (tank.x + tank.length + pumpPort.x) / 2;
    points = [
      pumpPort,
      { x: routeX, y: pumpPort.y },
      { x: routeX, y: tankPort.y },
      tankPort,
    ];
  }
  return entering ? points : points.reverse();
}

function drawPipe(points, chemical, { line }) {
  const style = {
    stroke: chemical ? "#947342" : "#4c7899",
    strokeWidth: chemical ? 1.8 : 2.4,
    ...(chemical && { strokeDasharray: "5 4" }),
  };
  points
    .slice(1)
    .forEach((p, i) => line(points[i].x, points[i].y, p.x, p.y, style));
  const end = points.at(-1);
  const previous = points.findLast(
    (p) => Math.hypot(p.x - end.x, p.y - end.y) > 1,
  );
  if (!previous) return;
  const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
  for (const offset of [-0.45, 0.45])
    line(
      end.x,
      end.y,
      end.x - 9 * Math.cos(angle + offset),
      end.y - 9 * Math.sin(angle + offset),
      { ...style, strokeDasharray: undefined },
    );
}

function drawConnections(layout, boxes, { left, width }, pen) {
  for (const connection of layout.connections) {
    const from = boxes[connection.from],
      to = boxes[connection.to];
    const chemical = connection.kind === "chemical";
    let points;
    if (connection.from === "inlet") {
      const end = port(to, "west");
      points = [{ x: left - 70, y: end.y }, end];
      pen.text(left - 15, end.y - 18, "INLET", 14, "end");
    } else if (connection.to === "outlet") {
      const start = port(from, "east");
      points = [start, { x: left + width + 70, y: start.y }];
      pen.text(left + width + 15, start.y - 18, "OUTLET", 14, "start");
    } else points = connectionPoints(from, to, layout.arrangement, chemical);
    drawPipe(points, chemical, pen);
  }
}

function drawEquipment(item, { shapes, text, rect }) {
  const cx = item.x + item.length / 2,
    cy = item.y + item.width / 2;
  if (item.equipmentId === "tank") {
    const radius = Math.min(item.length, item.width) / 2;
    shapes.push({
      kind: "circle",
      x: cx,
      y: cy,
      radius,
      fill: "#f1f6fa",
      stroke: "#8fa6ba",
      strokeWidth: 1.8,
      equipmentId: item.equipmentId,
    });
    const fontSize = Math.min(24, radius * 0.25);
    text(cx, cy - fontSize * 1.8, item.name, fontSize);
    text(cx, cy - fontSize * 0.5, `${item.capacityKL} kL`, fontSize * 0.9);
    item.annotations.forEach((entry, index) =>
      text(
        cx,
        cy + fontSize * (1 + index * 0.9),
        entry.label + (entry.quantity > 1 ? ` × ${entry.quantity}` : ""),
        fontSize * 0.65,
      ),
    );
  } else {
    rect(
      item.x,
      item.y,
      item.length,
      item.width,
      item.equipmentId === "controlPanel" ? "#edf0f4" : "#fff",
      item.equipmentId,
    );
    const labels =
      item.equipmentId === "controlPanel"
        ? ["Control Panel", "/ HMI"]
        : item.equipmentId === "dosingPump"
          ? item.details.split(" ")
          : [item.name, item.rating];
    const fontSize = Math.min(
      15,
      item.length /
        (Math.max(...labels.map((label) => label?.length ?? 0)) * 0.54 + 1),
    );
    labels.forEach(
      (label, index) =>
        label &&
        text(cx, cy + (index - (labels.length - 1) / 2) * 19, label, fontSize),
    );
  }
}
