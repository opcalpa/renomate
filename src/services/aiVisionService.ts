/**
 * AI Vision Service for Floor Plan Conversion
 * Uses Supabase Edge Functions to securely process images
 */

import { FloorMapShape } from "@/components/floormap/types";
import { supabase } from "@/lib/supabaseClient"; // Se till att denna fil skapats i src/lib/

export interface AIConversionResult {
  walls: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    thickness?: number;
  }>;
  doors: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  }>;
  rooms: Array<{
    points: Array<{ x: number; y: number }>;
    name?: string;
  }>;
}

/**
 * Convert image to Base64
 */
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call Supabase Edge Function instead of OpenAI directly
 */
async function callVisionAPI(
  base64Image: string,
  ratio: number
): Promise<AIConversionResult> {
  
  // Vi anropar funktionen vi skapade tidigare i Supabase
  const { data, error } = await supabase.functions.invoke('process-floorplan', {
    body: { 
      image: base64Image,
      ratio: ratio 
    },
  });

  if (error) {
    console.error('Supabase Edge Function error:', error);
    throw new Error(`AI-analys misslyckades: ${error.message}`);
  }

  return data as AIConversionResult;
}

/**
 * Convert AI result to FloorMapShape objects
 */
function convertToFloorMapShapes(
  aiResult: AIConversionResult,
  ratio: number,
  planId: string
): FloorMapShape[] {
  const shapes: FloorMapShape[] = [];

  // Walls
  aiResult.walls?.forEach((wall) => {
    shapes.push({
      id: `ai-wall-${Date.now()}-${Math.random()}`,
      planId,
      type: 'wall',
      coordinates: { x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 },
      thicknessMM: wall.thickness || 150,
      heightMM: 2400,
      strokeColor: '#2d3748',
    });
  });

  // Doors
  aiResult.doors?.forEach((door) => {
    shapes.push({
      id: `ai-door-${Date.now()}-${Math.random()}`,
      planId,
      type: 'door',
      coordinates: {
        left: door.x - door.width / 2,
        top: door.y - door.height / 2,
        width: door.width,
        height: door.height,
      },
      rotation: door.rotation || 0,
      color: '#8B4513',
    });
  });

  // Rooms
  aiResult.rooms?.forEach((room) => {
    const baseColor = '#3b82f6';
    const getDarkerColor = (hexColor: string): string => {
      return `rgba(25, 57, 109, 0.8)`; // Förenklad mörkblå
    };

    shapes.push({
      id: `ai-room-${Date.now()}-${Math.random()}`,
      planId,
      type: 'room',
      coordinates: { points: room.points },
      name: room.name || 'Unnamed Room',
      color: 'rgba(59, 130, 246, 0.2)',
      fillOpacity: 0.1,
      strokeColor: getDarkerColor(baseColor),
    });
  });

  return shapes;
}

export async function convertImageToBlueprint(
  imageFile: File,
  pixelToMmRatio: number,
  planId: string
): Promise<FloorMapShape[]> {
  const base64Image = await imageToBase64(imageFile);
  const aiResult = await callVisionAPI(base64Image, pixelToMmRatio);
  return convertToFloorMapShapes(aiResult, pixelToMmRatio, planId);
}