import { useState, useEffect } from "react";
import { FloorMapEditor } from "@/components/floormap/FloorMapEditor";
import { useTranslation } from "react-i18next";

interface SpacePlannerTabProps {
  projectId: string;
  projectName?: string;
  onBack?: () => void;
  backLabel?: string;
  isReadOnly?: boolean;
  isDemo?: boolean;
  highlightedRoomIds?: string[];
  showPinterest?: boolean;
}

const SpacePlannerTab = ({ projectId, projectName, onBack, backLabel, isReadOnly, isDemo, highlightedRoomIds, showPinterest }: SpacePlannerTabProps) => {
  return <FloorMapEditor projectId={projectId} projectName={projectName} onBack={onBack} backLabel={backLabel} isReadOnly={isReadOnly} isDemo={isDemo} highlightedRoomIds={highlightedRoomIds} showPinterest={showPinterest} />;
};

export default SpacePlannerTab;
