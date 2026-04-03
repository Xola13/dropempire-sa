import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Row,
  Column,
  Section,
} from '@react-email/components'

interface DailyReportProps {
  date: string
  revenue: number
  profit: number
  orders: number
  yesterdayRevenue: number
  failedFulfillments: number
}

export default function DailyReportEmail({
  date,
  revenue,
  profit,
  orders,
  yesterdayRevenue,
  failedFulfillments,
}: DailyReportProps) {
  const revenueChange = yesterdayRevenue
    ? ((revenue - yesterdayRevenue) / yesterdayRevenue) * 100
    : 0
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

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
                fontSize: '24px',
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
              Daily Performance Report — {date}
            </Text>
          </Section>

          <Section style={{ padding: '40px' }}>
            <Heading
              style={{
                color: '#0F172A',
                fontSize: '20px',
                margin: '0 0 24px 0',
              }}
            >
              Today&apos;s Summary
            </Heading>

            {/* Stats Grid */}
            <Row style={{ marginBottom: '24px' }}>
              <Column
                style={{
                  width: '50%',
                  paddingRight: '8px',
                }}
              >
                <Section
                  style={{
                    backgroundColor: '#F0FDF4',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  <Text
                    style={{
                      color: '#6B7280',
                      fontSize: '12px',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                    }}
                  >
                    Revenue
                  </Text>
                  <Text
                    style={{
                      color: '#065F46',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      margin: '0 0 4px 0',
                    }}
                  >
                    R{revenue.toFixed(2)}
                  </Text>
                  {revenueChange !== 0 && (
                    <Text
                      style={{
                        color: revenueChange >= 0 ? '#059669' : '#DC2626',
                        fontSize: '12px',
                        margin: 0,
                      }}
                    >
                      {revenueChange >= 0 ? '↑' : '↓'}{' '}
                      {Math.abs(revenueChange).toFixed(1)}% vs yesterday
                    </Text>
                  )}
                </Section>
              </Column>
              <Column
                style={{
                  width: '50%',
                  paddingLeft: '8px',
                }}
              >
                <Section
                  style={{
                    backgroundColor: '#FFFBEB',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #FDE68A',
                  }}
                >
                  <Text
                    style={{
                      color: '#6B7280',
                      fontSize: '12px',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                    }}
                  >
                    Profit
                  </Text>
                  <Text
                    style={{
                      color: '#92400E',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      margin: '0 0 4px 0',
                    }}
                  >
                    R{profit.toFixed(2)}
                  </Text>
                  <Text
                    style={{
                      color: '#B45309',
                      fontSize: '12px',
                      margin: 0,
                    }}
                  >
                    {profitMargin.toFixed(1)}% margin
                  </Text>
                </Section>
              </Column>
            </Row>

            <Hr style={{ borderColor: '#E2E8F0', margin: '0 0 24px 0' }} />

            {/* Orders and Alerts */}
            <Row style={{ marginBottom: '24px' }}>
              <Column style={{ width: '50%', paddingRight: '8px' }}>
                <Section
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  <Text
                    style={{
                      color: '#6B7280',
                      fontSize: '12px',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                    }}
                  >
                    Orders
                  </Text>
                  <Text
                    style={{
                      color: '#1E40AF',
                      fontSize: '32px',
                      fontWeight: 'bold',
                      margin: 0,
                    }}
                  >
                    {orders}
                  </Text>
                </Section>
              </Column>
              <Column style={{ width: '50%', paddingLeft: '8px' }}>
                <Section
                  style={{
                    backgroundColor:
                      failedFulfillments > 0 ? '#FEF2F2' : '#F0FDF4',
                    borderRadius: '8px',
                    padding: '16px',
                    border: `1px solid ${failedFulfillments > 0 ? '#FECACA' : '#BBF7D0'}`,
                  }}
                >
                  <Text
                    style={{
                      color: '#6B7280',
                      fontSize: '12px',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                    }}
                  >
                    Failed Fulfillments
                  </Text>
                  <Text
                    style={{
                      color:
                        failedFulfillments > 0 ? '#DC2626' : '#059669',
                      fontSize: '32px',
                      fontWeight: 'bold',
                      margin: 0,
                    }}
                  >
                    {failedFulfillments}
                  </Text>
                </Section>
              </Column>
            </Row>

            {failedFulfillments > 0 && (
              <Section
                style={{
                  backgroundColor: '#FEF2F2',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #FECACA',
                  marginBottom: '24px',
                }}
              >
                <Text
                  style={{
                    color: '#DC2626',
                    fontWeight: 'bold',
                    margin: '0 0 4px 0',
                  }}
                >
                  ⚠ Action Required
                </Text>
                <Text style={{ color: '#7F1D1D', margin: 0 }}>
                  {failedFulfillments} order(s) had fulfillment issues today.
                  Please review the agent logs in your admin dashboard.
                </Text>
              </Section>
            )}

            <Hr style={{ borderColor: '#E2E8F0', margin: '0 0 24px 0' }} />

            <Text style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
              View full analytics in your{' '}
              <a
                href={
                  process.env.NEXT_PUBLIC_STORE_URL +
                    '/admin/analytics' || '/admin/analytics'
                }
                style={{ color: '#F59E0B' }}
              >
                admin dashboard
              </a>
              .
            </Text>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: '#F8FAFC',
              padding: '24px 40px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <Text style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>
              © {new Date().getFullYear()} DropEmpire SA · Automated daily
              report
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
