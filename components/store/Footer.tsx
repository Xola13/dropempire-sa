import Link from 'next/link'
import { Package, Mail, Phone, MapPin } from 'lucide-react'

const footerLinks = {
  Shop: [
    { label: 'All Products', href: '/products' },
    { label: 'Electronics', href: '/products?category=Electronics' },
    { label: 'Home & Garden', href: '/products?category=Home+%26+Garden' },
    { label: 'Beauty', href: '/products?category=Beauty' },
  ],
  Support: [
    { label: 'Track Order', href: '/track' },
    { label: 'Returns Policy', href: '/returns' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact Us', href: '/contact' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 group mb-4">
              <div className="w-9 h-9 bg-[#F59E0B] rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-[#0F172A]" />
              </div>
              <span className="font-bold text-white text-xl tracking-tight">
                Drop<span className="text-[#F59E0B]">Empire</span>{' '}
                <span className="text-sm font-normal text-gray-400">SA</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              South Africa&apos;s premier online store. Quality products from
              trusted suppliers, delivered to your door across SA.
            </p>

            {/* Contact */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail size={14} className="text-[#F59E0B]" />
                <span>support@dropempiresa.co.za</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone size={14} className="text-[#F59E0B]" />
                <span>+27 (0)10 000 0000</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin size={14} className="text-[#F59E0B]" />
                <span>Johannesburg, South Africa</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {section}
              </h3>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-[#F59E0B] text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} DropEmpire SA. All rights reserved.
          </p>

          {/* Payment icons */}
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs">Secure payments:</span>
            <div className="flex items-center gap-2">
              {['PayFast', 'Visa', 'MC', 'Yoco'].map(brand => (
                <div
                  key={brand}
                  className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-gray-300 font-medium"
                >
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
