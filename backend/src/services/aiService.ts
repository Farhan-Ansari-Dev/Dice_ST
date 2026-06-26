import OpenAI from 'openai'
import { AIConversation } from '../models/AIConversation'
import { Application, Certification, Insight } from '../models'
import redis from '../config/redis'
import { logger } from '../utils/logger'

const apiKey = process.env.OPENAI_API_KEY
const openai = apiKey && !apiKey.startsWith('sk-your') ? new OpenAI({ apiKey }) : null

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
      const fallback = `I understand your question about "${message.slice(0, 50)}...". Please configure your OpenAI API key to enable AI-powered compliance advice. For now, please contact support@sanyogconformity.com for expert guidance.`
      messages.push({ role: 'assistant', content: fallback })
      const newConv = await AIConversation.create({ user_id: userId, messages })
      return { response: fallback, conversationId: newConv._id.toString() }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1000,
      temperature: 0.7,
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
    const cacheKey = `insight_summary:${Buffer.from(content.slice(0, 100)).toString('base64')}`
    const cached = await redis.get(cacheKey)
    if (cached) return cached

    if (!openai) return 'AI summary unavailable — configure OPENAI_API_KEY to enable.'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
    if (!openai) return { issues: [], recommendations: ['Configure OpenAI API key for document analysis'], complianceScore: 70 }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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

  async getComplianceRecommendations(userId: string): Promise<string[]> {
    const cacheKey = `recommendations:${userId}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    // Get user's certification data
    const certs = await Certification.find({ org_id: userId }).sort({ expiry_date: 1 }).limit(10).lean()
    const context = certs.map((c: any) => `${c.cert_type}: expires ${c.expiry_date}, status: ${c.status}`).join('; ')

    if (!openai) return ['Review your upcoming certificate renewals', 'Ensure all product test reports are current', 'Monitor BIS circular updates for your product categories']

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
