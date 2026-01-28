-- Add pinterest_board_url column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS pinterest_board_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN rooms.pinterest_board_url IS 'URL to a Pinterest board for room inspiration';
