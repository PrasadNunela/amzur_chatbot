import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ChatMessage } from './ChatMessage'
import type { Message } from '../../types/chat'

afterEach(() => {
  cleanup()
})

function buildMessage(content: string): Message {
  return {
    id: 'msg-1',
    role: 'assistant',
    content,
    created_at: '2026-05-16T12:00:00Z',
    attachments: [],
  }
}

describe('ChatMessage markdown table rendering', () => {
  it('renders a standard markdown table as an actual HTML table', () => {
    const content = [
      'Top spenders:',
      '',
      '| Customer_ID | Total_Amount |',
      '| --- | ---: |',
      '| CUST-1 | 100.00 |',
      '| CUST-2 | 90.00 |',
      '',
      'Done.',
    ].join('\n')

    render(<ChatMessage message={buildMessage(content)} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Customer_ID')).toBeInTheDocument()
    expect(screen.getByText('CUST-1')).toBeInTheDocument()
    expect(screen.getByText('100.00')).toBeInTheDocument()
  })

  it('unwraps fenced markdown table text and still renders a table', () => {
    const content = [
      'Here is the data:',
      '',
      '```markdown',
      '| Customer_ID | Total_Amount |',
      '| --- | ---: |',
      '| CUST-10 | 1529.72 |',
      '| CUST-11 | 1406.63 |',
      '```',
    ].join('\n')

    render(<ChatMessage message={buildMessage(content)} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('CUST-10')).toBeInTheDocument()
    expect(screen.getByText('1529.72')).toBeInTheDocument()
  })
})
