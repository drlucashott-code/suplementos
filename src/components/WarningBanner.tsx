// components/WarningBanner.tsx

export function WarningBanner() {
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3 w-full">
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-red-900 text-sm">
        <span role="img" aria-label="Alerta" className="text-xl">🚨</span>
        <div className="text-center sm:text-left">
          <p className="font-semibold">
            A Amazon está enfrentando uma instabilidade global hoje (05/03).
          </p>
          <p className="mt-0.5 opacity-90">
            A exibição de preços e o carrinho de compras no site da Amazon podem apresentar falhas temporárias. Estamos exibindo o <strong>último preço válido verificado</strong> para você não perder suas referências de comparação.
          </p>
        </div>
      </div>
    </div>
  );
}