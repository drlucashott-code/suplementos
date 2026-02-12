"use client";

import { useState } from "react";
import { importarAmazonAction } from "./actions";

// ✅ Atualizado para incluir pre_treino
type Categoria = "whey" | "creatina" | "barra" | "bebida_proteica" | "pre_treino";

/* =======================
   FIELD (PADRÃO DA EDIÇÃO)
======================= */
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

  // Controle de quais campos preencher em massa (Chips)
  const [activeFields, setActiveFields] = useState<string[]>([]);

  // Valores dos campos nutricionais/técnicos
  const [values, setValues] = useState({
    brand: "",
    totalWeight: "" as number | "",
    dose: "" as number | "",
    protein: "" as number | "",
    unitsPerBox: "" as number | "", 
    unitsPerPack: "" as number | "",      
    volumePerUnitInMl: "" as number | "", 
    caffeine: "" as number | "", // ✅ Novo campo para Pré-Treino
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all";

  // Definição dos campos por categoria
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
    bebida_proteica: [
      { key: "brand", label: "Marca" },
      { key: "unitsPerPack", label: "Unidades Fardo" },
      { key: "volumePerUnitInMl", label: "Volume (ml)" },
      { key: "protein", label: "Prot. por Unidade (g)" },
    ],
    // ✅ Configuração do Pré-Treino
    pre_treino: [
      { key: "brand", label: "Marca" },
      { key: "totalWeight", label: "Peso Pote (g)" },
      { key: "dose", label: "Dose Scoop (g)" },
      { key: "caffeine", label: "Cafeína (mg)" },
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
        // Envia o valor apenas se o chip estiver ativo e converte tipos com segurança
        brand: activeFields.includes("brand") ? values.brand : "",
        totalWeight: activeFields.includes("totalWeight") && values.totalWeight !== "" ? Number(values.totalWeight) : 0,
        dose: activeFields.includes("dose") && values.dose !== "" ? Number(values.dose) : 0,
        protein: activeFields.includes("protein") && values.protein !== "" ? Number(values.protein) : 0,
        unitsPerBox: activeFields.includes("unitsPerBox") && values.unitsPerBox !== "" ? Number(values.unitsPerBox) : 0,
        unitsPerPack: activeFields.includes("unitsPerPack") && values.unitsPerPack !== "" ? Number(values.unitsPerPack) : 0,
        volumePerUnitInMl: activeFields.includes("volumePerUnitInMl") && values.volumePerUnitInMl !== "" ? Number(values.volumePerUnitInMl) : 0,
        // ✅ Envia cafeína
        caffeine: activeFields.includes("caffeine") && values.caffeine !== "" ? Number(values.caffeine) : 0,
      });

      if (!res.ok) setError(res.error ?? "Erro desconhecido");
      if (res.logs?.length) setLogs(res.logs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro crítico desconhecido";
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm font-bold animate-pulse">
          🚨 {error}
        </div>
      )}

      {/* CATEGORIA E ASINS */}
      <div className="space-y-4">
        <Field label="Categoria">
          <select
            className={`${inputClass} font-bold bg-blue-50 border-blue-200 text-blue-800`}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Categoria);
              setActiveFields([]); // Reseta campos ao trocar categoria
            }}
          >
            <option value="whey">Whey Protein</option>
            <option value="creatina">Creatina</option>
            <option value="pre_treino">Pré-Treino</option> {/* ✅ Nova Opção */}
            <option value="barra">Barra de Proteína</option>
            <option value="bebida_proteica">Bebida Proteica</option>
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

      {/* SELETOR DE CHIPS */}
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

      {/* FORMULÁRIO DINÂMICO */}
      {activeFields.length > 0 && (
        <div className="p-6 bg-gray-50 border rounded-xl space-y-4 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* --- CAMPOS COMUNS --- */}
          
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

          {activeFields.includes("dose") && (
            <Field label={category === "barra" ? "Peso da Unidade (g)" : "Dose (g)"}>
              <input
                type="number"
                className={inputClass}
                value={values.dose}
                onChange={(e) => setValues({ ...values, dose: e.target.value === "" ? "" : Number(e.target.value) })}
              />
            </Field>
          )}

          {activeFields.includes("protein") && (
            <Field label={category === "barra" || category === "bebida_proteica" ? "Prot. por Unidade (g)" : "Proteína (g)"}>
              <input
                type="number"
                className={inputClass}
                value={values.protein}
                onChange={(e) => setValues({ ...values, protein: e.target.value === "" ? "" : Number(e.target.value) })}
              />
            </Field>
          )}

          {/* --- CAMPOS ESPECÍFICOS --- */}

          {activeFields.includes("unitsPerBox") && (
            <Field label="Unidades na Caixa">
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

          {activeFields.includes("unitsPerPack") && (
            <Field label="Unidades no Fardo">
              <input
                type="number"
                step="1"
                className={inputClass}
                value={values.unitsPerPack}
                onChange={(e) => setValues({ ...values, unitsPerPack: e.target.value === "" ? "" : Math.floor(Number(e.target.value)) })}
                placeholder="Ex: 6 ou 12"
              />
            </Field>
          )}

          {activeFields.includes("volumePerUnitInMl") && (
            <Field label="Volume (ml)">
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={values.volumePerUnitInMl}
                onChange={(e) => setValues({ ...values, volumePerUnitInMl: e.target.value === "" ? "" : Number(e.target.value) })}
                placeholder="Ex: 250"
              />
            </Field>
          )}

          {/* ✅ Novo Input de Cafeína */}
          {activeFields.includes("caffeine") && (
            <Field label="Cafeína (mg)">
              <input
                type="number"
                step="1"
                className={inputClass}
                value={values.caffeine}
                onChange={(e) => setValues({ ...values, caffeine: e.target.value === "" ? "" : Number(e.target.value) })}
                placeholder="Ex: 200"
              />
            </Field>
          )}

        </div>
      )}

      {/* CONFIGS TÉCNICAS */}
      <div className="pt-4 space-y-4 border-t">
        <Field label="Método">
          <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value as "getItem" | "getVariation")}>
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

      {/* LOGS */}
      {logs.length > 0 && (
        <div className="bg-[#0b1220] text-green-400 rounded-lg p-4 font-mono text-[11px] max-h-[300px] overflow-auto border border-gray-800 shadow-2xl">
          {logs.map((log, idx) => (
            <pre key={idx} className="whitespace-pre-wrap mb-1 border-l border-green-900/40 pl-3">{log}</pre>
          ))}
        </div>
      )}
    </main>
  );
}