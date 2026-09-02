import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Layers, 
  Gauge, 
  Activity, 
  Clock, 
  Box, 
  Cpu, 
  RefreshCw, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink, 
  ArrowLeft, 
  ShieldCheck, 
  Info,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface Cast1CalculatorStandaloneProps {
  onNavigateToApp?: () => void;
  systemLogo?: string | null;
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

const QUICK_ESPESSURAS = [17, 20, 23, 25, 30, 35, 50];

// Fatores de Rendimento por RPM (kg/h por cada 1 RPM)
const FATOR_A = 500 / 58;    // ~8.6207 kg/h por RPM
const FATOR_B = 63.83 / 130; // ~0.4910 kg/h por RPM
const FATOR_C = 125 / 160;   // ~0.78125 kg/h por RPM
const FATOR_D = 500 / 58;    // ~8.6207 kg/h por RPM

export const Cast1CalculatorStandalone: React.FC<Cast1CalculatorStandaloneProps> = ({
  onNavigateToApp,
  systemLogo
}) => {
  const [tipoMaterial, setTipoMaterial] = useState<'LC3' | 'LC2' | 'ATX'>('LC3');
  const [espessura, setEspessura] = useState<number>(30);
  const [gramatura, setGramatura] = useState<number>(13.80);
  const [velocidade, setVelocidade] = useState<number>(230);
  const [metragem, setMetragem] = useState<number>(3623);

  const [rpmA, setRpmA] = useState<number>(56);
  const [rpmB, setRpmB] = useState<number>(116);
  const [rpmC, setRpmC] = useState<number>(146);
  const [rpmD, setRpmD] = useState<number>(56);

  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

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

  // Inicialização padrão
  useEffect(() => {
    handleEspessuraChange(30);
  }, []);

  // Copiar link externo para a área de transferência (Livre / Sem Login)
  const getExternalLink = () => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('gest-o-de-produ-o-2026.pages.dev') || origin.includes('pages.dev')) {
        return `${origin}/?page=calculadora#cast1`;
      }
    }
    return `https://gest-o-de-produ-o-2026.pages.dev/?page=calculadora#cast1`;
  };

  const handleCopyLink = async () => {
    const link = getExternalLink();
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
      setCopied(true);
      setShareFeedback('Link copiado! Você pode enviar por WhatsApp ou abrir em qualquer aparelho.');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback(null);
      }, 4000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleShare = async () => {
    const link = getExternalLink();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Calculadora % CAST 1 (Extrusora)',
          text: 'Acesse a Calculadora % CAST 1 diretamente em qualquer aparelho sem login:',
          url: link
        });
      } catch (e) {
        // Ignora cancelamento pelo usuário
      }
    } else {
      handleCopyLink();
    }
  };

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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 md:p-8">
      
      {/* Container Principal Centralizado */}
      <div className="w-full max-w-3xl flex flex-col space-y-5">

        {/* Barra Superior de Acesso Externo */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-700/60 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">
              Acesso Externo Livre &bull; Sem Login
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
              }`}
              title="Copiar link para enviar pelo WhatsApp ou abrir em outro aparelho"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Link Copiado!' : 'Copiar Link Externo'}</span>
            </button>

            {'share' in navigator && (
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 rounded-xl text-xs font-bold transition-all"
                title="Compartilhar link"
              >
                <Share2 size={14} />
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
            )}

            {onNavigateToApp && (
              <button
                onClick={onNavigateToApp}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
                title="Voltar ao Sistema de Gestão de Produção"
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">Sistema</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback visual ao copiar link */}
        {shareFeedback && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 rounded-2xl p-3 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Card Principal da Calculadora */}
        <div className="bg-white text-slate-800 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Calculator size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                    Calculadora % CAST 1
                  </h1>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Extrusora
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  Produção Integrada &amp; Balanceamento de Roscas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEspessuraChange(espessura)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
                title="Resetar parâmetros para os valores padrão da espessura selecionada"
              >
                <RefreshCw size={14} />
                <span>Resetar Padrão</span>
              </button>
            </div>
          </div>

          {/* Corpo da Calculadora */}
          <div className="p-4 sm:p-6 md:p-8 space-y-6 bg-slate-50/40">

            {/* Seletor: Tipo de Material & Espessura */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-8">
                
                {/* Tipo de Material */}
                <div className="flex flex-col items-center w-full sm:w-auto">
                  <label htmlFor="tipoMaterialStandalone" className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers size={15} className="text-blue-600" />
                    Tipo de Material
                  </label>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 w-full sm:w-auto justify-center">
                    {(['LC3', 'LC2', 'ATX'] as const).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => handleTipoMaterialChange(tipo)}
                        className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
                          tipoMaterial === tipo
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Espessura Principal */}
                <div className="flex flex-col items-center w-full sm:w-auto">
                  <label htmlFor="espessuraStandalone" className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Gauge size={15} className="text-blue-600" />
                    Espessura (µm)
                  </label>
                  <select
                    id="espessuraStandalone"
                    value={espessura}
                    onChange={(e) => handleEspessuraChange(parseFloat(e.target.value))}
                    className="w-full sm:w-44 py-2 px-3 text-base font-black border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none cursor-pointer focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-center"
                  >
                    {ESPESSURAS.map((esp) => (
                      <option key={esp} value={esp}>{esp} µm</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botões Rápidos de Espessura Comum */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 mr-1">
                  Atalhos Rápidos:
                </span>
                {QUICK_ESPESSURAS.map((qEsp) => (
                  <button
                    key={qEsp}
                    type="button"
                    onClick={() => handleEspessuraChange(qEsp)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      espessura === qEsp
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {qEsp} µm
                  </button>
                ))}
              </div>
            </div>

            {/* Parâmetros da Linha: Gramatura, Velocidade, Metragem */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                <Activity size={15} className="text-blue-600" />
                Dados Operacionais da Linha
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                
                {/* Gramatura */}
                <div className="flex flex-col">
                  <label htmlFor="standaloneGramatura" className="text-xs font-bold text-slate-600 mb-1.5 text-center">
                    Gramatura (g)
                  </label>
                  <input
                    type="number"
                    id="standaloneGramatura"
                    value={gramatura}
                    step="any"
                    onChange={(e) => handleGramaturaChange(parseFloat(e.target.value) || 0)}
                    className="w-full py-2.5 px-3 text-base font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                  />
                  <span className="text-[10px] text-slate-400 text-center mt-1 font-semibold">Tabela para 500 mm</span>
                </div>

                {/* Velocidade */}
                <div className="flex flex-col">
                  <label htmlFor="standaloneVelocidade" className="text-xs font-bold text-slate-600 mb-1.5 text-center">
                    Velocidade (m/min)
                  </label>
                  <input
                    type="number"
                    id="standaloneVelocidade"
                    value={velocidade}
                    step="any"
                    onChange={(e) => handleVelocidadeChange(parseFloat(e.target.value) || 0)}
                    className="w-full py-2.5 px-3 text-base font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                  />
                  <span className="text-[10px] text-slate-400 text-center mt-1 font-semibold">Linha Contínua</span>
                </div>

                {/* Metragem */}
                <div className="flex flex-col">
                  <label htmlFor="standaloneMetragem" className="text-xs font-bold text-slate-600 mb-1.5 text-center">
                    Metragem (m)
                  </label>
                  <input
                    type="number"
                    id="standaloneMetragem"
                    value={metragem}
                    step="any"
                    onChange={(e) => setMetragem(parseFloat(e.target.value) || 0)}
                    className="w-full py-2.5 px-3 text-base font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                  />
                  <span className="text-[10px] text-slate-400 text-center mt-1 font-semibold">Bobina 50 kg</span>
                </div>
              </div>
            </div>

            {/* Cards das 4 Roscas (A, B, C, D) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-blue-600" />
                  Balanceamento de Roscas (Extrusão)
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  Ajuste RPM com vazão automática
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rosca A */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 border-t-4 border-t-blue-600 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-slate-900">Rosca A</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                        Estrutural
                      </span>
                    </div>
                    <span className="block text-[11px] font-semibold text-slate-400 mb-3">
                      Estrutural Grande
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-600">RPM:</span>
                      <input
                        type="number"
                        id="standaloneRpmA"
                        value={rpmA}
                        step="any"
                        onChange={(e) => handleRpmAouDChange(parseFloat(e.target.value) || 0, rpmD)}
                        className="w-full py-2 px-3 text-lg font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-900 focus:border-blue-600 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200 text-center">
                    <div className="text-2xl font-black text-blue-700">{formatarPorcentagem(pctA)}</div>
                    <div className="text-xs font-bold text-slate-500 mt-0.5">{vazaoA.toFixed(1).replace('.', ',')} kg/h</div>
                  </div>
                </div>

                {/* Rosca B */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 border-t-4 border-t-amber-600 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-slate-900">Rosca B</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                        Interna
                      </span>
                    </div>
                    <span className="block text-[11px] font-semibold text-slate-400 mb-3">
                      Pega / Interna (~5%)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-600">RPM:</span>
                      <input
                        type="number"
                        id="standaloneRpmB"
                        value={rpmB}
                        step="any"
                        onChange={(e) => setRpmB(parseFloat(e.target.value) || 0)}
                        className="w-full py-2 px-3 text-lg font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-900 focus:border-amber-600 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200 text-center">
                    <div className="text-2xl font-black text-amber-600">{formatarPorcentagem(pctB)}</div>
                    <div className="text-xs font-bold text-slate-500 mt-0.5">{vazaoB.toFixed(1).replace('.', ',')} kg/h</div>
                  </div>
                </div>

                {/* Rosca C */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 border-t-4 border-t-emerald-600 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-slate-900">Rosca C</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                        Externa
                      </span>
                    </div>
                    <span className="block text-[11px] font-semibold text-slate-400 mb-3">
                      Metalloceno / Externa ({tipoMaterial === 'LC2' ? '~5%' : '~10%'})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-600">RPM:</span>
                      <input
                        type="number"
                        id="standaloneRpmC"
                        value={rpmC}
                        step="any"
                        onChange={(e) => setRpmC(parseFloat(e.target.value) || 0)}
                        className="w-full py-2 px-3 text-lg font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-900 focus:border-emerald-600 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200 text-center">
                    <div className="text-2xl font-black text-emerald-600">{formatarPorcentagem(pctC)}</div>
                    <div className="text-xs font-bold text-slate-500 mt-0.5">{vazaoC.toFixed(1).replace('.', ',')} kg/h</div>
                  </div>
                </div>

                {/* Rosca D */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 border-t-4 border-t-blue-600 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-slate-900">Rosca D</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                        Estrutural
                      </span>
                    </div>
                    <span className="block text-[11px] font-semibold text-slate-400 mb-3">
                      Estrutural Grande
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-600">RPM:</span>
                      <input
                        type="number"
                        id="standaloneRpmD"
                        value={rpmD}
                        step="any"
                        onChange={(e) => handleRpmAouDChange(rpmA, parseFloat(e.target.value) || 0)}
                        className="w-full py-2 px-3 text-lg font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-900 focus:border-blue-600 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200 text-center">
                    <div className="text-2xl font-black text-blue-700">{formatarPorcentagem(pctD)}</div>
                    <div className="text-xs font-bold text-slate-500 mt-0.5">{vazaoD.toFixed(1).replace('.', ',')} kg/h</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total das Camadas */}
            <div className={`text-center font-black text-sm py-3 px-4 rounded-2xl shadow-sm border flex items-center justify-center gap-2 ${
              Math.abs(totalCamadas - 100) < 0.5 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}>
              <span className="text-base">{Math.abs(totalCamadas - 100) < 0.5 ? '✅' : '⚠️'}</span>
              <span>Total das Camadas: <strong>{formatarPorcentagem(totalCamadas)}</strong></span>
            </div>

            {/* Indicadores da Linha (Card Gradiente) */}
            <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-blue-500/30">
              <h3 className="text-sm font-black uppercase tracking-wider text-center text-white/95 mb-5 pb-2.5 border-b border-white/15 flex items-center justify-center gap-2">
                <Cpu size={18} className="text-yellow-300" />
                Indicadores da Linha de Produção
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                
                {/* Taxa de Produção */}
                <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 flex flex-col justify-between">
                  <span className="text-white/80 text-[11px]">Taxa de Produção Total:</span>
                  <span className="text-yellow-300 font-black text-xl sm:text-2xl mt-1">
                    {taxaProducaoQuilos.toFixed(2).replace('.', ',')} <span className="text-xs font-semibold text-yellow-200">Kg/h</span>
                  </span>
                </div>

                {/* Paletes / Turno */}
                <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 flex flex-col justify-between">
                  <span className="text-white/80 text-[11px] flex items-center gap-1.5">
                    <Box size={14} className="text-blue-300" />
                    Paletes / Turno (12h):
                  </span>
                  <span className="font-black text-white text-xl sm:text-2xl mt-1">
                    {resultadoPalete} <span className="text-xs font-semibold text-white/70">paletes</span>
                  </span>
                </div>

                {/* Tempo para 1 Palete */}
                <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 flex flex-col justify-between">
                  <span className="text-white/80 text-[11px] flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-300" />
                    Tempo para 1 Palete:
                  </span>
                  <span className="font-black text-white text-lg mt-1">
                    {formatarTempo(tempoPalete)}
                  </span>
                </div>

                {/* Tempo por Queda */}
                <div className="bg-white/10 rounded-2xl p-3.5 border border-white/10 flex flex-col justify-between">
                  <span className="text-white/80 text-[11px] flex items-center gap-1.5">
                    <Gauge size={14} className="text-emerald-300" />
                    Tempo por Queda:
                  </span>
                  <span className="font-black text-emerald-300 text-lg mt-1">
                    {tempoQuedaMinutos.replace('.', ',')} <span className="text-xs font-semibold">min</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Informações Técnicas e de Apoio */}
            <div className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200 text-slate-600 text-xs space-y-2">
              <div className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-wider text-[11px]">
                <Info size={14} className="text-blue-600" />
                Guia de Referência Operacional (CAST 1)
              </div>
              <p className="leading-relaxed text-[11px]">
                <strong>Rendimentos por RPM:</strong> Rosca A e D (500/58 ≈ 8,62 Kg/h/RPM) &bull; Rosca B (63,83/130 ≈ 0,49 Kg/h/RPM) &bull; Rosca C (125/160 ≈ 0,78 Kg/h/RPM).
              </p>
              <p className="leading-relaxed text-[11px]">
                <strong>Camadas Alvo:</strong> B = 5% &bull; C = {tipoMaterial === 'LC2' ? '5%' : '10%'} &bull; A e D dividem igualmente a porção estrutural restante ({formatarPorcentagem((100 - (tipoMaterial === 'LC2' ? 10 : 15)) / 2)} cada).
              </p>
            </div>

          </div>

          {/* Rodapé do Card */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-400 font-bold text-center sm:text-left text-[11px]">
              Manupackaging Fitasa &amp; Amazonia &bull; Desenvolvido por Adaias Melo
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-blue-600/20"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Link Copiado!' : 'Copiar Link da Calculadora'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Card Informativo com Link Externo e QR Code / Acesso em Qualquer Dispositivo */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4 sm:p-5 text-center text-slate-300 text-xs space-y-2">
          <p className="font-bold text-slate-200 text-sm">
            📱 Use em Qualquer Aparelho Sem Login
          </p>
          <p className="text-slate-400 max-w-md mx-auto text-[11px] leading-relaxed">
            Este endereço é público e pode ser acessado em smartphones, tablets ou computadores na fábrica sem necessidade de usuário ou senha.
          </p>
          <div className="pt-2">
            <code className="bg-slate-900 px-3 py-1.5 rounded-lg text-blue-400 font-mono text-[11px] select-all border border-slate-700 inline-block">
              {getExternalLink()}
            </code>
          </div>
        </div>

      </div>

    </div>
  );
};
