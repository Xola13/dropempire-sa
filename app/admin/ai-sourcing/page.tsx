import AISourcer from '@/components/admin/AISourcer'
import { Cpu, Info } from 'lucide-react'

export const metadata = {
  title: 'AI Sourcing — DropEmpire SA Admin',
}

export default function AdminAISourcingPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center">
          <Cpu size={20} className="text-[#0F172A]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">AI Sourcing</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Claude-powered trend discovery, supplier matching & listing generation
          </p>
        </div>
      </div>

      {/* Workflow explanation */}
      <div className="bg-[#0F172A] rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-[#F59E0B]" />
          <span className="font-semibold text-sm">AI Workflow</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            {
              step: '1',
              label: 'Trend Scout',
              desc: 'Claude identifies high-demand SA market opportunities',
            },
            {
              step: '2',
              label: 'Sourcing Agent',
              desc: 'Compares AliExpress, CJ & Makro for best cost/margin',
            },
            {
              step: '3',
              label: 'Listing Agent',
              desc: 'Generates SEO-optimised title, description & FAQs',
            },
            {
              step: '4',
              label: 'Pricing Agent',
              desc: 'Sets price ensuring minimum 20% margin',
            },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#F59E0B] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#0F172A]">
                {item.step}
              </div>
              <div>
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main AI Sourcer Component */}
      <AISourcer />
    </div>
  )
}
