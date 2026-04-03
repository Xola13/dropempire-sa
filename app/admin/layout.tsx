import AdminSidebar from '@/components/admin/Sidebar'

export const metadata = {
  title: 'DropEmpire SA — Admin',
  description: 'DropEmpire SA Admin Panel',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
