import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Room {
  id: string;
  name: string;
  description?: string;
}

interface RoomsManagementSectionProps {
  projectId: string;
  rooms: Room[];
  onRoomsUpdate: () => void;
}

export const RoomsManagementSection = ({ projectId, rooms, onRoomsUpdate }: RoomsManagementSectionProps) => {
  const { t } = useTranslation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error(t("roomManagement.enterRoomName", "Please enter a room name"));
      return;
    }

    try {
      const { error } = await supabase
        .from("rooms")
        .insert({
          project_id: projectId,
          name: newRoomName.trim(),
          description: newRoomDescription.trim() || null,
        });

      if (error) throw error;

      toast.success(t("roomManagement.roomCreated", "Room created successfully"));
      setNewRoomName("");
      setNewRoomDescription("");
      setIsCreateDialogOpen(false);
      onRoomsUpdate();
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error(t("roomManagement.createFailed", "Failed to create room"));
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom || !editingRoom.name.trim()) {
      toast.error(t("roomManagement.enterRoomName", "Please enter a room name"));
      return;
    }

    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          name: editingRoom.name.trim(),
          description: editingRoom.description?.trim() || null,
        })
        .eq("id", editingRoom.id);

      if (error) throw error;

      toast.success(t("roomManagement.roomUpdated", "Room updated successfully"));
      setEditingRoom(null);
      setIsEditDialogOpen(false);
      onRoomsUpdate();
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error(t("roomManagement.updateFailed", "Failed to update room"));
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm(t("roomManagement.confirmDelete", "Are you sure you want to delete this room?"))) {
      return;
    }

    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

      toast.success(t("roomManagement.roomDeleted", "Room deleted successfully"));
      onRoomsUpdate();
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error(t("roomManagement.deleteFailed", "Failed to delete room"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("roomManagement.title", "Rooms & Spaces")}</CardTitle>
            <CardDescription>{t("roomManagement.description", "Manage rooms for your project")}</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("roomManagement.addRoom", "Add Room")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("roomManagement.createNewRoom", "Create New Room")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">{t("roomManagement.roomName", "Room Name")} *</Label>
                  <Input
                    id="room-name"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder={t("roomManagement.roomNamePlaceholder", "e.g., Living Room, Kitchen")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-description">{t("common.description")} ({t("common.optional")})</Label>
                  <Input
                    id="room-description"
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    placeholder={t("roomManagement.descriptionPlaceholder", "Add any notes about this room")}
                  />
                </div>
                <Button onClick={handleCreateRoom} className="w-full">
                  {t("roomManagement.createRoom", "Create Room")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {rooms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t("roomManagement.noRooms", "No rooms yet. Create your first room to get started.")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{room.name}</p>
                  {room.description && (
                    <p className="text-sm text-muted-foreground">{room.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingRoom(room);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRoom(room.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("roomManagement.editRoom", "Edit Room")}</DialogTitle>
            </DialogHeader>
            {editingRoom && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-room-name">{t("roomManagement.roomName", "Room Name")} *</Label>
                  <Input
                    id="edit-room-name"
                    value={editingRoom.name}
                    onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                    placeholder={t("roomManagement.roomNamePlaceholder", "e.g., Living Room, Kitchen")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-room-description">{t("common.description")} ({t("common.optional")})</Label>
                  <Input
                    id="edit-room-description"
                    value={editingRoom.description || ""}
                    onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                    placeholder={t("roomManagement.descriptionPlaceholder", "Add any notes about this room")}
                  />
                </div>
                <Button onClick={handleUpdateRoom} className="w-full">
                  {t("roomManagement.updateRoom", "Update Room")}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
