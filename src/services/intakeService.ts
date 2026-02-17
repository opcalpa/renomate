import { supabase } from "@/integrations/supabase/client";

// =============================================================================
// TYPES
// =============================================================================

export type IntakeStatus = "pending" | "submitted" | "converted" | "expired" | "cancelled";

export type PropertyType = "villa" | "lagenhet" | "radhus" | "fritidshus" | "annat";

export type WorkType =
  | "rivning"
  | "el"
  | "vvs"
  | "kakel"
  | "snickeri"
  | "malning"
  | "golv"
  | "kok"
  | "badrum"
  | "fonster_dorrar"
  | "fasad"
  | "tak"
  | "tradgard"
  | "annat";

export type RoomPriority = "high" | "medium" | "low";

export interface IntakeRoom {
  id: string;
  name: string;
  description: string;
  work_types: WorkType[];
  priority: RoomPriority;
  images: string[];
}

export interface IntakeRequest {
  id: string;
  creator_id: string;
  token: string;
  status: IntakeStatus;

  // Customer info
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;

  // Property info
  property_address: string | null;
  property_postal_code: string | null;
  property_city: string | null;
  property_type: PropertyType | null;

  // Project info
  project_description: string | null;
  desired_start_date: string | null;

  // Data
  images: string[];
  rooms_data: IntakeRoom[];

  // References
  project_id: string | null;
  client_id: string | null;

  // Personal greeting from builder
  greeting: string | null;

  // Metadata
  expires_at: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntakeRequestWithCreator extends IntakeRequest {
  creator: {
    id: string;
    name: string | null;
    company_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export interface CreateIntakeRequestInput {
  customer_email?: string;
  customer_name?: string;
  project_id?: string; // Link to existing project
  greeting?: string; // Personal greeting from builder
}

export interface SubmitIntakeInput {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  property_address: string;
  property_postal_code?: string;
  property_city?: string;
  property_type?: PropertyType;
  project_description?: string;
  desired_start_date?: string;
  rooms_data: IntakeRoom[];
  images?: string[];
}

// =============================================================================
// BUILDER FUNCTIONS (authenticated)
// =============================================================================

/**
 * Create a new intake request (builder creates this)
 */
export async function createIntakeRequest(
  input: CreateIntakeRequestInput = {}
): Promise<IntakeRequest> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Get profile for current user
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    throw new Error("Profile not found");
  }

  const { data, error } = await supabase
    .from("customer_intake_requests")
    .insert({
      creator_id: profile.id,
      customer_email: input.customer_email || null,
      customer_name: input.customer_name || null,
      project_id: input.project_id || null,
      greeting: input.greeting || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create intake request:", error);
    throw new Error(error.message);
  }

  return transformIntakeRequest(data);
}

/**
 * Get all intake requests for the current builder
 */
export async function getMyIntakeRequests(): Promise<IntakeRequest[]> {
  const { data, error } = await supabase
    .from("customer_intake_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch intake requests:", error);
    throw new Error(error.message);
  }

  return (data || []).map(transformIntakeRequest);
}

/**
 * Get a single intake request by ID (builder view)
 */
export async function getIntakeRequest(id: string): Promise<IntakeRequest | null> {
  const { data, error } = await supabase
    .from("customer_intake_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("Failed to fetch intake request:", error);
    throw new Error(error.message);
  }

  return transformIntakeRequest(data);
}

/**
 * Cancel an intake request
 */
export async function cancelIntakeRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("customer_intake_requests")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    console.error("Failed to cancel intake request:", error);
    throw new Error(error.message);
  }
}

/**
 * Mark intake request as converted (after creating quote)
 */
export async function markIntakeAsConverted(
  id: string,
  projectId: string,
  clientId?: string
): Promise<void> {
  const { error } = await supabase
    .from("customer_intake_requests")
    .update({
      status: "converted",
      project_id: projectId,
      client_id: clientId || null,
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to mark intake as converted:", error);
    throw new Error(error.message);
  }
}

// =============================================================================
// PUBLIC FUNCTIONS (token-based, no auth required)
// =============================================================================

/**
 * Get intake request by token (for public form)
 */
export async function getIntakeRequestByToken(
  token: string
): Promise<IntakeRequestWithCreator | null> {
  const { data, error } = await supabase
    .from("customer_intake_requests")
    .select(`
      *,
      creator:profiles!customer_intake_requests_creator_id_fkey (
        id,
        name,
        company_name,
        avatar_url,
        email
      )
    `)
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("Failed to fetch intake request by token:", error);
    throw new Error(error.message);
  }

  return {
    ...transformIntakeRequest(data),
    creator: data.creator,
  };
}

/**
 * Submit intake request (customer fills in the form)
 */
export async function submitIntakeRequest(
  token: string,
  input: SubmitIntakeInput
): Promise<IntakeRequest> {
  const { data, error } = await supabase
    .from("customer_intake_requests")
    .update({
      status: "submitted",
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone || null,
      property_address: input.property_address,
      property_postal_code: input.property_postal_code || null,
      property_city: input.property_city || null,
      property_type: input.property_type || null,
      project_description: input.project_description || null,
      desired_start_date: input.desired_start_date || null,
      rooms_data: input.rooms_data,
      images: input.images || [],
      submitted_at: new Date().toISOString(),
    })
    .eq("token", token)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    console.error("Failed to submit intake request:", error);
    throw new Error(error.message);
  }

  return transformIntakeRequest(data);
}

// =============================================================================
// GUIDED SETUP (self-service project creation)
// =============================================================================

/**
 * Create a project directly from guided setup (self-service mode)
 * This creates a project, rooms, and tasks without going through intake_request
 *
 * Task creation strategy:
 * - Common work types: ONE task per work type, room_id = null, rooms listed in description
 * - Room-specific work types: ONE task per work type per room, room_id = the room's id
 */
export async function createProjectFromGuidedSetup(
  input: {
    projectName: string;
    address?: string;
    postalCode?: string;
    city?: string;
    commonWorkTypes?: WorkType[];
    rooms: IntakeRoom[];
  },
  creatorProfileId: string
): Promise<{ projectId: string }> {
  // 1. Create project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: input.projectName,
      owner_id: creatorProfileId,
      address: input.address || null,
      postal_code: input.postalCode || null,
      city: input.city || null,
      status: "planning",
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Failed to create project:", projectError);
    throw new Error(projectError?.message || "Failed to create project");
  }

  // 2. Create rooms from guided setup data
  const roomMapping = await createRoomsFromIntake(project.id, input.rooms);

  // 3. Create common work tasks (ONE task per work type, applies to all rooms)
  const roomNames = input.rooms.map(r => r.name);
  if (input.commonWorkTypes && input.commonWorkTypes.length > 0) {
    await createCommonWorkTasks(
      project.id,
      input.commonWorkTypes,
      roomNames,
      creatorProfileId
    );
  }

  // 4. Create room-specific tasks (extra work beyond common work)
  await createRoomSpecificTasks(project.id, input.rooms, roomMapping, creatorProfileId);

  // 5. Mark onboarding step as complete
  await supabase
    .from("profiles")
    .update({ onboarding_created_project: true })
    .eq("id", creatorProfileId);

  return { projectId: project.id };
}

/**
 * Create ONE task per common work type (applies to whole apartment)
 * These tasks have room_id = null but list rooms in the description
 */
async function createCommonWorkTasks(
  projectId: string,
  workTypes: WorkType[],
  roomNames: string[],
  creatorProfileId: string
): Promise<void> {
  const roomsText = roomNames.length > 0
    ? `Rum: ${roomNames.join(", ")}`
    : "";

  for (const workType of workTypes) {
    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      room_id: null, // Not linked to specific room - applies to all
      title: getWorkTypeLabel(workType),
      description: roomsText,
      status: "planned",
      priority: "medium",
      cost_center: workTypeToCostCenter(workType),
      created_by_user_id: creatorProfileId,
    });

    if (error) {
      console.error("Failed to create common work task:", error);
    }
  }
}

/**
 * Create tasks for room-specific extra work
 * These tasks have room_id set to the specific room
 */
async function createRoomSpecificTasks(
  projectId: string,
  rooms: IntakeRoom[],
  roomMapping: Array<{ intakeRoomId: string; dbRoomId: string }>,
  creatorProfileId: string
): Promise<void> {
  const roomIdMap = new Map(roomMapping.map((r) => [r.intakeRoomId, r.dbRoomId]));

  for (const room of rooms) {
    // Only create tasks for room-specific work_types (not common work)
    if (room.work_types.length === 0) continue;

    const dbRoomId = roomIdMap.get(room.id);

    for (const workType of room.work_types) {
      const taskTitle = `${getWorkTypeLabel(workType)} - ${room.name}`;

      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        room_id: dbRoomId || null,
        title: taskTitle,
        description: room.description,
        status: "planned",
        priority: room.priority === "high" ? "high" : room.priority === "low" ? "low" : "medium",
        cost_center: workTypeToCostCenter(workType),
        created_by_user_id: creatorProfileId,
      });

      if (error) {
        console.error("Failed to create room-specific task:", error);
      }
    }
  }
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Maps work_type to cost_center enum value
 */
export function workTypeToCostCenter(workType: WorkType): string {
  const mapping: Record<WorkType, string> = {
    rivning: "demolition",
    el: "electrical",
    vvs: "plumbing",
    kakel: "tiling",
    snickeri: "carpentry",
    malning: "painting",
    golv: "flooring",
    kok: "kitchen",
    badrum: "bathroom",
    fonster_dorrar: "windows_doors",
    fasad: "facade",
    tak: "roofing",
    tradgard: "landscaping",
    annat: "other",
  };
  return mapping[workType] || "other";
}

/**
 * Create rooms from intake request data
 */
export async function createRoomsFromIntake(
  projectId: string,
  rooms: IntakeRoom[]
): Promise<Array<{ intakeRoomId: string; dbRoomId: string }>> {
  const results: Array<{ intakeRoomId: string; dbRoomId: string }> = [];

  for (const room of rooms) {
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        project_id: projectId,
        name: room.name,
        description: room.description,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create room:", error);
      continue;
    }

    results.push({ intakeRoomId: room.id, dbRoomId: data.id });
  }

  return results;
}

/**
 * Create tasks from intake request data
 */
export async function createTasksFromIntake(
  projectId: string,
  rooms: IntakeRoom[],
  roomMapping: Array<{ intakeRoomId: string; dbRoomId: string }>,
  creatorProfileId: string
): Promise<void> {
  const roomIdMap = new Map(roomMapping.map((r) => [r.intakeRoomId, r.dbRoomId]));

  for (const room of rooms) {
    const dbRoomId = roomIdMap.get(room.id);

    for (const workType of room.work_types) {
      const taskTitle = `${getWorkTypeLabel(workType)} - ${room.name}`;

      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        room_id: dbRoomId || null,
        title: taskTitle,
        description: room.description,
        status: "planned",
        priority: room.priority === "high" ? "high" : room.priority === "low" ? "low" : "medium",
        cost_center: workTypeToCostCenter(workType),
        created_by_user_id: creatorProfileId,
      });

      if (error) {
        console.error("Failed to create task:", error);
      }
    }
  }
}

/**
 * Create or find client from intake request
 */
export async function createClientFromIntake(
  ownerProfileId: string,
  input: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    postal_code?: string;
    city?: string;
  }
): Promise<string> {
  // Check if client with this email already exists for this owner
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_id", ownerProfileId)
    .eq("email", input.email)
    .single();

  if (existing) {
    // Update existing client
    await supabase
      .from("clients")
      .update({
        name: input.name,
        phone: input.phone || null,
        address: input.address || null,
        postal_code: input.postal_code || null,
        city: input.city || null,
      })
      .eq("id", existing.id);

    return existing.id;
  }

  // Create new client
  const { data, error } = await supabase
    .from("clients")
    .insert({
      owner_id: ownerProfileId,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      address: input.address || null,
      postal_code: input.postal_code || null,
      city: input.city || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create client:", error);
    throw new Error(error.message);
  }

  return data.id;
}

/**
 * Invite customer as client to the project
 * Called when a quote is accepted
 */
export async function inviteCustomerAsClient(
  projectId: string,
  customerEmail: string,
  customerName: string,
  invitedByUserId: string
): Promise<void> {
  // Client role permissions (view access to everything)
  const clientPermissions = {
    timeline_access: "view",
    tasks_access: "view",
    tasks_scope: "all",
    space_planner_access: "view",
    purchases_access: "view",
    purchases_scope: "all",
    overview_access: "view",
    teams_access: "view",
    budget_access: "view",
    files_access: "view",
  };

  // Check if invitation already exists
  const { data: existing } = await supabase
    .from("project_invitations")
    .select("id")
    .eq("project_id", projectId)
    .eq("email", customerEmail)
    .single();

  if (existing) {
    // Already invited, skip
    return;
  }

  // Create the invitation
  const { data: invitation, error } = await supabase
    .from("project_invitations")
    .insert({
      project_id: projectId,
      invited_by_user_id: invitedByUserId,
      email: customerEmail,
      invited_name: customerName,
      role: "client",
      ...clientPermissions,
      permissions_snapshot: clientPermissions,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create client invitation:", error);
    throw new Error(error.message);
  }

  // Send invitation email
  try {
    await supabase.functions.invoke("send-project-invitation", {
      body: { invitationId: invitation.id },
    });
  } catch (sendError) {
    console.error("Failed to send invitation email:", sendError);
    // Don't throw - invitation is created, email just didn't send
  }
}

/**
 * Populate an existing project with intake data (rooms, tasks, project info)
 */
export async function populateProjectFromIntake(
  projectId: string,
  intake: IntakeRequest,
  creatorProfileId: string
): Promise<void> {
  // Update project with property info
  const projectUpdates: Record<string, unknown> = {};
  if (intake.property_address) {
    projectUpdates.address = intake.property_address;
  }
  if (intake.property_city) {
    projectUpdates.city = intake.property_city;
  }
  if (intake.project_description) {
    projectUpdates.description = intake.project_description;
  }
  if (intake.desired_start_date) {
    projectUpdates.start_date = intake.desired_start_date;
  }

  if (Object.keys(projectUpdates).length > 0) {
    await supabase
      .from("projects")
      .update(projectUpdates)
      .eq("id", projectId);
  }

  // Create rooms from intake
  const roomMapping = await createRoomsFromIntake(projectId, intake.rooms_data);

  // Create tasks from intake
  await createTasksFromIntake(projectId, intake.rooms_data, roomMapping, creatorProfileId);

  // Create or update client
  if (intake.customer_email && intake.customer_name) {
    const clientId = await createClientFromIntake(creatorProfileId, {
      name: intake.customer_name,
      email: intake.customer_email,
      phone: intake.customer_phone || undefined,
      address: intake.property_address || undefined,
      postal_code: intake.property_postal_code || undefined,
      city: intake.property_city || undefined,
    });

    // Update project with client reference
    await supabase
      .from("projects")
      .update({ client_id: clientId })
      .eq("id", projectId);

    // Mark intake as converted
    await markIntakeAsConverted(intake.id, projectId, clientId);
  } else {
    // Mark intake as converted without client
    await markIntakeAsConverted(intake.id, projectId);
  }
}

/**
 * Send intake form email to customer
 */
export async function sendIntakeFormEmail(
  intakeId: string,
  customerEmail: string,
  customerName?: string
): Promise<void> {
  const { error } = await supabase.functions.invoke("send-intake-email", {
    body: { intakeId, customerEmail, customerName },
  });

  if (error) {
    console.error("Failed to send intake email:", error);
    throw new Error("Failed to send email");
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function transformIntakeRequest(data: Record<string, unknown>): IntakeRequest {
  return {
    id: data.id as string,
    creator_id: data.creator_id as string,
    token: data.token as string,
    status: data.status as IntakeStatus,
    customer_name: data.customer_name as string | null,
    customer_email: data.customer_email as string | null,
    customer_phone: data.customer_phone as string | null,
    property_address: data.property_address as string | null,
    property_postal_code: data.property_postal_code as string | null,
    property_city: data.property_city as string | null,
    property_type: data.property_type as PropertyType | null,
    project_description: data.project_description as string | null,
    desired_start_date: data.desired_start_date as string | null,
    images: (data.images as string[]) || [],
    rooms_data: (data.rooms_data as IntakeRoom[]) || [],
    project_id: data.project_id as string | null,
    client_id: data.client_id as string | null,
    greeting: data.greeting as string | null,
    expires_at: data.expires_at as string,
    submitted_at: data.submitted_at as string | null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

/**
 * Get display label for work type
 */
export function getWorkTypeLabel(workType: WorkType): string {
  const labels: Record<WorkType, string> = {
    rivning: "Rivning",
    el: "El",
    vvs: "VVS",
    kakel: "Kakel",
    snickeri: "Snickeri",
    malning: "Målning",
    golv: "Golv",
    kok: "Kök",
    badrum: "Badrum",
    fonster_dorrar: "Fönster/Dörrar",
    fasad: "Fasad",
    tak: "Tak",
    tradgard: "Trädgård",
    annat: "Övrigt",
  };
  return labels[workType] || workType;
}

/**
 * Get all available work types with labels
 */
export function getWorkTypes(): Array<{ value: WorkType; label: string }> {
  const types: WorkType[] = [
    "rivning",
    "el",
    "vvs",
    "kakel",
    "snickeri",
    "malning",
    "golv",
    "kok",
    "badrum",
    "fonster_dorrar",
    "fasad",
    "tak",
    "tradgard",
    "annat",
  ];
  return types.map((t) => ({ value: t, label: getWorkTypeLabel(t) }));
}

/**
 * Get predefined room suggestions
 */
export function getRoomSuggestions(): Array<{ name: string; icon: string }> {
  return [
    { name: "Kök", icon: "🍳" },
    { name: "Badrum", icon: "🛁" },
    { name: "Vardagsrum", icon: "🛋️" },
    { name: "Sovrum", icon: "🛏️" },
    { name: "WC/Dusch", icon: "🚿" },
    { name: "Tvättstuga", icon: "👕" },
    { name: "Hall", icon: "🚪" },
    { name: "Kontor", icon: "💼" },
    { name: "Barnrum", icon: "🧸" },
    { name: "Balkong", icon: "🌿" },
    { name: "Källare", icon: "🏚️" },
    { name: "Vind", icon: "🏠" },
    { name: "Garage", icon: "🚗" },
    { name: "Uteplats", icon: "☀️" },
  ];
}

/**
 * Generate public intake form URL
 */
export function getIntakeFormUrl(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/intake/${token}`;
}
