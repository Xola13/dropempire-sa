import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generatePaymentForm } from '@/lib/payfast'
import { generateOrderNumber } from '@/lib/utils'
import { z } from 'zod'

const CheckoutSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(9),
  deliveryAddress: z.object({
    address: z.string().min(5),
    city: z.string().min(2),
    province: z.string().min(2),
    postalCode: z.string().min(4),
  }),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      qty: z.number().int().positive(),
    })
  ),
  paymentMethod: z.enum(['payfast', 'yoco']),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CheckoutSchema.parse(body)

    const productIds = data.items.map(i => i.productId)
    const { data: products, error: prodError } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('is_published', true)

    if (prodError || !products?.length) {
      return NextResponse.json(
        { error: 'Products not found' },
        { status: 400 }
      )
    }

    const orderItems = data.items.map(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product) throw new Error(`Product not found: ${item.productId}`)
      return {
        product_id: product.id,
        name: product.name,
        qty: item.qty,
        unit_price: product.selling_price,
        supplier_cost: product.cost_price,
        supplier: product.supplier,
        supplier_product_id: product.supplier_product_id,
        images: product.images,
      }
    })

    const subtotal = orderItems.reduce(
      (sum, i) => sum + i.unit_price * i.qty,
      0
    )
    const shippingCost = subtotal > 1000 ? 0 : 99
    const total = subtotal + shippingCost
    const totalCost = orderItems.reduce(
      (sum, i) => sum + i.supplier_cost * i.qty,
      0
    )
    const totalProfit = total - totalCost - shippingCost

    let customerId: string
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', data.customerEmail)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newCustomer, error: custError } = await supabaseAdmin
        .from('customers')
        .insert({
          email: data.customerEmail,
          name: data.customerName,
          phone: data.customerPhone,
        })
        .select('id')
        .single()
      if (custError || !newCustomer) {
        return NextResponse.json(
          { error: 'Failed to create customer' },
          { status: 500 }
        )
      }
      customerId = newCustomer.id
    }

    const orderNumber = generateOrderNumber()
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        customer_email: data.customerEmail,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        delivery_address: data.deliveryAddress,
        items: orderItems,
        subtotal,
        shipping_cost: shippingCost,
        total,
        total_cost: totalCost,
        total_profit: totalProfit,
        payment_method: data.paymentMethod,
        payment_status: 'pending',
        fulfillment_status: 'unfulfilled',
        status: 'pending',
      })
      .select('id, order_number')
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    const storeUrl =
      process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000'

    if (data.paymentMethod === 'payfast') {
      const { action, params } = generatePaymentForm({
        id: order.id,
        orderNumber: order.order_number,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        total,
        returnUrl: `${storeUrl}/order-confirmation?order_id=${order.id}`,
        cancelUrl: `${storeUrl}/checkout?cancelled=1`,
        notifyUrl: `${storeUrl}/api/webhooks/payfast`,
      })
      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.order_number,
        payfast: { action, params },
      })
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
    })
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 })
    }
    const message = e instanceof Error ? e.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
