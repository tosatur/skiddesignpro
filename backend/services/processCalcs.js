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

export function coolingDuty(inputs) {
  const targetC = designConfig.tradeWasteLimits.temperature.max;
  if (inputs.temperature <= targetC) return null;
  const { densityKgM3, cpKJkgK } = designConfig.fluid;
  const massFlow = (inputs.flowRate * densityKgM3) / 3600;
  return {
    flowKLH: inputs.flowRate,
    inletC: inputs.temperature,
    targetC,
    dutyKW: round(massFlow * cpKJkgK * (inputs.temperature - targetC), 1),
  };
}

export function processCalculations(inputs, equipment) {
  const flowKLH = equipment.pump.flowKLH;
  return {
    pipes: flowKLH
      ? [
          {
            line: `Process lines (${equipment.items
              .filter((item) => ["feedPump", "dischargePump"].includes(item.id))
              .map((item) => (item.id === "feedPump" ? "feed" : "discharge"))
              .join(" / ")})`,
            ...sizePipe(flowKLH),
          },
        ]
      : [],
    maxVelocity: designConfig.piping.maxVelocity,
    cooling: equipment.items.some((item) => item.id === "coolingHx")
      ? coolingDuty(inputs)
      : null,
  };
}
