import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Section,
} from '@react-email/components'

interface Order {
  order_number: string
  customer_name: string
  customer_email?: string
  items?: Array<{ name: string; qty: number }>
  delivery_address?: {
    city: string
    province: string
  }
  estimated_delivery?: string
  courier?: string
}

export default function OrderShippedEmail({
  order,
  trackingNumber,
}: {
  order: Order | Record<string, unknown>
  trackingNumber: string
}) {
  const storeUrl =
    process.env.NEXT_PUBLIC_STORE_URL || 'https://dropempiresa.co.za'

  const typedOrder = order as Order

  return (
    <Html>
      <Head />
      <Body
        style={{
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f4f4f4',
          margin: 0,
          padding: '20px 0',
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: '#0F172A',
              padding: '32px 40px',
            }}
          >
            <Heading
              style={{
                color: '#F59E0B',
                fontSize: '28px',
                margin: 0,
                fontWeight: 'bold',
              }}
            >
              DropEmpire SA
            </Heading>
            <Text
              style={{
                color: '#94A3B8',
                fontSize: '14px',
                margin: '4px 0 0 0',
              }}
            >
              Your order is on its way!
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '40px' }}>
            <Heading
              style={{
                color: '#0F172A',
                fontSize: '24px',
                margin: '0 0 8px 0',
              }}
            >
              Your Order Has Shipped! 🚚
            </Heading>
            <Text
              style={{
                color: '#64748B',
                fontSize: '16px',
                margin: '0 0 24px 0',
              }}
            >
              Hi {typedOrder.customer_name || 'there'}, great news! Your order{' '}
              <strong>{typedOrder.order_number}</strong> is on its way to you.
            </Text>

            {/* Tracking Info */}
            <Section
              style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #6EE7B7',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <Text
                style={{
                  color: '#065F46',
                  fontWeight: 'bold',
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Tracking Information
              </Text>
              <Text
                style={{
                  color: '#0F172A',
                  fontWeight: 'bold',
                  fontSize: '20px',
                  margin: '0 0 8px 0',
                  fontFamily: 'monospace',
                }}
              >
                {trackingNumber}
              </Text>
              {typedOrder.courier && (
                <Text style={{ color: '#374151', margin: '0 0 4px 0' }}>
                  Courier:{' '}
                  <span style={{ fontWeight: 'bold' }}>
                    {typedOrder.courier}
                  </span>
                </Text>
              )}
              {typedOrder.estimated_delivery && (
                <Text style={{ color: '#374151', margin: 0 }}>
                  Estimated delivery:{' '}
                  <span style={{ fontWeight: 'bold' }}>
                    {typedOrder.estimated_delivery}
                  </span>
                </Text>
              )}
            </Section>

            {typedOrder.delivery_address && (
              <Section
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <Text
                  style={{
                    margin: '0 0 4px 0',
                    fontWeight: 'bold',
                    color: '#0F172A',
                  }}
                >
                  Delivering to:
                </Text>
                <Text style={{ margin: 0, color: '#64748B' }}>
                  {typedOrder.delivery_address.city},{' '}
                  {typedOrder.delivery_address.province}
                </Text>
              </Section>
            )}

            <Hr style={{ borderColor: '#E2E8F0', margin: '0 0 24px 0' }} />

            <Text style={{ color: '#64748B', fontSize: '14px' }}>
              You can track your order using the tracking number above or by
              visiting our tracking page below.
            </Text>

            <Button
              href={`${storeUrl}/track/${typedOrder.order_number}`}
              style={{
                backgroundColor: '#F59E0B',
                color: '#0F172A',
                padding: '14px 28px',
                borderRadius: '8px',
                fontWeight: 'bold',
                textDecoration: 'none',
                fontSize: '16px',
              }}
            >
              Track My Order
            </Button>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: '#F8FAFC',
              padding: '24px 40px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <Text
              style={{
                color: '#94A3B8',
                fontSize: '12px',
                margin: '0 0 4px 0',
              }}
            >
              DropEmpire SA · Questions? Reply to this email.
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>
              © {new Date().getFullYear()} DropEmpire SA. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
