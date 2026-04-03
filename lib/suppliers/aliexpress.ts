import axios from 'axios'
import md5 from 'md5'

const BASE_URL = 'https://api-sg.aliexpress.com/sync'

function generateSign(
  params: Record<string, string>,
  secret: string
): string {
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('')
  return md5(secret + sorted + secret).toUpperCase()
}

async function callApi(
  method: string,
  params: Record<string, unknown>
) {
  const commonParams: Record<string, string> = {
    method,
    app_key: process.env.ALIEXPRESS_APP_KEY!,
    timestamp: new Date()
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19),
    format: 'json',
    v: '2.0',
    sign_method: 'md5',
  }

  const allParams = {
    ...commonParams,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  }
  allParams.sign = generateSign(
    allParams,
    process.env.ALIEXPRESS_APP_SECRET!
  )

  const formData = new URLSearchParams(allParams)
  const response = await axios.post(BASE_URL, formData)
  return response.data
}

export async function searchProducts(
  keyword: string,
  category?: string,
  minPrice?: number,
  maxPrice?: number
) {
  return callApi('aliexpress.ds.product.search', {
    keywords: keyword,
    target_currency: 'USD',
    target_language: 'EN',
    sort: 'SALE_PRICE_ASC',
    ship_to_country: 'ZA',
    ...(category && { category_ids: category }),
    ...(minPrice && { min_sale_price: minPrice }),
    ...(maxPrice && { max_sale_price: maxPrice }),
    page_size: 20,
    page_no: 1,
  })
}

export async function getProductDetails(productId: string) {
  return callApi('aliexpress.ds.product.get', {
    product_id: productId,
    target_currency: 'ZAR',
    target_language: 'EN',
    ship_to_country: 'ZA',
  })
}

export async function getShippingOptions(productId: string) {
  return callApi('aliexpress.ds.freight.query', {
    product_id: productId,
    product_num: 1,
    source_country: 'CN',
    destination_country: 'ZA',
    target_currency: 'ZAR',
  })
}

export async function placeOrder(params: {
  productId: string
  skuId: string
  quantity: number
  shippingAddress: {
    name: string
    phone: string
    address: string
    city: string
    province: string
    postalCode: string
    country: string
  }
  logisticsService: string
}) {
  return callApi('aliexpress.ds.order.create', {
    product_items: JSON.stringify([
      {
        product_id: params.productId,
        sku_id: params.skuId,
        product_count: params.quantity,
        logistics_service_name: params.logisticsService,
      },
    ]),
    delivery_address: JSON.stringify({
      contact_person: params.shippingAddress.name,
      mobile_no: params.shippingAddress.phone,
      address: params.shippingAddress.address,
      city: params.shippingAddress.city,
      province: params.shippingAddress.province,
      zip: params.shippingAddress.postalCode,
      country: 'ZA',
    }),
  })
}

export async function getOrderStatus(orderId: string) {
  return callApi('aliexpress.ds.order.query', { order_id: orderId })
}

export async function getTracking(orderId: string) {
  return callApi('aliexpress.ds.logistics.tracking.query', {
    order_id: orderId,
  })
}
