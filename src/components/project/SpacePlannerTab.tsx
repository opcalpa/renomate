import { useState, useEffect } from "react";
import { FloorMapEditor } from "@/components/floormap/FloorMapEditor";
import { useTranslation } from "react-i18next";

interface SpacePlannerTabProps {
  projectId: string;
  projectName?: string;
  onBack?: () => void;
}

const SpacePlannerTab = ({ projectId, projectName, onBack }: SpacePlannerTabProps) => {
  return <FloorMapEditor projectId={projectId} projectName={projectName} onBack={onBack} />;
};

export default SpacePlannerTab;
