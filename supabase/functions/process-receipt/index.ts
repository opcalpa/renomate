import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ReceiptAnalysisResult {
  vendor_name: string;
  total_amount: number;
  vat_amount: number | null;
  purchase_date: string | null;
  line_items: LineItem[];
  confidence: number;
}

function buildSystemPrompt(): string {
  return `You are an expert at analyzing receipts and extracting structured data.

Your task is to analyze the receipt image and extract key information.

IMPORTANT INSTRUCTIONS:
1. Extract the vendor/store name from the receipt header
2. Find the total amount (look for "TOTAL", "SUMMA", "ATT BETALA", etc.)
3. Find the VAT/moms amount if visible (look for "MOMS", "VAT", "25%", etc.)
4. Find the purchase date (look for date patterns like YYYY-MM-DD, DD/MM/YYYY, etc.)
5. Extract individual line items if clearly visible

For Swedish receipts:
- "SUMMA" or "ATT BETALA" = total amount
- "MOMS" = VAT
- "st" = pieces, "kg" = kilograms

RETURN FORMAT:
{
  "vendor_name": "Store name",
  "total_amount": 123.45,
  "vat_amount": 24.69,
  "purchase_date": "2026-02-10",
  "line_items": [
    {"description": "Item name", "quantity": 1, "unit_price": 99.00, "total": 99.00}
  ],
  "confidence": 0.85
}

RULES:
- total_amount MUST be a number (not a string)
- vat_amount can be null if not visible
- purchase_date should be in ISO format (YYYY-MM-DD) or null if not found
- line_items can be an empty array if items are unclear
- confidence is a number between 0 and 1 indicating how confident you are in the extraction

Return ONLY valid JSON, no explanations.`;
}

async function analyzeReceipt(base64Image: string): Promise<ReceiptAnalysisResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  console.log('Analyzing receipt with OpenAI Vision');

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
          role: 'system',
          content: buildSystemPrompt(),
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: 'Analyze this receipt. Extract the vendor name, total amount, VAT, date, and line items. Return structured JSON.',
            },
          ],
        },
      ],
      max_tokens: 4096,
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

  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  console.log('OpenAI raw response:', content.substring(0, 500));

  // Parse JSON from response
  let jsonText = content;

  // Try to extract JSON from markdown code blocks if present
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  // Also try to find JSON object directly
  const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    jsonText = jsonObjectMatch[0];
  }

  try {
    const result = JSON.parse(jsonText);

    // Validate and normalize the result
    const normalizedResult: ReceiptAnalysisResult = {
      vendor_name: result.vendor_name || '',
      total_amount: typeof result.total_amount === 'number' ? result.total_amount : parseFloat(result.total_amount) || 0,
      vat_amount: result.vat_amount != null ? (typeof result.vat_amount === 'number' ? result.vat_amount : parseFloat(result.vat_amount)) : null,
      purchase_date: result.purchase_date || null,
      line_items: Array.isArray(result.line_items) ? result.line_items.map((item: Partial<LineItem>) => ({
        description: item.description || '',
        quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 1,
        unit_price: typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price)) || 0,
        total: typeof item.total === 'number' ? item.total : parseFloat(String(item.total)) || 0,
      })) : [],
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    };

    console.log('Parsed receipt result:', JSON.stringify(normalizedResult, null, 2));

    return normalizedResult;
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', jsonText.substring(0, 1000));
    console.error('Parse error:', parseError);

    // Return empty result instead of throwing
    return {
      vendor_name: '',
      total_amount: 0,
      vat_amount: null,
      purchase_date: null,
      line_items: [],
      confidence: 0,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      throw new Error('image is required');
    }

    console.log('Processing receipt, image length:', image.length, 'chars');

    const result = await analyzeReceipt(image);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing receipt:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        vendor_name: '',
        total_amount: 0,
        vat_amount: null,
        purchase_date: null,
        line_items: [],
        confidence: 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
