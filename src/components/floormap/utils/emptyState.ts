import { FabricText, Line } from 'fabric';

/**
 * Draw an empty state guide with grid and helpful text
 */
export const drawEmptyStateGuide = (canvas: any) => {
  const width = canvas.width;
  const height = canvas.height;

  // Draw helpful text
  const text = new FabricText('Start drawing walls or rooms using the tools above', {
    left: width / 2,
    top: height / 2 - 40,
    fontSize: 18,
    fontFamily: 'Inter, system-ui, sans-serif',
    fill: '#94a3b8',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  });

  const subText = new FabricText('Grid: 100mm squares • Snap enabled by default', {
    left: width / 2,
    top: height / 2 + 10,
    fontSize: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    fill: '#64748b',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  });

  // Draw scale indicator
  const scaleLineY = height / 2 + 60;
  const scaleLine = new Line(
    [width / 2 - 100, scaleLineY, width / 2 + 100, scaleLineY],
    {
      stroke: '#94a3b8',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }
  );

  const scaleTextLeft = new FabricText('1000mm', {
    left: width / 2 - 105,
    top: scaleLineY - 20,
    fontSize: 12,
    fontFamily: 'monospace',
    fill: '#64748b',
    textAlign: 'right',
    originX: 'right',
    selectable: false,
    evented: false,
  });

  // Add end caps to scale line
  const leftCap = new Line(
    [width / 2 - 100, scaleLineY - 5, width / 2 - 100, scaleLineY + 5],
    {
      stroke: '#94a3b8',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }
  );

  const rightCap = new Line(
    [width / 2 + 100, scaleLineY - 5, width / 2 + 100, scaleLineY + 5],
    {
      stroke: '#94a3b8',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }
  );

  // Add all elements to canvas
  canvas.add(text);
  canvas.add(subText);
  canvas.add(scaleLine);
  canvas.add(leftCap);
  canvas.add(rightCap);
  canvas.add(scaleTextLeft);
  canvas.renderAll();
};
