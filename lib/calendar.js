import * as Astronomy from "astronomy-engine";

// Fast per-day phase lookup for calendar rendering — deliberately skips
// rise/set and horizon math since those aren't needed for a small glyph.
export function getMonthMoonPhases(year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    // Noon local avoids day-boundary edge cases in phase rounding.
    const date = new Date(year, monthIndex, d, 12, 0, 0);
    const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
    const phaseDeg = Astronomy.MoonPhase(date);
    days.push({
      day: d,
      date,
      k: illum.phase_fraction,
      waxing: phaseDeg < 180,
      isNew: phaseDeg < 4 || phaseDeg > 356,
      isFull: phaseDeg > 176 && phaseDeg < 184,
    });
  }
  return days;
}
