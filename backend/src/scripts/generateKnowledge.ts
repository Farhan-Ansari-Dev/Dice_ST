import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dice';
const API_KEY = process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: API_KEY,
  baseURL: process.env.NVIDIA_API_KEY ? 'https://integrate.api.nvidia.com/v1' : undefined
});

const model = process.env.NVIDIA_API_KEY ? 'meta/llama-3.3-70b-instruct' : 'gpt-4o-mini';

const TOPICS = [
  'BIS (Bureau of Indian Standards) ISI Mark and CRS certification for electronics, toys, and machinery',
  'FSSAI (Food Safety and Standards Authority of India) licensing and labeling regulations',
  'EPR (Extended Producer Responsibility) for plastic, e-waste, and battery waste in India',
  'WPC (Wireless Planning & Coordination) ETA approval for Bluetooth and WiFi devices',
  'TEC (Telecommunication Engineering Centre) MTCTE certification for telecom equipment',
  'SASO (Saudi Standards, Metrology and Quality Organization) SABER platform for Saudi Arabia exports',
  'CE Marking for exporting machinery and electronics to the European Union (EU)',
  'SCOMET dual-use goods export licensing from DGFT India',
  'NABL accredited laboratory testing procedures and requirements',
  'ISO 9001, 14001, and 45001 certification processes and benefits',
];

async function generateQAForTopic(topic: string, count: number = 10) {
  console.log(`Generating ${count} Q&As for topic: ${topic}...`);
  
  const prompt = `You are an expert compliance consultant at Sanyog Conformity Solutions. 
Generate exactly ${count} realistic, practical, and highly accurate Questions and Answers regarding the following topic: 
"${topic}"

The Q&As should range from basic (e.g., "What is it?") to medium complexity (e.g., "What documents are required?", "How long does it take?", "What is the penalty for non-compliance?").
The answers should be detailed, professional, and actionable.

Respond EXCLUSIVELY with a JSON object in this format:
{
  "qas": [
    {
      "category": "string (e.g., BIS, FSSAI, EPR, CE, SASO)",
      "question": "string",
      "answer": "string",
      "keywords": ["string", "string"]
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.5
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{"qas":[]}');
    return parsed.qas || [];
  } catch (error) {
    console.error(`Failed to generate Q&A for ${topic}:`, error);
    return [];
  }
}

async function run() {
  if (!API_KEY) {
    console.error('No API key found. Cannot generate knowledge.');
    process.exit(1);
  }

  try {
    const ragFilePath = path.join(__dirname, '../data/rag-knowledge.json');
    let existingData = [];
    if (fs.existsSync(ragFilePath)) {
      existingData = JSON.parse(fs.readFileSync(ragFilePath, 'utf8'));
    }

    let totalInserted = 0;

    for (const topic of TOPICS) {
      const qas = await generateQAForTopic(topic, 10); // Generates 10 per topic
      
      if (qas.length > 0) {
        existingData.push(...qas);
        totalInserted += qas.length;
        console.log(`Generated ${qas.length} records. Total: ${totalInserted}`);
      }
      
      // Save progressively
      fs.writeFileSync(ragFilePath, JSON.stringify(existingData, null, 2));
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\\nSuccess! Generated and appended ${totalInserted} Q&A pairs into rag-knowledge.json`);

  } catch (error) {
    console.error('Error running script:', error);
  } finally {
    process.exit(0);
  }
}

run();
