export type SpsStage =
  | "started"
  | "discovering"
  | "clarifying"
  | "structuring"
  | "validating"
  | "completed"
  | "abandoned";
const next: Record<SpsStage, SpsStage[]> = {
  started: ["discovering", "abandoned"],
  discovering: ["clarifying", "abandoned"],
  clarifying: ["structuring", "abandoned"],
  structuring: ["validating", "abandoned"],
  validating: ["completed", "abandoned"],
  completed: [],
  abandoned: [],
};
export function transitionSps(
  from: SpsStage,
  to: SpsStage,
  canComplete = false,
) {
  if (to === "completed" && !canComplete)
    throw new Error("sps_completion_requires_confirmed_specification");
  if (!next[from].includes(to))
    throw new Error(`invalid_sps_transition:${from}->${to}`);
  return to;
}
export const resumableSpsStages: SpsStage[] = [
  "started",
  "discovering",
  "clarifying",
  "structuring",
  "validating",
];
