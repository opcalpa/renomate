import React, { useMemo } from "react";
import { Group, Path } from "react-konva";
import type { TimelineDependency, TaskPosition } from "./types";
import { BAR_PADDING_Y, ROW_HEIGHT } from "./utils";

interface TimelineDependencyArrowsProps {
  dependencies: TimelineDependency[];
  taskPositions: Map<string, TaskPosition>;
}

const ARROW_COLOR = "#94a3b8";
const ARROW_HEAD_SIZE = 6;
const BAR_HEIGHT = ROW_HEIGHT - BAR_PADDING_Y * 2;

function buildArrowPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): string {
  // Start from right edge of predecessor, end at left edge of dependent
  const midX = fromX + (toX - fromX) / 2;

  // Bezier curve with horizontal start/end tangents
  return [
    `M ${fromX} ${fromY}`,
    `C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`,
  ].join(" ");
}

function buildArrowHead(tipX: number, tipY: number): string {
  // Small triangle pointing right
  const s = ARROW_HEAD_SIZE;
  return [
    `M ${tipX} ${tipY}`,
    `L ${tipX - s} ${tipY - s / 2}`,
    `L ${tipX - s} ${tipY + s / 2}`,
    `Z`,
  ].join(" ");
}

const TimelineDependencyArrowsComponent: React.FC<
  TimelineDependencyArrowsProps
> = ({ dependencies, taskPositions }) => {
  const arrows = useMemo(() => {
    const result: React.ReactNode[] = [];

    for (const dep of dependencies) {
      const fromPos = taskPositions.get(dep.depends_on_task_id);
      const toPos = taskPositions.get(dep.task_id);
      if (!fromPos || !toPos) continue;

      const fromX = fromPos.x + fromPos.width;
      const fromY = fromPos.y + BAR_PADDING_Y + BAR_HEIGHT / 2;
      const toX = toPos.x;
      const toY = toPos.y + BAR_PADDING_Y + BAR_HEIGHT / 2;

      result.push(
        <Path
          key={`dep-line-${dep.id}`}
          data={buildArrowPath(fromX, fromY, toX, toY)}
          stroke={ARROW_COLOR}
          strokeWidth={1.5}
          fill="transparent"
          listening={false}
          perfectDrawEnabled={false}
        />
      );

      result.push(
        <Path
          key={`dep-head-${dep.id}`}
          data={buildArrowHead(toX, toY)}
          fill={ARROW_COLOR}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    return result;
  }, [dependencies, taskPositions]);

  return <Group listening={false}>{arrows}</Group>;
};

export const TimelineDependencyArrows = React.memo(
  TimelineDependencyArrowsComponent
);
