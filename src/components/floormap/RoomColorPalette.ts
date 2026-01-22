/**
 * Generate consistent colors for rooms based on their ID
 */
export const getRoomColor = (roomId: string): string => {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
    '#84cc16', // lime
  ];
  
  // Generate consistent color based on room ID
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) {
    hash = roomId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/**
 * Get lighter version of color for fills
 */
export const getRoomFillColor = (roomId: string): string => {
  const color = getRoomColor(roomId);
  return color + '20'; // 20% opacity
};

/**
 * Room color mapping for display
 */
export const ROOM_COLORS = {
  unassigned: '#9ca3af',
  unassignedFill: '#9ca3af20',
};
