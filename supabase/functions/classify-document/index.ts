import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://app.letsrenomate.com',
  'https://letsrenomate.com',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

type DocumentType = 'quote' | 'invoice' | 'receipt' | 'floor_plan' | 'contract' | 'product_image' | 'specification' | 'other';

interface ClassificationResult {
  type: DocumentType;
  confidence: number;
  summary: string;
  vendor_name: string | null;
  suggested_action: 'extract_tasks' | 'extract_purchase' | 'import_to_canvas' | 'store_only';
}

function buildSystemPrompt(): string {
  return `You classify renovation project documents. Analyze the document and determine its type.

DOCUMENT TYPES:
- "quote" — A price offer/estimate from a contractor or supplier. Contains line items with prices, work descriptions, totals. Swedish: "Offert", "Prisförslag", "Anbud".
- "invoice" — A bill requesting payment. Has invoice number, due date, OCR/payment reference, bankgiro. Swedish: "Faktura".
- "receipt" — Proof of payment already made. From retail stores, hardware stores. Swedish: "Kvitto", "Kassakvitto".
- "floor_plan" — Architectural drawing, blueprint, or floor plan image. Shows rooms, walls, dimensions. Can be a photo of a printed drawing.
- "contract" — Legal agreement, construction contract, work order. Swedish: "Avtal", "Kontrakt", "Beställning".
- "specification" — Technical specification, material list, scope of work document without prices. Swedish: "Beskrivning", "Specifikation", "Arbetsbeskrivning".
- "product_image" — Photo of a product, material sample, fixture, appliance, or inspiration image.
- "other" — Anything that doesn't fit above categories.

SUGGESTED ACTIONS:
- "extract_tasks" — For quotes, specifications, contracts with work items → extract as tasks with budget
- "extract_purchase" — For invoices, receipts → extract as purchase/material record
- "import_to_canvas" — For floor plans → import as background image on canvas
- "store_only" — For product images, other documents → just save to files

RULES:
- Be decisive. Pick the most specific type that fits.
- vendor_name: Extract company/store name if visible, null otherwise.
- summary: 1-2 sentences in Swedish describing what the document is.
- confidence: 0.0-1.0

Return ONLY valid JSON:
{
  "type": "quote",
  "confidence": 0.95,
  "summary": "Offert från Byggfirma AB för badrumsrenovering, 8 arbetsmoment totalt 185 000 kr.",
  "vendor_name": "Byggfirma AB",
  "suggested_action": "extract_tasks"
}`;
}

async function classifyDocument(
  base64Content: string,
  fileName: string,
  isImage: boolean
): Promise<ClassificationResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const userContent = isImage
    ? [
        {
          type: 'image_url' as const,
          image_url: { url: `data:image/jpeg;base64,${base64Content}`, detail: 'low' as const },
        },
        { type: 'text' as const, text: `File name: "${fileName}". Classify this document.` },
      ]
    : [
        {
          type: 'text' as const,
          text: `File name: "${fileName}". Document text (first 5000 chars):\n\n${base64Content.substring(0, 5000)}\n\nClassify this document.`,
        },
      ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userContent },
      ],
      max_tokens: 512,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in OpenAI response');

  let jsonText = content;
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonText = jsonMatch[1].trim();
  const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) jsonText = jsonObjectMatch[0];

  try {
    const result = JSON.parse(jsonText);
    const validTypes: DocumentType[] = ['quote', 'invoice', 'receipt', 'floor_plan', 'contract', 'product_image', 'specification', 'other'];
    const validActions = ['extract_tasks', 'extract_purchase', 'import_to_canvas', 'store_only'];

    return {
      type: validTypes.includes(result.type) ? result.type : 'other',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
      summary: result.summary || '',
      vendor_name: result.vendor_name || null,
      suggested_action: validActions.includes(result.suggested_action) ? result.suggested_action : 'store_only',
    };
  } catch {
    console.error('Failed to parse classification:', jsonText.substring(0, 500));
    return { type: 'other', confidence: 0, summary: '', vendor_name: null, suggested_action: 'store_only' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    const { image, text, fileName } = await req.json();

    if (!image && !text) {
      throw new Error('image or text is required');
    }

    const isImage = !!image;
    const content = image || text;

    console.log('Classifying document:', fileName, 'isImage:', isImage);

    const result = await classifyDocument(content, fileName || 'unknown', isImage);

    console.log('Classification:', result.type, 'confidence:', result.confidence);

    return new Response(JSON.stringify(result), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error classifying document:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'other',
        confidence: 0,
        summary: '',
        vendor_name: null,
        suggested_action: 'store_only',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
