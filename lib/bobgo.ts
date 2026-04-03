const BOBGO_BASE = 'https://api.bobgo.co.za/v2'

export async function getShipmentTracking(trackingNumber: string) {
  const res = await fetch(`${BOBGO_BASE}/shipments/${trackingNumber}`, {
    headers: { Authorization: `Bearer ${process.env.BOBGO_API_KEY}` },
  })
  if (!res.ok) throw new Error('BobGo tracking failed')
  return res.json()
}

export async function createShipment(shipmentData: {
  reference: string
  toAddress: {
    name: string
    address: string
    city: string
    province: string
    postalCode: string
    phone: string
  }
  parcels: Array<{
    weight: number
    length: number
    width: number
    height: number
  }>
}) {
  const res = await fetch(`${BOBGO_BASE}/shipments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.BOBGO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(shipmentData),
  })
  if (!res.ok) throw new Error('BobGo shipment creation failed')
  return res.json()
}

export async function getShipmentRates(params: {
  fromPostalCode: string
  toPostalCode: string
  weight: number
  length: number
  width: number
  height: number
}) {
  const res = await fetch(`${BOBGO_BASE}/rates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.BOBGO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error('BobGo rates fetch failed')
  return res.json()
}
