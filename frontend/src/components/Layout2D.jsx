export default function Layout2D({ drawing }) {
  return (
    <svg
      className="layout-svg"
      viewBox={"0 0 " + drawing.width + " " + drawing.height}
      role="img"
      aria-label="Top view of the preliminary physical skid layout"
    >
      <title>Skid layout — preliminary top view</title>
      {drawing.shapes.map((shape, index) => {
        const {
          kind,
          radius,
          anchor,
          fontSize,
          text,
          equipmentId,
          ...attributes
        } = shape;
        if (kind === "text")
          return (
            <text
              key={index}
              {...attributes}
              fontSize={fontSize}
              textAnchor={anchor}
              dominantBaseline="middle"
            >
              {text}
            </text>
          );
        if (kind === "circle") {
          const { x, y, ...style } = attributes;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={radius}
              {...style}
              data-equipment-id={equipmentId}
            />
          );
        }
        if (kind === "rect")
          return (
            <rect
              key={index}
              {...attributes}
              rx={radius}
              data-equipment-id={equipmentId}
            />
          );
        return <line key={index} {...attributes} />;
      })}
    </svg>
  );
}
