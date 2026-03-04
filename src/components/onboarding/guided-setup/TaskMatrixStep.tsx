import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StepProps, TaskMatrix } from "./types";
import { WHOLE_PROPERTY_KEY } from "./types";

export function TaskMatrixStep({ formData, updateFormData }: StepProps) {
  const { t } = useTranslation();

  const { rooms, workTypes, matrix } = formData;

  const getChecked = (workTypeId: string, roomId: string): boolean => {
    const set = matrix[workTypeId];
    if (!set) return false;
    return set.has(roomId);
  };

  const isWholeProperty = (workTypeId: string): boolean => {
    return getChecked(workTypeId, WHOLE_PROPERTY_KEY);
  };

  const handleToggle = (workTypeId: string, roomId: string) => {
    const newMatrix: TaskMatrix = {};
    for (const [key, val] of Object.entries(matrix)) {
      newMatrix[key] = new Set(val);
    }

    if (!newMatrix[workTypeId]) {
      newMatrix[workTypeId] = new Set();
    }

    const set = newMatrix[workTypeId];

    if (roomId === WHOLE_PROPERTY_KEY) {
      if (set.has(WHOLE_PROPERTY_KEY)) {
        // Uncheck whole property -> switch to all rooms individually checked
        set.delete(WHOLE_PROPERTY_KEY);
        for (const room of rooms) {
          set.add(room.id);
        }
      } else {
        // Check whole property -> clear individual rooms, set whole
        set.clear();
        set.add(WHOLE_PROPERTY_KEY);
      }
    } else {
      // Toggle individual room
      if (set.has(roomId)) {
        set.delete(roomId);
      } else {
        set.add(roomId);
      }
    }

    updateFormData({ matrix: newMatrix });
  };

  const totalChecked = Object.values(matrix).reduce(
    (sum, set) => sum + set.size,
    0
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">
          {t("guidedSetup.matrixTitle")}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("guidedSetup.matrixDesc")}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">
                {t("guidedSetup.workType")}
              </TableHead>
              <TableHead className="text-center min-w-[76px] whitespace-nowrap">
                {t("guidedSetup.wholeProperty")}
              </TableHead>
              {rooms.map((room) => (
                <TableHead
                  key={room.id}
                  className="text-center min-w-[64px]"
                >
                  {room.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {workTypes.map((wt) => {
              const wholeChecked = isWholeProperty(wt.id);
              return (
                <TableRow key={wt.id}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">
                    {wt.label}
                    {wt.type === "custom" && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({t("guidedSetup.customTypes").toLowerCase()})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={wholeChecked}
                        onCheckedChange={() =>
                          handleToggle(wt.id, WHOLE_PROPERTY_KEY)
                        }
                      />
                    </div>
                  </TableCell>
                  {rooms.map((room) => {
                    const individualChecked = getChecked(wt.id, room.id);
                    return (
                      <TableCell key={room.id} className="text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={wholeChecked || individualChecked}
                            disabled={wholeChecked}
                            onCheckedChange={() =>
                              handleToggle(wt.id, room.id)
                            }
                          />
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalChecked === 0 && (
        <p className="text-center text-muted-foreground text-sm py-2">
          {t("guidedSetup.noMatrixSelections")}
        </p>
      )}
    </div>
  );
}
