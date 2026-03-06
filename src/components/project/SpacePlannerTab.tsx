import { FloorMapEditor } from "@/components/floormap/FloorMapEditor";

interface SpacePlannerTabProps {
  projectId: string;
  projectName?: string;
  onBack?: () => void;
  backLabel?: string;
  isReadOnly?: boolean;
  isDemo?: boolean;
  highlightedRoomIds?: string[];
  showPinterest?: boolean;
  simplified?: boolean;
}

const SpacePlannerTab = ({ projectId, projectName, onBack, backLabel, isReadOnly, isDemo, highlightedRoomIds, showPinterest, simplified }: SpacePlannerTabProps) => {
  return <FloorMapEditor projectId={projectId} projectName={projectName} onBack={onBack} backLabel={backLabel} isReadOnly={isReadOnly} isDemo={isDemo} highlightedRoomIds={highlightedRoomIds} showPinterest={showPinterest} simplified={simplified} />;
};

export default SpacePlannerTab;
