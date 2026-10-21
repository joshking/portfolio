// The dialled-in glass look — the single source of truth shared by the lab (its
// default slider state) and the Time Machine (its fixed values). Change it here
// and both follow. The lab also persists any live slider tweaks to localStorage
// (key GLASS_PARAMS_KEY), so a tuning session survives a reload.
export const GLASS_PRESET: Record<string, number> = {
  u_refract: 0,
  u_rim: 0.1,
  u_gloss: 120,
  u_tint: 0.5,
  u_dither: 1,
};

export const GLASS_PARAMS_KEY = "glass-basket-params";
