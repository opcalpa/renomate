import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore - pdf-parse types
import pdf from 'npm:pdf-parse@1.1.1';
// @ts-ignore - mammoth types
import mammoth from 'npm:mammoth@1.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedRoom {
  name: string;
  estimatedAreaSqm: number | null;
  description: string | null;
  confidence: number;
  sourceText: string;
}

interface ExtractedTask {
  title: string;
  description: string | null;
  category: string;
  roomName: string | null;
  confidence: number;
  sourceText: string;
}

interface ExtractionResult {
  rooms: ExtractedRoom[];
  tasks: ExtractedTask[];
  documentSummary: string;
}

const SYSTEM_PROMPT = `Du är en expert på att analysera svenska renoveringsdokument och uppdragsbeskrivningar.

Analysera dokumentet och extrahera:

1. RUM - Alla rum som nämns i dokumentet
   - name: Rumsnamn (t.ex. "Kök", "Vardagsrum", "Master bedroom")
   - estimatedAreaSqm: Uppskattad storlek i m² om det nämns, annars null
   - description: Kort beskrivning av rummet baserat på dokumentet
   - confidence: Din konfidens i extraheringen (0.0-1.0)
   - sourceText: Exakt text från dokumentet som nämnde rummet

2. UPPGIFTER/ARBETEN - Alla arbeten eller åtgärder som ska utföras
   - title: Kort titel för uppgiften (t.ex. "Riva vägg mellan kök och vardagsrum")
   - description: Detaljerad beskrivning
   - category: En av följande kategorier:
     * rivning - Rivningsarbeten
     * el - Elarbeten
     * vvs - VVS/rörarbeten
     * malning - Målningsarbeten
     * golv - Golvarbeten
     * kok - Köksarbeten
     * badrum - Badrumsarbeten
     * snickeri - Snickeriarbeten
     * kakel - Kakel/plattsättning
     * ovrigt - Övrigt
   - roomName: Vilket rum uppgiften gäller (null om generellt)
   - confidence: Din konfidens i extraheringen (0.0-1.0)
   - sourceText: Exakt text från dokumentet

3. SAMMANFATTNING - En kort sammanfattning av dokumentet (2-3 meningar)

VIKTIGT:
- Extrahera ALLA rum och uppgifter du hittar, även om de bara nämns kort
- Använd svenska namn och beskrivningar
- Var specifik med uppgifter - "måla väggar" ska specificeras till vilket rum
- Om samma rum nämns flera gånger, slå ihop informationen
- Confidence ska vara:
  * 0.9-1.0: Tydligt specificerat i dokumentet
  * 0.7-0.9: Rimlig tolkning baserat på kontext
  * 0.5-0.7: Osäker men trolig
  * <0.5: Gissning

Svara ENDAST med giltig JSON i detta format:
{
  "rooms": [...],
  "tasks": [...],
  "documentSummary": "..."
}`;

async function extractTextFromPdf(fileUrl: string): Promise<string> {
  console.log('Fetching PDF from:', fileUrl);
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  console.log('Parsing PDF, size:', buffer.length);

  try {
    const data = await pdf(buffer);
    console.log('PDF parsed, text length:', data.text?.length || 0);
    return data.text || '';
  } catch (pdfError) {
    console.error('PDF parse error:', pdfError);
    throw new Error('Kunde inte läsa PDF-filen. Försök med en annan fil.');
  }
}

async function extractTextFromDocx(fileUrl: string): Promise<string> {
  console.log('Fetching DOCX from:', fileUrl);
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch DOCX: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  console.log('Parsing DOCX, size:', arrayBuffer.byteLength);

  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    console.log('DOCX parsed, text length:', result.value?.length || 0);
    return result.value || '';
  } catch (docxError) {
    console.error('DOCX parse error:', docxError);
    throw new Error('Kunde inte läsa Word-filen. Försök med PDF eller TXT istället.');
  }
}

async function fetchDocumentContent(fileUrl: string, fileType: string, fileName: string): Promise<string> {
  console.log('Fetching document:', fileName, 'type:', fileType);

  // Check file extension
  const extension = fileName.toLowerCase().split('.').pop();

  // Handle PDF files
  if (fileType.includes('pdf') || extension === 'pdf') {
    return await extractTextFromPdf(fileUrl);
  }

  // Handle DOCX files (modern Word format)
  if (fileType.includes('openxmlformats') || extension === 'docx') {
    return await extractTextFromDocx(fileUrl);
  }

  // Handle old .doc files - not supported
  if (fileType.includes('msword') || extension === 'doc') {
    throw new Error('Gamla Word-dokument (.doc) stöds inte. Spara som .docx eller PDF först.');
  }

  // Handle text files
  if (fileType.includes('text') || fileType.includes('plain') || extension === 'txt') {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status}`);
    }
    return await response.text();
  }

  // Default: try to get as text
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.status}`);
  }
  return await response.text();
}

async function extractWithOpenAI(documentContent: string): Promise<ExtractionResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!documentContent || documentContent.trim().length === 0) {
    throw new Error('Dokumentet verkar vara tomt eller kunde inte läsas.');
  }

  console.log('Sending to OpenAI, content length:', documentContent.length);

  // Always use text-based approach (no vision needed)
  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Analysera följande dokument:\n\n${documentContent.substring(0, 30000)}`, // Limit to ~30k chars
    },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract content from response
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  console.log('OpenAI response received, length:', content.length);

  // Parse JSON from response
  let jsonText = content;

  // Try to extract JSON from markdown code blocks if present
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  try {
    const result = JSON.parse(jsonText);
    return {
      rooms: result.rooms || [],
      tasks: result.tasks || [],
      documentSummary: result.documentSummary || '',
    };
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', jsonText.substring(0, 500));
    throw new Error('Kunde inte tolka AI-svaret. Försök igen.');
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileType, fileName } = await req.json();

    console.log('Processing request:', { fileName, fileType, fileUrl: fileUrl?.substring(0, 50) });

    if (!fileUrl) {
      throw new Error('fileUrl is required');
    }

    // Fetch and extract document content
    const documentContent = await fetchDocumentContent(fileUrl, fileType || '', fileName || '');

    // Extract with OpenAI
    const result = await extractWithOpenAI(documentContent);

    console.log('Success! Rooms:', result.rooms.length, 'Tasks:', result.tasks.length);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        rooms: [],
        tasks: [],
        documentSummary: '',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
