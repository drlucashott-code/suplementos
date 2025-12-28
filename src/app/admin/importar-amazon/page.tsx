"use client";

import { useState } from "react";
import { importarAmazonAction } from "./actions";

export default function ImportarAmazonPage() {
  const [asins, setAsins] = useState("");
  const [mode, setMode] = useState<"getItem" | "getVariation">(
    "getItem"
  );
  const [titlePattern, setTitlePattern] = useState(
    "Whey Protein {brand} {weight} {title}"
  );
  const [dose, setDose] = useState(30);
  const [proteinPerDose, setProteinPerDose] = useState(24);

  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setLoading(true);
    setError(null);
    setLogs([]);

    const res = await importarAmazonAction({
      asins,
      mode,
      titlePattern,
      dose,
      proteinPerDose,
    });

    if (!res.ok) {
      setError(res.error ?? "Erro desconhecido");
    }

    if (res.logs?.length) {
      setLogs(res.logs);
    }

    setLoading(false);
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Importar Whey da Amazon
      </h1>

      {/* ASINS */}
      <div className="space-y-2">
        <label className="font-medium">
          ASINs (separados por espaço, vírgula ou linha)
        </label>
        <textarea
          className="w-full border rounded p-2 text-sm"
          rows={4}
          value={asins}
          onChange={(e) => setAsins(e.target.value)}
          placeholder="B07MC12N2N B07MFM3B4R"
        />
      </div>

      {/* MÉTODO */}
      <div className="space-y-2">
        <label className="font-medium">Método</label>
        <select
          className="border rounded p-2 text-sm"
          value={mode}
          onChange={(e) =>
            setMode(e.target.value as "getItem" | "getVariation")
          }
        >
          <option value="getItem">
            GetItem (produto simples)
          </option>
          <option value="getVariation">
            GetVariation (com variações)
          </option>
        </select>
      </div>

      {/* PADRÃO DO TÍTULO */}
      <div className="space-y-2">
        <label className="font-medium">Padrão do título</label>
        <input
          className="w-full border rounded p-2 text-sm"
          value={titlePattern}
          onChange={(e) => setTitlePattern(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          Variáveis disponíveis:{" "}
          <code>{`{brand}`}</code>,{" "}
          <code>{`{weight}`}</code>,{" "}
          <code>{`{title}`}</code>
        </p>
      </div>

      {/* DOSE / PROTEÍNA */}
      <div className="flex gap-4 flex-wrap">
        <div className="space-y-1">
          <label className="font-medium">Dose (g)</label>
          <input
            type="number"
            className="border rounded p-2 w-28"
            value={dose}
            onChange={(e) => setDose(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <label className="font-medium">
            Proteína por dose (g)
          </label>
          <input
            type="number"
            className="border rounded p-2 w-36"
            value={proteinPerDose}
            onChange={(e) =>
              setProteinPerDose(Number(e.target.value))
            }
          />
        </div>
      </div>

      {/* BOTÃO */}
      <button
        onClick={handleImport}
        disabled={loading}
        className="px-6 py-2 bg-black text-white rounded disabled:opacity-60"
      >
        {loading ? "Importando..." : "Importar"}
      </button>

      {/* ERRO */}
      {error && (
        <div className="text-red-600 font-medium">
          ❌ {error}
        </div>
      )}

      {/* LOGS */}
      {logs.length > 0 && (
        <div className="bg-[#0b1220] text-green-400 rounded p-4 font-mono text-sm max-h-[400px] overflow-auto">
          {logs.map((log, idx) => (
            <pre key={idx} className="whitespace-pre-wrap">
              {log}
            </pre>
          ))}
        </div>
      )}
    </main>
  );
}
