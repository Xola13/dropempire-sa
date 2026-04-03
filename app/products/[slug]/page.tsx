import { notFound } from 'next/navigation'
import Image from 'next/image'
import { supabaseAdmin } from '@/lib/supabase'
import type { Product } from '@/types'
import { formatZAR, getDeliveryLabel } from '@/lib/utils'
import ProductCard from '@/components/store/ProductCard'
import AddToCartButton from './AddToCartButton'
import { Truck, Shield, RotateCcw, Package, ChevronDown } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (error || !data) return null
  return data as Product
}

async function getRelatedProducts(
  category: string,
  excludeId: string
): Promise<Product[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('category', category)
    .eq('is_published', true)
    .neq('id', excludeId)
    .limit(4)
  return (data as Product[]) || []
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const related = await getRelatedProducts(product.category, product.id)

  const images =
    product.images?.length > 0
      ? product.images
      : [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop',
        ]

  const discount = product.compare_at_price
    ? Math.round(
        ((product.compare_at_price - product.selling_price) /
          product.compare_at_price) *
          100
      )
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <a href="/" className="hover:text-amber-600">
          Home
        </a>{' '}
        /{' '}
        <a
          href={`/products?category=${encodeURIComponent(product.category)}`}
          className="hover:text-amber-600"
        >
          {product.category}
        </a>{' '}
        / <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden">
            <Image
              src={images[0]}
              alt={product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {discount > 0 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                -{discount}% OFF
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden"
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <div className="mb-4">
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {product.category}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight">
            {product.name}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mt-4">
            <span className="text-3xl font-bold text-[#0F172A]">
              {formatZAR(product.selling_price)}
            </span>
            {product.compare_at_price && (
              <>
                <span className="text-xl text-gray-400 line-through">
                  {formatZAR(product.compare_at_price)}
                </span>
                <span className="text-sm font-bold text-red-500">
                  Save {formatZAR(product.compare_at_price - product.selling_price)}
                </span>
              </>
            )}
          </div>

          {/* Delivery Badge */}
          <div className="flex items-center gap-2 mt-4 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <Truck size={16} className="text-green-600 flex-shrink-0" />
            <div>
              <span className="text-sm font-semibold text-green-800">
                {getDeliveryLabel(product.supplier)}
              </span>
              <p className="text-xs text-green-600 mt-0.5">
                {product.stock_status === 'in_stock'
                  ? 'In stock — ready to ship'
                  : 'Currently unavailable'}
              </p>
            </div>
          </div>

          {/* Bullet Points */}
          {product.bullet_points && product.bullet_points.length > 0 && (
            <ul className="mt-6 space-y-2">
              {product.bullet_points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    ✓
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          )}

          {/* Add to Cart */}
          <div className="mt-8 space-y-3">
            <AddToCartButton product={product} image={images[0]} />
          </div>

          {/* Trust */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { icon: Shield, label: 'Secure payment' },
              { icon: RotateCcw, label: '30-day returns' },
              { icon: Package, label: 'Quality assured' },
            ].map(item => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl"
              >
                <item.icon size={16} className="text-gray-500" />
                <span className="text-xs text-gray-500 text-center">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Supplier badge */}
          <div className="mt-4 text-xs text-gray-400 text-center">
            Supplied by{' '}
            <span className="font-medium capitalize">{product.supplier}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-[#0F172A] mb-4">
            Product Description
          </h2>
          <div className="prose prose-sm text-gray-600 max-w-none">
            {product.description ? (
              product.description.split('\n').map((para, i) => (
                <p key={i} className="mb-3">
                  {para}
                </p>
              ))
            ) : (
              <p>No description available.</p>
            )}
          </div>
        </div>

        {/* FAQs */}
        {product.faqs && product.faqs.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-4">FAQs</h2>
            <div className="space-y-3">
              {product.faqs.map((faq, i) => (
                <details key={i} className="group bg-white border border-gray-100 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-gray-800 text-sm">
                    {faq.question}
                    <ChevronDown
                      size={16}
                      className="text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2"
                    />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-gray-600">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold text-[#0F172A] mb-6">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
