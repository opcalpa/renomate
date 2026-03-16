import React from "react";
import { Group, Rect, Line } from "react-konva";
import { addDays, getDay } from "date-fns";
import { dateToX, isWeekend, isSameDay } from "./utils";

interface TimelineGridProps {
  originDate: Date;
  pixelsPerDay: number;
  panX: number;
  stageWidth: number;
  stageHeight: number;
  daysToRender: number;
}

const WEEKEND_COLOR = "#f8fafc";
const DAY_LINE_COLOR = "#e2e8f0";
const MONTH_LINE_COLOR = "#cbd5e1";
const TODAY_LINE_COLOR = "#ef4444";

const TimelineGridComponent: React.FC<TimelineGridProps> = ({
  originDate,
  pixelsPerDay,
  panX,
  stageWidth,
  stageHeight,
  daysToRender,
}) => {
  const today = new Date();
  const elements: React.ReactNode[] = [];

  // Calculate visible day range to avoid rendering off-screen elements
  const firstVisibleDay = Math.floor(-panX / pixelsPerDay) - 1;
  const lastVisibleDay =
    Math.ceil((stageWidth - panX) / pixelsPerDay) + 1;

  const startDay = Math.max(0, firstVisibleDay);
  const endDay = Math.min(daysToRender, lastVisibleDay);

  for (let i = startDay; i <= endDay; i++) {
    const date = addDays(originDate, i);
    const x = dateToX(date, originDate, pixelsPerDay, panX);

    // Weekend shading
    if (isWeekend(date)) {
      elements.push(
        <Rect
          key={`wk-${i}`}
          x={x}
          y={0}
          width={pixelsPerDay}
          height={stageHeight}
          fill={WEEKEND_COLOR}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    // Day separator line
    const isFirstOfMonth = date.getDate() === 1;
    elements.push(
      <Line
        key={`dl-${i}`}
        points={[x, 0, x, stageHeight]}
        stroke={isFirstOfMonth ? MONTH_LINE_COLOR : DAY_LINE_COLOR}
        strokeWidth={isFirstOfMonth ? 1.5 : 0.5}
        listening={false}
        perfectDrawEnabled={false}
      />
    );

    // Today marker
    if (isSameDay(date, today)) {
      elements.push(
        <Line
          key="today"
          points={[x, 0, x, stageHeight]}
          stroke={TODAY_LINE_COLOR}
          strokeWidth={2}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }
  }

  return <Group listening={false}>{elements}</Group>;
};

export const TimelineGrid = React.memo(TimelineGridComponent);
