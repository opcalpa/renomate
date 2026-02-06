import { useTranslation } from "react-i18next";
import { Ruler } from "lucide-react";
import { DrawnObject } from "./types";

interface ObjectDimensionPopupProps {
  object: DrawnObject;
  canvasRect: DOMRect;
  zoom: number;
  panOffset: Point;
}

export const ObjectDimensionPopup = ({ object, canvasRect, zoom, panOffset }: ObjectDimensionPopupProps) => {
  const { t } = useTranslation();
  if (!object.selected || object.points.length === 0) return null;

  // Scale: 1:100 means 100 pixels = 1 meter in real life
  const PIXELS_PER_METER = 100; // 100 pixels = 1 meter at 1:100 scale

  // Calculate dimensions
  const calculateLength = () => {
    let totalLength = 0;
    for (let i = 0; i < object.points.length - 1; i++) {
      const p1 = object.points[i];
      const p2 = object.points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    return totalLength;
  };

  // Calculate in correct units: pixels -> meters -> cm -> mm
  const lengthPixels = calculateLength();
  const lengthM = lengthPixels / PIXELS_PER_METER; // Convert pixels to meters
  const lengthCM = lengthM * 100; // Convert meters to cm
  const lengthMM = lengthM * 1000; // Convert meters to mm

  // Get center point of object for popup position
  const centerPoint = object.points[Math.floor(object.points.length / 2)];
  const screenX = centerPoint.x * zoom + panOffset.x;
  const screenY = centerPoint.y * zoom + panOffset.y;

  // Position popup above the object
  const popupX = screenX;
  const popupY = screenY - 60;

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${popupX}px`,
        top: `${popupY}px`,
        transform: 'translate(-50%, 0)',
      }}
    >
      <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2 border border-gray-200">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-gray-600" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-900">
              {object.type === 'wall' ? t('floormap.wall') : t('elevationInfo.line')}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-blue-600">
                {lengthM >= 1 
                  ? `${lengthM.toFixed(2)} m` 
                  : `${lengthCM.toFixed(0)} cm`}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">
                {lengthMM.toFixed(0)} mm
              </span>
            </div>
          </div>
        </div>
        <div className="text-[10px] text-gray-400 mt-1">
          {object.type === 'room' ? t('floormap.doubleClickToEditRoom') : t('floormap.doubleClickForDetails')}
        </div>
      </div>
    </div>
  );
};
