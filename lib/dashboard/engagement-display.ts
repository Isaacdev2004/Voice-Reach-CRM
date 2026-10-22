/** Analytics also returns explanatory text. Only measured percentages belong on imagery. */
export function engagementDisplay(kpi: { value?: string; change?: string } | undefined, fromLiveData: boolean) {
  if (!fromLiveData || !kpi) return null;
  const percent = (text?: string) => {
    const value = text?.trim();
    return value && /^[+-]?\d+(?:\.\d+)?\s*%$/.test(value) ? value.replace(/\s/g, "") : null;
  };
  // A change is meaningful only when the underlying metric is available too.
  const value = percent(kpi.value);
  if (!value || Number(value.replace("%", "")) < 0 || Number(value.replace("%", "")) > 100) return null;
  const change = percent(kpi.change);
  return { headline: change ?? value, subline: change ? "Engagement change vs prior 30 days" : "Engagement rate" };
}
