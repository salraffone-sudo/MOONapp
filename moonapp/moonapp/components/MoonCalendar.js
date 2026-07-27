import { getMonthMoonPhases } from "../lib/calendar";
import MoonGlyph from "./MoonGlyph";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MoonCalendar({ year, month, selectedDay, onSelectDay, onNavigate }) {
  const days = getMonthMoonPhases(year, month);
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month, 1).toLocaleDateString([], { month: "long", year: "numeric" });

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="cal-nav" onClick={() => onNavigate(-1)} aria-label="Previous month">
          ‹
        </button>
        <span className="calendar-month">{monthLabel}</span>
        <button className="cal-nav" onClick={() => onNavigate(1)} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((w, i) => (
          <div className="cal-weekday" key={i}>
            {w}
          </div>
        ))}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const isSelected = selectedDay && d.date.toDateString() === selectedDay.toDateString();
          const isToday = d.date.toDateString() === new Date().toDateString();
          return (
            <button
              key={d.day}
              className={`cal-day ${isSelected ? "cal-day-selected" : ""} ${isToday ? "cal-day-today" : ""}`}
              onClick={() => onSelectDay(d.date)}
              title={`${d.date.toDateString()}`}
            >
              <MoonGlyph k={d.k} waxing={d.waxing} size={26} glow={false} />
              <span className="cal-day-num">{d.day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
