/**
 * Template data for the demo project seeded to all new users.
 * Represents a typical 3-room apartment renovation (~50 sqm) in Stockholm.
 * Focus on surface renovation (ytskiktsrenovering).
 */

export interface DemoRoom {
  name: string;
  descriptionKey: string;
  status: string;
  area_sqm: number;
  ceiling_height_mm: number;
  color: string;
  polygon: { x: number; y: number }[];
}

export interface DemoTask {
  titleKey: string;
  descriptionKey: string;
  status: string;
  priority: string;
  room_index: number; // Index into rooms array, -1 for no room (whole apartment)
  cost_center: string;
  budget: number | null;
  start_offset_days: number; // Days from today
  duration_days: number;
}

export interface DemoMaterial {
  nameKey: string;
  room_index: number; // -1 for general/whole apartment
  task_index: number;
  quantity: number;
  unit: string;
  price_per_unit: number;
  vendor_name: string;
}

export const DEMO_PROJECT_TEMPLATE = {
  nameKey: "demoProject.title",
  descriptionKey: "demoProject.description",
  project_type: "apartment_renovation",

  // Typical Stockholm 3-room apartment layout (~50 sqm)
  // Coordinates in mm, origin at top-left
  rooms: [
    {
      name: "Vardagsrum",
      descriptionKey: "demoProject.rooms.livingRoom",
      status: "to_be_renovated",
      area_sqm: 18,
      ceiling_height_mm: 2600,
      color: "#60A5FA", // blue-400
      // Large room at bottom-left
      polygon: [
        { x: 0, y: 3500 },
        { x: 5000, y: 3500 },
        { x: 5000, y: 7500 },
        { x: 0, y: 7500 },
      ],
    },
    {
      name: "Sovrum",
      descriptionKey: "demoProject.rooms.bedroom",
      status: "to_be_renovated",
      area_sqm: 12,
      ceiling_height_mm: 2600,
      color: "#A78BFA", // violet-400
      // Right side, middle
      polygon: [
        { x: 5200, y: 2500 },
        { x: 8200, y: 2500 },
        { x: 8200, y: 6500 },
        { x: 5200, y: 6500 },
      ],
    },
    {
      name: "Kök",
      descriptionKey: "demoProject.rooms.kitchen",
      status: "to_be_renovated",
      area_sqm: 8,
      ceiling_height_mm: 2600,
      color: "#34D399", // emerald-400
      // Top-left corner
      polygon: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 2000 },
        { x: 0, y: 2000 },
      ],
    },
    {
      name: "Badrum",
      descriptionKey: "demoProject.rooms.bathroom",
      status: "to_be_renovated",
      area_sqm: 4,
      ceiling_height_mm: 2600,
      color: "#38BDF8", // sky-400
      // Small room top-right
      polygon: [
        { x: 4200, y: 0 },
        { x: 6200, y: 0 },
        { x: 6200, y: 2000 },
        { x: 4200, y: 2000 },
      ],
    },
    {
      name: "Hall",
      descriptionKey: "demoProject.rooms.hallway",
      status: "to_be_renovated",
      area_sqm: 6,
      ceiling_height_mm: 2600,
      color: "#FBBF24", // amber-400
      // Central corridor connecting rooms
      polygon: [
        { x: 0, y: 2200 },
        { x: 5000, y: 2200 },
        { x: 5000, y: 3300 },
        { x: 0, y: 3300 },
      ],
    },
  ] as DemoRoom[],

  tasks: [
    // Task 0: Preparation
    {
      titleKey: "demoProject.tasks.preparation.title",
      descriptionKey: "demoProject.tasks.preparation.description",
      status: "done",
      priority: "high",
      room_index: -1, // Whole apartment
      cost_center: "preparation",
      budget: 3000,
      start_offset_days: -21,
      duration_days: 2,
    },
    // Task 1: Wall spackling
    {
      titleKey: "demoProject.tasks.spackling.title",
      descriptionKey: "demoProject.tasks.spackling.description",
      status: "done",
      priority: "high",
      room_index: 0, // Vardagsrum
      cost_center: "walls",
      budget: 8000,
      start_offset_days: -19,
      duration_days: 3,
    },
    // Task 2: Wall and ceiling painting - Living room
    {
      titleKey: "demoProject.tasks.paintingLivingRoom.title",
      descriptionKey: "demoProject.tasks.paintingLivingRoom.description",
      status: "done",
      priority: "medium",
      room_index: 0, // Vardagsrum
      cost_center: "painting",
      budget: 12000,
      start_offset_days: -16,
      duration_days: 3,
    },
    // Task 3: Bedroom wallpaper
    {
      titleKey: "demoProject.tasks.wallpaper.title",
      descriptionKey: "demoProject.tasks.wallpaper.description",
      status: "doing",
      priority: "medium",
      room_index: 1, // Sovrum
      cost_center: "walls",
      budget: 6000,
      start_offset_days: -5,
      duration_days: 2,
    },
    // Task 4: Floor sanding
    {
      titleKey: "demoProject.tasks.floorSanding.title",
      descriptionKey: "demoProject.tasks.floorSanding.description",
      status: "to_do",
      priority: "high",
      room_index: 0, // Vardagsrum (but applies to hall too)
      cost_center: "flooring",
      budget: 18000,
      start_offset_days: 2,
      duration_days: 4,
    },
    // Task 5: Kitchen countertop & backsplash
    {
      titleKey: "demoProject.tasks.kitchenSurfaces.title",
      descriptionKey: "demoProject.tasks.kitchenSurfaces.description",
      status: "to_do",
      priority: "medium",
      room_index: 2, // Kök
      cost_center: "kitchen",
      budget: 25000,
      start_offset_days: 7,
      duration_days: 3,
    },
    // Task 6: Bathroom tiling
    {
      titleKey: "demoProject.tasks.bathroomTiling.title",
      descriptionKey: "demoProject.tasks.bathroomTiling.description",
      status: "to_do",
      priority: "high",
      room_index: 3, // Badrum
      cost_center: "bathroom",
      budget: 35000,
      start_offset_days: 10,
      duration_days: 5,
    },
    // Task 7: Install trim/moldings
    {
      titleKey: "demoProject.tasks.trim.title",
      descriptionKey: "demoProject.tasks.trim.description",
      status: "to_do",
      priority: "low",
      room_index: -1, // Whole apartment
      cost_center: "finishing",
      budget: 8000,
      start_offset_days: 16,
      duration_days: 2,
    },
    // Task 8: Electrical - outlets and lighting
    {
      titleKey: "demoProject.tasks.electrical.title",
      descriptionKey: "demoProject.tasks.electrical.description",
      status: "to_do",
      priority: "medium",
      room_index: 2, // Kök
      cost_center: "electrical",
      budget: 15000,
      start_offset_days: 5,
      duration_days: 2,
    },
    // Task 9: Final cleaning
    {
      titleKey: "demoProject.tasks.finalCleaning.title",
      descriptionKey: "demoProject.tasks.finalCleaning.description",
      status: "to_do",
      priority: "low",
      room_index: -1, // Whole apartment
      cost_center: "other",
      budget: 4000,
      start_offset_days: 19,
      duration_days: 1,
    },
  ] as DemoTask[],

  materials: [
    // Spackling - for task 1 (spackling)
    {
      nameKey: "demoProject.materials.filler",
      room_index: 0,
      task_index: 1,
      quantity: 5,
      unit: "st",
      price_per_unit: 350,
      vendor_name: "Byggmax",
    },
    // Wall paint - for task 2 (painting living room)
    {
      nameKey: "demoProject.materials.wallPaint",
      room_index: 0,
      task_index: 2,
      quantity: 25,
      unit: "liter",
      price_per_unit: 85,
      vendor_name: "Colorama",
    },
    // Ceiling paint - for task 2
    {
      nameKey: "demoProject.materials.ceilingPaint",
      room_index: 0,
      task_index: 2,
      quantity: 10,
      unit: "liter",
      price_per_unit: 95,
      vendor_name: "Colorama",
    },
    // Wallpaper - for task 3 (bedroom)
    {
      nameKey: "demoProject.materials.wallpaper",
      room_index: 1,
      task_index: 3,
      quantity: 6,
      unit: "rullar",
      price_per_unit: 890,
      vendor_name: "Boråstapeter",
    },
    // Floor lacquer - for task 4 (floor sanding)
    {
      nameKey: "demoProject.materials.floorLacquer",
      room_index: 0,
      task_index: 4,
      quantity: 5,
      unit: "liter",
      price_per_unit: 520,
      vendor_name: "Bona",
    },
    // Kitchen countertop - for task 5
    {
      nameKey: "demoProject.materials.countertop",
      room_index: 2,
      task_index: 5,
      quantity: 1,
      unit: "st",
      price_per_unit: 8500,
      vendor_name: "IKEA",
    },
    // Kitchen backsplash tiles - for task 5
    {
      nameKey: "demoProject.materials.backsplashTiles",
      room_index: 2,
      task_index: 5,
      quantity: 2,
      unit: "kvm",
      price_per_unit: 650,
      vendor_name: "Kakel Direkt",
    },
    // Bathroom tiles - for task 6
    {
      nameKey: "demoProject.materials.bathroomTiles",
      room_index: 3,
      task_index: 6,
      quantity: 12,
      unit: "kvm",
      price_per_unit: 490,
      vendor_name: "Bauhaus",
    },
    // Tile grout - for task 6
    {
      nameKey: "demoProject.materials.grout",
      room_index: 3,
      task_index: 6,
      quantity: 8,
      unit: "kg",
      price_per_unit: 65,
      vendor_name: "Bauhaus",
    },
    // Floor trim - for task 7
    {
      nameKey: "demoProject.materials.floorTrim",
      room_index: -1,
      task_index: 7,
      quantity: 45,
      unit: "meter",
      price_per_unit: 89,
      vendor_name: "Byggmax",
    },
    // Ceiling trim - for task 7
    {
      nameKey: "demoProject.materials.ceilingTrim",
      room_index: 0,
      task_index: 7,
      quantity: 25,
      unit: "meter",
      price_per_unit: 125,
      vendor_name: "Byggmax",
    },
    // LED spots - for task 8 (electrical)
    {
      nameKey: "demoProject.materials.ledSpots",
      room_index: 2,
      task_index: 8,
      quantity: 6,
      unit: "st",
      price_per_unit: 299,
      vendor_name: "Elgiganten",
    },
  ] as DemoMaterial[],
};
