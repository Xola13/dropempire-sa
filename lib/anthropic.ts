import Anthropic from '@anthropic-ai/sdk'

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export async function runAgent(
  systemPrompt: string,
  userMessage: string,
  tools?: Tool[]
): Promise<string> {
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  }

  if (tools && tools.length > 0) {
    params.tools = tools
  }

  const response = await claude.messages.create(params)

  const textContent = response.content.find(c => c.type === 'text')
  if (textContent && textContent.type === 'text') {
    return textContent.text
  }

  return ''
}

export async function runAgentWithStreaming(
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void
): Promise<string> {
  let fullText = ''

  const stream = await claude.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      onChunk(chunk.delta.text)
      fullText += chunk.delta.text
    }
  }

  return fullText
}
