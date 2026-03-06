import { prisma } from '@/lib/prisma';
import Link from 'next/link';

// Componente de Card para o Menu
function AdminCard({ title, description, href, icon, color }: { 
  title: string; 
  description: string; 
  href: string; 
  icon: string;
  color: string;
}) {
  return (
    <Link href={href} className="group">
      <div className={`h-full p-6 bg-white border border-gray-200 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-${color}-200 hover:translate-y-[-2px]`}>
        <div className={`w-12 h-12 rounded-xl bg-${color}-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}

export default async function AdminDynamicDashboard() {
  // 🚀 CORREÇÃO PRISMA: Usando iniciais minúsculas para acessar os modelos
  const [totalProducts, totalCategories] = await Promise.all([
    prisma.dynamicProduct.count(),
    prisma.dynamicCategory.count()
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho Solo */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Admin Panel</span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">CATÁLOGO DINÂMICO</h1>
            <p className="text-gray-500 font-medium">Gerenciamento universal amazonpicks.com.br</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-200 shadow-sm text-center min-w-[120px]">
              <span className="block text-[10px] font-black text-gray-400 uppercase mb-1">Total de Itens</span>
              <span className="text-2xl font-black text-blue-600">{totalProducts}</span>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-200 shadow-sm text-center min-w-[120px]">
              <span className="block text-[10px] font-black text-gray-400 uppercase mb-1">Categorias</span>
              <span className="text-2xl font-black text-purple-600">{totalCategories}</span>
            </div>
          </div>
        </div>

        {/* Grade de Navegação - 🚀 URLs atualizadas para /admin/dynamic/ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AdminCard 
            title="Importar via API"
            description="Processamento em lote via PA-API. Nome, Foto e Preço real direto da Amazon."
            href="/admin/dynamic/importar"
            icon="🚀"
            color="blue"
          />
          
          <AdminCard 
            title="Gerenciar Produtos"
            description="Ajuste fino de atributos, edição de preços manuais e exclusão de ofertas."
            href="/admin/dynamic/produtos"
            icon="📦"
            color="emerald"
          />

          <AdminCard 
            title="Categorias"
            description="Visualize e gerencie as categorias dinâmicas e suas regras de exibição."
            href="/admin/dynamic/categorias"
            icon="📁"
            color="purple"
          />

          <AdminCard 
            title="Criar Nova Categoria"
            description="Defina novos slugs e campos de cálculo (ex: Preço por Litro, por Rolo, por KG)."
            href="/admin/dynamic/nova-categoria"
            icon="✨"
            color="yellow"
          />

          <AdminCard 
            title="Update Prices"
            description="Acompanhe o status da sua rotina de atualização automática de preços."
            href="#"
            icon="💰"
            color="red"
          />

          <AdminCard 
            title="Ver no Site"
            description="Abra a versão pública do site para validar o layout e os cards."
            href="/"
            icon="🌐"
            color="gray"
          />
        </div>

        {/* Info Box Solo */}
        <div className="mt-12 p-8 bg-gray-900 rounded-3xl text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Arquitetura Escalável</h3>
            <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
              Este módulo foi convertido para uma estrutura **Dynamic**. 
              Agora você pode gerenciar **Casa, Petshop, Bebês** ou qualquer outro nicho 
              centralizando tudo nesta mesma interface de gerenciamento.
            </p>
          </div>
          {/* Decoração sutil no fundo */}
          <div className="absolute top-[-20%] right-[-5%] text-[120px] opacity-[0.03] pointer-events-none select-none font-black">
            DYNAMIC
          </div>
        </div>
      </div>
    </div>
  );
}