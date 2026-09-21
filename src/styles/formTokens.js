/* Visual tokens shared by the Login card, the Register card and the
   Important Reminder modal so all three surfaces look uniform.
   The matching CSS lives under `.uniform-card` in Container.css. */
export const UNIFORM_BORDER = "1px solid #e6e6e6";
export const UNIFORM_ERROR_BORDER = "1px solid #d32f2f";
export const UNIFORM_RADIUS = "10px";
export const UNIFORM_FONT_SIZE = "13px";

export const fieldBorder = (hasError) =>
  hasError ? UNIFORM_ERROR_BORDER : UNIFORM_BORDER;
