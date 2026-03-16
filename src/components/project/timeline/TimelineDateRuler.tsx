import React, { useMemo } from "react";
import { Stage, Layer, Rect, Line, Text as KonvaText, Group } from "react-konva";
import { addDays, format, getISOWeek, startOfWeek } from "date-fns";
import { sv } from "date-fns/locale";
import { dateToX, RULER_HEIGHT } from "./utils";

interface TimelineDateRulerProps {
  originDate: Date;
  pixelsPerDay: number;
  panX: number;
  stageWidth: number;
  daysToRender: number;
}

const MONTH_ROW_HEIGHT = 18;
const WEEK_ROW_HEIGHT = 18;
const DAY_ROW_HEIGHT = 20;
const BG_COLOR = "#ffffff";
const BORDER_COLOR = "#e2e8f0";
const MONTH_TEXT_COLOR = "#334155";
const WEEK_TEXT_COLOR = "#64748b";
const DAY_TEXT_COLOR = "#94a3b8";

const TimelineDateRulerComponent: React.FC<TimelineDateRulerProps> = ({
  originDate,
  pixelsPerDay,
  panX,
  stageWidth,
  daysToRender,
}) => {
  // Calculate visible day range
  const firstVisibleDay = Math.floor(-panX / pixelsPerDay) - 1;
  const lastVisibleDay = Math.ceil((stageWidth - panX) / pixelsPerDay) + 1;
  const startDay = Math.max(0, firstVisibleDay);
  const endDay = Math.min(daysToRender, lastVisibleDay);

  const elements = useMemo(() => {
    const items: React.ReactNode[] = [];
    const renderedMonths = new Set<string>();
    const renderedWeeks = new Set<number>();

    for (let i = startDay; i <= endDay; i++) {
      const date = addDays(originDate, i);
      const x = dateToX(date, originDate, pixelsPerDay, panX);

      // Month labels (only render once per month)
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!renderedMonths.has(monthKey) || date.getDate() === 1) {
        if (date.getDate() <= 7 || !renderedMonths.has(monthKey)) {
          renderedMonths.add(monthKey);
          if (date.getDate() === 1 || i === startDay) {
            items.push(
              <KonvaText
                key={`m-${monthKey}`}
                x={x + 4}
                y={2}
                text={format(date, "MMM yyyy", { locale: sv })}
                fontSize={11}
                fontStyle="bold"
                fill={MONTH_TEXT_COLOR}
                listening={false}
              />
            );
          }
        }
      }

      // Week numbers (render once per week)
      const weekNum = getISOWeek(date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = weekNum * 100 + date.getFullYear();
      if (!renderedWeeks.has(weekKey) && date.getDay() === 1) {
        renderedWeeks.add(weekKey);
        const weekX = dateToX(weekStart, originDate, pixelsPerDay, panX);
        items.push(
          <KonvaText
            key={`w-${weekKey}`}
            x={weekX + 2}
            y={MONTH_ROW_HEIGHT + 2}
            text={`v${weekNum}`}
            fontSize={10}
            fill={WEEK_TEXT_COLOR}
            listening={false}
          />
        );
      }

      // Day labels (show if zoom is large enough)
      if (pixelsPerDay >= 30) {
        items.push(
          <KonvaText
            key={`d-${i}`}
            x={x + 2}
            y={MONTH_ROW_HEIGHT + WEEK_ROW_HEIGHT + 2}
            text={format(date, "d")}
            fontSize={10}
            fill={DAY_TEXT_COLOR}
            listening={false}
          />
        );
      }

      // Day separator lines in ruler
      items.push(
        <Line
          key={`rl-${i}`}
          points={[x, MONTH_ROW_HEIGHT + WEEK_ROW_HEIGHT, x, RULER_HEIGHT]}
          stroke={BORDER_COLOR}
          strokeWidth={0.5}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    return items;
  }, [startDay, endDay, originDate, pixelsPerDay, panX]);

  return (
    <Stage width={stageWidth} height={RULER_HEIGHT}>
      <Layer>
        {/* Background */}
        <Rect
          x={0}
          y={0}
          width={stageWidth}
          height={RULER_HEIGHT}
          fill={BG_COLOR}
          listening={false}
        />
        {/* Row separators */}
        <Line
          points={[0, MONTH_ROW_HEIGHT, stageWidth, MONTH_ROW_HEIGHT]}
          stroke={BORDER_COLOR}
          strokeWidth={0.5}
          listening={false}
        />
        <Line
          points={[
            0,
            MONTH_ROW_HEIGHT + WEEK_ROW_HEIGHT,
            stageWidth,
            MONTH_ROW_HEIGHT + WEEK_ROW_HEIGHT,
          ]}
          stroke={BORDER_COLOR}
          strokeWidth={0.5}
          listening={false}
        />
        {/* Bottom border */}
        <Line
          points={[0, RULER_HEIGHT - 1, stageWidth, RULER_HEIGHT - 1]}
          stroke={BORDER_COLOR}
          strokeWidth={1}
          listening={false}
        />
        <Group listening={false}>{elements}</Group>
      </Layer>
    </Stage>
  );
};

export const TimelineDateRuler = React.memo(TimelineDateRulerComponent);
