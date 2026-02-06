"use client";

import { useState } from "react";
import { importarAmazonAction } from "./actions";

type Categoria = "whey" | "creatina" | "barra" | "bebidaproteica";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <label className="col-span-3 text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="col-span-9">{children}</div>
    </div>
  );
}

export default function ImportadorUniversalPage() {
  const [category, setCategory] = useState<Categoria>("whey");
  const [asins, setAsins] = useState("");
  const [mode, setMode] = useState<"getItem" | "getVariation">("getItem");
  const [titlePattern, setTitlePattern] = useState("{brand} {weight} {title}");
  const [activeFields, setActiveFields] = useState<string[]>([]);

  const [values, setValues] = useState({
    brand: "",
    totalWeight: "" as number | "",
    dose: "" as number | "",
    protein: "" as number | "",
    unitsPerBox: "" as number | "", 
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all";

  const bulkFieldOptions: Record<Categoria, { key: string; label: string }[]> = {
    whey: [
      { key: "brand", label: "Marca" },
      { key: "totalWeight", label: "Peso Total (g)" },
      { key: "dose", label: "Dose (g)" },
      { key: "protein", label: "Proteína/Dose (g)" },
    ],
    creatina: [
      { key: "brand", label: "Marca" },
      { key: "totalWeight", label: "Peso Total (g)" },
      { key: "dose", label: "Dose (g)" },
    ],
    barra: [
      { key: "brand", label: "Marca" },
      { key: "unitsPerBox", label: "Unidades Caixa" },
      { key: "dose", label: "Peso Unidade (g)" },
      { key: "protein", label: "Prot. por Barra (g)" },
    ],
    bebidaproteica: [
      { key: "brand", label: "Marca" },
      { key: "unitsPerBox", label: "Unidades no Fardo" },
      { key: "dose", label: "Volume Unidade (ml)" },
      { key: "protein", label: "Prot. por Unidade (g)" },
    ],
  };

  const toggleField = (key: string) => {
    setActiveFields(prev => 
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  async function handleImport() {
    setLoading(true);
    setError(null);
    setLogs([]);

    try {
      const res = await importarAmazonAction({
        asins,
        mode,
        category,
        titlePattern,
        brand: activeFields.includes("brand") ? values.brand : "",
        totalWeight: activeFields.includes("totalWeight") && values.totalWeight !== "" ? values.totalWeight : 0,
        dose: activeFields.includes("dose") && values.dose !== "" ? values.dose : 0,
        protein: activeFields.includes("protein") && values.protein !== "" ? values.protein : 0,
        unitsPerBox: activeFields.includes("unitsPerBox") && values.unitsPerBox !== "" ? values.unitsPerBox : 0,
      });

      if (!res.ok) setError(res.error ?? "Erro desconhecido");
      if (res.logs?.length) setLogs(res.logs);
      // ✅ FIX: Tipagem correta do Erro (Linha 99)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError("Erro crítico: " + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">Importador Universal Amazon</h1>
        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Modo Inteligente</span>
      </div>

      <div className="space-y-4">
        <Field label="Categoria">
          <select
            className={`${inputClass} font-bold bg-blue-50 border-blue-200 text-blue-800`}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Categoria);
              setActiveFields([]); 
            }}
          >
            <option value="whey">Whey Protein</option>
            <option value="creatina">Creatina</option>
            <option value="barra">Barra de Proteína</option>
            <option value="bebidaproteica">Bebida Proteica</option>
          </select>
        </Field>

        <Field label="Lista de ASINs">
          <textarea
            className={inputClass}
            rows={3}
            value={asins}
            onChange={(e) => setAsins(e.target.value)}
            placeholder="Separe por espaço, vírgula ou linha..."
          />
        </Field>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
          O que deseja preencher em massa?
        </label>
        <div className="flex flex-wrap gap-2">
          {bulkFieldOptions[category].map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleField(opt.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                activeFields.includes(opt.key)
                  ? "bg-black border-black text-white shadow-md"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
            >
              {activeFields.includes(opt.key) ? "✓ " : "+ "} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {activeFields.length > 0 && (
        <div className="p-6 bg-gray-50 border rounded-xl space-y-4 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
          {activeFields.includes("brand") && (
            <Field label="Marca">
              <input
                className={inputClass}
                value={values.brand}
                onChange={(e) => setValues({ ...values, brand: e.target.value })}
                placeholder="Ex: Growth Supplements"
              />
            </Field>
          )}

          {activeFields.includes("totalWeight") && (
            <Field label="Peso Total (g)">
              <input
                type="number"
                className={inputClass}
                value={values.totalWeight}
                onChange={(e) => setValues({ ...values, totalWeight: e.target.value === "" ? "" : Number(e.target.value) })}
              />
            </Field>
          )}

          {activeFields.includes("unitsPerBox") && (
            <Field label={category === "bebidaproteica" ? "Unidades no Fardo" : "Unidades na Caixa"}>
              <input
                type="number"
                step="1"
                className={inputClass}
                value={values.unitsPerBox}
                onChange={(e) => setValues({ ...values, unitsPerBox: e.target.value === "" ? "" : Math.floor(Number(e.target.value)) })}
                placeholder="Ex: 12"
              />
            </Field>
          )}

          {activeFields.includes("dose") && (
            <Field 
              label={
                category === "barra" ? "Peso da Unidade (g)" : 
                category === "bebidaproteica" ? "Volume Unidade (ml)" : 
                "Dose (g)"
              }
            >
              <input
                type="number"
                className={inputClass}
                value={values.dose}
                onChange={(e) => setValues({ ...values, dose: e.target.value === "" ? "" : Number(e.target.value) })}
              />
            </Field>
          )}

          {activeFields.includes("protein") && (
            <Field 
              label={
                category === "barra" ? "Prot. por Barra (g)" : 
                category === "bebidaproteica" ? "Prot. por Unidade (g)" : 
                "Proteína (g)"
              }
            >
              <input
                type="number"
                className={inputClass}
                value={values.protein}
                onChange={(e) => setValues({ ...values, protein: e.target.value === "" ? "" : Number(e.target.value) })}
              />
            </Field>
          )}
        </div>
      )}

      <div className="pt-4 space-y-4 border-t">
        <Field label="Método">
          {/* ✅ FIX: Cast correto para o modo (Linha 241) */}
          <select 
            className={inputClass} 
            value={mode} 
            onChange={(e) => setMode(e.target.value as "getItem" | "getVariation")}
          >
            <option value="getItem">GetItem (Simples)</option>
            <option value="getVariation">GetVariation (Variações)</option>
          </select>
        </Field>

        <Field label="Padrão do título">
          <input className={inputClass} value={titlePattern} onChange={(e) => setTitlePattern(e.target.value)} />
        </Field>

        <button
          onClick={handleImport}
          disabled={loading || !asins.trim()}
          className="w-full py-4 bg-black text-white rounded-lg font-bold disabled:opacity-40 hover:bg-gray-800 transition-all shadow-md active:scale-[0.99]"
        >
          {loading ? "🚀 Processando Fila..." : `Importar ${asins.split(/[\s,]+/).filter(Boolean).length} Produto(s)`}
        </button>
      </div>

      {logs.length > 0 && (
        <div className="bg-[#0b1220] text-green-400 rounded-lg p-4 font-mono text-[11px] max-h-[300px] overflow-auto border border-gray-800 shadow-2xl">
          {logs.map((log, idx) => (
            <pre key={idx} className="whitespace-pre-wrap mb-1 border-l border-green-900/40 pl-3">{log}</pre>
          ))}
        </div>
      )}
      {error && <p className="text-red-500 text-sm font-bold mt-2">{error}</p>}
    </main>
  );
}