import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Row,
  Column,
  Section,
} from '@react-email/components'

interface OrderItem {
  name: string
  qty: number
  unit_price: number
}

interface Order {
  order_number: string
  customer_name: string
  items: OrderItem[]
  total: number
  shipping_cost: number
  delivery_address: {
    address: string
    city: string
    province: string
    postalCode: string
  }
}

export default function OrderConfirmationEmail({
  order,
}: {
  order: Order
}) {
  const storeUrl =
    process.env.NEXT_PUBLIC_STORE_URL || 'https://dropempiresa.co.za'

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
              Your order has been confirmed
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
              Order Confirmed! ✓
            </Heading>
            <Text
              style={{
                color: '#64748B',
                fontSize: '16px',
                margin: '0 0 24px 0',
              }}
            >
              Hi {order.customer_name}, thank you for your order. We&apos;ve
              received your payment and will begin processing your items
              shortly.
            </Text>

            <Section
              style={{
                backgroundColor: '#FEF3C7',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <Text
                style={{
                  color: '#92400E',
                  fontWeight: 'bold',
                  margin: 0,
                  fontSize: '16px',
                }}
              >
                Order Reference: {order.order_number}
              </Text>
            </Section>

            <Hr style={{ borderColor: '#E2E8F0', margin: '0 0 24px 0' }} />

            {/* Items */}
            <Heading
              style={{
                color: '#0F172A',
                fontSize: '16px',
                margin: '0 0 16px 0',
              }}
            >
              Order Summary
            </Heading>

            {order.items.map((item, i) => (
              <Row key={i} style={{ marginBottom: '12px' }}>
                <Column>
                  <Text style={{ margin: 0, color: '#374151' }}>
                    {item.name}{' '}
                    <span style={{ color: '#6B7280' }}>× {item.qty}</span>
                  </Text>
                </Column>
                <Column style={{ textAlign: 'right' }}>
                  <Text
                    style={{ margin: 0, color: '#374151', fontWeight: 'bold' }}
                  >
                    R{(item.unit_price * item.qty).toFixed(2)}
                  </Text>
                </Column>
              </Row>
            ))}

            <Hr style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />

            <Row style={{ marginBottom: '8px' }}>
              <Column>
                <Text style={{ margin: 0, color: '#6B7280' }}>Shipping</Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text style={{ margin: 0, color: '#6B7280' }}>
                  {order.shipping_cost === 0
                    ? 'FREE'
                    : `R${order.shipping_cost.toFixed(2)}`}
                </Text>
              </Column>
            </Row>

            <Row>
              <Column>
                <Text
                  style={{
                    margin: 0,
                    fontWeight: 'bold',
                    color: '#0F172A',
                    fontSize: '18px',
                  }}
                >
                  Total Paid
                </Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text
                  style={{
                    margin: 0,
                    fontWeight: 'bold',
                    color: '#0F172A',
                    fontSize: '18px',
                  }}
                >
                  R{order.total.toFixed(2)}
                </Text>
              </Column>
            </Row>

            <Hr style={{ borderColor: '#E2E8F0', margin: '24px 0' }} />

            {/* Delivery Address */}
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
                Delivery Address:
              </Text>
              <Text style={{ margin: 0, color: '#64748B' }}>
                {order.delivery_address.address},{' '}
                {order.delivery_address.city},{' '}
                {order.delivery_address.province}{' '}
                {order.delivery_address.postalCode}
              </Text>
            </Section>

            <Button
              href={`${storeUrl}/order-confirmation?order_id=${order.order_number}`}
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
