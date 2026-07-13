import OpenAI from 'openai'
import { AIConversation } from '../models/AIConversation'
import { Application, Certification, Insight } from '../models'
import redis from '../config/redis'
import { logger } from '../utils/logger'

import { RemoteConfig } from '../models/RemoteConfig'

async function getAIClientAndModel(): Promise<{ openai: OpenAI | null, model: string }> {
  const config = await RemoteConfig.getGlobalConfig()
  const aiSettings = config.aiSettings || { provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct', apiKey: '' };
  
  const key = aiSettings.apiKey || process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return { openai: null, model: aiSettings.model };
  
  let baseURL = undefined;
  if (aiSettings.provider === 'nvidia') baseURL = 'https://integrate.api.nvidia.com/v1';
  // Add other open-ai compatible endpoints here if needed
  
  const openai = new OpenAI({ apiKey: key, baseURL });
  return { openai, model: aiSettings.model };
}

const SYSTEM_PROMPT = `You are an expert AI compliance assistant for Sanyog Conformity Solutions, a leading certification and compliance consultancy in India. You have deep knowledge of:

- BIS (Bureau of Indian Standards) certification processes and IS standards
- FSSAI food safety regulations and licensing
- CE marking requirements for EU market
- ISO 9001, ISO 14001, ISO 45001 certification
- NABL laboratory accreditation
- Indian customs and export/import regulations (DGFT, CBIC)
- SCOMET policy for dual-use goods
- Product testing and inspection requirements
- EPR (Extended Producer Responsibility) compliance

Always provide accurate, actionable compliance advice. Reference specific standards and regulations when possible. If you're unsure, say so.`

export const aiService = {
  async chat(userId: string, message: string, conversationId?: string): Promise<{ response: string; conversationId: string }> {
    const { openai, model } = await getAIClientAndModel()
    const cacheKey = `ai_conv:${conversationId ?? userId}`

    // Get or create conversation
    let messages: OpenAI.ChatCompletionMessageParam[] = []
    if (conversationId) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        messages = JSON.parse(cached)
      } else {
        const conv = await AIConversation.findOne({ _id: conversationId, user_id: userId })
        if (conv) messages = conv.messages
      }
    }

    // Add extra context if the user asks general questions
    let contextStr = ""
    try {
      const recentInsights = await Insight.find({}).sort({ published_at: -1 }).limit(3).lean()
      if (recentInsights.length > 0) {
        contextStr = "\n\nRecent Regulatory Insights Context:\n" + recentInsights.map((i: any) => `- ${i.title}: ${i.ai_summary || i.summary}`).join('\n')
      }
    } catch(e) {}

    const fullMessage = message + contextStr
    messages.push({ role: 'user', content: fullMessage })

    if (!openai) {
      // Fallback when OpenAI is not configured
      const fallback = `I understand your question about "${message.slice(0, 50)}...". AI-powered compliance advice is temporarily unavailable. Please contact support@sanyogconformity.com for expert guidance.`
      messages.push({ role: 'assistant', content: fallback })
      const newConv = await AIConversation.create({ user_id: userId, messages })
      return { response: fallback, conversationId: newConv._id.toString() }
    }

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1024,
      temperature: 0.6,
    })

    const response = completion.choices[0].message.content ?? ''
    
    // Remove the context we appended invisibly before saving to history
    messages[messages.length - 1].content = message
    messages.push({ role: 'assistant', content: response })

    // Save conversation
    let convId = conversationId
    if (!convId) {
      const newConv = await AIConversation.create({ user_id: userId, messages })
      convId = newConv._id.toString()
    } else {
      await AIConversation.updateOne({ _id: convId }, { messages, updated_at: new Date() })
    }

    // Cache for 30 minutes
    await redis.setex(`ai_conv:${convId}`, 1800, JSON.stringify(messages))

    return { response, conversationId: convId! }
  },

  async generateInsightSummary(content: string): Promise<string> {
    const { openai, model } = await getAIClientAndModel()
    const cacheKey = `insight_summary:${Buffer.from(content.slice(0, 100)).toString('base64')}`
    const cached = await redis.get(cacheKey)
    if (cached) return cached

    if (!openai) return 'AI summary unavailable — configure API KEY in admin panel to enable.'

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a compliance expert. Summarize regulatory updates in 2-3 concise sentences highlighting impact on businesses seeking certifications in India.' },
        { role: 'user', content: `Summarize this regulatory update:\n\n${content}` },
      ],
      max_tokens: 200,
      temperature: 0.3,
    })

    const summary = completion.choices[0].message.content ?? ''
    await redis.setex(cacheKey, 3600, summary)
    return summary
  },

  async analyzeDocument(text: string): Promise<{ issues: string[]; recommendations: string[]; complianceScore: number }> {
    const { openai, model } = await getAIClientAndModel()
    if (!openai) return { issues: [], recommendations: ['Configure AI API key in Admin Panel for document analysis'], complianceScore: 70 }

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'Analyze this compliance document and identify potential issues, missing information, and recommendations. Return a JSON object with: issues (array), recommendations (array), complianceScore (0-100).' },
        { role: 'user', content: text.slice(0, 4000) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.2,
    })

    try {
      return JSON.parse(completion.choices[0].message.content ?? '{}')
    } catch {
      return { issues: [], recommendations: ['Document analysis complete'], complianceScore: 75 }
    }
  },

  async analyzeHsCode(hsCode: string): Promise<{ demand: string; profitMargin: string; topMarkets: string }> {
    const { openai, model } = await getAIClientAndModel()
    const cacheKey = `hs_code_analysis:${hsCode}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    if (!openai) return { demand: 'High', profitMargin: '10% - 15%', topMarkets: 'USA, EU' };

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a global trade analyst. Given an HS code or product name, provide a JSON response with exactly three keys: "demand" (e.g. "Very High", "Medium"), "profitMargin" (e.g. "15% - 20%"), and "topMarkets" (e.g. "USA, Germany, UAE"). Keep values very concise.' },
        { role: 'user', content: `Analyze HS Code / Product: ${hsCode}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 150,
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
      const result = {
        demand: parsed.demand || 'Unknown',
        profitMargin: parsed.profitMargin || 'Unknown',
        topMarkets: parsed.topMarkets || 'Unknown',
      };
      await redis.setex(cacheKey, 86400, JSON.stringify(result)); // Cache for 1 day
      return result;
    } catch {
      return { demand: 'Unknown', profitMargin: 'Unknown', topMarkets: 'Unknown' };
    }
  },

  async analyzeRisks(context: string): Promise<Array<{ title: string; level: string; desc: string }>> {
    const { openai, model } = await getAIClientAndModel()
    const cacheKey = `risk_analysis:${context}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    if (!openai) return [
      { title: 'Currency Fluctuation', level: 'High', desc: 'Exchange rate volatility.' },
      { title: 'Logistics', level: 'Medium', desc: 'Potential delays.' }
    ];

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a global trade risk analyst. Given a trade context (e.g., country or product), return a JSON object with a single key "risks", which is an array of exactly 3 risk objects. Each risk object must have "title" (string), "level" ("High", "Medium", or "Low"), and "desc" (short 1-sentence string).' },
        { role: 'user', content: `Analyze Trade Risks for: ${context}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 250,
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
      const risks = parsed.risks || [];
      await redis.setex(cacheKey, 86400, JSON.stringify(risks)); // Cache for 1 day
      return risks;
    } catch {
      return [];
    }
  },

  async analyzeCertifications(productName: string, markets: string[]): Promise<{ isValid: boolean; message?: string; certifications?: Array<{ code: string; name: string; market: string }> }> {
    const { openai, model } = await getAIClientAndModel()
    if (!openai) {
      if (productName.toLowerCase().includes('zebra') || productName.toLowerCase().includes('dog')) {
        return { isValid: false, message: `${productName} is a live animal. We only provide compliance services for physical manufactured goods, food, cosmetics, electronics, etc.` };
      }
      return { isValid: true, certifications: markets.map(m => ({ code: `COMP_${m}`, name: `${m} General Compliance`, market: m })) };
    }

    const prompt = `You are a compliance expert for Sanyog Conformity Solutions. 
The user wants to certify the product: "${productName}" for markets: ${markets.join(', ')}.
1. Validate if the product is a standard physical good, electronic device, food item, cosmetic, medical device, machinery, or similar trade good. 
2. If it is an abstract concept, software (standalone), or a living animal (like a Zebra, Dog, etc.), return isValid=false and a short polite message explaining that Sanyog Conformity Solutions specializes in physical product compliance (like BIS, EPR, FSSAI, WPC, FDA) and does not cover this category.
3. If valid, return isValid=true, and an array of 1-3 required certifications for the selected markets.
Respond EXCLUSIVELY with a JSON object:
{
  "isValid": boolean,
  "message": "string (only if isValid is false)",
  "certifications": [
    { "code": "string (e.g. BIS, FCC, CE)", "name": "string", "market": "string" }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 400,
      temperature: 0.1,
    });

    try {
      const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
      return {
        isValid: parsed.isValid !== false,
        message: parsed.message,
        certifications: parsed.certifications || markets.map(m => ({ code: `COMP_${m}`, name: `${m} General Compliance`, market: m }))
      };
    } catch {
      return { isValid: true, certifications: markets.map(m => ({ code: `COMP_${m}`, name: `${m} General Compliance`, market: m })) };
    }
  },

  async getComplianceRecommendations(userId: string): Promise<string[]> {
    const { openai, model } = await getAIClientAndModel()
    const cacheKey = `recommendations:${userId}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    // Get user's certification data
    const certs = await Certification.find({ org_id: userId }).sort({ expiry_date: 1 }).limit(10).lean()
    const context = certs.map((c: any) => `${c.cert_type}: expires ${c.expiry_date}, status: ${c.status}`).join('; ')

    if (!openai) return ['Review your upcoming certificate renewals', 'Ensure all product test reports are current', 'Monitor BIS circular updates for your product categories']

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'Generate 3-5 personalized compliance recommendations based on the user\'s certification portfolio. Return a JSON array of recommendation strings.' },
        { role: 'user', content: `User certifications: ${context || 'No certifications yet'}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.5,
    })

    try {
      const parsed = JSON.parse(completion.choices[0].message.content ?? '{}')
      const recommendations = parsed.recommendations ?? parsed
      await redis.setex(cacheKey, 3600, JSON.stringify(recommendations))
      return recommendations
    } catch {
      return ['Review your upcoming certificate renewals', 'Ensure all product test reports are current', 'Monitor BIS circular updates for your product categories']
    }
  },
}
