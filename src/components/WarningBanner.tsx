export function WarningBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 w-full">
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-amber-900 text-sm">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="w-6 h-6 shrink-0 text-amber-600"
        >
          <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
        </svg>

        <div className="text-center sm:text-left">
          <p className="font-semibold">
            Aviso: Instabilidade Global nos Servidores da Amazon
          </p>
          <p className="mt-0.5 opacity-90">
            A infraestrutura de nuvem da Amazon (AWS) está enfrentando falhas sistêmicas hoje. Devido a essa instabilidade técnica na própria loja, a nossa atualização de preços em tempo real está temporariamente pausada e o checkout na Amazon pode apresentar lentidão. Estamos exibindo o último preço validado pelo nosso sistema para garantir sua referência de comparação.
          </p>
        </div>
      </div>
    </div>
  );
}