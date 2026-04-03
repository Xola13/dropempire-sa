import axios from 'axios'

const BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1'
let cjToken: string | null = null
let tokenExpiry: number = 0

async function getToken(): Promise<string> {
  if (cjToken && Date.now() < tokenExpiry) return cjToken

  const res = await axios.post(
    `${BASE_URL}/authentication/getAccessToken`,
    {
      email: process.env.CJ_DROPSHIPPING_EMAIL,
      password: process.env.CJ_DROPSHIPPING_PASSWORD,
    }
  )
  cjToken = res.data.data.accessToken
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000
  return cjToken!
}

async function callCJ(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  data?: unknown
) {
  const token = await getToken()
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'CJ-Access-Token': token,
      'Content-Type': 'application/json',
    },
    ...(method === 'GET' ? { params: data } : { data }),
  }
  const res = await axios(config)
  return res.data
}

export async function searchProducts(keyword: string, category?: string) {
  return callCJ('/product/list', 'GET', {
    productNameEn: keyword,
    categoryId: category,
    pageNum: 1,
    pageSize: 20,
  })
}

export async function getProductDetails(pid: string) {
  return callCJ(`/product/query?pid=${pid}`)
}

export async function getVariants(pid: string) {
  return callCJ(`/product/variants?pid=${pid}`)
}

export async function getShippingMethods(pid: string) {
  return callCJ('/logistic/freightCalculate', 'POST', {
    pid,
    quantity: 1,
    countryCode: 'ZA',
  })
}

export async function createOrder(params: {
  orderNumber: string
  shippingAddress: {
    name: string
    phone: string
    email: string
    address: string
    city: string
    province: string
    postalCode: string
  }
  products: Array<{
    vid: string
    quantity: number
    shippingName: string
  }>
}) {
  return callCJ('/shopping/order/createOrder', 'POST', {
    orderNumber: params.orderNumber,
    shippingZip: params.shippingAddress.postalCode,
    shippingCountryCode: 'ZA',
    shippingCountry: 'South Africa',
    shippingProvince: params.shippingAddress.province,
    shippingCity: params.shippingAddress.city,
    shippingAddress: params.shippingAddress.address,
    shippingCustomerName: params.shippingAddress.name,
    shippingPhone: params.shippingAddress.phone,
    email: params.shippingAddress.email,
    products: params.products.map(p => ({
      vid: p.vid,
      quantity: p.quantity,
      shippingName: p.shippingName,
    })),
  })
}

export async function getOrderDetail(orderId: string) {
  return callCJ(`/shopping/order/getOrderDetail?orderId=${orderId}`)
}

export async function getOrderTracking(orderId: string) {
  return callCJ(`/shopping/order/getOrderTracking?orderId=${orderId}`)
}
