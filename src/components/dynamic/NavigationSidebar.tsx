import Link from 'next/link';
import { getNavGroups } from '@/app/admin/dynamic/categorias/actions';

export async function NavigationSidebar() {
  const groups = await getNavGroups();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 p-6 overflow-y-auto hidden lg:block">
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tighter text-gray-900">Navegar</h2>
      </div>

      <nav className="space-y-8">
        {Object.entries(groups).map(([groupName, categories]) => (
          <div key={groupName}>
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">
              {groupName === 'casa' ? '🏠 Casa & Limpeza' : 
               groupName === 'petshop' ? '🐶 Petshop' : 
               groupName.toUpperCase()}
            </h3>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link 
                    href={`/${cat.group}/${cat.slug}`}
                    className="text-sm font-medium text-gray-600 hover:text-black transition-colors block py-1"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}