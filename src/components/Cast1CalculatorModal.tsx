import React, { useState, useEffect } from 'react';
import { X, Calculator, RefreshCw, Layers, Gauge, Activity, Clock, Box, Cpu, Copy, Check, ExternalLink } from 'lucide-react';

interface Cast1CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mapeamento Espessura (µm) -> Gramatura (g) para Largura de 500 mm
const TABELA_GRAMATURA_500: Record<number, number> = {
  10: 4.60, 11: 5.06, 12: 5.52, 13: 5.98, 14: 6.44, 15: 6.90,
  16: 7.36, 17: 7.82, 18: 8.28, 19: 8.74, 20: 9.20, 21: 9.66,
  22: 10.12, 23: 10.58, 24: 11.04, 25: 11.50, 26: 11.96, 27: 12.42,
  28: 12.88, 29: 13.34, 30: 13.80, 31: 14.26, 32: 14.72, 33: 15.18,
  34: 15.64, 35: 16.10, 36: 16.56, 37: 17.02, 38: 17.48, 39: 17.94,
  40: 18.40, 41: 18.86, 42: 19.32, 43: 19.78, 44: 20.24, 45: 20.70,
  46: 21.16, 47: 21.62, 48: 22.08, 49: 22.54, 50: 23.00, 70: 32.20,
  71: 32.66
};

const ESPESSURAS = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  50, 70, 71
];

// Fatores de Rendimento por RPM (kg/h por cada 1 RPM)
const FATOR_A = 500 / 58;    // ~8.6207 kg/h por RPM
const FATOR_B = 63.83 / 130; // ~0.4910 kg/h por RPM
const FATOR_C = 125 / 160;   // ~0.78125 kg/h por RPM
const FATOR_D = 500 / 58;    // ~8.6207 kg/h por RPM

export const Cast1CalculatorModal: React.FC<Cast1CalculatorModalProps> = ({ isOpen, onClose }) => {
  const [tipoMaterial, setTipoMaterial] = useState<'LC3' | 'LC2' | 'ATX'>('LC3');
  const [espessura, setEspessura] = useState<number>(30);
  const [gramatura, setGramatura] = useState<number>(13.80);
  const [velocidade, setVelocidade] = useState<number>(230);
  const [metragem, setMetragem] = useState<number>(3623);

  const [rpmA, setRpmA] = useState<number>(56);
  const [rpmB, setRpmB] = useState<number>(116);
  const [rpmC, setRpmC] = useState<number>(146);
  const [rpmD, setRpmD] = useState<number>(56);

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyExternalLink = async () => {
    let link = 'https://gest-o-de-produ-o-2026.pages.dev/?page=calculadora#cast1';
    if (typeof window !== 'undefined' && (window.location.origin.includes('gest-o-de-produ-o-2026.pages.dev') || window.location.origin.includes('pages.dev'))) {
      link = `${window.location.origin}/?page=calculadora#cast1`;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.error("Erro ao copiar link:", e);
    }
  };

  // Cálculo de Metragem Automática Integrada
  const calcularMetragemAutomatica = (espessuraMicras: number) => {
    const pesoFixadoKg = 50;
    const densidade = 0.092;
    const larguraMetros = 500 / 100;

    if (espessuraMicras <= 0 || isNaN(espessuraMicras)) return 0;

    const espessuraMm = espessuraMicras / 1000;
    const metragemArea = (pesoFixadoKg * 1000) / (densidade * larguraMetros * espessuraMm);
    const metragemAjustada = metragemArea / 1000;

    return Math.round(metragemAjustada);
  };

  // Atualizar parâmetros por espessura
  const handleEspessuraChange = (novaEspessura: number) => {
    setEspessura(novaEspessura);
    const novaGramatura = TABELA_GRAMATURA_500[novaEspessura] !== undefined 
      ? TABELA_GRAMATURA_500[novaEspessura] 
      : gramatura;
    setGramatura(novaGramatura);

    const novaMetragem = calcularMetragemAutomatica(novaEspessura);
    setMetragem(novaMetragem);

    recalcularVelocidadesSugestoes(tipoMaterial, novaGramatura, velocidade);
  };

  // Recalcula as RPMs baseando-se na velocidade geral da linha
  const recalcularVelocidadesSugestoes = (
    tipoMat: 'LC3' | 'LC2' | 'ATX',
    gram: number,
    vel: number
  ) => {
    const pctB_alvo = 0.05;
    const pctC_alvo = tipoMat === 'LC2' ? 0.05 : 0.10;
    const pctAD_alvo = (1.0 - (pctB_alvo + pctC_alvo)) / 2.0;

    const quantidadeBobinas = 6;
    const tempoMinutos = 60;
    const taxaProducaoQuilos = (gram * quantidadeBobinas * vel * tempoMinutos) / 1000;

    if (taxaProducaoQuilos > 0) {
      const vazaoAlvoA = taxaProducaoQuilos * pctAD_alvo;
      const vazaoAlvoB = taxaProducaoQuilos * pctB_alvo;
      const vazaoAlvoC = taxaProducaoQuilos * pctC_alvo;
      const vazaoAlvoD = taxaProducaoQuilos * pctAD_alvo;

      setRpmA(Math.round(vazaoAlvoA / FATOR_A));
      setRpmB(Math.round(vazaoAlvoB / FATOR_B));
      setRpmC(Math.round(vazaoAlvoC / FATOR_C));
      setRpmD(Math.round(vazaoAlvoD / FATOR_D));
    }
  };

  // Recalcula roscas B e C quando A ou D são alteradas manualmente
  const handleRpmAouDChange = (newRpmA: number, newRpmD: number) => {
    setRpmA(newRpmA);
    setRpmD(newRpmD);

    const pctB_alvo = 0.05;
    const pctC_alvo = tipoMaterial === 'LC2' ? 0.05 : 0.10;
    const pctAD_alvo_total = 1.0 - (pctB_alvo + pctC_alvo);

    const vazaoAD = (newRpmA * FATOR_A) + (newRpmD * FATOR_D);

    if (vazaoAD > 0) {
      const vazaoTotalEstimada = vazaoAD / pctAD_alvo_total;
      const vazaoAlvoB = vazaoTotalEstimada * pctB_alvo;
      const vazaoAlvoC = vazaoTotalEstimada * pctC_alvo;

      setRpmB(Math.round(vazaoAlvoB / FATOR_B));
      setRpmC(Math.round(vazaoAlvoC / FATOR_C));
    }
  };

  const handleTipoMaterialChange = (newTipo: 'LC3' | 'LC2' | 'ATX') => {
    setTipoMaterial(newTipo);
    recalcularVelocidadesSugestoes(newTipo, gramatura, velocidade);
  };

  const handleGramaturaChange = (newGram: number) => {
    setGramatura(newGram);
    recalcularVelocidadesSugestoes(tipoMaterial, newGram, velocidade);
  };

  const handleVelocidadeChange = (newVel: number) => {
    setVelocidade(newVel);
    recalcularVelocidadesSugestoes(tipoMaterial, gramatura, newVel);
  };

  // Inicialização padrão ao abrir
  useEffect(() => {
    if (isOpen) {
      handleEspessuraChange(30);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- CÁLCULOS DERIVADOS ---
  const vazaoA = rpmA * FATOR_A;
  const vazaoB = rpmB * FATOR_B;
  const vazaoC = rpmC * FATOR_C;
  const vazaoD = rpmD * FATOR_D;

  const vazaoCalculadaTotal = vazaoA + vazaoB + vazaoC + vazaoD;

  let pctA = 0, pctB = 0, pctC = 0, pctD = 0;
  if (vazaoCalculadaTotal > 0) {
    pctA = (vazaoA / vazaoCalculadaTotal) * 100;
    pctB = (vazaoB / vazaoCalculadaTotal) * 100;
    pctC = (vazaoC / vazaoCalculadaTotal) * 100;
    pctD = (vazaoD / vazaoCalculadaTotal) * 100;
  }
  const totalCamadas = pctA + pctB + pctC + pctD;

  // Indicadores de Produção da Linha
  const quantidadeBobinas = 6;
  const tempoMinutos = 60;
  const horasProducao = 12;
  const pesoPalete = 800;

  const gramaturaTotal = gramatura * quantidadeBobinas;
  const taxaProducaoGramas = gramaturaTotal * velocidade * tempoMinutos;
  const taxaProducaoQuilos = taxaProducaoGramas / 1000;

  const resultadoPalete = Math.floor((taxaProducaoQuilos * horasProducao) / pesoPalete);
  const tempoPalete = taxaProducaoQuilos > 0 ? (pesoPalete / taxaProducaoQuilos) : 0;

  const formatarTempo = (t: number) => {
    if (t <= 0 || isNaN(t)) return "00:00 h/min";
    const h = Math.floor(t);
    const m = Math.round((t - h) * 60);
    return `${h}:${m < 10 ? '0' : ''}${m} h/min`;
  };

  const tempoQuedaMinutos = velocidade > 0 ? (metragem / velocidade).toFixed(2) : "0.00";

  const formatarPorcentagem = (valor: number) => {
    return valor.toFixed(2).replace('.', ',') + "%";
  };

  return (
    <div className="fixed inset-0 z-[330] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Calculator size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight uppercase">
                Calculadora % CAST 1
              </h2>
              <p className="text-[11px] font-bold text-slate-500">
                Produção Integrada &amp; Balanceamento de Roscas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyExternalLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                copiedLink 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
              title="Copiar link público da calculadora para acessar em qualquer aparelho sem login"
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copiedLink ? 'Link Copiado!' : 'Link Externo'}</span>
            </button>
            <button
              onClick={() => handleEspessuraChange(espessura)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title="Resetar parâmetros da espessura atual"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scroll Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
          
          {/* Header Selects: Tipo de Material & Espessura */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <div className="flex flex-col items-center w-full sm:w-auto">
              <label htmlFor="tipoMaterial" className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Layers size={13} className="text-blue-600" />
                Tipo de Material
              </label>
              <select
                id="tipoMaterial"
                value={tipoMaterial}
                onChange={(e) => handleTipoMaterialChange(e.target.value as 'LC3' | 'LC2' | 'ATX')}
                className="w-full sm:w-40 py-2 px-3 text-sm font-black border border-slate-300 rounded-xl bg-slate-50 text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-center"
              >
                <option value="LC3">LC3</option>
                <option value="LC2">LC2</option>
                <option value="ATX">ATX</option>
              </select>
            </div>

            <div className="flex flex-col items-center w-full sm:w-auto">
              <label htmlFor="espessura" className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Gauge size={13} className="text-blue-600" />
                Espessura (µm)
              </label>
              <select
                id="espessura"
                value={espessura}
                onChange={(e) => handleEspessuraChange(parseFloat(e.target.value))}
                className="w-full sm:w-40 py-2 px-3 text-sm font-black border border-slate-300 rounded-xl bg-slate-50 text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-center"
              >
                {ESPESSURAS.map((esp) => (
                  <option key={esp} value={esp}>{esp} µm</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dados de Produção da Linha */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
              <Activity size={14} className="text-blue-600" />
              Dados de Produção da Linha
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col items-center">
                <label htmlFor="calcGramatura" className="text-[11px] font-bold text-slate-600 mb-1">
                  Gramatura (g):
                </label>
                <input
                  type="number"
                  id="calcGramatura"
                  value={gramatura}
                  step="any"
                  onChange={(e) => handleGramaturaChange(parseFloat(e.target.value) || 0)}
                  className="w-full py-2 px-3 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                />
              </div>

              <div className="flex flex-col items-center">
                <label htmlFor="calcVelocidade" className="text-[11px] font-bold text-slate-600 mb-1">
                  Velocidade (m/min):
                </label>
                <input
                  type="number"
                  id="calcVelocidade"
                  value={velocidade}
                  step="any"
                  onChange={(e) => handleVelocidadeChange(parseFloat(e.target.value) || 0)}
                  className="w-full py-2 px-3 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                />
              </div>

              <div className="flex flex-col items-center">
                <label htmlFor="calcMetragem" className="text-[11px] font-bold text-slate-600 mb-1">
                  Metragem (m):
                </label>
                <input
                  type="number"
                  id="calcMetragem"
                  value={metragem}
                  step="any"
                  onChange={(e) => setMetragem(parseFloat(e.target.value) || 0)}
                  className="w-full py-2 px-3 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Cards das 4 Roscas (A, B, C, D) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Rosca A */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 border-t-4 border-t-blue-600 shadow-sm flex flex-col justify-between">
              <div>
                <label htmlFor="rpmA" className="block font-black text-sm text-slate-800">
                  Rosca A
                </label>
                <span className="block text-[11px] font-semibold text-slate-400 mb-2">
                  Estrutural Grande
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">RPM:</span>
                  <input
                    type="number"
                    id="rpmA"
                    value={rpmA}
                    step="any"
                    onChange={(e) => handleRpmAouDChange(parseFloat(e.target.value) || 0, rpmD)}
                    className="w-full py-2 px-3 text-base font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 bg-slate-50"
                  />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 text-center">
                <div className="text-xl font-black text-blue-700">{formatarPorcentagem(pctA)}</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">{vazaoA.toFixed(1).replace('.', ',')} kg/h</div>
              </div>
            </div>

            {/* Rosca B */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 border-t-4 border-t-amber-600 shadow-sm flex flex-col justify-between">
              <div>
                <label htmlFor="rpmB" className="block font-black text-sm text-slate-800">
                  Rosca B
                </label>
                <span className="block text-[11px] font-semibold text-slate-400 mb-2">
                  Pega / Interna
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">RPM:</span>
                  <input
                    type="number"
                    id="rpmB"
                    value={rpmB}
                    step="any"
                    onChange={(e) => setRpmB(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-3 text-base font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-amber-600 bg-slate-50"
                  />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 text-center">
                <div className="text-xl font-black text-amber-600">{formatarPorcentagem(pctB)}</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">{vazaoB.toFixed(1).replace('.', ',')} kg/h</div>
              </div>
            </div>

            {/* Rosca C */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 border-t-4 border-t-emerald-600 shadow-sm flex flex-col justify-between">
              <div>
                <label htmlFor="rpmC" className="block font-black text-sm text-slate-800">
                  Rosca C
                </label>
                <span className="block text-[11px] font-semibold text-slate-400 mb-2">
                  Metalloceno / Externa
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">RPM:</span>
                  <input
                    type="number"
                    id="rpmC"
                    value={rpmC}
                    step="any"
                    onChange={(e) => setRpmC(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-3 text-base font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-emerald-600 bg-slate-50"
                  />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 text-center">
                <div className="text-xl font-black text-emerald-600">{formatarPorcentagem(pctC)}</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">{vazaoC.toFixed(1).replace('.', ',')} kg/h</div>
              </div>
            </div>

            {/* Rosca D */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 border-t-4 border-t-blue-600 shadow-sm flex flex-col justify-between">
              <div>
                <label htmlFor="rpmD" className="block font-black text-sm text-slate-800">
                  Rosca D
                </label>
                <span className="block text-[11px] font-semibold text-slate-400 mb-2">
                  Estrutural Grande
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">RPM:</span>
                  <input
                    type="number"
                    id="rpmD"
                    value={rpmD}
                    step="any"
                    onChange={(e) => handleRpmAouDChange(rpmA, parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-3 text-base font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 bg-slate-50"
                  />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 text-center">
                <div className="text-xl font-black text-blue-700">{formatarPorcentagem(pctD)}</div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">{vazaoD.toFixed(1).replace('.', ',')} kg/h</div>
              </div>
            </div>
          </div>

          {/* Total das Camadas */}
          <div className="text-center font-black text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 py-2.5 px-4 rounded-xl shadow-sm">
            Total das Camadas: {formatarPorcentagem(totalCamadas)}
          </div>

          {/* Indicadores da Linha (Card Azul) */}
          <div className="bg-gradient-to-br from-blue-700 to-indigo-900 text-white p-5 rounded-2xl shadow-lg border border-blue-500/30">
            <h3 className="text-sm font-black uppercase tracking-wider text-center text-white/90 mb-4 pb-2 border-b border-white/15 flex items-center justify-center gap-2">
              <Cpu size={16} className="text-yellow-300" />
              Indicadores da Linha
            </h3>

            <div className="space-y-2.5 text-xs font-bold">
              <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                <span className="text-white/80">Taxa de Produção Total:</span>
                <span className="text-yellow-300 font-black text-base sm:text-lg">
                  {taxaProducaoQuilos.toFixed(2).replace('.', ',')} Kg/h
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                <span className="text-white/80 flex items-center gap-1.5">
                  <Box size={14} className="text-blue-300" />
                  Paletes / Turno (12h):
                </span>
                <span className="font-black text-white text-sm">
                  {resultadoPalete}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-white/10">
                <span className="text-white/80 flex items-center gap-1.5">
                  <Clock size={14} className="text-blue-300" />
                  Tempo para 1 Palete:
                </span>
                <span className="font-black text-white text-sm">
                  {formatarTempo(tempoPalete)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-white/80 flex items-center gap-1.5">
                  <Gauge size={14} className="text-emerald-300" />
                  Tempo por Queda:
                </span>
                <span className="font-black text-emerald-300 text-sm">
                  {tempoQuedaMinutos.replace('.', ',')} min
                </span>
              </div>
            </div>
          </div>

          {/* Footer Assinatura */}
          <div className="text-center text-[11px] font-bold text-slate-400 pt-1">
            Manupackaging Fitasa &amp; Amazonia &bull; Desenvolvido por Adaias Melo
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyExternalLink}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              copiedLink
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95'
            }`}
          >
            {copiedLink ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedLink ? 'Link Externo Copiado!' : 'Copiar Link Externo (Sem Login)'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-900 active:scale-95 transition-all shadow-sm"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
