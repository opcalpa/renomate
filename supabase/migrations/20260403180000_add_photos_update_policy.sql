-- Add UPDATE policy for photos table
-- Currently only SELECT, INSERT, DELETE exist. UPDATE is needed for
-- linking photos to rooms/tasks (changing linked_to_type and linked_to_id).

CREATE POLICY "Users can update own photos"
  ON public.photos
  FOR UPDATE
  USING (uploaded_by_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (uploaded_by_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
