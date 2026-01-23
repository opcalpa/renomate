/**
 * AI Vision Service for Floor Plan Conversion
 * Converts floor plan images to structured canvas data using Vision AI
 */

import { FloorMapShape } from "@/components/floormap/types";

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
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call Vision AI API (GPT-4o or Claude)
 */
async function callVisionAPI(
  base64Image: string,
  ratio: number
): Promise<AIConversionResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key saknas! Lägg till VITE_OPENAI_API_KEY i .env filen.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a floor plan analysis AI. Analyze the attached floor plan image and extract walls, doors, and rooms.

MANDATORY: Respond with ONLY valid JSON. Do not include ANY text before or after the JSON. Do not use markdown code blocks. Do not explain your reasoning.

JSON Structure (exactly this format):
{
  "walls": [
    {"x1": number, "y1": number, "x2": number, "y2": number, "thickness": number}
  ],
  "doors": [
    {"x": number, "y": number, "width": number, "height": number, "rotation": number}
  ],
  "rooms": [
    {"points": [{"x": number, "y": number}], "name": string}
  ]
}

Guidelines:
- Coordinates in pixels from image top-left (0,0)
- Round coordinates to nearest 50 pixels
- Wall thickness: 100-200 pixels
- Door width: 700-1000 pixels, height: 50-100 pixels
- Rooms: closed polygons with 3+ points
- Focus on wall centerlines
- Empty arrays if no items found

JSON ONLY:`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.1, // Low temperature for more consistent results
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Try multiple strategies to extract clean JSON
    let jsonContent = content.trim();

    // Strategy 1: Remove markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    // Strategy 2: Find JSON object boundaries
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
    }

    // Strategy 3: Remove any remaining text before/after JSON
    jsonContent = jsonContent.replace(/^[^{]*/, '').replace(/[^}]*$/, '');

    // Strategy 4: Try to find JSON in explanatory text (e.g., "Here is the JSON: { ... }")
    if (!jsonContent.trim().startsWith('{')) {
      // Look for JSON object in text
      const jsonPattern = /\{[\s\S]*\}/;
      const match = jsonContent.match(jsonPattern);
      if (match) {
        jsonContent = match[0];
      }
    }

    // Strategy 5: Clean up any remaining non-JSON text
    jsonContent = jsonContent.trim();
    if (jsonContent.includes('JSON') || jsonContent.includes('json')) {
      // Extract just the JSON part if there's explanatory text
      const colonIndex = jsonContent.indexOf(':');
      if (colonIndex !== -1) {
        const afterColon = jsonContent.substring(colonIndex + 1).trim();
        if (afterColon.startsWith('{')) {
          jsonContent = afterColon;
        }
      }
    }

    const result = JSON.parse(jsonContent);
    return result;
  } catch (error: any) {
    // Provide helpful error messages
    if (error.message?.includes('API key')) {
      throw new Error('Ogiltig API-nyckel. Kontrollera att VITE_OPENAI_API_KEY är korrekt i .env');
    }
    if (error.message?.includes('quota')) {
      throw new Error('API-kvot överskriden. Kontrollera din OpenAI billing.');
    }
    if (error instanceof SyntaxError) {
      throw new Error('AI returnerade ogiltigt JSON-format. Detta kan bero på en komplex ritning. Försök med en enklare, tydligare golvplan.');
    }

    throw error;
  }
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

  // Convert walls
  aiResult.walls.forEach((wall) => {
    shapes.push({
      id: `ai-wall-${Date.now()}-${Math.random()}`,
      planId,
      type: 'wall',
      coordinates: {
        x1: wall.x1,
        y1: wall.y1,
        x2: wall.x2,
        y2: wall.y2,
      },
      thicknessMM: wall.thickness || 150,
      heightMM: 2400,
      strokeColor: '#2d3748',
    });
  });

  // Convert doors
  aiResult.doors.forEach((door) => {
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

  // Convert rooms
  aiResult.rooms.forEach((room) => {
    // Helper to get darker color for stroke (matching manual room creation)
    const baseColor = '#3b82f6'; // Blue
    const getDarkerColor = (hexColor: string): string => {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const darkerR = Math.floor(r * 0.7);
      const darkerG = Math.floor(g * 0.7);
      const darkerB = Math.floor(b * 0.7);
      return `rgba(${darkerR}, ${darkerG}, ${darkerB}, 0.8)`;
    };

    shapes.push({
      id: `ai-room-${Date.now()}-${Math.random()}`,
      planId,
      type: 'room',
      coordinates: {
        points: room.points,
      },
      name: room.name || 'Unnamed Room',
      color: 'rgba(59, 130, 246, 0.2)', // Match manual format (rgba)
      fillOpacity: 0.1,
      strokeColor: getDarkerColor(baseColor), // Add stroke like manual rooms
    });
  });

  return shapes;
}

/**
 * Main function: Convert floor plan image to canvas shapes
 */
export async function convertImageToBlueprint(
  imageFile: File,
  pixelToMmRatio: number,
  planId: string
): Promise<FloorMapShape[]> {
  const base64Image = await imageToBase64(imageFile);
  const aiResult = await callVisionAPI(base64Image, pixelToMmRatio);
  const shapes = convertToFloorMapShapes(aiResult, pixelToMmRatio, planId);
  return shapes;
}

/**
 * Configuration for real API (add to .env)
 * 
 * For OpenAI GPT-4o:
 * VITE_OPENAI_API_KEY=sk-...
 * 
 * For Anthropic Claude:
 * VITE_ANTHROPIC_API_KEY=sk-ant-...
 */
