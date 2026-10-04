import { designConfig } from "../config/designConfig.js";

const round = (value, digits = 2) => Number(value.toFixed(digits));

export function sizePipe(flowKLH) {
  const { maxVelocity, sizes } = designConfig.piping;
  const flow = flowKLH / 3600;
  const velocityIn = (idMm) => flow / ((Math.PI / 4) * (idMm / 1000) ** 2);
  const size = sizes.find((s) => velocityIn(s.idMm) <= maxVelocity);
  return {
    flowKLH,
    requiredIdMm: round(
      Math.sqrt((4 * flow) / (Math.PI * maxVelocity)) * 1000,
      1,
    ),
    dn: size?.dn ?? null,
    idMm: size?.idMm ?? null,
    velocity: size ? round(velocityIn(size.idMm)) : null,
  };
}

export function processCalculations(equipment) {
  const flowKLH = equipment.pump.flowKLH;
  return {
    pipes: flowKLH
      ? [{ line: "Process lines (feed / discharge)", ...sizePipe(flowKLH) }]
      : [],
    maxVelocity: designConfig.piping.maxVelocity,
  };
}
