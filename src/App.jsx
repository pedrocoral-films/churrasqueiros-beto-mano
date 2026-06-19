import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  Beef,
  CalendarDays,
  ChefHat,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Flame,
  MessageCircle,
  Phone,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import LOGO_URL from "./assets/logo-beto-e-mano.png";

const STORAGE_KEY = "app_churrasqueiros_agenda";
const LOGO_KEY = "app_churrasqueiros_logo";
const EMPRESA = "OS CHURRASQUEIROS BETO E MANO";
const VALOR_BASE_CHURRASQUEIRO = 350;

const PDF_COLORS = {
  black: [9, 9, 11],
  graphite: [28, 25, 23],
  gold: [161, 116, 35],
  goldLight: [202, 158, 66],
  ember: [116, 28, 18],
  cream: [250, 247, 241],
  line: [229, 222, 211],
  text: [41, 37, 36],
  muted: [120, 113, 108],
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function criarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function formatarData(dataISO) {
  if (!dataISO) return "—";
  const [ano, mes, dia] = dataISO.split("-");
  if (!ano || !mes || !dia) return dataISO;
  return `${dia}/${mes}/${ano}`;
}

function formatarKg(valor) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`;
}

function mascaraTelefone(valor) {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 6) return numeros.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (numeros.length <= 10) return numeros.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return numeros.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

function calcularOrcamento({ nome, telefone, dataEvento, pessoas, tipoServico }) {
  const quantidadePessoas = Number(pessoas);
  const comEntrada = tipoServico === "com_entrada";
  const carnePorPessoaGramas = comEntrada ? 400 : 300;
  const quantidadeChurrasqueiros = quantidadePessoas > 100 ? 2 : 1;
  const quantidadeTotalCarneKg = (quantidadePessoas * carnePorPessoaGramas) / 1000;
  const valorTotal = VALOR_BASE_CHURRASQUEIRO * quantidadeChurrasqueiros;

  return {
    id: criarId(),
    nome: nome.trim(),
    telefone: telefone.trim(),
    dataEvento,
    pessoas: quantidadePessoas,
    tipoServico,
    tipoServicoTexto: comEntrada ? "Com entrada" : "Sem entrada",
    carnePorPessoaGramas,
    quantidadeTotalCarneKg,
    quantidadeChurrasqueiros,
    valorBaseChurrasqueiro: VALOR_BASE_CHURRASQUEIRO,
    valorTotal,
    criadoEm: new Date().toISOString(),
  };
}

function imagemParaDataUrl(src) {
  return new Promise((resolve) => {
    if (!src) return resolve("");
    if (src.startsWith("data:")) return resolve(src);

    const imagem = new Image();
    imagem.crossOrigin = "anonymous";
    imagem.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = imagem.naturalWidth;
      canvas.height = imagem.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imagem, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    imagem.onerror = () => resolve("");
    imagem.src = src;
  });
}

function telefoneParaWhatsApp(telefone) {
  const numeros = String(telefone || "").replace(/\D/g, "");
  if (!numeros) return "";
  return numeros.startsWith("55") ? numeros : `55${numeros}`;
}

function mensagemWhatsApp(orcamento) {
  return [
    `Olá, ${orcamento.nome}!`,
    "Segue o orçamento do churrasco em PDF.",
    `Data: ${formatarData(orcamento.dataEvento)}`,
    `Pessoas: ${orcamento.pessoas}`,
    `Serviço: ${orcamento.tipoServicoTexto}`,
    `Valor final: ${formatarMoeda(orcamento.valorTotal)}`,
  ].join("\n");
}

async function montarPDF(orcamento, logoUsuarioDataUrl) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const logoPDF = await imagemParaDataUrl(logoUsuarioDataUrl || LOGO_URL);

  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, largura, altura, "F");

  doc.setFillColor(10, 10, 10);
  doc.roundedRect(10, 10, largura - 20, 62, 5, 5, "F");
  doc.setDrawColor(161, 116, 35);
  doc.setLineWidth(0.35);
  doc.roundedRect(10, 10, largura - 20, 62, 5, 5, "S");

  if (logoPDF) {
    try {
      doc.addImage(logoPDF, "PNG", 22, 18, largura - 44, 42);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(245, 245, 245);
      doc.text(EMPRESA, largura / 2, 42, { align: "center" });
    }
  }

  doc.setFillColor(161, 116, 35);
  doc.roundedRect(10, 78, largura - 20, 2.5, 1.2, 1.2, "F");

  const card = (x, y, w, h) => {
    doc.setFillColor(15, 15, 15);
    doc.roundedRect(x, y, w, h, 4, 4, "F");
    doc.setDrawColor(58, 44, 24);
    doc.roundedRect(x, y, w, h, 4, 4, "S");
  };

  const tituloSecao = (titulo, x, y) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(202, 158, 66);
    doc.text(titulo, x, y);
  };

  const linha = (label, valor, x, y, w) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.setTextColor(145, 135, 120);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.3);
    doc.setTextColor(245, 245, 245);
    const valorQuebrado = doc.splitTextToSize(String(valor || "—"), w - 70);
    doc.text(valorQuebrado, x + 68, y, { align: "left" });

    doc.setDrawColor(38, 38, 38);
    doc.line(x, y + 5, x + w, y + 5);
  };

  card(14, 90, largura - 28, 52);
  tituloSecao("DADOS DO CLIENTE", 24, 104);
  linha("Cliente", orcamento.nome, 24, 116, largura - 48);
  linha("WhatsApp", orcamento.telefone || "Não informado", 24, 128, largura - 48);
  linha("Data do evento", formatarData(orcamento.dataEvento), 24, 140, largura - 48);

  card(14, 152, largura - 28, 64);
  tituloSecao("DADOS DO EVENTO", 24, 166);
  linha("Pessoas", `${orcamento.pessoas} pessoas`, 24, 178, largura - 48);
  linha("Tipo de serviço", `${orcamento.tipoServicoTexto} (${orcamento.carnePorPessoaGramas}g por pessoa)`, 24, 190, largura - 48);
  linha("Carne total", formatarKg(orcamento.quantidadeTotalCarneKg), 24, 202, largura - 48);
  linha("Churrasqueiros", `${orcamento.quantidadeChurrasqueiros} churrasqueiro${orcamento.quantidadeChurrasqueiros > 1 ? "s" : ""}`, 24, 214, largura - 48);

  card(14, 226, largura - 28, 28);
  tituloSecao("INFORMAÇÕES DO ORÇAMENTO", 24, 240);
  linha("Valor por churrasqueiro", formatarMoeda(orcamento.valorBaseChurrasqueiro), 24, 252, largura - 48);

  doc.setFillColor(116, 28, 18);
  doc.roundedRect(14, 264, largura - 28, 24, 5, 5, "F");
  doc.setDrawColor(202, 158, 66);
  doc.setLineWidth(0.45);
  doc.roundedRect(14, 264, largura - 28, 24, 5, 5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(245, 245, 245);
  doc.text("VALOR FINAL", 24, 279);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(238, 198, 94);
  doc.text(formatarMoeda(orcamento.valorTotal), largura - 24, 280, { align: "right" });

  doc.setFillColor(5, 5, 5);
  doc.rect(0, altura - 8, largura, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(202, 158, 66);
  doc.text(EMPRESA, largura / 2, altura - 3.2, { align: "center" });

  const nomeArquivo = `Orcamento_${orcamento.nome || "cliente"}`
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  return { doc, nomeArquivo };
}

function blobParaDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onloadend = () => resolve(String(leitor.result || ""));
    leitor.onerror = reject;
    leitor.readAsDataURL(blob);
  });
}

async function criarPDFInterno(orcamento, logoUsuarioDataUrl) {
  const { doc, nomeArquivo } = await montarPDF(orcamento, logoUsuarioDataUrl);
  const blob = doc.output("blob");
  const pdfDataUrl = await blobParaDataUrl(blob);

  return {
    pdfDataUrl,
    pdfNome: `${nomeArquivo}.pdf`,
    pdfCriadoEm: new Date().toISOString(),
  };
}

function baixarPDFInterno(pdfDataUrl, nomeArquivo) {
  const link = document.createElement("a");
  link.href = pdfDataUrl;
  link.download = nomeArquivo || "orcamento.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function dataUrlParaArquivo(pdfDataUrl, nomeArquivo) {
  const resposta = await fetch(pdfDataUrl);
  const blob = await resposta.blob();
  return new File([blob], nomeArquivo || "orcamento.pdf", { type: "application/pdf" });
}

async function salvarPDF(orcamento, logoUsuarioDataUrl) {
  if (orcamento.pdfDataUrl) {
    baixarPDFInterno(orcamento.pdfDataUrl, orcamento.pdfNome || `Orcamento_${orcamento.nome || "cliente"}.pdf`);
    return;
  }

  const { doc, nomeArquivo } = await montarPDF(orcamento, logoUsuarioDataUrl);
  doc.save(`${nomeArquivo}.pdf`);
}

async function compartilharPDFWhatsApp(orcamento, logoUsuarioDataUrl) {
  let arquivo;

  if (orcamento.pdfDataUrl) {
    arquivo = await dataUrlParaArquivo(orcamento.pdfDataUrl, orcamento.pdfNome || `Orcamento_${orcamento.nome || "cliente"}.pdf`);
  } else {
    const { doc, nomeArquivo } = await montarPDF(orcamento, logoUsuarioDataUrl);
    const blob = doc.output("blob");
    arquivo = new File([blob], `${nomeArquivo}.pdf`, { type: "application/pdf" });
  }

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    await navigator.share({
      files: [arquivo],
      title: "Orçamento de churrasco",
      text: mensagemWhatsApp(orcamento),
    });
    return;
  }

  throw new Error("Este navegador não permitiu compartilhar arquivo PDF diretamente.");
}

function SplashScreen({ logoDataUrl, onFinish }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 1800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070707] px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(161,116,35,0.22),transparent_42%),radial-gradient(circle_at_bottom,rgba(116,28,18,0.22),transparent_36%)]" />
      <div className="relative grid w-full max-w-xs grid-cols-1 gap-5 text-center splash-enter sm:max-w-sm">
        <div className="rounded-[2rem] border border-[#a17423]/25 bg-transparent p-2 shadow-[0_0_3rem_rgba(161,116,35,0.24)]">
          <img src={logoDataUrl || LOGO_URL} alt={EMPRESA} className="mx-auto max-h-36 w-full object-contain" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-full border border-[#a17423]/25 bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#ca9e42]">
          <Flame className="w-4" /> Orçamentos para eventos
        </div>
      </div>

      <style>{`
        @keyframes splashEnter {
          from { opacity: 0; transform: scale(0.96) translateY(0.75rem); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .splash-enter { animation: splashEnter 700ms ease-out both; }
      `}</style>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="grid w-full grid-cols-1 gap-2">
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#ca9e42]">
        {Icon && <Icon className="w-4 text-[#a17423] drop-shadow-[0_0_0.5rem_rgba(161,116,35,0.35)]" />}
        {label}
      </span>
      {children}
    </label>
  );
}

function InputBase(props) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-[#101010]/90 px-4 py-4 text-base text-white outline-none transition duration-300 placeholder:text-stone-600",
        "focus:border-[#a17423] focus:bg-black focus:shadow-[0_0_1.4rem_rgba(161,116,35,0.18)]",
        props.className
      )}
    />
  );
}

function Card({ children, destaque = false, className = "" }) {
  return (
    <div
      className={cn(
        "w-full rounded-[1.75rem] border p-4 shadow-2xl transition duration-300 md:p-5",
        destaque
          ? "border-[#a17423]/35 bg-[linear-gradient(145deg,rgba(24,24,27,0.96),rgba(36,18,14,0.92))] shadow-[0_0_2.5rem_rgba(161,116,35,0.10)]"
          : "border-white/10 bg-[#111111]/90 shadow-black/40",
        className
      )}
    >
      {children}
    </div>
  );
}

function Button({ children, icon: Icon, variant = "primary", className = "", ...props }) {
  const variants = {
    primary:
      "bg-[linear-gradient(135deg,#a17423,#741c12)] text-white shadow-[0_0_1.5rem_rgba(161,116,35,0.22)] hover:shadow-[0_0_2rem_rgba(202,158,66,0.30)] hover:-translate-y-0.5",
    secondary:
      "border border-[#a17423]/30 bg-white/5 text-[#ca9e42] hover:bg-[#a17423]/10 hover:border-[#a17423]/60",
    danger:
      "border border-red-400/30 bg-red-950/40 text-red-100 hover:bg-red-900/50",
    ghost:
      "border border-white/10 bg-black/20 text-stone-200 hover:bg-white/10",
  };

  return (
    <button
      {...props}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-black uppercase tracking-[0.12em] transition duration-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
    >
      {Icon && <Icon className="w-5" />}
      {children}
    </button>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex items-center gap-2 text-[#a17423]">
        <Icon className="w-5 drop-shadow-[0_0_0.7rem_rgba(161,116,35,0.4)]" />
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">{label}</span>
      </div>
      <p className="text-xl font-black text-white">{value}</p>
    </div>
  );
}

function LinhaResumo({ label, valor, icon: Icon }) {
  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-white/10 py-3 last:border-b-0">
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-stone-400">
        {Icon && <Icon className="w-4 text-[#a17423]" />}
        {label}
      </span>
      <span className="text-right text-sm font-bold text-stone-50">{valor}</span>
    </div>
  );
}

function LogoBox({ logoDataUrl, compact = false }) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center overflow-hidden border border-[#a17423]/20 bg-transparent shadow-[0_0_2rem_rgba(161,116,35,0.10)]",
        compact ? "rounded-2xl px-2 py-1" : "rounded-[1.5rem] p-2"
      )}
    >
      <img
        src={logoDataUrl || LOGO_URL}
        alt={EMPRESA}
        className={cn(
          "mx-auto w-full object-contain",
          compact ? "max-h-20 max-w-sm" : "max-h-32 max-w-md"
        )}
      />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [tela, setTela] = useState("orcamento");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [pessoas, setPessoas] = useState("");
  const [tipoServico, setTipoServico] = useState("com_entrada");
  const [orcamentoAtual, setOrcamentoAtual] = useState(null);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);

  const [agenda, setAgenda] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setLogoDataUrl(localStorage.getItem(LOGO_KEY) || "");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agenda));
  }, [agenda]);

  useEffect(() => {
    if (!mensagem) return;
    const timer = setTimeout(() => setMensagem(""), 2800);
    return () => clearTimeout(timer);
  }, [mensagem]);

  const previaCalculo = useMemo(() => {
    const qtd = Number(pessoas);
    if (!qtd || qtd < 1) return null;
    return calcularOrcamento({
      nome: nome || "Cliente",
      telefone,
      dataEvento,
      pessoas: qtd,
      tipoServico,
    });
  }, [nome, telefone, dataEvento, pessoas, tipoServico]);

  function limparFormulario() {
    setNome("");
    setTelefone("");
    setDataEvento("");
    setPessoas("");
    setTipoServico("com_entrada");
  }

  async function gerarOrcamento(evento) {
    evento.preventDefault();

    if (!nome.trim()) return setMensagem("Informe o nome do cliente.");
    if (!telefone.trim()) return setMensagem("Informe o WhatsApp do cliente.");
    if (!dataEvento) return setMensagem("Informe a data do evento.");
    if (!Number(pessoas) || Number(pessoas) < 1) return setMensagem("Informe a quantidade de pessoas.");

    const novoOrcamento = calcularOrcamento({ nome, telefone, dataEvento, pessoas, tipoServico });
    let orcamentoComPDF = novoOrcamento;

    try {
      const pdfInterno = await criarPDFInterno(novoOrcamento, logoDataUrl);
      orcamentoComPDF = { ...novoOrcamento, ...pdfInterno };
    } catch {
      orcamentoComPDF = novoOrcamento;
    }

    setOrcamentoAtual(orcamentoComPDF);
    setAgenda((listaAtual) => [orcamentoComPDF, ...listaAtual]);
    setTela("orcamento");
    setMensagem("Orçamento criado com PDF salvo na agenda.");
  }

  function excluirCliente(id) {
    const confirmar = window.confirm("Deseja excluir este cliente da agenda?");
    if (!confirmar) return;

    setAgenda((listaAtual) => listaAtual.filter((item) => item.id !== id));
    if (clienteSelecionado?.id === id) setClienteSelecionado(null);
    setMensagem("Cliente excluído.");
  }

  function carregarLogo(evento) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = String(leitor.result || "");
      setLogoDataUrl(resultado);
      localStorage.setItem(LOGO_KEY, resultado);
      setMensagem("Logo personalizada salva.");
    };
    leitor.readAsDataURL(arquivo);
  }

  function removerLogo() {
    setLogoDataUrl("");
    localStorage.removeItem(LOGO_KEY);
    setMensagem("Logo padrão restaurada.");
  }

  async function gerarPDF(orcamento) {
    if (!orcamento) return;
    setGerandoPDF(true);
    try {
      await salvarPDF(orcamento, logoDataUrl);
      setMensagem("PDF criado com sucesso.");
    } catch {
      setMensagem("Não foi possível criar o PDF. Tente novamente.");
    } finally {
      setGerandoPDF(false);
    }
  }


  async function enviarWhatsApp(orcamento) {
    if (!orcamento) return;
    setEnviandoWhatsApp(true);
    try {
      await compartilharPDFWhatsApp(orcamento, logoDataUrl);
      setMensagem("Escolha o WhatsApp para enviar o PDF.");
    } catch {
      setMensagem("O celular não permitiu anexar o PDF direto. Abra pelo Chrome e use o botão novamente.");
    } finally {
      setEnviandoWhatsApp(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#070707] text-stone-100">
      {showSplash && <SplashScreen logoDataUrl={logoDataUrl} onFinish={() => setShowSplash(false)} />}

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(161,116,35,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(116,28,18,0.24),transparent_36%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-4 md:px-6">
        <header className="sticky top-0 z-30 -mx-4 border-b border-[#a17423]/20 bg-black/85 px-4 py-4 backdrop-blur-xl md:-mx-6 md:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="w-full max-w-xs md:max-w-sm">
              <LogoBox logoDataUrl={logoDataUrl} compact />
            </div>

            <nav className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 md:max-w-md">
              <button
                type="button"
                onClick={() => {
                  setTela("orcamento");
                  setClienteSelecionado(null);
                }}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black uppercase tracking-wide transition duration-300",
                  tela === "orcamento"
                    ? "bg-[linear-gradient(135deg,#a17423,#741c12)] text-white shadow-[0_0_1.5rem_rgba(161,116,35,0.20)]"
                    : "text-stone-300 hover:bg-white/10"
                )}
              >
                <FileText className="w-4" /> Orçamento
              </button>
              <button
                type="button"
                onClick={() => {
                  setTela("agenda");
                  setClienteSelecionado(null);
                }}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black uppercase tracking-wide transition duration-300",
                  tela === "agenda"
                    ? "bg-[linear-gradient(135deg,#a17423,#741c12)] text-white shadow-[0_0_1.5rem_rgba(161,116,35,0.20)]"
                    : "text-stone-300 hover:bg-white/10"
                )}
              >
                <ClipboardList className="w-4" /> Agenda
              </button>
            </nav>
          </div>
        </header>

        <section className="grid w-full grid-cols-1 gap-5 py-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          {tela === "orcamento" && (
            <>
              <div className="grid w-full grid-cols-1 gap-5">
                <Card destaque>
                  <div className="mb-5 grid w-full grid-cols-1 gap-4">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ca9e42]">
                        <ChefHat className="w-4" /> Novo orçamento
                      </p>
                      <h1 className="mt-2 text-3xl font-black text-white">Dados do evento</h1>
                      <p className="mt-2 text-sm leading-relaxed text-stone-400">
                        Cadastre o cliente, calcule o atendimento, salve o histórico e envie uma proposta em PDF.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={gerarOrcamento} className="grid w-full grid-cols-1 gap-4">
                    <Field label="Nome do cliente" icon={Users}>
                      <InputBase value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" />
                    </Field>

                    <Field label="Número / WhatsApp" icon={Phone}>
                      <InputBase value={telefone} onChange={(e) => setTelefone(mascaraTelefone(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" />
                    </Field>

                    <Field label="Data do evento" icon={CalendarDays}>
                      <InputBase value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} type="date" />
                    </Field>

                    <Field label="Quantidade de pessoas" icon={Users}>
                      <InputBase value={pessoas} onChange={(e) => setPessoas(e.target.value)} placeholder="Ex: 80" inputMode="numeric" type="number" min="1" />
                    </Field>

                    <Field label="Tipo de serviço" icon={Beef}>
                      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setTipoServico("com_entrada")}
                          className={cn(
                            "w-full rounded-2xl border p-4 text-left transition duration-300",
                            tipoServico === "com_entrada"
                              ? "border-[#a17423] bg-[#a17423]/18 shadow-[0_0_1.4rem_rgba(161,116,35,0.16)]"
                              : "border-white/10 bg-black/25 hover:border-[#a17423]/50"
                          )}
                        >
                          <span className="mb-2 flex items-center gap-2 text-base font-black text-white">
                            <CheckCircle2 className="w-5 text-[#ca9e42]" /> Com entrada
                          </span>
                          <span className="text-sm text-stone-400">400g por pessoa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTipoServico("sem_entrada")}
                          className={cn(
                            "w-full rounded-2xl border p-4 text-left transition duration-300",
                            tipoServico === "sem_entrada"
                              ? "border-[#a17423] bg-[#a17423]/18 shadow-[0_0_1.4rem_rgba(161,116,35,0.16)]"
                              : "border-white/10 bg-black/25 hover:border-[#a17423]/50"
                          )}
                        >
                          <span className="mb-2 flex items-center gap-2 text-base font-black text-white">
                            <CheckCircle2 className="w-5 text-[#ca9e42]" /> Sem entrada
                          </span>
                          <span className="text-sm text-stone-400">300g por pessoa</span>
                        </button>
                      </div>
                    </Field>

                    {previaCalculo && <PreviewCalculo previa={previaCalculo} />}

                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                      <Button type="submit" icon={FileText}>Gerar orçamento</Button>
                      <Button type="button" variant="secondary" icon={X} onClick={limparFormulario}>Limpar campos</Button>
                    </div>
                  </form>
                </Card>
              </div>

              <div className="grid w-full grid-cols-1 gap-5 self-start lg:sticky lg:top-36">
                {orcamentoAtual ? (
                  <OrcamentoResultado orcamento={orcamentoAtual} onPDF={() => gerarPDF(orcamentoAtual)} onWhatsApp={() => enviarWhatsApp(orcamentoAtual)} gerandoPDF={gerandoPDF} enviandoWhatsApp={enviandoWhatsApp} onVerAgenda={() => setTela("agenda")} />
                ) : (
                  <Card>
                    <div className="grid w-full grid-cols-1 place-items-center gap-4 py-8 text-center">
                      <div className="flex aspect-square w-20 items-center justify-center rounded-[2rem] bg-[#a17423]/10 text-[#ca9e42] shadow-[0_0_2rem_rgba(161,116,35,0.12)]">
                        <FileText className="w-10" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white">Resumo do orçamento</h3>
                        <p className="mt-2 text-sm leading-relaxed text-stone-400">
                          Preencha os dados do evento para visualizar o resumo, salvar na agenda e criar o PDF.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}

          {tela === "agenda" && (
            <div className="lg:col-span-2">
              {clienteSelecionado ? (
                <ClienteDetalhes cliente={clienteSelecionado} onVoltar={() => setClienteSelecionado(null)} onExcluir={() => excluirCliente(clienteSelecionado.id)} onPDF={() => gerarPDF(clienteSelecionado)} onWhatsApp={() => enviarWhatsApp(clienteSelecionado)} gerandoPDF={gerandoPDF} enviandoWhatsApp={enviandoWhatsApp} />
              ) : (
                <AgendaLista agenda={agenda} onVisualizar={setClienteSelecionado} onExcluir={excluirCliente} />
              )}
            </div>
          )}
        </section>
      </div>

      {mensagem && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-full max-w-md px-4">
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ca9e42]/30 bg-[#111111] px-4 py-4 text-center text-sm font-black text-[#ca9e42] shadow-[0_0_2rem_rgba(161,116,35,0.20)]">
            <Sparkles className="w-4" /> {mensagem}
          </div>
        </div>
      )}
    </main>
  );
}

function PreviewCalculo({ previa }) {
  return (
    <div className="rounded-[1.5rem] border border-[#a17423]/25 bg-[#a17423]/10 p-4 shadow-[0_0_1.6rem_rgba(161,116,35,0.10)]">
      <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ca9e42]">
        <Sparkles className="w-4" /> Prévia instantânea
      </p>
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric icon={Beef} label="Carne" value={formatarKg(previa.quantidadeTotalCarneKg)} />
        <Metric icon={ChefHat} label="Equipe" value={`${previa.quantidadeChurrasqueiros} churr.`} />
        <Metric icon={Wallet} label="Total" value={formatarMoeda(previa.valorTotal)} />
      </div>
    </div>
  );
}

function OrcamentoResultado({ orcamento, onPDF, onWhatsApp, gerandoPDF, enviandoWhatsApp, onVerAgenda }) {
  return (
    <Card destaque>
      <div className="mb-5 flex w-full items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ca9e42]">
            <CheckCircle2 className="w-4" /> Orçamento salvo
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">{orcamento.nome}</h2>
          <p className="mt-1 text-sm text-stone-400">{formatarData(orcamento.dataEvento)}</p>
        </div>
        <div className="rounded-2xl bg-[#a17423]/10 p-3 text-[#ca9e42]">
          <Flame className="w-6" />
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-1">
        <LinhaResumo icon={Phone} label="WhatsApp" valor={orcamento.telefone || "—"} />
        <LinhaResumo icon={Users} label="Pessoas" valor={`${orcamento.pessoas} pessoas`} />
        <LinhaResumo icon={Beef} label="Tipo" valor={`${orcamento.tipoServicoTexto} (${orcamento.carnePorPessoaGramas}g)`} />
        <LinhaResumo icon={Beef} label="Carne total" valor={formatarKg(orcamento.quantidadeTotalCarneKg)} />
        <LinhaResumo icon={ChefHat} label="Churrasqueiros" valor={`${orcamento.quantidadeChurrasqueiros} churrasqueiro${orcamento.quantidadeChurrasqueiros > 1 ? "s" : ""}`} />
        <LinhaResumo icon={FileText} label="PDF interno" valor={orcamento.pdfDataUrl ? "Pronto na agenda" : "Será criado ao baixar"} />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[#a17423]/30 bg-black/35 p-5 shadow-[0_0_1.8rem_rgba(161,116,35,0.10)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Valor final</p>
        <p className="mt-2 text-4xl font-black text-[#ca9e42]">{formatarMoeda(orcamento.valorTotal)}</p>
      </div>

      <div className="mt-5 grid w-full grid-cols-1 gap-3">
        <Button type="button" icon={Download} onClick={onPDF} disabled={gerandoPDF || enviandoWhatsApp}>
          {gerandoPDF ? "Preparando PDF..." : "Baixar PDF interno"}
        </Button>
        <Button type="button" variant="secondary" icon={MessageCircle} onClick={onWhatsApp} disabled={gerandoPDF || enviandoWhatsApp}>
          {enviandoWhatsApp ? "Abrindo envio..." : "Enviar PDF pelo WhatsApp"}
        </Button>
        <Button type="button" variant="ghost" icon={ClipboardList} onClick={onVerAgenda}>
          Ver agenda
        </Button>
      </div>
    </Card>
  );
}

function AgendaLista({ agenda, onVisualizar, onExcluir }) {
  return (
    <Card destaque>
      <div className="mb-5 flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ca9e42]">
            <ClipboardList className="w-4" /> Agenda
          </p>
          <h2 className="mt-2 text-3xl font-black text-white">Clientes salvos</h2>
          <p className="mt-2 text-sm text-stone-400">Histórico de orçamentos criados.</p>
        </div>
        <span className="w-full rounded-2xl border border-[#a17423]/25 bg-black/25 px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-[#ca9e42] md:w-auto">
          {agenda.length} registro{agenda.length === 1 ? "" : "s"}
        </span>
      </div>

      {!agenda.length && (
        <div className="grid w-full grid-cols-1 place-items-center gap-4 rounded-[1.75rem] border border-dashed border-white/10 bg-black/25 p-8 text-center">
          <div className="flex aspect-square w-20 items-center justify-center rounded-[2rem] bg-[#a17423]/10 text-[#ca9e42]">
            <Beef className="w-10" />
          </div>
          <p className="max-w-md text-sm leading-relaxed text-stone-400">
            Nenhum cliente salvo ainda. Gere um orçamento para criar o primeiro registro na agenda.
          </p>
        </div>
      )}

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agenda.map((cliente) => (
          <article key={cliente.id} className="group grid w-full grid-cols-1 gap-4 rounded-[1.5rem] border border-white/10 bg-black/30 p-4 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-[#a17423]/35 hover:shadow-[0_0_2rem_rgba(161,116,35,0.10)]">
            <div className="flex w-full items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-black text-white">{cliente.nome}</h3>
                <p className="mt-1 flex items-center gap-2 text-sm text-stone-400">
                  <CalendarDays className="w-4" /> {formatarData(cliente.dataEvento)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#a17423]/10 p-3 text-[#ca9e42]">
                <ChefHat className="w-5" />
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 text-sm text-stone-300">
              <span className="rounded-xl bg-white/5 px-3 py-2">{cliente.pessoas} pessoas</span>
              <span className="rounded-xl bg-white/5 px-3 py-2">{cliente.quantidadeChurrasqueiros} churr.</span>
            </div>

            <strong className="text-2xl font-black text-[#ca9e42]">{formatarMoeda(cliente.valorTotal)}</strong>

            <span className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-wide text-stone-300">
              <FileText className="w-4 text-[#ca9e42]" /> {cliente.pdfDataUrl ? "PDF salvo" : "PDF pendente"}
            </span>

            <div className="grid w-full grid-cols-2 gap-2">
              <Button type="button" icon={Eye} className="py-3 text-xs" onClick={() => onVisualizar(cliente)}>
                Visualizar
              </Button>
              <Button type="button" variant="danger" icon={Trash2} className="py-3 text-xs" onClick={() => onExcluir(cliente.id)}>
                Excluir
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

function ClienteDetalhes({ cliente, onVoltar, onExcluir, onPDF, onWhatsApp, gerandoPDF, enviandoWhatsApp }) {
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-5">
      <Button type="button" variant="ghost" icon={ArrowLeft} onClick={onVoltar}>
        Voltar para agenda
      </Button>

      <Card destaque>
        <div className="mb-5 flex w-full items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ca9e42]">
              <Eye className="w-4" /> Detalhes do cliente
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">{cliente.nome}</h2>
            <p className="mt-2 text-sm text-stone-400">Registro salvo em {formatarData(cliente.criadoEm?.slice(0, 10))}</p>
          </div>
          <div className="rounded-[1.5rem] bg-[#a17423]/10 p-4 text-[#ca9e42]">
            <Users className="w-7" />
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-1">
          <LinhaResumo icon={Phone} label="WhatsApp" valor={cliente.telefone || "—"} />
          <LinhaResumo icon={CalendarDays} label="Data" valor={formatarData(cliente.dataEvento)} />
          <LinhaResumo icon={Users} label="Pessoas" valor={`${cliente.pessoas} pessoas`} />
          <LinhaResumo icon={Beef} label="Tipo" valor={cliente.tipoServicoTexto} />
          <LinhaResumo icon={Beef} label="Carne total" valor={formatarKg(cliente.quantidadeTotalCarneKg)} />
          <LinhaResumo icon={ChefHat} label="Churrasqueiros" valor={`${cliente.quantidadeChurrasqueiros} churrasqueiro${cliente.quantidadeChurrasqueiros > 1 ? "s" : ""}`} />
          <LinhaResumo icon={FileText} label="PDF interno" valor={cliente.pdfDataUrl ? "Pronto para enviar" : "Será criado ao baixar"} />
          <LinhaResumo icon={Wallet} label="Valor total" valor={formatarMoeda(cliente.valorTotal)} />
        </div>

        <div className="mt-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <Button type="button" icon={Download} onClick={onPDF} disabled={gerandoPDF || enviandoWhatsApp}>
            {gerandoPDF ? "Preparando..." : "Baixar PDF"}
          </Button>
          <Button type="button" variant="secondary" icon={MessageCircle} onClick={onWhatsApp} disabled={gerandoPDF || enviandoWhatsApp}>
            {enviandoWhatsApp ? "Abrindo..." : "WhatsApp"}
          </Button>
          <Button type="button" variant="danger" icon={Trash2} onClick={onExcluir}>
            Excluir cliente
          </Button>
        </div>
      </Card>
    </div>
  );
}
