import { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import assinatura from "./img/assinatura.png";
import { supabase } from "./supabase";

export default function App() {
  const [eventos, setEventos] = useState(() => {
    try {
      const salvos = localStorage.getItem("eventos");
      return salvos ? JSON.parse(salvos) : [];
    } catch {
      return [];
    }
  });

  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState("");
  const [historicoTelas, setHistoricoTelas] = useState([]);
  const [navegacaoAnterior, setNavegacaoAnterior] = useState(null);
  const [voltarCadastroPendente, setVoltarCadastroPendente] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [eventoExpandidoId, setEventoExpandidoId] = useState(null);
  const [modoEventosExpandido, setModoEventosExpandido] = useState(false);
  const [tituloListaAberta, setTituloListaAberta] = useState("");
  const [clienteAbertoChave, setClienteAbertoChave] = useState(null);
  const [origemTelaAnterior, setOrigemTelaAnterior] = useState(null);
  const [reciboAberto, setReciboAberto] = useState(null);
  const [tipoRecibo, setTipoRecibo] = useState("sinal");
  const [pagamentoRecibo, setPagamentoRecibo] = useState("Pix");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [mesCalendario, setMesCalendario] = useState(() => new Date().getMonth());
  const [anoCalendario, setAnoCalendario] = useState(() => new Date().getFullYear());
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [mostrarProximosComDiaSelecionado, setMostrarProximosComDiaSelecionado] = useState(false);
  const [dataConsultaAgenda, setDataConsultaAgenda] = useState("");
  const inputBackupRef = useRef(null);
  const valorInputRef = useRef(null);
  const entradaInputRef = useRef(null);
  const [larguraTela, setLarguraTela] = useState(() => window.innerWidth);
  const isMobile = larguraTela <= 700;

  const formInicial = {
    nome: "",
    cpf: "",
    whatsapp: "",
    tipoEvento: "",
    servicosTexto: "",
    clienteOnly: false,
    data: "",
    horaInicio: "",
    horaFim: "",
    endereco: "",
    cidade: "",
    bairro: "",
    pacote: "",
    pacotePersonalizado: "",
    valor: "",
    entrada: "",
    custo: "",
    custoDescricao: "",
    formaEntrada: "",
    formaPagamento: "",
    parcelas: "",
    obs: "",
    status: "pre",
    executado: false,
    quitado: false,
    obsInternas: "",
    obsExtras: "",
    pagamentoCadastroTipo: "nao",
    pagamentoCadastroValor: "",
    pagamentoCadastroContaId: "nubank",
    pagamentoCadastroForma: "Pix",
    pagamentoCadastroParcelas: "1",
    pagamentoCadastroTaxa: "0",
    pagamentoCadastroData: new Date().toISOString().slice(0, 10),
  };

  const PACOTES_PROFISSIONAIS = {
    "Pacote de ENTRADA 01 - DJ + Som": { valor: 450, entrada: 150, descricao: "DJ + som profissional para eventos compactos." },
    "Pacote 02 de ENTRADA - DJ + Som + Iluminação + Máquina de fumaça opcional": { valor: 650, entrada: 200, descricao: "DJ + som + iluminação + máquina de fumaça opcional." },
    "Pacote 03 Completo - DJ + Som + Iluminação Top + Máquina de fumaça opcional": { valor: 850, entrada: 250, descricao: "Pacote completo com DJ, som, iluminação top e fumaça opcional." },
    "Pacote 04 - Som + Luz + Máquina de fumaça opcional + DJ/VJ mixando vídeo na TV": { valor: 1000, entrada: 300, descricao: "DJ/VJ com mixagem de vídeo na TV, som, luz e fumaça opcional." },
    "Pacote 05 - Som + Luz + Máquina de fumaça + DJ/VJ mixando vídeo no telão": { valor: 1300, entrada: 400, descricao: "Experiência premium com DJ/VJ, telão, som, luz e máquina de fumaça." },
    "Pacote Kids Festa Infantil - DJ + Som + Luz + Máquina de fumaça opcional": { valor: 700, entrada: 200, descricao: "Pacote infantil com DJ, som, luz e fumaça opcional." },
    "Pacote Projeção - Telão + Projetor": { valor: 450, entrada: 150, descricao: "Telão + projetor para retrospectiva, vídeos e apresentação." },
    "Pacote Kids Criancinha Projeção - DJ + Som + Luz + Máquina de fumaça opcional + DJ mixando ao vivo no telão": { valor: 1100, entrada: 300, descricao: "Pacote kids com projeção e DJ mixando ao vivo no telão." },
    "Pacote Kids Festa Infantil Projeção - DJ + Som + Luz + Máquina de fumaça opcional + DJ mixando ao vivo no telão": { valor: 1200, entrada: 350, descricao: "Festa infantil com DJ, som, luz, fumaça opcional e telão." },
    "Pacote Kids Festa Infantil Projeção - Telão + Projetor + Caixa de som ativa + Tripé + 2 microfones sem fio": { valor: 800, entrada: 250, descricao: "Projeção com telão, projetor, caixa ativa, tripé e 2 microfones sem fio." },
    "Aluguel de equipamentos": { valor: 350, entrada: 100, descricao: "Locação de equipamentos conforme necessidade do evento." }
  };

  const pegarPacoteFinal = (evento = form) => evento.pacote === "Outro" ? evento.pacotePersonalizado : evento.pacote;

  const pacoteInfo = (pacote) => PACOTES_PROFISSIONAIS[pacote] || null;

  const campoFoiPreenchido = (valor) =>
    valor !== undefined && valor !== null && String(valor).trim() !== "";

  const valorOuPadrao = (valor, padrao = "0") =>
    campoFoiPreenchido(valor) ? String(valor) : String(padrao);

  const aplicarValorDoPacote = (pacoteEscolhido = form.pacote) => {
    const info = pacoteInfo(pacoteEscolhido);
    if (!info) return;

    // Este botão agora só usa a sugestão quando você clicar nele de propósito.
    // Se quiser preço manual, basta digitar no campo VALOR TOTAL e ele será mantido.
    setForm((atual) => ({
      ...atual,
      pacote: pacoteEscolhido,
      valor: String(info.valor),
      entrada: campoFoiPreenchido(atual.entrada) ? atual.entrada : "0",
      formaEntrada: atual.formaEntrada || "Pix",
      formaPagamento: atual.formaPagamento || "Entrada / sinal"
    }));
  };

  const confirmarValorManual = () => {
    const valorManual = String(form.valor ?? "").trim();
    const sinalManual = String(form.entrada ?? "").trim();

    if (!valorManual) {
      alert("Digite primeiro o valor final no campo VALOR TOTAL.");
      valorInputRef.current?.focus();
      return;
    }

    setForm((atual) => ({
      ...atual,
      valor: valorManual,
      entrada: sinalManual === "" ? "0" : sinalManual
    }));

    alert(`Valor manual confirmado!\n\nValor final: ${moeda(valorManual)}${sinalManual ? `\nSinal: ${moeda(sinalManual)}` : ""}\n\nA proposta, o contrato e o WhatsApp vão usar esse valor.`);
  };

  const mensagemComPreco = (evento = form) => {
    const pacoteFinal = pegarPacoteFinal(evento) || "pacote ideal para seu evento";
    const info = pacoteInfo(pacoteFinal);
    const total = Number(campoFoiPreenchido(evento.valor) ? evento.valor : (info?.valor || 0));
    const entrada = Number(campoFoiPreenchido(evento.entrada) ? evento.entrada : 0);
    const pendente = Math.max(total - entrada, 0);

    return [
      `Olá, ${evento.nome || "tudo bem"}! Tudo bem? 😊`,
      "",
      "Conferi as informações do seu evento e preparei uma opção profissional para você:",
      "",
      `🎉 Evento: ${evento.tipoEvento || "a confirmar"}`,
      `📅 Data: ${evento.data ? dataCurtaBR(evento.data) : "a confirmar"}`,
      `⏰ Horário: ${evento.horaInicio || "a combinar"}${evento.horaFim ? ` às ${evento.horaFim}` : ""}`,
      `📍 Local: ${cidadeBairroFinal(evento) || evento.endereco || "a confirmar"}`,
      "",
      `✅ Pacote indicado: ${pacoteFinal}`,
      info?.descricao ? `📦 Estrutura inclusa: ${info.descricao}` : "",
      "",
      total > 0 ? `💰 Valor total do serviço: ${moeda(total)}` : "💰 Valor total: a confirmar",
      entrada > 0 ? `🔐 Sinal para reservar a data: ${moeda(entrada)}` : "🔐 Sinal de reserva: a combinar",
      total > 0 ? `💳 Saldo para o dia do evento: ${moeda(pendente)}` : "",
      "",
      "Importante: a data só fica garantida após a confirmação do sinal/entrada combinado.",
      "Posso deixar essa opção reservada para você? 🙌"
    ].filter(Boolean).join("\n");
  };

  const copiarMensagemPreco = () => {
    const texto = mensagemComPreco(form);
    navigator.clipboard.writeText(texto);
    alert("Mensagem com preço copiada!");
  };

  const abrirWhatsAppProposta = (evento = form) => {
    const numero = String(evento.whatsapp || "").replace(/\D/g, "");
    if (!numero) {
      alert("Informe o WhatsApp do cliente primeiro.");
      return;
    }

    setWhatsAppEditor({
      evento,
      titulo: "Proposta editável para WhatsApp",
      numero,
      mensagem: mensagemComPreco(evento),
      acaoHistorico: "Proposta WhatsApp aberta",
      detalheHistorico: `${pegarPacoteFinal(evento) || "Pacote não informado"} - ${moeda(Number(evento.valor || 0))}`
    });
  };

  const [form, setForm] = useState(() => {
    try {
      const rascunho = localStorage.getItem("rascunhoFormJPEventos");
      return rascunho ? { ...formInicial, ...JSON.parse(rascunho) } : formInicial;
    } catch {
      return formInicial;
    }
  });
  const [custoDescricaoDigitando, setCustoDescricaoDigitando] = useState(() => {
    try {
      const rascunho = localStorage.getItem("rascunhoFormJPEventos");
      if (!rascunho) return "";
      const dados = JSON.parse(rascunho);
      return String(dados?.custoDescricao || "");
    } catch {
      return "";
    }
  });
  const [textoWhatsApp, setTextoWhatsApp] = useState(() => localStorage.getItem("rascunhoWhatsAppJPEventos") || "");
  const [whatsAppEditor, setWhatsAppEditor] = useState(null);
  const [tomWhatsApp, setTomWhatsApp] = useState(() => localStorage.getItem("tomWhatsAppJPEventos") || "profissional");
  const [metaMensal, setMetaMensal] = useState(() => localStorage.getItem("metaMensalJPEventos") || "10000");
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null);
  const [appInstalavel, setAppInstalavel] = useState(false);
  const [bancoStatus, setBancoStatus] = useState("Conectando ao banco online...");
  const [onlineStatus, setOnlineStatus] = useState(() => navigator.onLine ? "online" : "offline");
  const [filaSync, setFilaSync] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("filaSyncJPEventos") || "[]");
    } catch {
      return [];
    }
  });
  const contasPadraoJP = [
    { id: "nubank", nome: "Nubank", saldoInicial: 0 },
    { id: "caixa_poupanca", nome: "Caixa Poupança", saldoInicial: 0 },
    { id: "carteira", nome: "Carteira / dinheiro", saldoInicial: 0 }
  ];

  const [contasFinanceiras, setContasFinanceiras] = useState(() => {
    try {
      const salvas = localStorage.getItem("contasFinanceirasJPEventos");
      return salvas ? JSON.parse(salvas) : contasPadraoJP;
    } catch {
      return contasPadraoJP;
    }
  });

  const [movimentosCaixa, setMovimentosCaixa] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("movimentosCaixaJPEventos") || "[]");
    } catch {
      return [];
    }
  });

  const [novaContaFinanceira, setNovaContaFinanceira] = useState("");
  const [contaFinanceiraEditando, setContaFinanceiraEditando] = useState(null);
  const [pagamentoEvento, setPagamentoEvento] = useState(null);
  const [novoMovimento, setNovoMovimento] = useState(() => ({
    tipo: "saida",
    data: new Date().toISOString().slice(0, 10),
    descricao: "",
    categoria: "Outros",
    valor: "",
    contaId: "nubank",
    contaDestinoId: "caixa_poupanca",
    formaPagamento: "Pix",
    parcelas: "1",
    taxaCartao: "0",
    observacao: ""
  }));
  const [clienteFinanceiroFiltro, setClienteFinanceiroFiltro] = useState("");
  const [diaFinanceiroSelecionado, setDiaFinanceiroSelecionado] = useState(null);
  const [painelFinanceiroDetalhe, setPainelFinanceiroDetalhe] = useState(null);

  const bancoCarregadoRef = useRef(false);
  const sincronizandoBancoRef = useRef(false);
  const filaSyncRef = useRef([]);

  const salvarFilaSync = (novaFila) => {
    const filaLimpa = Array.isArray(novaFila) ? novaFila : [];
    filaSyncRef.current = filaLimpa;
    setFilaSync(filaLimpa);
    localStorage.setItem("filaSyncJPEventos", JSON.stringify(filaLimpa));
  };

  const adicionarNaFilaSync = (lista, motivo = "Falha temporária") => {
    const registros = normalizarIdsEventos(lista).map(eventoParaBanco);
    const item = {
      id: criarIdSeguro(),
      criadoEm: new Date().toISOString(),
      motivo,
      registros
    };

    salvarFilaSync([...filaSyncRef.current, item]);
    setBancoStatus(`Offline: ${registros.length} cadastro(s) guardado(s) para sincronizar depois.`);
  };

  const sincronizarFilaPendente = async () => {
    if (sincronizandoBancoRef.current) return;
    if (!navigator.onLine) {
      setOnlineStatus("offline");
      setBancoStatus("Offline: alterações ficam salvas neste aparelho e serão enviadas quando a internet voltar.");
      return;
    }

    const filaAtual = [...filaSyncRef.current];
    if (!filaAtual.length) return;

    try {
      sincronizandoBancoRef.current = true;
      setBancoStatus(`Sincronizando ${filaAtual.length} pendência(s) online...`);

      const pendentes = [];
      for (const item of filaAtual) {
        try {
          const registros = Array.isArray(item.registros) ? item.registros : [];
          if (registros.length > 0) {
            const { error } = await supabase.from("eventos").insert(registros);
            if (error) throw error;
          }
        } catch (erro) {
          pendentes.push(item);
        }
      }

      salvarFilaSync(pendentes);

      if (pendentes.length === 0) {
        setBancoStatus("Online: pendências sincronizadas com sucesso.");
      } else {
        setBancoStatus(`Online parcial: ${pendentes.length} pendência(s) ainda aguardando.`);
      }
    } catch (erro) {
      setBancoStatus(`Erro ao sincronizar pendências: ${erro?.message || erro}`);
    } finally {
      sincronizandoBancoRef.current = false;
    }
  };

  const ehUuid = (valor) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(valor || ""));

  const criarIdSeguro = () =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const normalizarIdsEventos = (lista) =>
    (Array.isArray(lista) ? lista : []).map((evento) => ({
      ...evento,
      id: ehUuid(evento.id) ? evento.id : criarIdSeguro()
    }));

  const eventoParaBanco = (evento) => ({
    id: ehUuid(evento.id) ? evento.id : undefined,
    nome: evento.nome || "",
    cpf: evento.cpf || "",
    whatsapp: evento.whatsapp || "",
    tipo_evento: evento.clienteOnly ? "__CLIENTE__" : (evento.tipoEvento || ""),
    data: evento.data || "",
    hora_inicio: evento.horaInicio || "",
    hora_fim: evento.horaFim || "",
    endereco: evento.endereco || "",
    cidade: evento.cidade || "",
    bairro: evento.bairro || "",
    pacote: evento.pacote || "",
    pacote_personalizado: evento.pacotePersonalizado || "",
    valor: evento.clienteOnly ? 0 : Number(evento.valor || 0),
    entrada: Number(evento.entrada || 0),
    custo: valorNumericoJP(evento.custo),
    forma_entrada: evento.formaEntrada || "",
    forma_pagamento: evento.formaPagamento || "",
    parcelas: evento.parcelas || "",
    obs: juntarObservacoesJP(
      [evento.obsInternas ?? evento.obs, evento.servicosTexto ? `Serviços contratados: ${evento.servicosTexto}` : ""].filter(Boolean).join("\n"),
      evento.obsExtras
    ),
    status: evento.status || "pre",
    executado: Boolean(evento.executado),
    quitado: Boolean(evento.quitado),
    historico: Array.isArray(evento.historico) ? evento.historico : [],
    data_cadastro: evento.dataCadastro || ""
  });

  const eventoDoBanco = (row) => ({
    id: row.id,
    nome: row.nome || "",
    cpf: row.cpf || "",
    whatsapp: row.whatsapp || "",
    tipoEvento: row.tipo_evento === "__CLIENTE__" ? "" : (row.tipo_evento || ""),
    clienteOnly: row.tipo_evento === "__CLIENTE__",
    servicosTexto: extrairServicosTextoJP(row.obs || ""),
    data: row.data || "",
    horaInicio: row.hora_inicio || "",
    horaFim: row.hora_fim || "",
    endereco: row.endereco || "",
    cidade: row.cidade || "",
    bairro: row.bairro || "",
    pacote: row.pacote || "",
    pacotePersonalizado: row.pacote_personalizado || "",
    valor: row.valor === null || row.valor === undefined ? "" : String(row.valor),
    entrada: row.entrada === null || row.entrada === undefined ? "" : String(row.entrada),
    custo: row.custo === null || row.custo === undefined ? "" : String(row.custo),
    custoDescricao: extrairCustoDescricaoJP(row.obs || ""),
    formaEntrada: row.forma_entrada || "",
    formaPagamento: row.forma_pagamento || "",
    parcelas: row.parcelas || "",
    obs: row.obs || "",
    obsInternas: separarObservacoesJP(row.obs || "").internas,
    obsExtras: separarObservacoesJP(row.obs || "").extras,
    status: row.status || "pre",
    executado: Boolean(row.executado),
    quitado: Boolean(row.quitado),
    historico: Array.isArray(row.historico) ? row.historico : [],
    dataCadastro: row.data_cadastro || ""
  });

  const carregarEventosDoBanco = async () => {
    try {
      setBancoStatus("Conectando ao banco online...");
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (Array.isArray(data) && data.length > 0) {
        setEventos(data.map(eventoDoBanco));
        setBancoStatus("Online: dados carregados do Supabase.");
      } else {
        setEventos((atuais) => normalizarIdsEventos(atuais));
        setBancoStatus("Online: banco vazio, usando dados locais como primeira sincronização.");
      }
    } catch (erro) {
      console.error("Erro ao carregar Supabase:", erro);
      setBancoStatus(`Modo local: ${erro?.message || "não conectou ao Supabase"}`);
    } finally {
      bancoCarregadoRef.current = true;
    }
  };

  const sincronizarEventosNoBanco = async (lista) => {
    if (!bancoCarregadoRef.current || sincronizandoBancoRef.current) return;

    const registros = normalizarIdsEventos(lista).map(eventoParaBanco);

    if (!navigator.onLine) {
      adicionarNaFilaSync(lista, "Sem internet no momento da sincronização");
      return;
    }

    try {
      sincronizandoBancoRef.current = true;
      setBancoStatus("Salvando online...");

      const { error: deleteError } = await supabase
        .from("eventos")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) throw deleteError;

      if (registros.length > 0) {
        const { error: insertError } = await supabase.from("eventos").insert(registros);
        if (insertError) throw insertError;
      }

      setBancoStatus(`Online: ${registros.length} cadastro(s) sincronizado(s).`);

      if (filaSyncRef.current.length > 0) {
        setTimeout(() => sincronizarFilaPendente(), 400);
      }
    } catch (erro) {
      console.error("Erro ao sincronizar Supabase:", erro);
      adicionarNaFilaSync(lista, erro?.message || "Falha ao salvar online");
      setBancoStatus(`Modo seguro: dados salvos localmente e pendentes para sincronizar. Detalhe: ${erro?.message || erro}`);
    } finally {
      sincronizandoBancoRef.current = false;
    }
  };

  useEffect(() => {
    carregarEventosDoBanco();
  }, []);

  useEffect(() => {
    localStorage.setItem("eventos", JSON.stringify(eventos));
    sincronizarEventosNoBanco(eventos);
  }, [eventos]);

  useEffect(() => {
    localStorage.setItem("metaMensalJPEventos", String(metaMensal || ""));
  }, [metaMensal]);

  useEffect(() => {
    filaSyncRef.current = filaSync;
    localStorage.setItem("filaSyncJPEventos", JSON.stringify(filaSync));
  }, [filaSync]);


  useEffect(() => {
    localStorage.setItem("contasFinanceirasJPEventos", JSON.stringify(contasFinanceiras));
  }, [contasFinanceiras]);

  useEffect(() => {
    localStorage.setItem("movimentosCaixaJPEventos", JSON.stringify(movimentosCaixa));
  }, [movimentosCaixa]);

  useEffect(() => {
    const aoFicarOnline = () => {
      setOnlineStatus("online");
      sincronizarFilaPendente();
    };

    const aoFicarOffline = () => {
      setOnlineStatus("offline");
      setBancoStatus("Offline: você pode continuar usando. O sistema sincroniza quando voltar internet.");
    };

    window.addEventListener("online", aoFicarOnline);
    window.addEventListener("offline", aoFicarOffline);

    sincronizarFilaPendente();

    return () => {
      window.removeEventListener("online", aoFicarOnline);
      window.removeEventListener("offline", aoFicarOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("rascunhoFormJPEventos", JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem("rascunhoWhatsAppJPEventos", textoWhatsApp || "");
  }, [textoWhatsApp]);

  useEffect(() => {
    const atualizarLargura = () => setLarguraTela(window.innerWidth);
    window.addEventListener("resize", atualizarLargura);
    return () => window.removeEventListener("resize", atualizarLargura);
  }, []);

  useEffect(() => {
    const aoPrepararInstalacao = (evento) => {
      evento.preventDefault();
      setPwaInstallPrompt(evento);
      setAppInstalavel(true);
    };

    const aoInstalar = () => {
      setPwaInstallPrompt(null);
      setAppInstalavel(false);
    };

    window.addEventListener("beforeinstallprompt", aoPrepararInstalacao);
    window.addEventListener("appinstalled", aoInstalar);

    return () => {
      window.removeEventListener("beforeinstallprompt", aoPrepararInstalacao);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  const instalarAppNoCelular = async () => {
    if (!pwaInstallPrompt) {
      alert(`Para instalar no celular:

Android/Chrome: toque nos 3 pontinhos e escolha 'Adicionar à tela inicial'.
iPhone/Safari: toque em Compartilhar e depois 'Adicionar à Tela de Início'.

Se aparecer o botão automático de instalação, use ele primeiro.`);
      return;
    }

    pwaInstallPrompt.prompt();
    await pwaInstallPrompt.userChoice;
    setPwaInstallPrompt(null);
    setAppInstalavel(false);
  };

  const estilos = {
    pagina: {
      minHeight: "100vh",
      padding: isMobile ? 12 : 24,
      background: "radial-gradient(circle at top left, rgba(168,85,247,0.30), transparent 28%), radial-gradient(circle at top right, rgba(14,165,233,0.14), transparent 30%), linear-gradient(135deg, #050816, #0f172a 48%, #1e1236)",
      color: "white",
      fontFamily: "Inter, Arial, sans-serif"
    },
    titulo: {
      marginBottom: 4,
      color: "#ffffff",
      letterSpacing: "-1px",
      fontSize: isMobile ? 28 : 42,
      fontWeight: 900
    },
    subtitulo: {
      marginTop: 0,
      color: "#c4b5fd",
      fontSize: isMobile ? 14 : 17,
      marginBottom: 22
    },
    input: {
      width: "100%",
      fontSize: isMobile ? 16 : 14,
      boxSizing: "border-box",
      marginBottom: 12,
      background: "rgba(15, 23, 42, 0.86)",
      color: "white",
      padding: isMobile ? 14 : 13,
      borderRadius: 16,
      border: "1px solid rgba(167,139,250,0.48)",
      outline: "none",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03), 0 12px 30px rgba(0,0,0,0.18)",
      backdropFilter: "blur(10px)"
    },
    textarea: {
      width: "100%",
      fontSize: isMobile ? 16 : 14,
      minHeight: 90,
      boxSizing: "border-box",
      marginBottom: 10,
      background: "rgba(15, 23, 42, 0.96)",
      color: "white",
      padding: 12,
      borderRadius: 12,
      border: "1px solid rgba(167,139,250,0.55)",
      outline: "none"
    },
    botao: {
      margin: "4px 4px 4px 0",
      padding: isMobile ? "10px 12px" : "8px 10px",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "#263244",
      color: "white",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: isMobile ? 14 : 13
    },
    botaoRoxo: {
      margin: "4px 4px 4px 0",
      padding: isMobile ? "11px 14px" : "10px 13px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "linear-gradient(135deg, #8b5cf6, #a855f7 55%, #ec4899)",
      color: "white",
      cursor: "pointer",
      fontWeight: "900",
      fontSize: isMobile ? 14 : 13,
      boxShadow: "0 12px 28px rgba(168,85,247,0.28)"
    },
    botaoPequeno: {
      margin: "3px 3px 3px 0",
      padding: isMobile ? "9px 10px" : "7px 9px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(30, 41, 59, 0.95)",
      color: "white",
      cursor: "pointer",
      fontWeight: "700",
      fontSize: isMobile ? 13 : 12
    },
    card: {
      border: "1px solid rgba(139,92,246,0.58)",
      background: "linear-gradient(180deg, rgba(17, 24, 39, 0.88), rgba(15, 23, 42, 0.82))",
      padding: isMobile ? 14 : 20,
      marginBottom: 16,
      borderRadius: 24,
      boxShadow: "0 22px 55px rgba(0,0,0,0.34), 0 0 26px rgba(108,43,217,0.18)",
      backdropFilter: "blur(12px)"
    },
    cardClaro: {
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.045)",
      padding: 12,
      borderRadius: 14,
      marginTop: 10
    },
    grupoAcoes: {
      display: "flex",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 8,
      paddingTop: 8,
      borderTop: "1px solid rgba(255,255,255,0.08)"
    },
    tituloGrupo: {
      width: "100%",
      color: "#c4b5fd",
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      marginTop: 4
    },
    badge: {
      display: "inline-block",
      padding: "4px 9px",
      borderRadius: 999,
      background: "rgba(124,58,237,0.22)",
      border: "1px solid rgba(196,181,253,0.35)",
      color: "#ddd6fe",
      fontWeight: "800",
      fontSize: 12,
      margin: "3px 4px 3px 0"
    },
    miniInfo: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
      gap: 8,
      marginTop: 10
    },
    linhaInfo: {
      background: "rgba(255,255,255,0.045)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12,
      padding: 10
    },
    gridResumo: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(190px, 1fr))",
      gap: 12,
      marginBottom: 20
    },
    cardResumo: {
      background: "linear-gradient(135deg, rgba(88,28,135,0.90), rgba(30,41,59,0.82))",
      border: "1px solid rgba(196,181,253,0.32)",
      borderRadius: 22,
      padding: 18,
      boxShadow: "0 18px 38px rgba(0,0,0,0.30)",
      minHeight: 94,
      backdropFilter: "blur(10px)"
    },
    cardFinanceiro: {
      background: "linear-gradient(135deg, rgba(6,78,59,0.50), rgba(30,41,59,0.86))",
      border: "1px solid rgba(34,197,94,0.32)",
      borderRadius: 22,
      padding: 18,
      boxShadow: "0 18px 36px rgba(0,0,0,0.26)",
      backdropFilter: "blur(10px)"
    },
    divisorPremium: {
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(196,181,253,0.42), transparent)",
      margin: "12px 0 18px"
    }
  };


  const separarObservacoesJP = (texto = "") => {
    const bruto = String(texto || "");
    const marcador = "\n--- OBSERVAÇÕES EXTRAS ---\n";

    if (!bruto.includes(marcador.trim())) {
      return { internas: bruto, extras: "" };
    }

    const partes = bruto.split(marcador.trim());
    return {
      internas: (partes[0] || "").trim(),
      extras: partes.slice(1).join(marcador.trim()).trim()
    };
  };

  const juntarObservacoesJP = (internas = "", extras = "") => {
    const parteInterna = String(internas || "").trim();
    const parteExtra = String(extras || "").trim();

    if (parteInterna && parteExtra) {
      return `${parteInterna}\n--- OBSERVAÇÕES EXTRAS ---\n${parteExtra}`;
    }

    return parteExtra || parteInterna || "";
  };

  const observacoesInternasJP = (evento) => {
    if (evento?.obsInternas !== undefined) return String(evento.obsInternas || "");
    return separarObservacoesJP(evento?.obs || "").internas;
  };

  const observacoesExtrasJP = (evento) => {
    if (evento?.obsExtras !== undefined) return String(evento.obsExtras || "");
    return separarObservacoesJP(evento?.obs || "").extras;
  };

  const valorNumericoJP = (valor) => {
    if (valor === undefined || valor === null || valor === "") return 0;
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

    let texto = String(valor).trim();
    if (!texto) return 0;

    texto = texto.replace(/R\$/gi, "").replace(/\s/g, "");

    if (texto.includes(",") && texto.includes(".")) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else {
      texto = texto.replace(",", ".");
    }

    const achou = texto.match(/-?\d+(?:\.\d+)?/);
    if (!achou) return 0;

    const numero = Number(achou[0]);
    return Number.isFinite(numero) ? numero : 0;
  };

  const extrairServicosTextoJP = (obs = "") => {
    const linha = String(obs || "").split("\n").find((l) => l.toLowerCase().startsWith("serviços contratados:") || l.toLowerCase().startsWith("servicos contratados:"));
    return linha ? linha.split(":").slice(1).join(":").trim() : "";
  };

  const removerServicosTextoJP = (obs = "") =>
    String(obs || "")
      .split("\n")
      .filter((l) => {
        const n = l.toLowerCase().trim();
        return !n.startsWith("serviços contratados:") && !n.startsWith("servicos contratados:");
      })
      .join("\n")
      .trim();

  const extrairCustoDescricaoJP = (obs = "") => {
    const linha = String(obs || "")
      .split("\n")
      .find((item) => normalizarTexto(item).startsWith("custo do evento:"));
    if (!linha) return "";
    return linha.split(":").slice(1).join(":").trim();
  };

  const removerCustoDescricaoJP = (obs = "") =>
    String(obs || "")
      .split("\n")
      .filter((linha) => !normalizarTexto(linha).startsWith("custo do evento:"))
      .join("\n")
      .trim();

  const custoDescricaoFinalJP = (evento) =>
    String(evento?.custoDescricao || extrairCustoDescricaoJP(evento?.obsInternas || evento?.obs || "") || "").trim();

  const moeda = (valor) =>
    valorNumericoJP(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const rotuloDocumentoCliente = (valor) => {
    const nums = String(valor || "").replace(/[^0-9]/g, "");
    if (nums.length === 14) return "CNPJ";
    if (nums.length === 11) return "CPF";
    return "CPF/CNPJ";
  };

  const formatarDocumentoCliente = (valor) => {
    const nums = String(valor || "").replace(/[^0-9]/g, "").slice(0, 14);
    if (nums.length <= 11) {
      return nums
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return nums
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  };

  const documentoValidoCliente = (valor) => {
    const nums = String(valor || "").replace(/[^0-9]/g, "");
    return nums.length === 11 || nums.length === 14;
  };

  const textoDocumentoValidacao = (valor) => {
    const nums = String(valor || "").replace(/[^0-9]/g, "");
    if (!nums) return "Não informado";
    if (nums.length === 11) return "CPF informado com 11 dígitos";
    if (nums.length === 14) return "CNPJ informado com 14 dígitos";
    return "Atenção: documento incompleto ou com quantidade de dígitos diferente de CPF/CNPJ";
  };

  const dataBR = (data) => {
    if (!data) return "Não informado";
    const [ano, mes, dia] = String(data).split("-");
    const dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia));
    const dias = [
      "domingo",
      "segunda-feira",
      "terça-feira",
      "quarta-feira",
      "quinta-feira",
      "sexta-feira",
      "sábado"
    ];
    // Mantém formato brasileiro fixo e reduz confusão do tradutor do Chrome no celular.
    return `${dias[dataObj.getDay()]} - ${dia}/${mes}/${ano}`;
  };

  const dataCurtaBR = (data) => {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const normalizarTexto = (texto) =>
    String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const limparObservacoesInternas = (obs) =>
    String(obs || "")
      .split("\n")
      .filter((linha) => {
        if (normalizarTexto(linha).includes("--- observacoes extras ---")) return false;
        const l = normalizarTexto(linha);
        return (
          !l.includes("sugestao de pacote") &&
          !l.includes("mensagem sugerida") &&
          !l.includes("dados extraidos")
        );
      })
      .join("\n")
      .trim();

  const normalizarHorarioManual = (valor) => {
    const texto = String(valor || "").trim().toLowerCase();
    if (!texto) return "";

    const achou = texto.match(/(\d{1,2})(?:\s*h|:([0-5]\d))?/i);
    if (!achou) return "";

    let hora = Number(achou[1]);
    const minuto = achou[2] ? Number(achou[2]) : 0;

    if (Number.isNaN(hora) || hora < 0 || hora > 23) return "";
    return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
  };

  const cidadeBairroFinal = (evento) => {
    const cidade = String(evento?.cidade || "").trim();
    const bairro = String(evento?.bairro || "").trim();

    if (cidade && bairro && !normalizarTexto(cidade).includes(normalizarTexto(bairro))) {
      return `${cidade} / ${bairro}`;
    }

    return cidade || bairro || "Não informado";
  };

  const temSinal = (e) => Number(e?.entrada || 0) > 0;

  const reservaConfirmada = (e) => e?.status === "confirmado" || Boolean(e?.quitado);

  const ehPreCadastro = (e) => !reservaConfirmada(e) || !e?.valor || Number(e.valor || 0) === 0;

  const statusEvento = (e) => {
    if (ehPreCadastro(e)) return "pre";
    if (e.quitado) return "pago";
    return "pendente";
  };

  const textoStatus = (e) => {
    if (reservaConfirmada(e)) return "🟢 EVENTO CONFIRMADO";
    if (temSinal(e)) return "🟠 PRÉ-RESERVA COM SINAL / AGUARDANDO CONFIRMAÇÃO";
    return "🟡 PRÉ-RESERVA SEM SINAL / DATA NÃO GARANTIDA";
  };

  const textoStatusCurto = (e) => {
    if (reservaConfirmada(e)) return "🟢 EVENTO CONFIRMADO";
    if (temSinal(e)) return "🟠 PRÉ-RESERVA COM SINAL";
    return "⚠️ PRÉ-RESERVA SEM PAGAMENTO";
  };

  const corStatus = (e) => {
    if (reservaConfirmada(e)) return "limegreen";
    if (temSinal(e)) return "#f59e0b";
    return "orange";
  };

  const criarRegistroHistorico = (acao, detalhe = "") => ({
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    data: new Date().toLocaleString("pt-BR"),
    acao,
    detalhe
  });

  const registrarHistoricoEvento = (evento, acao, detalhe = "") => {
    if (!evento?.id) return;
    const registro = criarRegistroHistorico(acao, detalhe);
    setEventos((lista) =>
      lista.map((item) =>
        item.id === evento.id
          ? { ...item, historico: [registro, ...(Array.isArray(item.historico) ? item.historico : [])].slice(0, 50) }
          : item
      )
    );
  };

  const resumoHistorico = (evento) => {
    const historico = Array.isArray(evento?.historico) ? evento.historico : [];
    return historico.slice(0, 5);
  };

  const perguntasPadrao = `Olá! Tudo bem? 😊

Para eu montar a melhor proposta para o seu evento, me envie por favor:

📅 Data do evento:
🎉 Tipo de evento:
👤 Nome completo do responsável:
🧾 CPF ou CNPJ para proposta/contrato:
📍 Cidade / bairro:
🏠 Endereço completo:
⏰ Horário de início:
⏳ Duração do evento:
🏢 Local: casa, buffet, salão, loja ou área externa?
☔ O local é coberto e tem ponto de energia seguro?
🎶 Tem alguma preferência de pacote ou estrutura?

Com essas informações eu confiro a agenda e te envio a melhor opção com valor, sinal e detalhes do serviço.`;

  const copiarPerguntasPadrao = () => {
  navigator.clipboard.writeText(perguntasPadrao);

  const abrir = confirm(
    "Perguntas copiadas!\n\nDeseja abrir o WhatsApp agora?"
  );

  if (abrir) {
    const numero = form.whatsapp ? form.whatsapp.replace(/\D/g, "") : "";

    if (numero) {
      const numeroFinal = numero.startsWith("55") ? numero : `55${numero}`;
      window.open(
        `https://wa.me/${numeroFinal}?text=${encodeURIComponent(perguntasPadrao)}`,
        "_blank"
      );
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(perguntasPadrao)}`,
        "_blank"
      );
    }
  }
};

  const separarLinhas = (texto) => String(texto || "").split(String.fromCharCode(10)).map((l) => l.trim()).filter(Boolean);

  const extrairNumeros = (texto) => {
    const numeros = [];
    let atual = "";
    for (const c of String(texto || "")) {
      if (c >= "0" && c <= "9") atual += c;
      else if (atual) {
        numeros.push(Number(atual));
        atual = "";
      }
    }
    if (atual) numeros.push(Number(atual));
    return numeros;
  };

  const pegarDataTexto = (texto) => {
  const linhas = separarLinhas(texto);

  for (const linha of linhas) {
    const l = normalizarTexto(linha);

    const numeros = extrairNumeros(linha);

    if (
      numeros.length >= 2 &&
      numeros[0] >= 1 &&
      numeros[0] <= 31 &&
      numeros[1] >= 1 &&
      numeros[1] <= 12 &&
      !l.includes("horas") &&
      !l.includes("hrs") &&
      !l.includes("pessoas") &&
      !l.includes("total")
    ) {
      const ano = new Date().getFullYear();
      return `${ano}-${String(numeros[1]).padStart(2, "0")}-${String(numeros[0]).padStart(2, "0")}`;
    }
  }

  return "";
};

  const pegarHoraTexto = (texto) => {
    const t = normalizarTexto(texto);

    const matchComeca = t.match(/(?:comeca|começa|inicio|início|horario|horário)\s*(?:as|às)?\s*(\d{1,2})/i);
    if (matchComeca) {
      let h = Number(matchComeca[1]);
      if ((t.includes("tarde") || t.includes("noite")) && h < 12) h += 12;
      if ((t.includes("manha") || t.includes("manhã")) && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:00`;
    }

    const matchDas = t.match(/(\d{1,2})\s*h?\s*(?:as|às|ate|até|-)\s*(\d{1,2})/i);
    if (matchDas) {
      const h = Number(matchDas[1]);
      return `${String(h).padStart(2, "0")}:00`;
    }

    return "";
  };

  const pegarDuracaoTexto = (texto) => {
    const t = normalizarTexto(texto);

    // Prioriza frases claras de duração, como "1 hora", "3 horas" ou "total de 3 horas".
    // Não deixa a frase seguinte "Começa às 10 horas" confundir a duração.
    const duracaoClara = t.match(/(?:duracao|duração|total de|por|sao|são)?\s*(\d{1,2})\s*(hora|horas|hrs|hs|h)\b/i);

    if (duracaoClara) {
      const qtd = Number(duracaoClara[1]);
      const antes = t.slice(Math.max(0, duracaoClara.index - 25), duracaoClara.index);

      const pareceHoraInicio =
        antes.includes("comeca") ||
        antes.includes("começa") ||
        antes.includes("inicio") ||
        antes.includes("início") ||
        antes.includes("horario") ||
        antes.includes("horário") ||
        antes.trim().endsWith("as") ||
        antes.trim().endsWith("às");

      if (qtd > 0 && qtd <= 12 && !pareceHoraInicio) return qtd;
    }

    return null;
  };

  const somarHorasTexto = (hora, qtd) => {
    if (!hora || !qtd) return "";
    const [h, m] = hora.split(":").map(Number);
    const data = new Date(2000, 0, 1, h, m || 0);
    data.setHours(data.getHours() + Number(qtd));
    return `${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;
  };

  const pegarLinha = (texto, palavras) => {
    const linhas = separarLinhas(texto);
    for (const linha of linhas) {
      const ln = normalizarTexto(linha);
      for (const palavra of palavras) {
        if (ln.includes(normalizarTexto(palavra))) return linha;
      }
    }
    return "";
  };

  const limparResposta = (linha, palavras) => {
    let texto = String(linha || "");
    for (const palavra of palavras) {
      texto = texto.replaceAll(palavra, "");
      texto = texto.replaceAll(palavra.toUpperCase(), "");
    }
    return texto.replaceAll(":", "").replaceAll("-", "").trim();
  };

  const removerPrefixoWhatsApp = (linha) => {
    let texto = String(linha || "").trim();

    if (texto.startsWith("[")) {
      const fim = texto.indexOf("]");
      if (fim >= 0) texto = texto.slice(fim + 1).trim();
    }

    const separador = texto.indexOf(" - ");
    if (separador >= 0 && separador < 30) {
      texto = texto.slice(separador + 3).trim();
    }

    const doisPontos = texto.indexOf(":");
    const antesDoisPontos = doisPontos >= 0 ? texto.slice(0, doisPontos).trim() : "";
    const numerosAntes = antesDoisPontos.replace(/[^0-9]/g, "");
    const pareceRemetente = antesDoisPontos.startsWith("+") || numerosAntes.length >= 8 || antesDoisPontos.toLowerCase().includes("jp eventos") || antesDoisPontos.toLowerCase().includes("jeanmix");

    if (doisPontos >= 0 && pareceRemetente) {
      texto = texto.slice(doisPontos + 1).trim();
    }

    return texto;
  };

  const limparConversaWhatsApp = (texto) => {
    const linhas = separarLinhas(texto);
    const cliente = [];

    for (const linhaOriginal of linhas) {
      const originalNormal = normalizarTexto(linhaOriginal);
      if (originalNormal.includes("jp eventos") || originalNormal.includes("jeanmix")) continue;

      let linha = removerPrefixoWhatsApp(linhaOriginal);
      const ln = normalizarTexto(linha);

      if (!linha) continue;
      if (ln.includes("pra quando vai ser")) continue;
      if (ln.includes("onde sera") || ln.includes("onde será")) continue;
      if (ln.includes("qual o endereco") || ln.includes("qual o endereço")) continue;
      if (ln.includes("qual o numero") || ln.includes("qual o número")) continue;
      if (ln.includes("quantas horas")) continue;
      if (ln.includes("vai comecar") || ln.includes("vai começar")) continue;
      if (ln.includes("me passa essas informacoes") || ln.includes("me passa essas informações")) continue;
      if (ln.includes("tem que ser em parte coberto")) continue;
      if (ln.includes("pois como ta em epoca")) continue;

      cliente.push(linha);
    }

    return cliente.join(String.fromCharCode(10));
  };

  const procurarLinhaCom = (texto, palavras) => {
    const linhas = separarLinhas(texto);
    for (const linha of linhas) {
      const ln = normalizarTexto(linha);
      for (const palavra of palavras) {
        if (ln.includes(normalizarTexto(palavra))) return linha;
      }
    }
    return "";
  };

  const juntarEnderecoComNumero = (endereco, texto) => {
    if (!endereco) return "";
    const linhas = separarLinhas(texto);
    const index = linhas.findIndex((l) => normalizarTexto(l) === normalizarTexto(endereco));
    if (index >= 0 && linhas[index + 1]) {
      const proxima = linhas[index + 1].trim();
      const numeros = extrairNumeros(proxima);
      if (numeros.length > 0 && proxima.length <= 10) return `${endereco}, ${proxima}`;
    }
    return endereco;
  };

  const extrairDadosWhatsApp = () => {
    if (!textoWhatsApp.trim()) {
      alert("Cole a conversa ou resposta do cliente primeiro.");
      return;
    }

    const textoOriginalBruto = textoWhatsApp;
    const prepararTextoWhatsApp = (valor) => {
      let preparado = String(valor || "")
        .replace(/\r/g, "\n")
        .replace(/\s+(Nome completo|CPF\s*ou\s*cnpj|CPF\/CNPJ|Pra quando vai ser\s*\?|Onde será\s*\?|Onde sera\s*\?|Endereço do local do evento\s*\?|Endereco do local do evento\s*\?|cidade\s*\/\s*bairro\s*\?|Quantas horas\s*\?|Vai começar que horas\s*\?|Vai comecar que horas\s*\?|Será em buffet, casa ou local externo\s*\?|Sera em buffet, casa ou local externo\s*\?|E qual é o tipo de evento|E qual e o tipo de evento)\b/gi, "\n$1")
        .replace(/\n\s*\n+/g, "\n")
        .trim();

      return preparado;
    };

    const textoOriginal = prepararTextoWhatsApp(textoOriginalBruto);
    const textoLimpo = limparConversaWhatsApp(textoOriginal);
    // Para extrair campos com rótulos do WhatsApp (ex: "Nome completo:", "Pra quando vai ser:"),
    // usamos o texto original. O texto limpo continua servindo como apoio para detectar informações soltas.
    const texto = textoOriginal;
    const textoApoio = `${textoOriginal}
${textoLimpo || ""}`;
    const t = normalizarTexto(textoApoio);
    const linhasTexto = separarLinhas(textoApoio);
    const linhasOriginais = separarLinhas(textoOriginal);

    const apenasNumeros = (valor) => String(valor || "").replace(/[^0-9]/g, "");

    const valorPorRotulo = (rotulos) => {
      const listaRotulos = Array.isArray(rotulos) ? rotulos : [rotulos];

      for (let i = 0; i < linhasOriginais.length; i += 1) {
        const linha = linhasOriginais[i];
        const normal = normalizarTexto(linha).replace(/\s+/g, " ").replace(/[?]/g, "").trim();

        for (const rotulo of listaRotulos) {
          const rotuloNormal = normalizarTexto(rotulo).replace(/\s+/g, " ").replace(/[?]/g, "").trim();

          if (normal === rotuloNormal || normal.startsWith(rotuloNormal + " ") || normal.startsWith(rotuloNormal)) {
            const doisPontos = linha.indexOf(":");

            if (doisPontos >= 0) {
              const depois = linha.slice(doisPontos + 1).trim();
              if (depois) return depois;
            }

            let restoLinha = linha
              .replace(new RegExp("^\\s*" + rotulo.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") + "\\s*[:?\\-–—]*\\s*", "i"), "")
              .trim();

            const restoNormal = normalizarTexto(restoLinha).replace(/[?]/g, "").trim();

            const restoEhApenasComplementoDoRotulo =
              !restoNormal ||
              restoNormal === "ou cnpj" ||
              restoNormal === "ou cpf" ||
              restoNormal === "cpf" ||
              restoNormal === "cnpj" ||
              restoNormal === "documento";

            if (!restoEhApenasComplementoDoRotulo) return restoLinha;

            const proximaLinha = linhasOriginais[i + 1]?.trim();
            if (proximaLinha) return proximaLinha;
          }
        }
      }

      return "";
    };

    const normalizarDataTexto = (valor) => {
      const nums = extrairNumeros(valor);
      if (nums.length < 2) return "";
      const dia = nums[0];
      const mes = nums[1];
      const anoBruto = nums[2] || new Date().getFullYear();
      const ano = anoBruto < 100 ? 2000 + anoBruto : anoBruto;
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
        return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      }
      return "";
    };

    const normalizarHoraTexto = (valor, frase = "") => {
      const achou = String(valor || "").match(/(\d{1,2})(?:\s*h|:([0-5]\d))?/i);
      if (!achou) return "";
      let hora = Number(achou[1]);
      const minuto = achou[2] ? Number(achou[2]) : 0;
      const f = normalizarTexto(`${valor} ${frase}`);
      if ((f.includes("tarde") || f.includes("noite")) && hora > 0 && hora < 12) hora += 12;
      if ((f.includes("manha") || f.includes("manhã")) && hora === 12) hora = 0;
      if (Number.isNaN(hora) || hora < 0 || hora > 23) return "";
      return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
    };

    const formatarCPF = (nums) => {
      if (!nums || nums.length !== 11) return "";
      return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
    };

    const formatarCNPJ = (nums) => {
      if (!nums || nums.length !== 14) return "";
      return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12, 14)}`;
    };

    const formatarCpfOuCnpj = (valor) => {
      const nums = apenasNumeros(valor);
      if (nums.length === 11) return formatarCPF(nums);
      if (nums.length === 14) return formatarCNPJ(nums);
      return valor || "";
    };

    const normalizarHora = (h, frase = "") => {
      let hora = Number(h);
      const f = normalizarTexto(frase);
      if ((f.includes("tarde") || f.includes("noite")) && hora > 0 && hora < 12) hora += 12;
      if ((f.includes("manha") || f.includes("manhã")) && hora === 12) hora = 0;
      if (Number.isNaN(hora) || hora < 0 || hora > 23) return "";
      return `${String(hora).padStart(2, "0")}:00`;
    };

    const somarHoras = (hora, qtd) => {
      if (!hora || !qtd) return "";
      const [h, m] = hora.split(":").map(Number);
      if (Number.isNaN(h)) return "";
      let novaHora = h + Number(qtd);
      if (novaHora >= 24) novaHora = novaHora % 24;
      return `${String(novaHora).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
    };

    const limparCampoCurto = (valor) =>
      String(valor || "")
        .split(/ rua | avenida | av\. | bairro | cidade | dia | vai | começa | comeca | inauguração | inauguracao | aniversário | aniversario | casamento | formatura /i)[0]
        .replace(/[:\-]/g, "")
        .trim();

    const limparNomeExtraido = (valor) =>
      String(valor || "")
        .replace(/^\s*nome\s+completo\s*[:\-]?\s*/i, "")
        .replace(/^\s*nome\s*[:\-]?\s*/i, "")
        .replace(/^\s*cliente\s*[:\-]?\s*/i, "")
        .replace(/^\s*contratante\s*[:\-]?\s*/i, "")
        .replace(/^\s*completo\s*[:\-]?\s*/i, "")
        .trim();

    const pegarDepoisDaPalavra = (palavra) => {
      const reg = new RegExp(`${palavra}\\s*[:\\-]?\\s*([a-zA-ZÀ-ÿ\\s]{2,60})`, "i");
      const achou = texto.match(reg);
      if (!achou) return "";
      return limparCampoCurto(achou[1]);
    };

    const acharCpfOuCnpj = () => {
      const porRotulo = valorPorRotulo(["cpf ou cnpj", "cpf/cnpj", "cpf", "cnpj", "documento"]);
      const documentoRotulo = formatarCpfOuCnpj(porRotulo);
      if (documentoRotulo) return documentoRotulo;

      const cnpjs = String(texto).match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) || [];
      if (cnpjs.length > 0) return formatarCNPJ(apenasNumeros(cnpjs[0]));

      const cpfs = String(texto).match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g) || [];
      if (cpfs.length > 0) return formatarCPF(apenasNumeros(cpfs[0]));

      return "";
    };

    const documentoExtraido = acharCpfOuCnpj();
    const documentoNumeros = apenasNumeros(documentoExtraido);

    const acharTelefone = () => {
      const grupos = String(textoOriginal + "\n" + texto).match(/\+?\d[\d\s().-]{8,}\d/g) || [];

      for (const grupo of grupos) {
        let nums = apenasNumeros(grupo);
        if (nums.startsWith("55") && nums.length >= 12) nums = nums.slice(2);

        if (nums === documentoNumeros) continue;

        if (nums.length === 11 && nums[2] === "9") return nums;
        if (nums.length === 10) return nums;
      }

      return "";
    };

    let telefoneExtraido = acharTelefone();

    const pegarDataInteligente = () => {
      const dataPorRotulo = valorPorRotulo(["data do evento", "pra quando vai ser", "quando vai ser", "data"]);
      const dataNormalizada = normalizarDataTexto(dataPorRotulo);
      if (dataNormalizada) return dataNormalizada;

      for (const linha of linhasTexto) {
        const l = normalizarTexto(linha);
        const nums = extrairNumeros(linha);

        if (linha.includes("/") || l.includes("dia") || (nums.length === 2 && linha.trim().length <= 8)) {
          if (nums.length >= 2 && nums[0] >= 1 && nums[0] <= 31 && nums[1] >= 1 && nums[1] <= 12) {
            const ano = nums[2] ? (nums[2] < 100 ? 2000 + nums[2] : nums[2]) : new Date().getFullYear();
            return `${ano}-${String(nums[1]).padStart(2, "0")}-${String(nums[0]).padStart(2, "0")}`;
          }
        }
      }

      const achou = texto.match(/(?:dia\s*)?(\d{1,2})[\/.\-\s](\d{1,2})(?:[\/.\-\s](\d{2,4}))?/i);
      if (achou) {
        const dia = Number(achou[1]);
        const mes = Number(achou[2]);
        const anoBruto = achou[3] ? Number(achou[3]) : new Date().getFullYear();
        const ano = anoBruto < 100 ? 2000 + anoBruto : anoBruto;
        if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
          return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        }
      }

      return "";
    };

    let dataExtraida = pegarDataInteligente();
    const pegarDadosTextoLivreV23 = () => {
      const linhas = linhasTexto.map((l) => String(l || "").trim()).filter(Boolean);

      const parecePerguntaOuSistema = (linha) => {
        const l = normalizarTexto(linha);
        return (
          l.includes("nome completo") ||
          l.includes("cpf") ||
          l.includes("cnpj") ||
          l.includes("pra quando") ||
          l.includes("onde sera") ||
          l.includes("onde será") ||
          l.includes("endereco do local") ||
          l.includes("endereço do local") ||
          l.includes("cidade") ||
          l.includes("bairro") ||
          l.includes("quantas horas") ||
          l.includes("vai comecar") ||
          l.includes("vai começar") ||
          l.includes("sera em buffet") ||
          l.includes("será em buffet") ||
          l.includes("tipo de evento") ||
          l.includes("pagou") ||
          l.includes("entrada") ||
          l.includes("restante")
        );
      };

      const dataSolta = (() => {
        const linhaData = linhas.find((linha) => {
          const l = normalizarTexto(linha);
          if (l.includes("cpf") || l.includes("cnpj") || l.includes("pagou")) return false;
          return (
            /(?:vai\s+ser|dia|data)\s+\d{1,2}\s*[\/.\-\s]\s*\d{1,2}/i.test(linha) ||
            /^\s*\d{1,2}\s*[\/.\-\s]\s*\d{1,2}(?:\s*[\/.\-\s]\s*\d{2,4})?\s*$/i.test(linha)
          );
        });

        if (!linhaData) return "";
        return normalizarDataTexto(linhaData);
      })();

      const horaInicioSolta = (() => {
        let linhaHora = linhas.find((linha) =>
          /(?:comeca|começa|inicio|início|iniciar|vai começar|vai comecar)\s*(?:as|às)?\s*\d{1,2}\s*(?:h|hs|hora|horas|:00)?/i.test(linha)
        );

        if (!linhaHora) {
          linhaHora = linhas.find((linha) =>
            /^\s*(as|às)?\s*\d{1,2}\s*(h|hs|hora|horas)\s*$/i.test(linha) ||
            /^\s*\d{1,2}:[0-5]\d\s*$/i.test(linha)
          );
        }

        if (!linhaHora) return "";

        const m =
          linhaHora.match(/(?:comeca|começa|inicio|início|iniciar|vai começar|vai comecar)\s*(?:as|às)?\s*(\d{1,2})(?::([0-5]\d))?\s*(?:h|hs|hora|horas)?/i) ||
          linhaHora.match(/^\s*(?:as|às)?\s*(\d{1,2})(?::([0-5]\d))?\s*(?:h|hs|hora|horas)?\s*$/i);

        if (!m) return "";
        const minuto = m[2] || "00";
        return `${String(Number(m[1])).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
      })();

      const duracaoSolta = (() => {
        const linhaDuracao = linhas.find((linha) => /^\s*\d{1,2}\s*(h|hs|hrs|hora|horas)\s*$/i.test(linha));
        if (!linhaDuracao) return null;
        const qtd = Number((linhaDuracao.match(/\d{1,2}/) || [])[0]);
        return qtd > 0 && qtd <= 12 ? qtd : null;
      })();

      const enderecoSolto = (() => {
        return linhas.find((linha) => {
          const l = normalizarTexto(linha);
          return /\b(rua|avenida|av\.?|travessa|tv\.?|alameda|rodovia|estrada)\b/i.test(linha) && !l.includes("endereco do local");
        }) || "";
      })();

      const cidadeSolta = (() => {
        if (!enderecoSolto) return "";
        const partes = enderecoSolto.trim().split(/\s+/);
        if (partes.length >= 3) {
          const ultimo = partes[partes.length - 1];
          if (!/\d/.test(ultimo) && ultimo.length >= 3) return ultimo;
        }
        return "";
      })();

      const nomeSolto = (() => {
        for (let i = linhas.length - 1; i >= 0; i -= 1) {
          const linha = linhas[i];
          const l = normalizarTexto(linha);
          const temNumero = /\d/.test(linha);

          if (
            !temNumero &&
            linha.split(/\s+/).length >= 2 &&
            !parecePerguntaOuSistema(linha) &&
            !l.includes("rua") &&
            !l.includes("avenida") &&
            !l.includes("casa") &&
            !l.includes("loja") &&
            !l.includes("buffet") &&
            !l.includes("aniversario") &&
            !l.includes("aniversário") &&
            !l.includes("simples") &&
            !l.includes("pessoas")
          ) {
            return linha;
          }
        }
        return "";
      })();

      const idadeSolta = (() => {
        const linhaIdade = linhas.find((linha) => /\b\d{1,3}\s*anos\b/i.test(linha));
        if (!linhaIdade) return "";
        const m = linhaIdade.match(/\b(\d{1,3})\s*anos\b/i);
        return m ? Number(m[1]) : "";
      })();

      const tipoSolto = (() => {
        const lTudo = normalizarTexto(linhas.join(" "));
        if (idadeSolta || lTudo.includes("aniversario") || lTudo.includes("aniversário")) {
          return idadeSolta ? `Aniversário de ${idadeSolta} anos` : "Aniversário";
        }
        if (lTudo.includes("palestra")) return "Palestra para clientes";
        if (lTudo.includes("inauguracao") || lTudo.includes("inauguração")) return "Inauguração";
        if (lTudo.includes("casamento")) return "Casamento";
        if (lTudo.includes("formatura")) return "Formatura";
        if (lTudo.includes("loja")) return "Evento em loja";
        return "";
      })();

      return {
        data: dataSolta,
        horaInicio: horaInicioSolta,
        duracao: duracaoSolta,
        horaFim: horaInicioSolta && duracaoSolta ? somarHorasTexto(horaInicioSolta, duracaoSolta) : "",
        endereco: enderecoSolto,
        cidade: cidadeSolta,
        nome: nomeSolto,
        idade: idadeSolta,
        tipoEvento: tipoSolto
      };
    };

    const dadosTextoLivreV23 = pegarDadosTextoLivreV23();
    if (!dataExtraida && dadosTextoLivreV23.data) dataExtraida = dadosTextoLivreV23.data;

    let horaInicio = "";
    let horaFim = "";
    let quantidadeHoras = null;

    if (!horaInicio && dadosTextoLivreV23.horaInicio) horaInicio = dadosTextoLivreV23.horaInicio;
    if (!quantidadeHoras && dadosTextoLivreV23.duracao) quantidadeHoras = dadosTextoLivreV23.duracao;

    const horaPorRotulo = valorPorRotulo(["vai começar que horas", "vai comecar que horas", "horário de início", "horario de inicio", "hora início", "hora inicio", "horário", "horario"]);
    if (horaPorRotulo) horaInicio = normalizarHoraTexto(horaPorRotulo, textoApoio);

    const duracaoPorRotulo = valorPorRotulo(["quantas horas", "duração", "duracao", "total de horas"]);
    if (duracaoPorRotulo) {
      const numsDuracao = extrairNumeros(duracaoPorRotulo);
      const qtd = numsDuracao[0];
      if (qtd > 0 && qtd <= 12) quantidadeHoras = qtd;
    }

    const textoHorario = normalizarTexto(textoApoio);

    const faixaHorario = textoHorario.match(/(?:das?\s*)?(\d{1,2})\s*(?:h|:00)?\s*(?:as|ate|-|às|até)\s*(\d{1,2})\s*(?:h|:00)?/i);
    if (faixaHorario) {
      const trechoFaixa = faixaHorario[0] || "";
      horaInicio = normalizarHora(faixaHorario[1], textoHorario);

      // Evita tratar duração "3h" como hora final quando o texto era "começa as 19h\n3h".
      if (!/\n/.test(trechoFaixa)) {
        horaFim = normalizarHora(faixaHorario[2], textoHorario);
      }
    }

    if (!horaInicio) {
      const inicioHorario = textoHorario.match(/(?:comeca|começa|inicio|início|horario|horário)\s*(?:as|às)?\s*(\d{1,2})/i);
      if (inicioHorario) {
        horaInicio = normalizarHora(inicioHorario[1], textoHorario);
      }
    }
if (!horaInicio) {
  const inicioHorario = textoHorario.match(/(?:comeca|começa|inicio|início|horario|horário)\s*(?:as|às)?\s*(\d{1,2})/i);
  if (inicioHorario) {
    horaInicio = normalizarHora(inicioHorario[1], textoHorario);
  }
}
    if (!horaInicio) {
      const linhaComHoraInicio = linhasTexto.find((linha) => {
        const l = normalizarTexto(linha);
        return (l.includes("comeca") || l.includes("começa") || l.includes("inicio") || l.includes("início")) && /\d{1,2}\s*h/i.test(linha);
      });
      const horaSolta = linhaComHoraInicio?.match(/(\d{1,2})\s*h/i);
      if (horaSolta) horaInicio = normalizarHora(horaSolta[1], linhaComHoraInicio);
    }
    if (!horaInicio) {
      const horaInicioSolta = textoApoio.match(/(?:comeca|começa|inicio|início|horario|horário|vai começar|vai comecar)\s*(?:as|às)?\s*(\d{1,2})\s*(?:h|hs|:00)?/i);
      if (horaInicioSolta) horaInicio = normalizarHora(horaInicioSolta[1], textoApoio);
    }

    const duracaoLinhaSolta = linhasTexto.find((linha) => /^\s*\d{1,2}\s*(h|hs|hrs|hora|horas)\s*$/i.test(linha));
    if (!quantidadeHoras && duracaoLinhaSolta) {
      const qtdSolta = Number((duracaoLinhaSolta.match(/\d{1,2}/) || [])[0]);
      if (qtdSolta > 0 && qtdSolta <= 12) quantidadeHoras = qtdSolta;
    }

    if (!horaInicio) {
      const horaInicioLinhaSoltaV235 = linhasTexto.find((linha) => {
        const l = normalizarTexto(linha).trim();

        // Aceita formatos soltos:
        // "as 19h", "às 19 h", "19 horas", "19:00", "19h"
        if (/^\s*(as|às)?\s*\d{1,2}\s*(h|hs|hora|horas)\s*$/i.test(linha)) return true;
        if (/^\s*\d{1,2}:[0-5]\d\s*$/i.test(linha)) return true;

        return false;
      });

      if (horaInicioLinhaSoltaV235) {
        horaInicio = normalizarHoraTexto(horaInicioLinhaSoltaV235, textoApoio);
      }
    }

    const duracoes = [...textoHorario.matchAll(/(\d{1,2})\s*(hora|horas|hrs|hs|h)\b/gi)];
    for (const m of duracoes) {
      const qtd = Number(m[1]);
      const antes = textoHorario.slice(Math.max(0, m.index - 30), m.index);
      const depois = textoHorario.slice(m.index, m.index + 35);
      const pareceHorarioInicio =
        antes.includes("comeca") ||
        antes.includes("começa") ||
        antes.includes("inicio") ||
        antes.includes("início") ||
        antes.includes("horario") ||
        antes.includes("horário") ||
        antes.trim().endsWith("as") ||
        antes.trim().endsWith("às") ||
        depois.includes("manha") ||
        depois.includes("manhã") ||
        depois.includes("tarde") ||
        depois.includes("noite");

      if (qtd > 0 && qtd <= 12 && !pareceHorarioInicio) {
        quantidadeHoras = qtd;
        break;
      }
    }

    const totalDeHoras = textoHorario.match(/total\s+de\s+(\d{1,2})\s*(hora|horas|hrs|hs|h)/i);
    if (!quantidadeHoras && totalDeHoras) {
      const qtd = Number(totalDeHoras[1]);
      if (qtd > 0 && qtd <= 12) quantidadeHoras = qtd;
    }

    if (!horaFim && horaInicio && quantidadeHoras) {
      horaFim = somarHoras(horaInicio, quantidadeHoras);
    }

    const idadePorRotulo = valorPorRotulo(["é 15 anos? se não for 15 anos é qual idade", "e 15 anos? se nao for 15 anos e qual idade", "idade", "qual idade"]);
    const idadeNums = extrairNumeros(idadePorRotulo);
    const idadeRotulo = idadeNums.length ? idadeNums[idadeNums.length - 1] : "";
    const idadeMatch = textoApoio.match(/(\d{1,3})\s*(anos|aninhos|idade)/i);
    const idade = idadeRotulo || (idadeMatch ? Number(idadeMatch[1]) : "");

    const tipoEventoRotulo = valorPorRotulo(["tipo de evento", "e qual é o tipo de evento", "e qual e o tipo de evento", "qual é o tipo de evento", "qual e o tipo de evento", "evento"]);
    let tipoEvento = "";
    const tipoNormal = normalizarTexto(tipoEventoRotulo);
    if (tipoNormal.includes("aniversario") || tipoNormal.includes("aniversário")) tipoEvento = "Aniversário";
    else if (tipoNormal.includes("inauguracao") || tipoNormal.includes("inauguração")) tipoEvento = "Inauguração";
    else if (tipoNormal.includes("casamento")) tipoEvento = "Casamento";
    else if (tipoNormal.includes("formatura")) tipoEvento = "Formatura";
    else if (tipoNormal.includes("confraternizacao") || tipoNormal.includes("confraternização")) tipoEvento = "Confraternização";
    else if (tipoNormal.includes("empresa") || tipoNormal.includes("corporativo")) tipoEvento = "Evento corporativo";
    else if (tipoNormal.includes("batizado")) tipoEvento = "Batizado";
    else if (tipoNormal.includes("loja")) tipoEvento = "Evento em loja";

    if (!tipoEvento && tipoEventoRotulo) {
      tipoEvento = tipoEventoRotulo.trim();
    }

    if (!tipoEvento) {
      if (t.includes("inauguracao") || t.includes("inauguração")) tipoEvento = "Inauguração";
      else if (t.includes("aniversario") || t.includes("aniversário") || idade) tipoEvento = idade ? `Aniversário de ${idade} anos` : "Aniversário";
      else if (t.includes("casamento")) tipoEvento = "Casamento";
      else if (t.includes("formatura")) tipoEvento = "Formatura";
      else if (t.includes("confraternizacao") || t.includes("confraternização")) tipoEvento = "Confraternização";
      else if (t.includes("empresa") || t.includes("corporativo")) tipoEvento = "Evento corporativo";
      else if (t.includes("batizado")) tipoEvento = "Batizado";
      else if (t.includes("loja")) tipoEvento = "Evento em loja";
    }

    if (tipoEvento === "Aniversário" && idade) tipoEvento = `Aniversário de ${idade} anos`;

    const localEventoRotulo = valorPorRotulo(["será em buffet, casa ou local externo", "sera em buffet, casa ou local externo", "será em buffet casa ou local externo", "sera em buffet casa ou local externo", "local do evento", "local"]);
    let localEvento = "";
    const localNormal = normalizarTexto(localEventoRotulo);
    if (localNormal.includes("buffet")) localEvento = "Buffet";
    else if (localNormal.includes("casa")) localEvento = "Casa";
    else if (localNormal.includes("salao") || localNormal.includes("salão")) localEvento = "Salão de festa";
    else if (localNormal.includes("loja")) localEvento = "Loja";
    else if (localNormal.includes("externo") || localNormal.includes("ar livre")) localEvento = "Local externo";

    if (!localEvento) {
      if (t.includes("casa mesmo") || t.includes("em casa")) localEvento = "Casa";
      else if (t.includes("salao") || t.includes("salão")) localEvento = "Salão de festa";
      else if (t.includes("loja")) localEvento = "Loja";
      else if (t.includes("buffet")) localEvento = "Buffet";
      else if (t.includes("casa")) localEvento = "Casa";
      else if (t.includes("lado de fora") || t.includes("externo") || t.includes("ar livre") || t.includes("praia") || t.includes("sitio") || t.includes("sítio")) localEvento = "Local externo";
    }

    let endereco = valorPorRotulo(["endereço do local do evento", "endereco do local do evento", "endereço", "endereco"]);
    const enderecoMatch = textoApoio.match(/\b(rua|avenida|av\.?|travessa|tv\.?|alameda|rodovia|estrada)\s+(.{3,120})/i);
    if (!endereco && enderecoMatch) {
      endereco = `${enderecoMatch[1]} ${enderecoMatch[2]}`
        .split(/ bairro | cidade | dia | vai | começa | comeca | inauguração | inauguracao | aniversário | aniversario | casamento | formatura | cpf | whatsapp /i)[0]
        .trim();
    }

    const cidadeBairroRotulo = valorPorRotulo(["cidade / bairro", "cidade/bairro", "cidade e bairro"]);
    let cidade = "";
    let bairro = "";

    if (cidadeBairroRotulo) {
      const partes = cidadeBairroRotulo.split(/[,/|-]/).map((p) => p.trim()).filter(Boolean);
      cidade = partes[0] || "";
      bairro = partes.slice(1).join(" / ") || "";
    }

    if (!cidade) cidade = valorPorRotulo(["onde será", "onde sera", "cidade"] ) || pegarDepoisDaPalavra("cidade");
    if (!bairro) bairro = valorPorRotulo(["bairro"] ) || pegarDepoisDaPalavra("bairro");

    if (!bairro && endereco) {
      const partesEndereco = endereco.split(/\s+/);
      const ultimo = partesEndereco[partesEndereco.length - 1] || "";
      if (ultimo.length > 3 && !/\d/.test(ultimo)) bairro = ultimo;
    }

    const cidadeFinal = [cidade, bairro].filter(Boolean).join(" / ") || form.cidade;

    let nomeMelhorado = limparNomeExtraido(valorPorRotulo(["nome completo", "nome", "cliente", "contratante"]));
    const nomeExplicito = texto.match(/(?:nome\s+completo|nome|cliente|contratante)\s*[:\-]?\s*([a-zA-ZÀ-ÿ\s]{6,80})/i);
    if (!nomeMelhorado && nomeExplicito) nomeMelhorado = limparNomeExtraido(nomeExplicito[1]);

    if (!nomeMelhorado) {
      for (let i = linhasTexto.length - 1; i >= 0; i--) {
        const linha = linhasTexto[i];
        const l = normalizarTexto(linha);
        const temNumero = extrairNumeros(linha).length > 0;

        if (
          !temNumero &&
          linha.length > 6 &&
          linha.split(" ").length >= 2 &&
          !l.includes("rua") &&
          !l.includes("avenida") &&
          !l.includes("bairro") &&
          !l.includes("cidade") &&
          !l.includes("horas") &&
          !l.includes("pessoas") &&
          !l.includes("evento") &&
          !l.includes("casa") &&
          !l.includes("buffet") &&
          !l.includes("salão") &&
          !l.includes("salao") &&
          !l.includes("loja") &&
          !l.includes("festa") &&
          !l.includes("inauguracao") &&
          !l.includes("inauguração") &&
          !l.includes("aniversario") &&
          !l.includes("aniversário") &&
          !l.includes("simples") &&
          !l.includes("mesmo") &&
          !l.includes("começa") &&
          !l.includes("comeca")
        ) {
          nomeMelhorado = linha.trim();
          break;
        }
      }
    }

    const aniversarianteLinha = procurarLinhaCom(texto, ["aniversariante", "nome da crianca", "nome da criança"]);
    const aniversariante = limparResposta(aniversarianteLinha, ["nome do aniversariante", "aniversariante", "nome da criança", "nome da crianca"]);

    let pacoteSugerido = "";
    if (t.includes("projetor") || t.includes("telão") || t.includes("telao")) pacoteSugerido = "Pacote Projeção - Telão + Projetor";
    else if (tipoEvento.includes("Aniversário")) {
      if (idade && Number(idade) <= 12) pacoteSugerido = "Pacote Kids Festa Infantil - DJ + Som + Luz + Máquina de fumaça opcional";
      else pacoteSugerido = "Pacote 02 de ENTRADA - DJ + Som + Iluminação + Máquina de fumaça opcional";
    }
    else if (tipoEvento === "Inauguração" || localEvento === "Loja") pacoteSugerido = "Pacote de ENTRADA 01 - DJ + Som";

    const mensagemSugerida = nomeMelhorado
      ? `Olá, ${nomeMelhorado}! Recebi as informações do seu evento para ${dataExtraida ? dataCurtaBR(dataExtraida) : "a data informada"}${horaInicio ? ` às ${horaInicio}` : ""}. Vou conferir o melhor pacote e já te retorno.`
      : "";
    horaInicio = dadosTextoLivreV23.horaInicio || horaInicio;
    quantidadeHoras = quantidadeHoras || dadosTextoLivreV23.duracao;

const duracaoForcada = (() => {
  const textoHora = normalizarTexto(texto);
  const achou = textoHora.match(/(\d{1,2})\s*(hora|horas|hrs)\b/i);
  if (!achou) return null;

  const qtd = Number(achou[1]);
  return qtd > 0 && qtd <= 12 ? qtd : null;
})();

const corrigirHoraFimQuandoPegouDuracaoComoHorario = () => {
  const duracaoFinal = quantidadeHoras || duracaoForcada || dadosTextoLivreV23.duracao;

  if (!horaInicio || !duracaoFinal) return horaFim;

  const inicioNumero = Number(String(horaInicio).split(":")[0]);
  const fimNumero = Number(String(horaFim || "").split(":")[0]);

  // Exemplo real:
  // "começa as 19h"
  // "3h"
  // Antes o sistema podia entender horaFim como 03:00.
  // Aqui corrigimos para 19:00 + 3h = 22:00.
  if (horaFim && inicioNumero >= 12 && fimNumero > 0 && fimNumero <= 12 && fimNumero === Number(duracaoFinal)) {
    return somarHorasTexto(horaInicio, duracaoFinal);
  }

  return horaFim || somarHorasTexto(horaInicio, duracaoFinal);
};

const horaFimFinal = corrigirHoraFimQuandoPegouDuracaoComoHorario();
    const valoresPagos = [...textoApoio.matchAll(/pagou\s*(?:r\$)?\s*([0-9]+(?:[,.][0-9]{1,2})?)/gi)]
      .map((m) => Number(String(m[1]).replace(",", ".")))
      .filter((n) => !Number.isNaN(n) && n > 0);

    const entradaExtraida = valoresPagos.length > 0 ? valoresPagos[0] : "";
    const totalPagoExtraido = valoresPagos.length > 1 ? valoresPagos.reduce((acc, n) => acc + n, 0) : "";
    const valorExtraido = totalPagoExtraido || "";

    const obsExtras = [
      observacoesInternasJP(form),
      localEvento ? `Local informado: ${localEvento}` : "",
      quantidadeHoras ? `Duração informada: ${quantidadeHoras} hora(s)` : "",
      idade ? `Idade informada: ${idade} anos` : "",
      aniversariante ? `Nome do aniversariante: ${aniversariante}` : "",
      pacoteSugerido ? `Sugestão de pacote: ${pacoteSugerido}` : "",
      mensagemSugerida ? `Mensagem sugerida para o cliente: ${mensagemSugerida}` : "",
      t.includes("coberto") ? "Cliente informou que o local é coberto." : "",
      t.includes("lado de fora") ? "Cliente informou que será do lado de fora." : "",
      "Dados extraídos da conversa do WhatsApp."
    ].filter(Boolean).join(String.fromCharCode(10));

    setForm({
      ...form,
      nome: nomeMelhorado || dadosTextoLivreV23.nome || form.nome,
      cpf: documentoExtraido || form.cpf,
      whatsapp: telefoneExtraido || form.whatsapp,
      tipoEvento: tipoEvento || dadosTextoLivreV23.tipoEvento || form.tipoEvento,
      data: dataExtraida || form.data,
      horaInicio: horaInicio || dadosTextoLivreV23.horaInicio || form.horaInicio,
      horaFim: horaFimFinal || dadosTextoLivreV23.horaFim || form.horaFim,
      endereco: endereco || dadosTextoLivreV23.endereco || form.endereco,
      cidade: cidadeFinal || dadosTextoLivreV23.cidade,
      bairro: bairro || form.bairro || "",
      pacote: form.pacote || pacoteSugerido,
      valor: campoFoiPreenchido(form.valor) ? String(form.valor) : (valorExtraido ? String(valorExtraido) : (pacoteInfo(pacoteSugerido)?.valor ? String(pacoteInfo(pacoteSugerido).valor) : form.valor)),
      entrada: campoFoiPreenchido(form.entrada) ? String(form.entrada) : (entradaExtraida ? String(entradaExtraida) : "0"),
      formaEntrada: form.formaEntrada || (pacoteInfo(pacoteSugerido) ? "Pix" : form.formaEntrada),
      formaPagamento: form.formaPagamento || (pacoteInfo(pacoteSugerido) ? "Entrada / sinal" : form.formaPagamento),
      obsInternas: obsExtras,
      obsExtras: form.obsExtras || "",
      obs: juntarObservacoesJP(obsExtras, form.obsExtras || "")
    });

    setTextoWhatsApp(textoOriginal);
    setAba("cadastro");
    alert("Extração concluída! Confira os campos antes de salvar.");
  };

  const limpar = () => {
    setForm(formInicial);
    setCustoDescricaoDigitando("");
    setEditandoId(null);
    localStorage.removeItem("rascunhoFormJPEventos");
  };

  const limparSomenteWhatsApp = () => {
    setTextoWhatsApp("");
    localStorage.removeItem("rascunhoWhatsAppJPEventos");
  };

  const limparSomenteCadastro = () => {
    if (!confirm("Limpar somente os campos do cadastro? A conversa do WhatsApp será mantida.")) return;
    setForm(formInicial);
    setCustoDescricaoDigitando("");
    setEditandoId(null);
    localStorage.removeItem("rascunhoFormJPEventos");
  };

  const exportarBackup = () => {
    const dados = {
      sistema: "JP Eventos",
      versao: "24.4 observacoes separadas",
      dataBackup: new Date().toLocaleString("pt-BR"),
      eventos
    };

    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_jp_eventos_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importarBackup = (arquivo) => {
    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = (ev) => {
      try {
        const dados = JSON.parse(ev.target.result);
        const novosEventos = Array.isArray(dados) ? dados : dados.eventos;

        if (!Array.isArray(novosEventos)) {
          alert("Arquivo de backup inválido.");
          return;
        }

        const confirmar = confirm("Deseja importar este backup? OK para substituir os dados atuais.");

        if (confirmar) {
          setEventos(novosEventos);
          alert("Backup importado com sucesso!");
        }
      } catch (erro) {
        alert("Não foi possível ler o arquivo de backup.");
      }
    };

    leitor.readAsText(arquivo);
  };

  const apagarTudo = () => {
    const confirmar = confirm("Tem certeza que deseja apagar TODOS os eventos? Faça um backup antes.");
    if (!confirmar) return;

    const confirmarDeNovo = confirm("Confirma mesmo? Essa ação apaga todos os dados salvos neste navegador.");
    if (!confirmarDeNovo) return;

    setEventos([]);
    localStorage.removeItem("eventos");
    alert("Todos os eventos foram apagados.");
  };

  const resetarSistema = async () => {
    const primeira = confirm(
      "ATENÇÃO: isso vai apagar TODOS os dados do sistema.\n\nAntes de continuar, faça backup em Configurações.\n\nDeseja continuar?"
    );

    if (!primeira) return;

    const confirmacao = prompt(
      "Para confirmar o RESET TOTAL, digite exatamente: CONFIRMAR"
    );

    if (confirmacao !== "CONFIRMAR") {
      alert("Reset cancelado. Nada foi apagado.");
      return;
    }

    const segunda = confirm(
      "Última confirmação: apagar todos os eventos, cadastros, financeiro, histórico e dados locais?"
    );

    if (!segunda) return;

    try {
      setEventos([]);
      localStorage.removeItem("eventos");
      localStorage.removeItem("metaMensalJPEventos");
      localStorage.removeItem("tomWhatsAppJPEventos");
      salvarFilaSync([]);

      if (bancoCarregadoRef.current) {
        await supabase
          .from("eventos")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
      }

      alert("Sistema resetado com sucesso. Agora você pode começar com clientes reais.");
      window.location.reload();
    } catch (erro) {
      console.error("Erro ao resetar sistema:", erro);
      alert(`Dados locais apagados, mas houve erro ao limpar online: ${erro?.message || erro}`);
      window.location.reload();
    }
  };

  const salvar = () => {
    const modoCliente = aba === "cadastro" && !editandoId;

    if (modoCliente) {
      if (!form.nome || !form.whatsapp) {
        alert("Preencha pelo menos nome e WhatsApp do cliente.");
        return;
      }

      const idCliente = criarIdSeguro();
      const novoCliente = {
        ...formInicial,
        id: idCliente,
        clienteOnly: true,
        nome: form.nome,
        whatsapp: form.whatsapp,
        cpf: form.cpf || "",
        endereco: form.endereco || "",
        cidade: form.cidade || "",
        bairro: form.bairro || "",
        obsInternas: form.obsInternas || form.obs || "",
        obsExtras: form.obsExtras || "",
        obs: juntarObservacoesJP(form.obsInternas || form.obs || "", form.obsExtras || ""),
        tipoEvento: "",
        data: "",
        valor: "0",
        entrada: "0",
        custo: "0",
        status: "cliente",
        dataCadastro: new Date().toLocaleString("pt-BR"),
        historico: [criarRegistroHistorico("Cliente cadastrado", "Cadastro inicial sem evento/serviço")]
      };

      setEventos([novoCliente, ...eventos]);
      setBusca(novoCliente.nome || novoCliente.whatsapp || "");
      limpar();
      setClienteAbertoChave(chaveClienteJP(novoCliente));
      setAba("clientes");
      setMenuAberto(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!form.nome || !form.whatsapp || !form.tipoEvento || !form.data) {
      alert("Preencha pelo menos cliente, WhatsApp, tipo de evento e data.");
      return;
    }

    const custoDescricaoLimpa = String(form.custoDescricao || "").trim();
    const obsInternasSemCusto = removerServicosTextoJP(removerCustoDescricaoJP(form.obsInternas ?? form.obs));
    const obsInternasComCusto = [
      obsInternasSemCusto,
      custoDescricaoLimpa ? `Custo do evento: ${custoDescricaoLimpa}` : ""
    ].filter(Boolean).join("\n");

    const numeroCampo = (valor) => valorNumericoJP(valor);
    const totalEvento = numeroCampo(form.valor);
    const entradaManual = numeroCampo(form.entrada);
    const tipoPagamentoCadastro = form.pagamentoCadastroTipo || "nao";
    const temPagamentoNoCadastro = tipoPagamentoCadastro !== "nao";
    const valorRecebidoAgora = temPagamentoNoCadastro ? numeroCampo(form.pagamentoCadastroValor) : 0;

    if (temPagamentoNoCadastro && valorRecebidoAgora <= 0) {
      alert("Informe o valor recebido agora ou escolha 'Não recebeu pagamento agora'.");
      return;
    }

    if (tipoPagamentoCadastro === "total" && totalEvento > 0 && valorRecebidoAgora < totalEvento) {
      const seguir = confirm(
        `Você marcou PAGAMENTO TOTAL, mas o valor recebido (${moeda(valorRecebidoAgora)}) é menor que o valor total (${moeda(totalEvento)}).\n\nDeseja salvar como pagamento parcial/entrada?`
      );
      if (!seguir) return;
    }

    const ehPagamentoTotalNoCadastro = tipoPagamentoCadastro === "total" && (totalEvento === 0 || valorRecebidoAgora >= totalEvento);
    const entradaDocumento = tipoPagamentoCadastro === "sinal"
      ? (entradaManual > 0 ? entradaManual : valorRecebidoAgora)
      : entradaManual;

    const quitadoCalculado = ehPagamentoTotalNoCadastro || (totalEvento > 0 && entradaDocumento >= totalEvento);

    const dadosEvento = {
      ...form,
      entrada: String(entradaDocumento),
      custoDescricao: custoDescricaoLimpa,
      servicosTexto: String(form.servicosTexto || "").trim(),
      clienteOnly: false,
      obsInternas: obsInternasComCusto,
      formaEntrada: temPagamentoNoCadastro ? (form.pagamentoCadastroForma || form.formaEntrada || "Pix") : (form.formaEntrada || ""),
      formaPagamento: ehPagamentoTotalNoCadastro ? (form.pagamentoCadastroForma || form.formaPagamento || "Pix") : (form.formaPagamento || ""),
      parcelas: form.pagamentoCadastroForma === "Cartão de crédito" && Number(form.pagamentoCadastroParcelas || 1) > 1 ? `${form.pagamentoCadastroParcelas}x` : (form.parcelas || ""),
      obs: juntarObservacoesJP(obsInternasComCusto, form.obsExtras),
      horaInicio: normalizarHorarioManual(form.horaInicio) || form.horaInicio,
      horaFim: normalizarHorarioManual(form.horaFim) || form.horaFim,
      status: (form.status === "confirmado" || temPagamentoNoCadastro) ? "confirmado" : (form.status || "pre"),
      quitado: quitadoCalculado,
      executado: Boolean(form.executado),
      pagamentoCadastroTipo: "nao",
      pagamentoCadastroValor: "",
      pagamentoCadastroContaId: "nubank",
      pagamentoCadastroForma: "Pix",
      pagamentoCadastroParcelas: "1",
      pagamentoCadastroTaxa: "0",
      pagamentoCadastroData: new Date().toISOString().slice(0, 10)
    };

    const idFinal = editandoId || criarIdSeguro();
    const historicoPagamento = temPagamentoNoCadastro
      ? criarRegistroHistorico(
          ehPagamentoTotalNoCadastro ? "Pagamento total registrado no cadastro" : "Entrada/sinal registrada no cadastro",
          `${moeda(valorRecebidoAgora)} em ${contaPorId(form.pagamentoCadastroContaId).nome} via ${form.pagamentoCadastroForma || "Pix"}`
        )
      : null;

    if (temPagamentoNoCadastro) {
      const ehCartaoCredito = form.pagamentoCadastroForma === "Cartão de crédito";
      const parcelas = ehCartaoCredito ? limitarNumero(form.pagamentoCadastroParcelas || 1, 1, 12) : 1;
      const taxaCartao = ehCartaoCredito ? numeroCampo(form.pagamentoCadastroTaxa) : 0;
      const valorTaxaTotal = Math.max((valorRecebidoAgora * taxaCartao) / 100, 0);
      const valorLiquidoTotal = Math.max(valorRecebidoAgora - valorTaxaTotal, 0);
      const grupoParcelamentoId = parcelas > 1 ? criarIdSeguro() : "";

      for (let i = 0; i < parcelas; i += 1) {
        criarMovimentoCaixa({
          tipo: "entrada",
          data: somarMesesData(form.pagamentoCadastroData || new Date().toISOString().slice(0, 10), i),
          descricao: parcelas > 1
            ? `Parcela ${i + 1}/${parcelas} - ${ehPagamentoTotalNoCadastro ? "Pagamento total" : "Entrada/sinal"} - ${form.nome}`
            : `${ehPagamentoTotalNoCadastro ? "Pagamento total" : "Entrada/sinal"} - ${form.nome}`,
          categoria: ehPagamentoTotalNoCadastro ? "Pagamento de cliente" : "Entrada / sinal",
          valor: parcelas > 1 ? valorLiquidoTotal / parcelas : valorLiquidoTotal,
          contaId: form.pagamentoCadastroContaId || contaPorId("nubank")?.id || contasFinanceiras[0]?.id || "nubank",
          formaPagamento: form.pagamentoCadastroForma || "Pix",
          parcelas: String(parcelas),
          parcelaNumero: parcelas > 1 ? String(i + 1) : "",
          grupoParcelamentoId,
          taxaCartao,
          valorBruto: parcelas > 1 ? valorRecebidoAgora / parcelas : valorRecebidoAgora,
          valorTaxa: parcelas > 1 ? valorTaxaTotal / parcelas : valorTaxaTotal,
          eventoId: idFinal,
          cliente: form.nome || "Cliente",
          observacao: ehCartaoCredito && parcelas > 1
            ? `Pagamento parcelado em ${parcelas}x. Valor bruto total: ${moeda(valorRecebidoAgora)}. Taxa: ${taxaCartao}%.`
            : "Lançado automaticamente pelo cadastro."
        });
      }
    }

    if (editandoId) {
      const atualizados = eventos.map((e) =>
        e.id === editandoId
          ? {
              ...dadosEvento,
              id: editandoId,
              dataCadastro: form.dataCadastro || new Date().toLocaleString("pt-BR"),
              historico: [
                criarRegistroHistorico("Cadastro atualizado", dadosEvento.quitado ? "Pagamento quitado" : dadosEvento.status === "confirmado" ? "Reserva confirmada" : "Pré-reserva/proposta"),
                ...(historicoPagamento ? [historicoPagamento] : []),
                ...(Array.isArray(e.historico) ? e.historico : [])
              ].slice(0, 50)
            }
          : e
      );
      setEventos(atualizados);
    } else {
      const novo = {
        ...dadosEvento,
        id: idFinal,
        dataCadastro: new Date().toLocaleString("pt-BR"),
        historico: [
          criarRegistroHistorico("Cadastro criado", dadosEvento.quitado ? "Pagamento quitado" : dadosEvento.status === "confirmado" ? "Reserva confirmada" : "Pré-reserva/proposta"),
          ...(historicoPagamento ? [historicoPagamento] : [])
        ]
      };
      setEventos([novo, ...eventos]);
      setBusca(novo.nome || "");
      setFiltroStatus("todos");
    }

    const chaveDepois = chaveClienteJP(dadosEvento);
    limpar();
    setClienteAbertoChave(chaveDepois);
    setAba("clientes");
    setMenuAberto(false);
  };

  const salvarClienteEIniciarServico = () => {
    if (!form.nome || !form.whatsapp) {
      alert("Preencha pelo menos nome e WhatsApp do cliente antes de criar evento/serviço.");
      return;
    }

    const idCliente = criarIdSeguro();
    const novoCliente = {
      ...formInicial,
      id: idCliente,
      clienteOnly: true,
      nome: form.nome,
      whatsapp: form.whatsapp,
      cpf: form.cpf || "",
      endereco: form.endereco || "",
      cidade: form.cidade || "",
      bairro: form.bairro || "",
      obsInternas: form.obsInternas || form.obs || "",
      obsExtras: form.obsExtras || "",
      obs: juntarObservacoesJP(form.obsInternas || form.obs || "", form.obsExtras || ""),
      tipoEvento: "",
      servicosTexto: "",
      data: "",
      valor: "0",
      entrada: "0",
      custo: "0",
      status: "cliente",
      dataCadastro: new Date().toLocaleString("pt-BR"),
      historico: [criarRegistroHistorico("Cliente cadastrado", "Cliente criado e direcionado para novo evento/serviço")]
    };

    setEventos([novoCliente, ...eventos]);
    setClienteAbertoChave(chaveClienteJP(novoCliente));
    setOrigemTelaAnterior("clientes");
    setForm({
      ...formInicial,
      nome: novoCliente.nome,
      whatsapp: novoCliente.whatsapp,
      cpf: novoCliente.cpf,
      endereco: novoCliente.endereco,
      cidade: novoCliente.cidade,
      bairro: novoCliente.bairro,
      obsInternas: `Novo evento/serviço para cliente já cadastrado: ${novoCliente.nome || ""}`
    });
    setAba("servico");
    setMenuAberto(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const excluirEvento = (id) => {
    const eventoAlvo = eventos.find((e) => e.id === id);
    if (!eventoAlvo) {
      alert("Evento/serviço não encontrado.");
      return;
    }

    const titulo = eventoAlvo.tipoEvento || eventoAlvo.pacote || "evento/serviço";
    const dataTexto = eventoAlvo.data ? dataCurtaBR(eventoAlvo.data) : "sem data";
    const clienteTexto = eventoAlvo.nome || "cliente sem nome";

    const ok = confirm(
      `Deseja excluir SOMENTE este evento/serviço?

Cliente: ${clienteTexto}
Evento/serviço: ${titulo}
Data: ${dataTexto}

✅ OK = apagar apenas este evento
❌ Cancelar = não apagar

O cliente e os outros eventos deste cliente continuarão salvos.`
    );
    if (!ok) return;

    setEventos((lista) => lista.filter((e) => e.id !== id));

    const movimentosRelacionados = movimentosCaixa.filter((m) => m.eventoId === id);
    if (movimentosRelacionados.length > 0) {
      const limparCaixa = confirm(
        `Este evento/serviço tem ${movimentosRelacionados.length} lançamento(s) de caixa vinculado(s).

Deseja remover também esses lançamentos do caixa?

✅ OK = remover lançamentos
❌ Cancelar = manter lançamentos`
      );
      if (limparCaixa) {
        setMovimentosCaixa((lista) => lista.filter((m) => m.eventoId !== id));
      }
    }

    setEventoExpandidoId(null);
    setEventoAbertoLista(null);
    alert("Evento/serviço excluído. O cliente foi mantido.");
  };

  const excluirClienteCompleto = (cliente) => {
    if (!cliente) return;
    const eventosDoCliente = eventos.filter((e) => chaveClienteJP(e) === cliente.chave);
    const qtdEventos = eventosDoCliente.length;
    const nomeCliente = cliente.nome || "Cliente sem nome";

    const ok = confirm(
      `Deseja excluir este cliente COMPLETO?

Cliente: ${nomeCliente}
WhatsApp: ${cliente.whatsapp || "Não informado"}
Eventos/serviços vinculados: ${qtdEventos}

⚠️ Isso apaga o cliente e todos os eventos/serviços dele.

✅ OK = excluir cliente completo
❌ Cancelar = sair sem apagar`
    );
    if (!ok) return;

    const confirmarFinal = confirm(
      `Confirma mesmo a exclusão completa de ${nomeCliente}?

Depois disso, os eventos/serviços desse cliente também serão removidos da lista.

✅ OK = confirmar exclusão
❌ Cancelar = desistir`
    );
    if (!confirmarFinal) return;

    const idsEventosCliente = new Set(eventosDoCliente.map((e) => e.id));
    setEventos((lista) => lista.filter((e) => chaveClienteJP(e) !== cliente.chave));

    const movimentosRelacionados = movimentosCaixa.filter((m) => idsEventosCliente.has(m.eventoId));
    if (movimentosRelacionados.length > 0) {
      const limparCaixa = confirm(
        `Esse cliente tem ${movimentosRelacionados.length} lançamento(s) de caixa ligado(s) aos eventos dele.

Deseja remover esses lançamentos também?

✅ OK = remover do caixa
❌ Cancelar = manter no caixa`
      );
      if (limparCaixa) {
        setMovimentosCaixa((lista) => lista.filter((m) => !idsEventosCliente.has(m.eventoId)));
      }
    }

    setClienteAbertoChave(null);
    setEventoExpandidoId(null);
    setBusca("");
    alert("Cliente excluído com segurança.");
  };

  const editarEvento = (evento) => {
    setCustoDescricaoDigitando(custoDescricaoFinalJP(evento));
    setForm({
      ...formInicial,
      ...evento,
      custoDescricao: custoDescricaoFinalJP(evento),
      obsInternas: removerCustoDescricaoJP(observacoesInternasJP(evento)),
      obsExtras: observacoesExtrasJP(evento),
      obs: juntarObservacoesJP(observacoesInternasJP(evento), observacoesExtrasJP(evento))
    });
    setEditandoId(evento.id);
    setAba("servico");
  };

  const toggleExecutado = (id) => {
    setEventos((lista) =>
      lista.map((e) =>
        e.id === id
          ? {
              ...e,
              executado: !e.executado,
              historico: [
                criarRegistroHistorico(!e.executado ? "Evento marcado como executado" : "Evento desmarcado como executado"),
                ...(Array.isArray(e.historico) ? e.historico : [])
              ].slice(0, 50)
            }
          : e
      )
    );
  };

  const marcarQuitado = (id, quitado) => {
    const registro = criarRegistroHistorico(quitado ? "Marcado como pago" : "Marcado como pendente", quitado ? "Pagamento confirmado" : "Pagamento em aberto");
    setEventos((lista) =>
      lista.map((e) =>
        e.id === id
          ? {
              ...e,
              quitado,
              status: quitado ? "confirmado" : e.status,
              historico: [registro, ...(Array.isArray(e.historico) ? e.historico : [])].slice(0, 50)
            }
          : e
      )
    );
  };

  const calcularDuracao = (inicio, fim) => {
    const inicioNormal = normalizarHorarioManual(inicio);
    const fimNormal = normalizarHorarioManual(fim);

    if (!inicioNormal || !fimNormal) return "Não informado";

    const [h1, m1] = inicioNormal.split(":").map(Number);
    const [h2, m2] = fimNormal.split(":").map(Number);

    if ([h1, m1, h2, m2].some((v) => Number.isNaN(v))) return "Não informado";

    let diferenca = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diferenca < 0) diferenca += 24 * 60;

    const horas = Math.floor(diferenca / 60);
    const minutos = diferenca % 60;

    if (horas <= 0 && minutos <= 0) return "Não informado";
    if (minutos === 0) return `${horas} horas`;
    return `${horas}h ${minutos}min`;
  };

  const abrirWhatsApp = (evento) => {
    const numero = typeof evento === "string" ? evento : evento.whatsapp;
    if (!numero) {
      alert("WhatsApp não informado.");
      return;
    }

    let numeroLimpo = numero.replace(/\D/g, "");
    if (!numeroLimpo.startsWith("55")) numeroLimpo = `55${numeroLimpo}`;

    const mensagem =
      typeof evento === "string"
        ? "Olá! Tudo bem?"
        : `Olá, ${evento.nome}! Tudo bem? Passando para falar sobre o evento ${evento.tipoEvento}${evento.servicosTexto ? ` | ${evento.servicosTexto}` : ""} marcado para ${dataCurtaBR(evento.data)} às ${evento.horaInicio || "horário combinado"}.`;

    window.open(`https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`, "_blank");
  };

  const pedirNumeroWhatsApp = (evento, titulo = "Enviar WhatsApp") => {
    const numeroAtual = String(evento?.whatsapp || "").replace(/\D/g, "");
    const numeroDigitado = prompt(
      `${titulo}\n\nConfirme ou altere o WhatsApp de envio:\n(Use DDD + número. Ex: 85999999999)`,
      numeroAtual
    );

    if (numeroDigitado === null) return null;

    let numeroLimpo = String(numeroDigitado || "").replace(/\D/g, "");

    if (!numeroLimpo) {
      alert("WhatsApp não informado.");
      return null;
    }

    if (!numeroLimpo.startsWith("55")) numeroLimpo = `55${numeroLimpo}`;
    return numeroLimpo;
  };

  const abrirWhatsAppComMensagem = (evento, mensagem, titulo, acaoHistorico, detalheHistorico = "") => {
    const numeroInicial = String(evento?.whatsapp || "").replace(/\D/g, "");
    setWhatsAppEditor({
      evento,
      titulo: titulo || "Enviar WhatsApp",
      numero: numeroInicial,
      mensagem: mensagem || "",
      acaoHistorico,
      detalheHistorico
    });
  };

  const abrirWhatsAppPersonalizado = (evento) => {
    const mensagem = [
      `Olá, ${evento?.nome || "tudo bem"}! 😊`,
      "",
      "Estou passando por aqui para falar sobre seu evento.",
      evento?.data ? `📅 Data: ${dataCurtaBR(evento.data)}` : "",
      evento?.tipoEvento ? `🎉 Evento: ${evento.tipoEvento}${evento.servicosTexto ? ` | ${evento.servicosTexto}` : ""}` : "",
      "",
      "Pode me confirmar se está tudo certo por aí?"
    ].filter(Boolean).join("\n");

    abrirWhatsAppComMensagem(evento, mensagem, "Mensagem personalizada", "Mensagem personalizada aberta", "Cliente recebeu mensagem editável");
  };

  const mensagemPremiumSemIA = (evento, tipo = "followup") => {
    const total = Number(evento?.valor || 0);
    const entrada = Number(evento?.entrada || 0);
    const saldo = Math.max(total - entrada, 0);
    const pacoteFinal = pegarPacoteFinal(evento) || "pacote combinado";
    const dataEvento = evento?.data ? dataCurtaBR(evento.data) : "data combinada";
    const horario = `${normalizarHorarioManual(evento?.horaInicio) || evento?.horaInicio || "horário combinado"}${evento?.horaFim ? ` às ${normalizarHorarioManual(evento.horaFim) || evento.horaFim}` : ""}`;
    const nome = evento?.nome || "tudo bem";
    const assinaturaWhats = tomWhatsApp === "curto" ? "" : "\n\nAtenciosamente,\nJean - JP Eventos";

    const modelos = {
      followup: [
        `Olá, ${nome}! Tudo bem? 😊`,
        "",
        `Estou passando para dar continuidade ao atendimento do seu evento ${evento?.tipoEvento || ""} para ${dataEvento}.`,
        total > 0 ? `O pacote ${pacoteFinal} ficou no valor total de ${moeda(total)}.` : `O pacote indicado é: ${pacoteFinal}.`,
        entrada > 0 ? `Para garantir a data na agenda, o sinal fica em ${moeda(entrada)}.` : "Para garantir a data, preciso da confirmação do sinal combinado.",
        "",
        "Se estiver tudo certo, posso deixar sua data encaminhada por aqui. 🙌"
      ],
      urgente: [
        `Olá, ${nome}! 😊`,
        "",
        `Passando rapidinho porque a data ${dataEvento} ainda está como pré-reserva no sistema.`,
        "Como trabalho por agenda, a data só fica garantida depois da confirmação do sinal.",
        entrada > 0 ? `O sinal combinado é de ${moeda(entrada)}.` : "Me confirma por aqui se deseja seguir com a reserva?",
        "",
        "Assim eu já deixo tudo organizado para seu evento. 🙌"
      ],
      confirmacao: [
        `Olá, ${nome}! Tudo bem? 😊`,
        "",
        "Passando para confirmar os dados do seu evento:",
        `📅 Data: ${dataEvento}`,
        `⏰ Horário: ${horario}`,
        `🎉 Evento: ${evento?.tipoEvento || "a confirmar"}`,
        `📍 Local: ${evento?.endereco || cidadeBairroFinal(evento) || "a confirmar"}`,
        "",
        "Está tudo certo com essas informações? Se precisar ajustar algo, me avisa por aqui. 🙌"
      ],
      pagamento: [
        `Olá, ${nome}! 😊`,
        "",
        `Passando para lembrar do financeiro do evento do dia ${dataEvento}.`,
        `Valor total: ${moeda(total)}`,
        `Entrada/sinal: ${moeda(entrada)}`,
        `Saldo pendente: ${moeda(saldo)}`,
        "",
        "Quando puder, me confirma a melhor forma de concluir o pagamento. Obrigado! 🙌"
      ],
      posEvento: [
        `Olá, ${nome}! Tudo bem? 😊`,
        "",
        "Quero agradecer pela confiança no meu trabalho no seu evento.",
        "Foi um prazer fazer parte desse momento! 🙌",
        "",
        "Se puder, me manda um feedback por aqui. Isso ajuda muito meu trabalho e também os próximos clientes."
      ],
      indicacao: [
        `Olá, ${nome}! 😊`,
        "",
        "Fico feliz pela oportunidade de atender seu evento.",
        "Se você conhecer alguém precisando de DJ, som, iluminação ou telão, pode indicar meu contato. 🙌",
        "",
        "Atendo aniversários, casamentos, eventos infantis, inaugurações, confraternizações e eventos corporativos."
      ]
    };

    const base = modelos[tipo] || modelos.followup;
    return base.filter(Boolean).join("\n") + assinaturaWhats;
  };

  const abrirWhatsAppModelo = (evento, tipo, titulo) => {
    abrirWhatsAppComMensagem(
      evento,
      mensagemPremiumSemIA(evento, tipo),
      titulo,
      `Modelo WhatsApp aberto: ${titulo}`,
      "Mensagem gerada pelo sistema sem IA paga e editável antes do envio"
    );
  };

  const numeroWhatsAppFinal = (numero) => {
    let numeroLimpo = String(numero || "").replace(/\D/g, "");
    if (!numeroLimpo) return "";
    if (!numeroLimpo.startsWith("55")) numeroLimpo = `55${numeroLimpo}`;
    return numeroLimpo;
  };

  const copiarMensagemEditada = async () => {
    if (!whatsAppEditor?.mensagem?.trim()) {
      alert("Digite uma mensagem antes de copiar.");
      return;
    }
    await navigator.clipboard.writeText(whatsAppEditor.mensagem);
    alert("Mensagem copiada! Você pode colar no WhatsApp.");
  };

  const enviarMensagemEditada = () => {
    if (!whatsAppEditor) return;
    const numeroFinal = numeroWhatsAppFinal(whatsAppEditor.numero);
    if (!numeroFinal) {
      alert("Informe o WhatsApp do cliente com DDD.");
      return;
    }
    if (!String(whatsAppEditor.mensagem || "").trim()) {
      alert("A mensagem está vazia. Escreva algo antes de enviar.");
      return;
    }

    if (whatsAppEditor.acaoHistorico) {
      registrarHistoricoEvento(whatsAppEditor.evento, whatsAppEditor.acaoHistorico, whatsAppEditor.detalheHistorico || "Mensagem editada/enviada pelo WhatsApp");
    }

    window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(whatsAppEditor.mensagem)}`, "_blank");
    setWhatsAppEditor(null);
  };

  const abrirWhatsAppCobrarSinal = (evento) => {
    const total = Number(evento.valor || 0);
    const entrada = Number(evento.entrada || 0);
    const sinalSugerido = pacoteInfo(pegarPacoteFinal(evento))?.entrada || entrada || 0;
    const valorSinal = entrada > 0 ? entrada : sinalSugerido;

    const mensagem = [
      `Olá, ${evento.nome || "tudo bem"}! 😊`,
      "",
      `Passando para confirmar a reserva da data do seu evento ${evento.tipoEvento || ""} para ${evento.data ? dataCurtaBR(evento.data) : "a data combinada"}.`,
      total > 0 ? `Valor total: ${moeda(total)}` : "",
      valorSinal > 0 ? `Para garantir a data, o sinal de reserva fica em ${moeda(valorSinal)}.` : "Para garantir a data, preciso da confirmação do sinal combinado.",
      "",
      "Assim que o sinal for confirmado, eu deixo sua data bloqueada na agenda e seguimos com o contrato. 🙌"
    ].filter(Boolean).join("\n");

    abrirWhatsAppComMensagem(evento, mensagem, "Cobrar sinal", "Cobrança de sinal enviada", `Sinal: ${moeda(valorSinal)}`);
  };

  const abrirWhatsAppLembrarPagamento = (evento) => {
    const total = Number(evento.valor || 0);
    const entrada = Number(evento.entrada || 0);
    const pendente = evento.quitado ? 0 : Math.max(total - entrada, 0);

    const mensagem = [
      `Olá, ${evento.nome || "tudo bem"}! 😊`,
      "",
      `Passando para lembrar sobre o pagamento do evento ${evento.tipoEvento || ""} marcado para ${evento.data ? dataCurtaBR(evento.data) : "a data combinada"}.`,
      `Valor total: ${moeda(total)}`,
      `Entrada/sinal: ${moeda(entrada)}`,
      `Saldo pendente: ${moeda(pendente)}`,
      "",
      "Quando puder, me confirma por aqui a melhor forma de concluir o pagamento. Obrigado! 🙌"
    ].filter(Boolean).join("\n");

    abrirWhatsAppComMensagem(evento, mensagem, "Lembrar pagamento", "Lembrete de pagamento enviado", `Saldo pendente: ${moeda(pendente)}`);
  };

  const abrirWhatsAppConfirmarEvento = (evento) => {
    const mensagem = [
      `Olá, ${evento.nome || "tudo bem"}! 😊`,
      "",
      `Passando para confirmar os dados do evento ${evento.tipoEvento || ""}:`,
      `📅 Data: ${evento.data ? dataCurtaBR(evento.data) : "a confirmar"}`,
      `⏰ Horário: ${normalizarHorarioManual(evento.horaInicio) || evento.horaInicio || "a confirmar"} às ${normalizarHorarioManual(evento.horaFim) || evento.horaFim || "a confirmar"}`,
      `📍 Endereço: ${evento.endereco || "a confirmar"}`,
      `Cidade/bairro: ${cidadeBairroFinal(evento)}`,
      "",
      "Está tudo certo para o evento? Qualquer ajuste, me avisa por aqui. 🙌"
    ].filter(Boolean).join("\n");

    abrirWhatsAppComMensagem(evento, mensagem, "Confirmar evento", "Confirmação de evento enviada", "Mensagem de confirmação enviada pelo WhatsApp");
  };

  // Mantém compatibilidade com botões antigos, se existirem.
  const abrirWhatsAppCobranca = abrirWhatsAppLembrarPagamento;
  const abrirWhatsAppLembrete = abrirWhatsAppConfirmarEvento;

  const abrirGoogleAgenda = (evento) => {
    if (!evento.data) {
      alert("Data não informada.");
      return;
    }

    const data = evento.data.replaceAll("-", "");
    const horaInicio = (evento.horaInicio || "12:00").replace("h", ":").replace(/\D/g, "").padEnd(4, "0");
    const horaFim = (evento.horaFim || "13:00").replace("h", ":").replace(/\D/g, "").padEnd(4, "0");
    const dataInicio = `${data}T${horaInicio}00`;
    const dataFim = `${data}T${horaFim}00`;
    const titulo = `${textoStatusCurto(evento)} - ${evento.nome} - ${evento.tipoEvento}${evento.servicosTexto ? ` | ${evento.servicosTexto}` : ""}`;
    const total = valorNumericoJP(evento.valor);
    const entrada = valorNumericoJP(evento.entrada);
    const pendente = eventoQuitadoJP(evento) ? 0 : saldoPendenteEventoJP(evento);
    const avisoAgenda = reservaConfirmada(evento)
      ? "✅ EVENTO CONFIRMADO: cliente fechado."
      : temSinal(evento)
        ? "🟠 PRÉ-RESERVA COM SINAL: conferir se já deve virar contrato oficial."
        : "⚠️ PRÉ-RESERVA SEM PAGAMENTO: data NÃO garantida. Conferir retorno do cliente.";
    const detalhes = [
      avisoAgenda,
      "",
      `Cliente: ${evento.nome}`,
      `WhatsApp: ${evento.whatsapp}`,
      `Serviços: ${evento.servicosTexto || (evento.pacote === "Outro" ? evento.pacotePersonalizado : evento.pacote) || "a definir"}`,
      `Valor total: ${moeda(total)}`,
      `Sinal/entrada: ${moeda(entrada)}`,
      `Saldo pendente: ${moeda(pendente)}`,
      `Status: ${textoStatus(evento)}`
    ].join("\n");

    const url =
      "https://www.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(titulo)}` +
      `&dates=${dataInicio}/${dataFim}` +
      `&details=${encodeURIComponent(detalhes)}` +
      `&location=${encodeURIComponent(evento.endereco || "")}`;

    registrarHistoricoEvento(evento, "Google Agenda aberto", textoStatusCurto(evento));
    window.open(url, "_blank");
  };

  const textoCompleto = (e) => {
    const total = Number(e.valor || 0);
    const entrada = Number(e.entrada || 0);
    const pendente = e.quitado ? 0 : Math.max(total - entrada, 0);

    return [
      `Nome: ${e.nome}`,
      `${rotuloDocumentoCliente(e.cpf)}: ${e.cpf || "Não informado"}`,

      `WhatsApp: ${e.whatsapp}`,
      `Tipo do evento: ${e.tipoEvento}`,
      `Data do evento: ${dataBR(e.data)}`,
      `Horário: ${normalizarHorarioManual(e.horaInicio) || e.horaInicio || "Não informado"} às ${normalizarHorarioManual(e.horaFim) || e.horaFim || "Não informado"}`,
      `Duração: ${calcularDuracao(e.horaInicio, e.horaFim)}`,
      `Endereço: ${e.endereco || "Não informado"}`,
      `Cidade / bairro: ${cidadeBairroFinal(e)}`,
      `Pacote: ${e.pacote === "Outro" ? e.pacotePersonalizado : e.pacote || "Não informado"}`,
      `Valor total: ${moeda(total)}`,
      `Entrada / sinal: ${moeda(entrada)}`,
      valorNumericoJP(e.custo) > 0 ? `Custo do evento: ${moeda(e.custo)}${custoDescricaoFinalJP(e) ? ` - ${custoDescricaoFinalJP(e)}` : ""}` : "",
      `Forma da entrada: ${e.formaEntrada || "Não informada"}`,
      `Forma de pagamento: ${e.formaPagamento || "Não informada"}`,
      e.parcelas ? `Parcelas: ${e.parcelas}` : "",
      `Pendente: ${moeda(pendente)}`,
      `Status: ${textoStatus(e)}`,
      `Observações: ${observacoesExtrasJP(e) || "Nenhuma"}`,
      `Data do cadastro: ${e.dataCadastro || "Não informado"}`
    ]
      .filter(Boolean)
      .join("\n");
  };


  const atualizarObservacaoEvento = (evento, valor) => {
    if (!evento?.id) return;

    const atualizados = eventos.map((item) => {
      if (item.id !== evento.id) return item;

      const internas = observacoesInternasJP(item);
      return {
        ...item,
        obsExtras: valor,
        obs: juntarObservacoesJP(internas, valor)
      };
    });

    setEventos(atualizados);
  };

  const abrirRecibo = (evento) => {
    setReciboAberto(evento);
    setTipoRecibo("sinal");
    setPagamentoRecibo(evento.formaEntrada || evento.formaPagamento || "Pix");
  };

  const pacoteSugeridoDasObservacoes = (obs) => {
    const linha = String(obs || "")
      .split("\n")
      .find((item) => normalizarTexto(item).includes("sugestao de pacote"));

    if (!linha) return "";
    return linha.split(":").slice(1).join(":").trim();
  };

  const prepararEventoDocumento = (evento = {}) => {
    const pacoteSugerido = pacoteSugeridoDasObservacoes(evento.obs);
    const pacoteDocumento = evento.pacote || pacoteSugerido || "";
    const infoPacote = pacoteInfo(pacoteDocumento);
    const horaInicioNormal = normalizarHorarioManual(evento.horaInicio);
    const horaFimNormal = normalizarHorarioManual(evento.horaFim);

    // Importante: valor 0 também é um valor válido.
    // Antes, quando entrada era 0, o sistema voltava para o sinal sugerido do pacote.
    const temValorManual = campoFoiPreenchido(evento.valor);

    const temEntradaManual = campoFoiPreenchido(evento.entrada);

    return {
      ...formInicial,
      ...evento,
      nome: evento.nome || "Cliente não informado",
      tipoEvento: evento.tipoEvento || "Evento não informado",
      pacote: pacoteDocumento,
      pacotePersonalizado: evento.pacotePersonalizado || "",
      valor: temValorManual ? String(evento.valor) : (infoPacote ? String(infoPacote.valor) : "0"),
      // Entrada/sinal em branco significa R$ 0,00. Nunca volta sozinho para o sinal sugerido.
      entrada: temEntradaManual ? String(evento.entrada) : "0",
      horaInicio: horaInicioNormal || evento.horaInicio || "",
      horaFim: horaFimNormal || evento.horaFim || "",
      formaEntrada: evento.formaEntrada || "Pix",
      formaPagamento: evento.formaPagamento || "Entrada / sinal",
      status: evento.status || "pre"
    };
  };


  const observacoesDocumento = (evento) => {
    const texto = String(observacoesExtrasJP(evento) || "").trim();
    return texto || "Nenhuma observação informada.";
  };

  const gerarDocumentoEvento = (e, tipo = "contrato") => {
    const ehProposta = tipo === "proposta";
    const doc = new jsPDF();
    const total = Number(e.valor || 0);
    const entrada = Number(e.entrada || 0);
    const pendente = e.quitado ? 0 : Math.max(total - entrada, 0);
    const pacoteFinal = e.pacote === "Outro" ? e.pacotePersonalizado : e.pacote || "Não informado";
    const hojeContrato = new Date().toLocaleDateString("pt-BR");
    const obsLimpa = observacoesDocumento(e);

    const margem = 14;
    const larguraPagina = 210;
    const larguraConteudo = 182;
    let y = 0;

    const limparNomeArquivo = (nome) =>
      String(nome || "cliente")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .toLowerCase();

    const tituloDocumento = ehProposta
      ? "PROPOSTA DE SERVIÇO DE EVENTO"
      : "CONTRATO DE PRESTAÇÃO DE SERVIÇO";

    const novaPagina = () => {
      doc.addPage();
      desenharCabecalho(false);
      y = 42;
    };

    const garantirEspaco = (alturaNecessaria) => {
      if (y + alturaNecessaria > 275) novaPagina();
    };

    const texto = (conteudo, x, posY, opcoes = {}) => {
      doc.text(String(conteudo || ""), x, posY, opcoes);
    };

    const desenharCabecalho = (primeiraPagina = true) => {
      doc.setFillColor(20, 24, 38);
      doc.rect(0, 0, larguraPagina, primeiraPagina ? 42 : 30, "F");

      doc.setFillColor(108, 43, 217);
      doc.rect(0, 0, 6, primeiraPagina ? 42 : 30, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(primeiraPagina ? 16 : 12);
      texto(primeiraPagina ? tituloDocumento : `JP Eventos - ${ehProposta ? "Proposta" : "Contrato"}`, 105, primeiraPagina ? 17 : 16, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      texto("@JP Eventos Fortaleza | @Vdj JeanMix", 105, primeiraPagina ? 27 : 23, { align: "center" });
      if (primeiraPagina) texto("WhatsApp: (85) 98708-3412", 105, 34, { align: "center" });

      doc.setTextColor(0, 0, 0);
    };

    const secao = (titulo) => {
      garantirEspaco(14);
      doc.setFillColor(245, 243, 255);
      doc.setDrawColor(108, 43, 217);
      doc.roundedRect(margem, y, larguraConteudo, 9, 2, 2, "FD");
      doc.setTextColor(55, 48, 163);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      texto(titulo, margem + 4, y + 6.2);
      doc.setTextColor(0, 0, 0);
      y += 13;
    };

    const campo = (rotulo, valor, opcoesCampo = {}) => {
      const valorFinal = valor || "Não informado";
      const xValor = margem + 58;
      const larguraValor = larguraConteudo - 62;
      const linhasValor = doc.splitTextToSize(String(valorFinal), larguraValor);
      garantirEspaco(linhasValor.length * 6 + 3);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      texto(`${rotulo}:`, margem, y);

      if (opcoesCampo.azul) {
        doc.setTextColor(37, 99, 235);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
      }

      texto(linhasValor[0] || "", xValor, y);
      for (let i = 1; i < linhasValor.length; i += 1) {
        y += 6;
        texto(linhasValor[i], xValor, y);
      }

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      y += 7;
    };

    const cardFinanceiro = (rotulo, valor, corRgb, x, largura = 56) => {
      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(230, 230, 240);
      doc.roundedRect(x, y, largura, 24, 3, 3, "FD");

      doc.setTextColor(90, 90, 100);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      texto(rotulo, x + 4, y + 7);

      doc.setTextColor(corRgb[0], corRgb[1], corRgb[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      texto(valor, x + 4, y + 17);
      doc.setTextColor(0, 0, 0);
    };

    const paragrafo = (conteudo) => {
      const linhas = doc.splitTextToSize(String(conteudo || ""), larguraConteudo);
      garantirEspaco(linhas.length * 6 + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(linhas, margem, y);
      y += linhas.length * 6 + 4;
    };

    const linhaSeparadora = () => {
      garantirEspaco(5);
      doc.setDrawColor(220, 220, 230);
      doc.line(margem, y, margem + larguraConteudo, y);
      y += 6;
    };

    desenharCabecalho(true);
    y = 52;

    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(230, 230, 240);
    doc.roundedRect(margem, y - 6, larguraConteudo, 22, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    texto(`${ehProposta ? "Cliente" : "Contratante"}: ${e.nome || "Não informado"}`, margem + 5, y + 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    texto(`Evento: ${e.tipoEvento || "Não informado"} | Data: ${dataBR(e.data)}`, margem + 5, y + 9);
    texto(ehProposta ? "Documento para análise e confirmação. A data só fica garantida após o sinal combinado." : "Documento oficial de contratação do serviço.", margem + 5, y + 16);
    y += 27;

    secao(ehProposta ? "DADOS DO CLIENTE" : "DADOS DO CONTRATANTE");
    campo("Nome", e.nome);
    campo(rotuloDocumentoCliente(e.cpf), e.cpf || "Não informado");

    campo("WhatsApp", e.whatsapp);

    secao("DADOS DO EVENTO");
    campo("Tipo do evento", e.tipoEvento, { azul: !ehProposta });
    campo("Data do evento", dataBR(e.data), { azul: !ehProposta });
    campo("Horário", `${normalizarHorarioManual(e.horaInicio) || e.horaInicio || "Não informado"} às ${normalizarHorarioManual(e.horaFim) || e.horaFim || "Não informado"}`, { azul: !ehProposta });
    campo("Duração", calcularDuracao(e.horaInicio, e.horaFim), { azul: !ehProposta });
    campo("Endereço", e.endereco || "Não informado", { azul: !ehProposta });
    campo("Cidade / bairro", cidadeBairroFinal(e), { azul: !ehProposta });
    campo(ehProposta ? "Pacote proposto" : "Pacote contratado", pacoteFinal, { azul: !ehProposta });

    secao(ehProposta ? "VALORES DA PROPOSTA" : "DADOS FINANCEIROS");
    if (!ehProposta) {
      garantirEspaco(30);
      cardFinanceiro("VALOR TOTAL", moeda(total), [37, 99, 235], margem, 42);
      cardFinanceiro("ENTRADA / SINAL", moeda(entrada), [202, 138, 4], margem + 47, 42);
      cardFinanceiro("PENDENTE", moeda(pendente), [220, 38, 38], margem + 94, 42);
      cardFinanceiro("STATUS", e.quitado || pendente <= 0 ? "QUITADO" : "PENDENTE", e.quitado || pendente <= 0 ? [22, 163, 74] : [220, 38, 38], margem + 141, 41);
      y += 31;
      campo("Forma da entrada", e.formaEntrada || "Não informada", { azul: true });
      campo("Forma de pagamento", e.formaPagamento || "Não informada", { azul: true });
      if (e.parcelas) campo("Parcelas", e.parcelas, { azul: true });
    } else {
      campo("Valor total", moeda(total));
      campo("Sinal para reserva da data", moeda(entrada));
      campo("Forma da entrada", e.formaEntrada || "Não informada");
      campo("Forma de pagamento", e.formaPagamento || "Não informada");
      if (e.parcelas) campo("Parcelas", e.parcelas);
      campo("Saldo pendente", moeda(pendente));
    }

    secao("OBSERVAÇÕES");
    paragrafo(obsLimpa);

    linhaSeparadora();
    secao(ehProposta ? "CONDIÇÕES DA PROPOSTA" : "CLÁUSULAS DO CONTRATO");

    const textoReserva = entrada > 0
      ? `O sinal informado para reserva da data é de ${moeda(entrada)}. A data somente ficará garantida após a confirmação do pagamento do sinal e aceite da proposta.`
      : "A data ainda não está garantida sem confirmação do sinal ou pagamento combinado.";

    const itens = ehProposta
      ? [
          `1. Esta proposta apresenta os dados, pacote e valores sugeridos para o evento informado pelo cliente.`,
          `2. ${textoReserva}`,
          "3. Os valores podem sofrer alteração caso haja mudança de endereço, horário, duração, estrutura, pacote ou necessidade técnica adicional.",
          "4. Após o aceite do cliente e confirmação do sinal, esta proposta poderá ser convertida em contrato oficial de prestação de serviço.",
          "5. O saldo restante deverá ser quitado conforme combinado entre as partes, preferencialmente até o dia do evento.",
          "6. Esta proposta não substitui o contrato oficial quando houver confirmação definitiva da contratação."
        ]
      : [
          entrada > 0
            ? `1. O CONTRATANTE declara estar ciente de que o valor pago a título de entrada/sinal, no valor de ${moeda(entrada)}, confirma a reserva da data do evento e não será devolvido em caso de desistência, cancelamento ou quebra do acordo por parte do CONTRATANTE.`
            : e.quitado
              ? `1. Em caso de desistência, cancelamento ou quebra do acordo por parte do CONTRATANTE, será retido 50% do valor total contratado, correspondente a ${moeda(total * 0.5)}, por se tratar da reserva da data e bloqueio da agenda do CONTRATADO.`
              : "1. Tratando-se de pré-reserva sem pagamento, não haverá cobrança de cancelamento. A data poderá ser liberada pelo CONTRATADO caso não haja confirmação do sinal ou pagamento combinado.",
          "2. O saldo restante deverá ser quitado integralmente até a data do evento, preferencialmente antes do início da prestação do serviço. A ausência de quitação poderá impedir a realização do serviço.",
          "3. O CONTRATANTE se responsabiliza por fornecer endereço correto, horário correto, local adequado para montagem dos equipamentos e acesso seguro da equipe ao espaço do evento.",
          "4. O CONTRATANTE é responsável pela segurança dos equipamentos e da equipe durante o evento. Danos, extravios, quedas, quebras ou prejuízos causados por convidados, terceiros ou pelo próprio CONTRATANTE deverão ser ressarcidos integralmente.",
          "5. Em caso de chuva, vento forte, instabilidade elétrica ou qualquer situação que comprometa a segurança da estrutura, o CONTRATANTE deverá providenciar local coberto e protegido. Não havendo condições seguras, o serviço poderá ser suspenso sem responsabilidade do CONTRATADO.",
          "6. Alterações de horário, endereço, pacote ou duração do evento deverão ser combinadas previamente entre as partes e poderão gerar ajuste de valor conforme a necessidade operacional.",
          "7. Em caso de atraso no início do evento por responsabilidade do CONTRATANTE, convidados, local ou terceiros, o horário contratado permanecerá contando a partir do horário combinado, podendo haver cobrança adicional para extensão do serviço.",
          "8. O CONTRATANTE deverá garantir ponto de energia elétrica adequado, seguro e compatível com os equipamentos. Quedas de energia, oscilações, tomadas inadequadas, extensões defeituosas ou ausência de energia no local não serão responsabilidade do CONTRATADO."
        ];

    itens.forEach((item) => paragrafo(item));

    garantirEspaco(52);
    y += 4;
    texto(`Fortaleza/CE, ${hojeContrato}`, margem, y);
    y += 14;

    try {
      doc.addImage(assinatura, "PNG", margem + 7, y, 55, 25);
    } catch {
      // Caso a imagem de assinatura não carregue, o documento continua sendo gerado normalmente.
    }

    y += 29;
    doc.setDrawColor(0, 0, 0);
    doc.line(margem, y, margem + 82, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    texto("Jean Carlos da Silva", margem + 41, y, { align: "center" });
    y += 5;
    doc.setFont("helvetica", "normal");
    texto("Responsável JP Eventos", margem + 41, y, { align: "center" });

    doc.line(margem + 100, y - 11, margem + 182, y - 11);
    doc.setFont("helvetica", "bold");
    texto(e.nome || (ehProposta ? "Cliente" : "Contratante"), margem + 141, y - 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    texto(ehProposta ? "Aceite do cliente" : "Contratante", margem + 141, y, { align: "center" });

    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i += 1) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 130);
      texto(`Página ${i} de ${totalPaginas}`, 196, 290, { align: "right" });
      texto(`JP Eventos Fortaleza - ${ehProposta ? "Proposta" : "Contrato"} gerado automaticamente pelo sistema | ${rotuloDocumentoCliente(e.cpf)} contratante: ${e.cpf || "não informado"}`, margem, 290);
      doc.setTextColor(0, 0, 0);
    }

    const prefixo = ehProposta ? "proposta_servico_evento" : "contrato_premium";
    doc.save(`${prefixo}_${limparNomeArquivo(e.nome)}.pdf`);
  };

  const gerarProposta = (evento = form) => {
    try {
      registrarHistoricoEvento(evento, "Proposta PDF gerada", `${pegarPacoteFinal(evento) || "Pacote não informado"} - ${moeda(Number(evento.valor || 0))}`);
      gerarDocumentoEvento(prepararEventoDocumento(evento), "proposta");
    } catch (erro) {
      console.error("Erro ao gerar proposta:", erro);
      alert(`Não foi possível gerar a proposta. Verifique os dados e tente novamente. Detalhe: ${erro?.message || erro}`);
    }
  };

  const gerarContrato = (evento = form) => {
    try {
      registrarHistoricoEvento(evento, "Contrato PDF gerado", `${pegarPacoteFinal(evento) || "Pacote não informado"} - ${moeda(Number(evento.valor || 0))}`);
      gerarDocumentoEvento(prepararEventoDocumento(evento), "contrato");
    } catch (erro) {
      console.error("Erro ao gerar contrato:", erro);
      alert(`Não foi possível gerar o contrato. Verifique os dados e tente novamente. Detalhe: ${erro?.message || erro}`);
    }
  };

  const gerarRecibo = () => {
    if (!reciboAberto) return;

    const e = prepararEventoDocumento(reciboAberto);
    const doc = new jsPDF();
    const total = Number(e.valor || 0);
    const entrada = Number(e.entrada || 0);
    const pendente = tipoRecibo === "total" ? 0 : Math.max(total - entrada, 0);
    const valorRecibo = tipoRecibo === "sinal" ? entrada : total;
    const pacoteFinal = e.pacote === "Outro" ? e.pacotePersonalizado : e.pacote || "Não informado";
    const titulo = tipoRecibo === "sinal" ? "RECIBO DE SINAL / ENTRADA" : "RECIBO DE PAGAMENTO TOTAL";
    const subtitulo = tipoRecibo === "sinal" ? "Reserva de data confirmada mediante sinal" : "Pagamento total confirmado";
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const obsRecibo = String(observacoesDocumento(e) || "").trim();

    const margem = 14;
    const larguraPagina = 210;
    const larguraConteudo = 182;
    let y = 0;

    const limparNomeArquivo = (nome) =>
      String(nome || "cliente")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .toLowerCase();

    const texto = (conteudo, x, posY, opcoes = {}) => {
      doc.text(String(conteudo || ""), x, posY, opcoes);
    };

    const garantirEspaco = (alturaNecessaria) => {
      if (y + alturaNecessaria <= 276) return;
      doc.addPage();
      desenharCabecalho(false);
      y = 42;
    };

    const desenharCabecalho = (primeiraPagina = true) => {
      doc.setFillColor(20, 24, 38);
      doc.rect(0, 0, larguraPagina, primeiraPagina ? 46 : 30, "F");

      doc.setFillColor(108, 43, 217);
      doc.rect(0, 0, 6, primeiraPagina ? 46 : 30, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(primeiraPagina ? 16 : 12);
      texto(primeiraPagina ? titulo : "JP Eventos - Recibo", 105, primeiraPagina ? 17 : 16, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      texto("@JP Eventos Fortaleza | @Vdj JeanMix", 105, primeiraPagina ? 28 : 23, { align: "center" });
      if (primeiraPagina) texto("WhatsApp: (85) 98708-3412", 105, 36, { align: "center" });

      doc.setTextColor(0, 0, 0);
    };

    const secao = (tituloSecao) => {
      garantirEspaco(15);
      doc.setFillColor(245, 243, 255);
      doc.setDrawColor(108, 43, 217);
      doc.roundedRect(margem, y, larguraConteudo, 9, 2, 2, "FD");
      doc.setTextColor(55, 48, 163);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      texto(tituloSecao, margem + 4, y + 6.2);
      doc.setTextColor(0, 0, 0);
      y += 13;
    };

    const campo = (rotulo, valor) => {
      const valorFinal = valor || "Não informado";
      const xValor = margem + 52;
      const larguraValor = larguraConteudo - 56;
      const linhasValor = doc.splitTextToSize(String(valorFinal), larguraValor);
      garantirEspaco(linhasValor.length * 6 + 3);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      texto(`${rotulo}:`, margem, y);

      doc.setFont("helvetica", "normal");
      texto(linhasValor[0] || "", xValor, y);
      for (let i = 1; i < linhasValor.length; i += 1) {
        y += 6;
        texto(linhasValor[i], xValor, y);
      }

      y += 7;
    };

    const paragrafo = (conteudo) => {
      const linhas = doc.splitTextToSize(String(conteudo || ""), larguraConteudo);
      garantirEspaco(linhas.length * 6 + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(linhas, margem, y);
      y += linhas.length * 6 + 4;
    };

    const cardFinanceiro = (rotulo, valor, corRgb, x, largura = 56) => {
      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(230, 230, 240);
      doc.roundedRect(x, y, largura, 24, 3, 3, "FD");

      doc.setTextColor(90, 90, 100);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      texto(rotulo, x + 4, y + 7);

      doc.setTextColor(corRgb[0], corRgb[1], corRgb[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      texto(valor, x + 4, y + 17);
      doc.setTextColor(0, 0, 0);
    };

    desenharCabecalho(true);
    y = 54;

    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(230, 230, 240);
    doc.roundedRect(margem, y - 6, larguraConteudo, 22, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    texto(subtitulo, margem + 5, y + 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    texto(`Emitido em Fortaleza/CE, ${dataEmissao}`, margem + 5, y + 9);
    texto(`Valor recebido neste recibo: ${moeda(valorRecibo)}`, margem + 5, y + 16);
    y += 30;

    secao("CLIENTE");
    campo("Nome", e.nome);
    campo(rotuloDocumentoCliente(e.cpf), e.cpf || "Não informado");
    campo("WhatsApp", e.whatsapp || "Não informado");

    secao("EVENTO");
    campo("Tipo", e.tipoEvento || "Não informado");
    campo("Data", dataBR(e.data));
    campo("Horário", `${normalizarHorarioManual(e.horaInicio) || e.horaInicio || "Não informado"} às ${normalizarHorarioManual(e.horaFim) || e.horaFim || "Não informado"}`);
    campo("Local", `${e.endereco || "Não informado"} - ${cidadeBairroFinal(e)}`);
    campo("Pacote", pacoteFinal);

    secao("FINANCEIRO");
    garantirEspaco(30);
    cardFinanceiro("VALOR TOTAL", moeda(total), [37, 99, 235], margem, 56);
    cardFinanceiro("ENTRADA / SINAL", moeda(entrada), [202, 138, 4], margem + 63, 56);
    cardFinanceiro(tipoRecibo === "total" ? "STATUS" : "PENDENTE", tipoRecibo === "total" ? "QUITADO" : moeda(pendente), tipoRecibo === "total" ? [22, 163, 74] : [220, 38, 38], margem + 126, 56);
    y += 31;

    campo("Tipo do recibo", tipoRecibo === "sinal" ? "Sinal / entrada" : "Pagamento total");
    campo("Forma de pagamento", pagamentoRecibo || "Não informada");
    campo("Valor recebido", moeda(valorRecibo));

    if (obsRecibo && obsRecibo !== "Nenhuma observação informada.") {
      secao("OBSERVAÇÕES");
      paragrafo(obsRecibo);
    }

    secao("DECLARAÇÃO");
    paragrafo(
      tipoRecibo === "sinal"
        ? `Declaro que recebi de ${e.nome || "cliente"} o valor de ${moeda(valorRecibo)} referente ao sinal/entrada para reserva da data do evento acima descrito.`
        : `Declaro que recebi de ${e.nome || "cliente"} o valor total de ${moeda(valorRecibo)} referente à prestação de serviço para o evento acima descrito, ficando o pagamento quitado.`
    );

    garantirEspaco(55);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    texto(`Fortaleza/CE, ${dataEmissao}`, margem, y);
    y += 14;

    try {
      doc.addImage(assinatura, "PNG", margem + 7, y, 55, 25);
    } catch {
      // Caso a assinatura não carregue, o recibo continua sendo gerado.
    }

    y += 29;
    doc.setDrawColor(0, 0, 0);
    doc.line(margem, y, margem + 82, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    texto("Jean Carlos da Silva", margem + 41, y, { align: "center" });
    y += 5;
    doc.setFont("helvetica", "normal");
    texto("Responsável JP Eventos", margem + 41, y, { align: "center" });

    doc.line(margem + 100, y - 11, margem + 182, y - 11);
    doc.setFont("helvetica", "bold");
    texto(e.nome || "Cliente", margem + 141, y - 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    texto("Cliente", margem + 141, y, { align: "center" });

    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i += 1) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 130);
      texto(`Página ${i} de ${totalPaginas}`, 196, 290, { align: "right" });
      texto(`JP Eventos Fortaleza - Recibo gerado automaticamente | ${rotuloDocumentoCliente(e.cpf)}: ${e.cpf || "não informado"}`, margem, 290);
      doc.setTextColor(0, 0, 0);
    }

    doc.save(`recibo_premium_${tipoRecibo}_${limparNomeArquivo(e.nome)}.pdf`);

    if (tipoRecibo === "total") {
      marcarQuitado(e.id, true);
    }

    setReciboAberto(null);
  };

  const hoje = new Date();
  const contaPorId = (id) =>
    contasFinanceiras.find((conta) => conta.id === id) || contasFinanceiras[0] || { id: "nubank", nome: "Nubank", saldoInicial: 0 };

  const limitarNumero = (valor, min, max) => Math.min(max, Math.max(min, Number(valor || min)));

  const somarMesesData = (dataISO, meses) => {
    const [ano, mes, dia] = String(dataISO || new Date().toISOString().slice(0, 10)).split("-").map(Number);
    const data = new Date(ano || new Date().getFullYear(), (mes || 1) - 1 + Number(meses || 0), dia || 1);
    return data.toISOString().slice(0, 10);
  };

  const criarMovimentoCaixa = (dados) => {
    const movimento = {
      id: criarIdSeguro(),
      criadoEm: new Date().toISOString(),
      tipo: dados.tipo || "saida",
      data: dados.data || new Date().toISOString().slice(0, 10),
      descricao: dados.descricao || "Lançamento financeiro",
      categoria: dados.categoria || "Outros",
      valor: Number(dados.valor || 0),
      contaId: dados.contaId || contaPorId()?.id || "caixa",
      contaDestinoId: dados.contaDestinoId || "",
      formaPagamento: dados.formaPagamento || "Pix",
      parcelas: dados.parcelas || "1",
      parcelaNumero: dados.parcelaNumero || "",
      grupoParcelamentoId: dados.grupoParcelamentoId || "",
      taxaCartao: Number(dados.taxaCartao || 0),
      valorBruto: Number(dados.valorBruto || dados.valor || 0),
      valorTaxa: Number(dados.valorTaxa || 0),
      eventoId: dados.eventoId || "",
      cliente: dados.cliente || "",
      observacao: dados.observacao || ""
    };

    if (!movimento.valor || movimento.valor <= 0) {
      alert("Informe um valor maior que zero.");
      return null;
    }

    if (movimento.tipo === "transferencia" && movimento.contaId === movimento.contaDestinoId) {
      alert("Na transferência, a conta de origem e destino precisam ser diferentes.");
      return null;
    }

    setMovimentosCaixa((lista) => [movimento, ...lista]);
    return movimento;
  };

  const adicionarContaFinanceira = () => {
    const nome = String(novaContaFinanceira || "").trim();
    if (!nome) {
      alert("Digite o nome da conta ou banco.");
      return;
    }

    const id = nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || criarIdSeguro();

    if (contasFinanceiras.some((conta) => conta.id === id || normalizarTexto(conta.nome) === normalizarTexto(nome))) {
      alert("Essa conta já existe.");
      return;
    }

    setContasFinanceiras((lista) => [...lista, { id, nome, saldoInicial: 0 }]);
    setNovaContaFinanceira("");
  };

  const renomearContaFinanceira = (id, novoNome) => {
    const nome = String(novoNome || "").trim();
    if (!nome) {
      alert("Digite um nome para a conta.");
      return;
    }

    if (contasFinanceiras.some((conta) => conta.id !== id && normalizarTexto(conta.nome) === normalizarTexto(nome))) {
      alert("Já existe outra conta com esse nome.");
      return;
    }

    setContasFinanceiras((lista) => lista.map((conta) => conta.id === id ? { ...conta, nome } : conta));
    setContaFinanceiraEditando(null);
  };

  const aplicarContasPadraoJP = () => {
    const confirmar = confirm(
      "Usar contas padrão recomendadas?\n\nNubank\nCaixa Poupança\nCarteira / dinheiro\n\nImportante: PIX agora fica como forma de pagamento, não como banco. Contas antigas que já têm lançamentos serão mantidas para não quebrar o histórico."
    );

    if (!confirmar) return;

    setContasFinanceiras((listaAtual) => {
      const usadas = (Array.isArray(listaAtual) ? listaAtual : []).filter((conta) =>
        movimentosCaixa.some((m) => m.contaId === conta.id || m.contaDestinoId === conta.id)
      );

      const extrasUsadas = usadas.filter((conta) => !contasPadraoJP.some((padrao) => padrao.id === conta.id));
      return [...contasPadraoJP, ...extrasUsadas];
    });
  };

  const removerContaFinanceira = (id) => {
    if (contasFinanceiras.length <= 1) {
      alert("Mantenha pelo menos uma conta cadastrada.");
      return;
    }

    const usada = movimentosCaixa.some((m) => m.contaId === id || m.contaDestinoId === id);
    if (usada) {
      alert("Essa conta já tem lançamentos. Para manter o histórico correto, ela não será apagada. Se quiser, renomeie a conta.");
      return;
    }

    if (!confirm("Remover esta conta?")) return;
    setContasFinanceiras((lista) => lista.filter((conta) => conta.id !== id));
  };

  const abrirRegistroPagamentoEvento = (evento, tipo = "entrada") => {
    const total = Number(evento.valor || 0);
    const entradaAtual = Number(evento.entrada || 0);
    const saldo = Math.max(total - entradaAtual, 0);
    const contaPadrao = contaPorId("nubank")?.id || contasFinanceiras[0]?.id || "nubank";

    setPagamentoEvento({
      eventoId: evento.id,
      cliente: evento.nome || "Cliente",
      tipo,
      valor: String(tipo === "entrada" ? (entradaAtual > 0 ? entradaAtual : "") : (saldo > 0 ? saldo : total)),
      contaId: contaPadrao,
      formaPagamento: tipo === "entrada" ? (evento.formaEntrada || "Pix") : (evento.formaPagamento || "Pix"),
      parcelas: "1",
      taxaCartao: "0",
      data: new Date().toISOString().slice(0, 10),
      descricao: tipo === "entrada" ? `Entrada/sinal - ${evento.nome || "cliente"}` : `Pagamento total/saldo - ${evento.nome || "cliente"}`
    });
  };


  const guardarVoltaParaCliente = (evento, origem = "eventos") => {
    if (!evento) return;
    setNavegacaoAnterior({
      aba: origem,
      busca: evento.nome || "",
      filtroStatus: "todos",
      clienteId: evento.id || "",
      clienteNome: evento.nome || "Cliente",
      titulo: `← Voltar para ${evento.nome || "cliente"}`
    });
  };

  const voltarParaTelaAnterior = () => {
    if (!navegacaoAnterior) {
      setAba("eventos");
      return;
    }

    setAba(navegacaoAnterior.aba || "eventos");
    setBusca(navegacaoAnterior.busca || "");
    setFiltroStatus(navegacaoAnterior.filtroStatus || "todos");
    setDiaFinanceiroSelecionado(null);
  };

  const abrirClientePeloFinanceiro = () => {
    if (navegacaoAnterior?.clienteNome) {
      setBusca(navegacaoAnterior.clienteNome);
    }
    setFiltroStatus("todos");
    setAba("eventos");
    setDiaFinanceiroSelecionado(null);
  };

  const abrirFinanceiroDoCliente = (evento) => {
    guardarVoltaParaCliente(evento, "eventos");
    setClienteFinanceiroFiltro(evento?.nome || "");
    setBusca(evento?.nome || "");
    setAba("financeiro");
    setDiaFinanceiroSelecionado(null);
  };

  const abrirDespesaDoEvento = (evento) => {
    guardarVoltaParaCliente(evento, "eventos");
    const contaPadrao = contaPorId("nubank")?.id || contasFinanceiras[0]?.id || "nubank";
    setNovoMovimento({
      tipo: "saida",
      data: new Date().toISOString().slice(0, 10),
      descricao: `Despesa do evento - ${evento?.nome || "cliente"}`,
      categoria: "Outros",
      valor: "",
      contaId: contaPadrao,
      contaDestinoId: "",
      formaPagamento: "Pix",
      parcelas: "1",
      taxaCartao: "0",
      cliente: evento?.nome || "",
      eventoId: evento?.id || "",
      observacao: `Evento: ${evento?.tipoEvento || ""} | Data: ${evento?.data ? dataCurtaBR(evento.data) : ""}`
    });
    setClienteFinanceiroFiltro(evento?.nome || "");
    setAba("financeiro");
  };

  const movimentosDoEvento = (evento) =>
    movimentosCaixa.filter((m) =>
      (evento?.id && m.eventoId === evento.id) ||
      (evento?.nome && normalizarTexto(m.cliente).includes(normalizarTexto(evento.nome))) ||
      (evento?.nome && normalizarTexto(m.descricao).includes(normalizarTexto(evento.nome)))
    );

  const resumoFinanceiroEvento = (evento) => {
    const movs = movimentosDoEvento(evento);
    const entradas = movs.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + valorNumericoJP(m.valor), 0);
    const saidas = movs.filter((m) => m.tipo === "saida").reduce((acc, m) => acc + valorNumericoJP(m.valor), 0);
    return { movs, entradas, saidas, saldo: entradas - saidas };
  };

  const saldoPendenteEventoJP = (evento = {}) => {
    const total = valorNumericoJP(evento.valor);
    const entrada = valorNumericoJP(evento.entrada);
    const resumoCx = resumoFinanceiroEvento(evento);
    const recebidoReal = Math.max(entrada, resumoCx.entradas || 0);
    if (evento.quitado || (total > 0 && recebidoReal >= total)) return 0;
    return Math.max(total - recebidoReal, 0);
  };

  const eventoQuitadoJP = (evento = {}) => {
    const total = valorNumericoJP(evento.valor);
    return Boolean(evento.quitado) || (total > 0 && saldoPendenteEventoJP(evento) <= 0);
  };

  const indicadorFinanceiroEvento = (evento = {}) => {
    const total = valorNumericoJP(evento.valor);
    const entrada = valorNumericoJP(evento.entrada);
    const pendente = saldoPendenteEventoJP(evento);

    if (evento.executado) {
      return { cor: "#22c55e", texto: "Executado", emoji: "✅", prioridade: 4 };
    }

    if (eventoQuitadoJP(evento)) {
      return { cor: "#38bdf8", texto: "Pago/quitado", emoji: "💙", prioridade: 3 };
    }

    if (entrada > 0 && pendente > 0) {
      return { cor: "#facc15", texto: "Sinal pago", emoji: "🟡", prioridade: 2, corExtra: "#ef4444" };
    }

    if (total > 0 && pendente > 0) {
      return { cor: "#ef4444", texto: "Pendente", emoji: "🔴", prioridade: 1 };
    }

    return { cor: "#8b5cf6", texto: "Agendado", emoji: "🟣", prioridade: 0 };
  };

  const resumoVisualDiaAgenda = (listaDia = []) => {
    const indicadores = listaDia.map(indicadorFinanceiroEvento);
    const principal = indicadores.reduce((maior, item) => item.prioridade > maior.prioridade ? item : maior, { cor: "#111827", prioridade: -1 });
    return { indicadores, principal };
  };


  const usarDataNoCadastroSeguro = (dataAlvo) => {
    const dataSegura = String(dataAlvo || "").trim();
    if (!dataSegura) {
      alert("Escolha uma data primeiro.");
      return;
    }
    setForm((atual) => ({ ...(atual || formInicial), data: dataSegura }));
    setDataConsultaAgenda("");
    if (aba !== "servico") setAba("cadastro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chaveClienteJP = (evento = {}) =>
    normalizarTexto(evento.whatsapp || evento.cpf || evento.nome || "cliente-sem-chave");

  const clientesAgrupadosJP = Object.values(
    eventos.reduce((acc, ev) => {
      const chave = chaveClienteJP(ev);
      if (!acc[chave]) acc[chave] = {
        chave,
        nome: ev.nome || "Cliente sem nome",
        whatsapp: ev.whatsapp || "",
        cpf: ev.cpf || "",
        endereco: ev.endereco || "",
        cidade: ev.cidade || "",
        bairro: ev.bairro || "",
        eventos: [],
        total: 0,
        pendente: 0,
        recebido: 0
      };
      if (!ev.clienteOnly) {
        acc[chave].eventos.push(ev);
        acc[chave].total += valorNumericoJP(ev.valor);
        acc[chave].pendente += saldoPendenteEventoJP(ev);
        acc[chave].recebido += resumoFinanceiroEvento(ev).entradas || (eventoQuitadoJP(ev) ? valorNumericoJP(ev.valor) : valorNumericoJP(ev.entrada));
      }
      return acc;
    }, {})
  ).sort((a, b) => {
    const semEventoA = a.eventos.length === 0 ? 1 : 0;
    const semEventoB = b.eventos.length === 0 ? 1 : 0;
    if (semEventoA !== semEventoB) return semEventoB - semEventoA;
    return b.eventos.length - a.eventos.length || String(a.nome).localeCompare(String(b.nome));
  });

  const clientesBuscaGlobalJP = clientesAgrupadosJP.filter((cliente) => {
    const termo = normalizarTexto(busca || "");
    if (!termo) return false;
    const textoCliente = normalizarTexto(`
      ${cliente.nome || ""}
      ${cliente.whatsapp || ""}
      ${cliente.cpf || ""}
      ${cliente.endereco || ""}
      ${cliente.cidade || ""}
      ${cliente.bairro || ""}
      ${cliente.eventos.map((ev) => `${ev.tipoEvento || ""} ${ev.servicosTexto || ""} ${ev.pacote || ""} ${ev.pacotePersonalizado || ""} ${ev.data || ""} ${dataBR(ev.data) || ""}`).join(" ")}
    `);
    return textoCliente.includes(termo);
  });

  const clientesSemEventoJP = clientesAgrupadosJP.filter((cliente) => cliente.eventos.length === 0);

  const abrirClienteDaBuscaJP = (cliente) => {
    setClienteAbertoChave(cliente.chave);
    setAba("clientes");
    setMenuAberto(false);
    setTimeout(() => document.getElementById(`cliente-${cliente.chave}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const salvarPagamentoEvento = () => {
    if (!pagamentoEvento) return;

    const valorBruto = Number(String(pagamentoEvento.valor || "").replace(",", "."));
    if (!valorBruto || valorBruto <= 0) {
      alert("Digite o valor recebido.");
      return;
    }

    const ehCartaoCredito = pagamentoEvento.formaPagamento === "Cartão de crédito";
    const parcelas = ehCartaoCredito ? limitarNumero(pagamentoEvento.parcelas || 1, 1, 12) : 1;
    const taxaCartao = ehCartaoCredito ? Number(String(pagamentoEvento.taxaCartao || "0").replace(",", ".")) : 0;
    const valorTaxaTotal = Math.max((valorBruto * taxaCartao) / 100, 0);
    const valorLiquidoTotal = Math.max(valorBruto - valorTaxaTotal, 0);
    const grupoParcelamentoId = parcelas > 1 ? criarIdSeguro() : "";
    const valorLiquidoParcela = valorLiquidoTotal / parcelas;
    const valorBrutoParcela = valorBruto / parcelas;
    const valorTaxaParcela = valorTaxaTotal / parcelas;

    let primeiroMovimento = null;

    for (let i = 0; i < parcelas; i += 1) {
      const mov = criarMovimentoCaixa({
        tipo: "entrada",
        data: somarMesesData(pagamentoEvento.data, i),
        descricao: parcelas > 1
          ? `Parcela ${i + 1}/${parcelas} - ${pagamentoEvento.descricao}`
          : pagamentoEvento.descricao,
        categoria: pagamentoEvento.tipo === "entrada" ? "Entrada / sinal" : "Pagamento de cliente",
        valor: valorLiquidoParcela,
        contaId: pagamentoEvento.contaId,
        formaPagamento: pagamentoEvento.formaPagamento,
        parcelas: String(parcelas),
        parcelaNumero: parcelas > 1 ? String(i + 1) : "",
        grupoParcelamentoId,
        taxaCartao,
        valorBruto: valorBrutoParcela,
        valorTaxa: valorTaxaParcela,
        eventoId: pagamentoEvento.eventoId,
        cliente: pagamentoEvento.cliente,
        observacao: parcelas > 1
          ? `Pagamento parcelado no cartão em ${parcelas}x. Valor bruto total: ${moeda(valorBruto)}. Taxa: ${taxaCartao}%. Valor líquido total previsto: ${moeda(valorLiquidoTotal)}.`
          : (taxaCartao > 0 ? `Taxa cartão: ${taxaCartao}%. Valor líquido: ${moeda(valorLiquidoTotal)}.` : "")
      });
      if (!mov) return;
      if (!primeiroMovimento) primeiroMovimento = mov;
    }

    setEventos((lista) =>
      lista.map((evento) => {
        if (evento.id !== pagamentoEvento.eventoId) return evento;
        const total = Number(evento.valor || 0);
        const entradaAtual = Number(evento.entrada || 0);
        const novaEntrada = pagamentoEvento.tipo === "entrada" ? entradaAtual + valorBruto : Math.min(total || entradaAtual + valorBruto, entradaAtual + valorBruto);
        const quitado = pagamentoEvento.tipo === "total" || (total > 0 && novaEntrada >= total);

        return {
          ...evento,
          entrada: String(novaEntrada),
          formaEntrada: pagamentoEvento.tipo === "entrada" ? pagamentoEvento.formaPagamento : evento.formaEntrada,
          formaPagamento: pagamentoEvento.tipo === "total" ? pagamentoEvento.formaPagamento : evento.formaPagamento,
          parcelas: ehCartaoCredito && parcelas > 1 ? `${parcelas}x` : evento.parcelas,
          quitado,
          status: quitado ? "confirmado" : evento.status,
          historico: [
            criarRegistroHistorico(
              quitado ? "Pagamento total registrado" : "Entrada/sinal registrada",
              `${moeda(valorBruto)}${ehCartaoCredito && parcelas > 1 ? ` em ${parcelas}x` : ""} em ${contaPorId(pagamentoEvento.contaId).nome}${taxaCartao > 0 ? ` | líquido previsto: ${moeda(valorLiquidoTotal)}` : ""}`
            ),
            ...(Array.isArray(evento.historico) ? evento.historico : [])
          ].slice(0, 50)
        };
      })
    );

    setPagamentoEvento(null);
    alert(parcelas > 1 ? `Pagamento parcelado registrado em ${parcelas} parcelas no caixa financeiro.` : "Pagamento registrado no caixa financeiro.");
  };

  const salvarMovimentoManual = () => {
    const valorBruto = Number(String(novoMovimento.valor || "").replace(",", "."));
    if (!valorBruto || valorBruto <= 0) {
      alert("Informe um valor maior que zero.");
      return;
    }

    const ehCartaoCredito = novoMovimento.formaPagamento === "Cartão de crédito" && novoMovimento.tipo === "entrada";
    const parcelas = ehCartaoCredito ? limitarNumero(novoMovimento.parcelas || 1, 1, 12) : 1;
    const taxaCartao = ehCartaoCredito ? Number(String(novoMovimento.taxaCartao || "0").replace(",", ".")) : 0;
    const valorTaxaTotal = Math.max((valorBruto * taxaCartao) / 100, 0);
    const valorLiquidoTotal = Math.max(valorBruto - valorTaxaTotal, 0);
    const grupoParcelamentoId = parcelas > 1 ? criarIdSeguro() : "";

    for (let i = 0; i < parcelas; i += 1) {
      const mov = criarMovimentoCaixa({
        ...novoMovimento,
        data: parcelas > 1 ? somarMesesData(novoMovimento.data, i) : novoMovimento.data,
        descricao: parcelas > 1 ? `Parcela ${i + 1}/${parcelas} - ${novoMovimento.descricao || "Recebimento no cartão"}` : novoMovimento.descricao,
        valor: ehCartaoCredito ? valorLiquidoTotal / parcelas : valorBruto,
        parcelas: String(parcelas),
        parcelaNumero: parcelas > 1 ? String(i + 1) : "",
        grupoParcelamentoId,
        taxaCartao,
        valorBruto: ehCartaoCredito ? valorBruto / parcelas : valorBruto,
        valorTaxa: ehCartaoCredito ? valorTaxaTotal / parcelas : 0,
        observacao: ehCartaoCredito && parcelas > 1
          ? `${novoMovimento.observacao || ""}\nParcelado em ${parcelas}x. Bruto total: ${moeda(valorBruto)}. Taxa: ${taxaCartao}%. Líquido previsto: ${moeda(valorLiquidoTotal)}.`.trim()
          : novoMovimento.observacao
      });
      if (!mov) return;
    }

    setNovoMovimento((atual) => ({
      ...atual,
      data: new Date().toISOString().slice(0, 10),
      descricao: "",
      valor: "",
      parcelas: "1",
      taxaCartao: "0",
      observacao: ""
    }));
    alert(parcelas > 1 ? `Lançamento parcelado salvo em ${parcelas} parcelas.` : "Lançamento salvo no fluxo de caixa.");
  };

  const excluirMovimentoCaixa = (id) => {
    if (!confirm("Excluir este lançamento do caixa?")) return;
    setMovimentosCaixa((lista) => lista.filter((m) => m.id !== id));
  };

  const movimentosDoMesAtual = movimentosCaixa.filter((m) => {
    if (!m.data) return false;
    const [ano, mes] = String(m.data).split("-").map(Number);
    return ano === hoje.getFullYear() && mes - 1 === hoje.getMonth();
  });

  const totalEntradasCaixa = movimentosCaixa.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + Number(m.valor || 0), 0);
  const totalSaidasCaixa = movimentosCaixa.filter((m) => m.tipo === "saida").reduce((acc, m) => acc + Number(m.valor || 0), 0);
  const lucroLiquidoCaixa = totalEntradasCaixa - totalSaidasCaixa;
  const entradasMesCaixa = movimentosDoMesAtual.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + Number(m.valor || 0), 0);
  const saidasMesCaixa = movimentosDoMesAtual.filter((m) => m.tipo === "saida").reduce((acc, m) => acc + Number(m.valor || 0), 0);
  const lucroMesCaixa = entradasMesCaixa - saidasMesCaixa;

  const saldoDaConta = (contaId) =>
    movimentosCaixa.reduce((acc, m) => {
      const valor = Number(m.valor || 0);
      if (m.tipo === "entrada" && m.contaId === contaId) return acc + valor;
      if (m.tipo === "saida" && m.contaId === contaId) return acc - valor;
      if (m.tipo === "transferencia" && m.contaId === contaId) return acc - valor;
      if (m.tipo === "transferencia" && m.contaDestinoId === contaId) return acc + valor;
      return acc;
    }, Number(contaPorId(contaId).saldoInicial || 0));

  const movimentosFinanceiroFiltrados = movimentosCaixa.filter((m) => {
    const filtro = normalizarTexto(clienteFinanceiroFiltro || "");
    if (!filtro) return true;
    return normalizarTexto(`${m.cliente || ""} ${m.descricao || ""} ${m.categoria || ""}`).includes(filtro);
  });

  const movimentosFinanceiroDoMes = movimentosFinanceiroFiltrados.filter((m) => {
    if (!m.data) return false;
    const [ano, mes] = String(m.data).split("-").map(Number);
    return ano === anoCalendario && mes - 1 === mesCalendario;
  });

  const entradasFinanceiroMes = movimentosFinanceiroDoMes.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + Number(m.valor || 0), 0);
  const saidasFinanceiroMes = movimentosFinanceiroDoMes.filter((m) => m.tipo === "saida").reduce((acc, m) => acc + Number(m.valor || 0), 0);
  const lucroFinanceiroMes = entradasFinanceiroMes - saidasFinanceiroMes;

  const movimentosDoDiaFinanceiro = diaFinanceiroSelecionado
    ? movimentosFinanceiroDoMes.filter((m) => Number(String(m.data || "").split("-")[2]) === diaFinanceiroSelecionado)
    : [];

  const resumoDiaFinanceiro = (dia) => {
    const movs = movimentosFinanceiroDoMes.filter((m) => Number(String(m.data || "").split("-")[2]) === dia);
    const entradas = movs.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + Number(m.valor || 0), 0);
    const saidas = movs.filter((m) => m.tipo === "saida").reduce((acc, m) => acc + Number(m.valor || 0), 0);
    return { qtd: movs.length, entradas, saidas, saldo: entradas - saidas };
  };

  const estiloCardClicavel = (extra = {}) => ({
    ...extra,
    cursor: "pointer",
    position: "relative",
    userSelect: "none",
    boxShadow: `${extra.boxShadow || "0 18px 38px rgba(0,0,0,0.30)"}, inset 0 0 0 1px rgba(255,255,255,0.04)`
  });

  const abrirDetalheFinanceiro = (tipo, titulo) => {
    setPainelFinanceiroDetalhe({ tipo, titulo });
    setAba("financeiro");
    setTimeout(() => {
      document.getElementById("detalhe-financeiro-jp")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const eventoNoMesAtual = (e) => {
    if (!e?.data) return false;
    const [ano, mes] = e.data.split("-").map(Number);
    return ano === hoje.getFullYear() && mes - 1 === hoje.getMonth();
  };

  const eventoHoje = (e) => {
    if (!e?.data) return false;
    return e.data === new Date().toISOString().slice(0, 10);
  };

  const eventoUltimos15Dias = (e) => {
    if (!e?.data) return false;
    const [ano, mes, dia] = e.data.split("-").map(Number);
    const dataEvento = new Date(ano, mes - 1, dia);
    dataEvento.setHours(0, 0, 0, 0);
    return dataEvento >= quinzeDiasAtras && dataEvento <= hoje;
  };

  const eventosParaDetalheFinanceiro = (tipo) => {
    const pendenteEvento = (e) => !e.quitado && Number(e.valor || 0) > Number(e.entrada || 0);
    const recebidoEvento = (e) => e.quitado || Number(e.entrada || 0) > 0;

    switch (tipo) {
      case "eventos_total": return eventos;
      case "propostas": return eventos.filter((e) => ehPreCadastro(e));
      case "fechados": return eventos.filter((e) => reservaConfirmada(e));
      case "proximos": return eventosFuturos;
      case "hoje": return eventos.filter(eventoHoje);
      case "ultimos15": return eventos.filter(eventoUltimos15Dias);
      case "mes": return eventos.filter(eventoNoMesAtual);
      case "valorTotal": return eventos.filter((e) => Number(e.valor || 0) > 0);
      case "entradaSinal": return eventos.filter((e) => Number(e.entrada || 0) > 0);
      case "pendente": return eventos.filter(pendenteEvento);
      case "custos": return eventos.filter((e) => valorNumericoJP(e.custo) > 0);
      case "lucroEstimado": return eventos.filter((e) => Number(e.valor || 0) > 0);
      case "sinais": return eventos.filter((e) => Number(e.entrada || 0) > 0);
      case "faturamentoFuturo": return eventosFuturos.filter((e) => Number(e.valor || 0) > 0);
      case "aReceberFuturo": return eventosFuturos.filter(pendenteEvento);
      case "ticketMedio": return eventos.filter((e) => reservaConfirmada(e));
      case "caixaReal": return eventos.filter(recebidoEvento);
      case "lucroReal": return eventos.filter((e) => Number(e.valor || 0) > 0 || Number(e.entrada || 0) > 0);
      case "margem": return eventos.filter((e) => Number(e.valor || 0) > 0);
      case "conversao": return eventos;
      case "receitaMesGrafico": return eventos.filter((e) => eventoNoMesAtual(e) && Number(e.valor || 0) > 0);
      case "custosMesGrafico": return eventos.filter((e) => eventoNoMesAtual(e) && valorNumericoJP(e.custo) > 0);
      case "lucroMesGrafico": return eventos.filter((e) => eventoNoMesAtual(e) && Number(e.valor || 0) > 0);
      case "metaGrafico": return eventos.filter(eventoNoMesAtual);
      default: return [];
    }
  };

  const movimentosParaDetalheFinanceiro = (tipo) => {
    switch (tipo) {
      case "entradasCaixa": return movimentosCaixa.filter((m) => m.tipo === "entrada");
      case "saidasCaixa": return movimentosCaixa.filter((m) => m.tipo === "saida");
      case "lucroCaixa": return movimentosCaixa.filter((m) => m.tipo === "entrada" || m.tipo === "saida");
      case "lucroMesCaixa": return movimentosDoMesAtual.filter((m) => m.tipo === "entrada" || m.tipo === "saida");
      case "entradasFinanceiroMes": return movimentosFinanceiroDoMes.filter((m) => m.tipo === "entrada");
      case "saidasFinanceiroMes": return movimentosFinanceiroDoMes.filter((m) => m.tipo === "saida");
      case "resultadoFinanceiroMes": return movimentosFinanceiroDoMes.filter((m) => m.tipo === "entrada" || m.tipo === "saida");
      default: return [];
    }
  };

  const renderDetalheFinanceiro = () => {
    if (!painelFinanceiroDetalhe) return null;

    const eventosDetalhe = eventosParaDetalheFinanceiro(painelFinanceiroDetalhe.tipo);
    const movimentosDetalhe = movimentosParaDetalheFinanceiro(painelFinanceiroDetalhe.tipo);
    const temEventos = eventosDetalhe.length > 0;
    const temMovimentos = movimentosDetalhe.length > 0;

    return (
      <div id="detalhe-financeiro-jp" style={{ ...estilos.card, borderColor: "#38bdf8", background: "linear-gradient(135deg, rgba(14,165,233,0.16), rgba(17,24,39,0.96))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ marginTop: 0 }}>🔎 {painelFinanceiroDetalhe.titulo}</h3>
            <p style={{ color: "#c4b5fd", marginTop: -4 }}>Detalhe aberto pelo card clicável. Use os botões para abrir cliente, caixa ou limpar o filtro.</p>
          </div>
          <button style={estilos.botaoPequeno} onClick={() => setPainelFinanceiroDetalhe(null)}>Fechar detalhe</button>
        </div>

        {!temEventos && !temMovimentos && <p>Nenhum item encontrado para este card.</p>}

        {temMovimentos && (
          <>
            <h4>Movimentos do caixa</h4>
            {movimentosDetalhe.slice(0, 80).map((m) => (
              <div key={m.id} style={{ borderBottom: "1px solid #374151", padding: "8px 0" }}>
                <strong style={{ color: m.tipo === "entrada" ? "#22c55e" : m.tipo === "saida" ? "#ef4444" : "#38bdf8" }}>
                  {m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "-" : "⇄"} {moeda(m.valor)}
                </strong>
                <br />
                {dataCurtaBR(m.data)} - {m.descricao || "Sem descrição"} {m.cliente ? `- ${m.cliente}` : ""}
                <br />
                <span style={{ color: "#c4b5fd" }}>{m.tipo === "transferencia" ? `${contaPorId(m.contaId).nome} → ${contaPorId(m.contaDestinoId).nome}` : contaPorId(m.contaId).nome} | {m.categoria} | {m.formaPagamento}{m.parcelaNumero ? ` | Parcela ${m.parcelaNumero}/${m.parcelas}` : ""}</span>
              </div>
            ))}
          </>
        )}

        {temEventos && (
          <>
            <h4>Clientes / eventos relacionados</h4>
            {eventosDetalhe.slice(0, 80).map((e) => {
              const total = Number(e.valor || 0);
              const entrada = Number(e.entrada || 0);
              const pendente = e.quitado ? 0 : Math.max(total - entrada, 0);
              return (
                <button
                  key={e.id}
                  style={{ ...estilos.botao, display: "block", width: "100%", textAlign: "left", marginBottom: 6 }}
                  onClick={() => abrirEventoRapido(e)}
                >
                  <strong>{dataCurtaBR(e.data)} - {e.nome}</strong> | {e.tipoEvento || "Evento"} | Total: {moeda(total)} | Entrada: {moeda(entrada)} | Pendente: {moeda(pendente)}
                </button>
              );
            })}
          </>
        )}
      </div>
    );
  };

  hoje.setHours(0, 0, 0, 0);

  const diasAteData = (data) => {
    if (!data) return null;
    const [ano, mes, dia] = data.split("-");
    const dataEvento = new Date(Number(ano), Number(mes) - 1, Number(dia));
    dataEvento.setHours(0, 0, 0, 0);
    return Math.ceil((dataEvento - hoje) / (1000 * 60 * 60 * 24));
  };

  const diasDesdeCadastro = (evento) => {
    if (!evento?.id || Number.isNaN(Number(evento.id))) return 0;
    return Math.max(0, Math.floor((Date.now() - Number(evento.id)) / (1000 * 60 * 60 * 24)));
  };

  const agendaOrdenada = useMemo(() => {
    return [...eventos].filter((e) => !e.clienteOnly).sort((a, b) => {
      const dataA = `${a.data || "9999-12-31"} ${a.horaInicio || "00:00"}`;
      const dataB = `${b.data || "9999-12-31"} ${b.horaInicio || "00:00"}`;
      return new Date(dataA) - new Date(dataB);
    });
  }, [eventos]);

  const eventosFuturos = agendaOrdenada.filter((e) => {
    if (!e.data) return false;
    const [ano, mes, dia] = e.data.split("-");
    const dataEvento = new Date(Number(ano), Number(mes) - 1, Number(dia));
    return dataEvento >= hoje;
  });

  const hojeISOJP = hoje.toISOString().slice(0, 10);
  const eventosARealizar = eventosFuturos.filter((e) => !e.executado);
  const contarEventosPorPeriodo = (listaBase = eventosARealizar) => {
    const base = Array.isArray(listaBase) ? listaBase.filter((e) => e?.data && !e.executado) : [];
    return {
      hoje: base.filter((e) => e.data === hojeISOJP).length,
      mesAgenda: base.filter((e) => {
        const [ano, mes] = String(e.data || "").split("-").map(Number);
        return ano === anoCalendario && mes - 1 === mesCalendario;
      }).length,
      anoAgenda: base.filter((e) => {
        const [ano] = String(e.data || "").split("-").map(Number);
        return ano === anoCalendario;
      }).length,
      total: base.length
    };
  };

  const eventosExecutados = agendaOrdenada.filter((e) => e.executado);
  const eventosNaoExecutados = agendaOrdenada.filter((e) => !e.executado);
  const eventosMesAgenda = agendaOrdenada.filter((e) => {
    const [ano, mes] = String(e.data || "").split("-").map(Number);
    return ano === anoCalendario && mes - 1 === mesCalendario;
  });
  const eventosAnoAgenda = agendaOrdenada.filter((e) => {
    const [ano] = String(e.data || "").split("-").map(Number);
    return ano === anoCalendario;
  });
  const eventosHoje = agendaOrdenada.filter((e) => e.data === hojeISOJP);

  const resumoEventosPainel = {
    hoje: eventosHoje.length,
    hojeFeitos: eventosHoje.filter((e) => e.executado).length,
    hojeFaltam: eventosHoje.filter((e) => !e.executado).length,
    mesTotal: eventosMesAgenda.length,
    mesFeitos: eventosMesAgenda.filter((e) => e.executado).length,
    mesFaltam: eventosMesAgenda.filter((e) => !e.executado).length,
    anoTotal: eventosAnoAgenda.length,
    anoFeitos: eventosAnoAgenda.filter((e) => e.executado).length,
    anoFaltam: eventosAnoAgenda.filter((e) => !e.executado).length,
    totalGeral: agendaOrdenada.length,
    totalFeitos: eventosExecutados.length,
    totalFaltam: eventosNaoExecutados.length,
    futuros: eventosFuturos.length,
    aRealizar: eventosARealizar.length
  };

  const proximoEvento = eventosFuturos[0];

  const lembretes = eventosFuturos.filter((e) => {
    const [ano, mes, dia] = e.data.split("-");
    const dataEvento = new Date(Number(ano), Number(mes) - 1, Number(dia));
    const dias = Math.ceil((dataEvento - hoje) / (1000 * 60 * 60 * 24));
    return dias >= 0 && dias <= 7;
  });

  const preReservasProximas = eventosFuturos.filter((e) => {
    if (!ehPreCadastro(e)) return false;
    const dias = diasAteData(e.data);
    return dias !== null && dias >= 0 && dias <= 3;
  });

  const clientesSumidos = eventosFuturos.filter((e) => ehPreCadastro(e) && diasDesdeCadastro(e) >= 2);

  const pendentesFinanceiros = eventos
    .filter((e) => !ehPreCadastro(e) && !e.quitado && Number(e.valor || 0) > Number(e.entrada || 0))
    .sort((a, b) => String(a.data || "9999-12-31").localeCompare(String(b.data || "9999-12-31")));

  const abrirEventoRapido = (evento) => {
    if (!evento) return;
    setBusca(evento.nome || evento.whatsapp || evento.tipoEvento || "");
    setFiltroStatus("todos");
    setEventoExpandidoId(evento.id);
    setModoEventosExpandido(false);
    setTituloListaAberta("Resultado da busca");
    setAba("eventos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmarFechamentoSemSinal = (evento) => {
    const sinal = Number(campoFoiPreenchido(evento?.entrada) ? evento.entrada : 0);
    if (sinal > 0) return true;

    return confirm(
      `Atenção: este cliente está sem sinal/entrada registrada.\n\n` +
        `Cliente: ${evento?.nome || "Não informado"}\n` +
        `Valor total: ${moeda(evento?.valor || 0)}\n` +
        `Sinal/entrada: ${moeda(0)}\n\n` +
        `Tem certeza que deseja fechar e gerar contrato sem sinal?`
    );
  };

  const fecharComCliente = (evento) => {
    if (!confirmarFechamentoSemSinal(evento)) return;

    const registro = criarRegistroHistorico("Cliente fechado", "Reserva confirmada e contrato gerado");
    const atualizado = {
      ...evento,
      status: "confirmado",
      quitado:
        evento.formaPagamento === "Valor total" ||
        evento.formaPagamento === "Valor total à vista" ||
        (Number(evento.valor || 0) > 0 && Number(evento.entrada || 0) >= Number(evento.valor || 0)),
      historico: [registro, ...(Array.isArray(evento.historico) ? evento.historico : [])].slice(0, 50)
    };

    if (evento.id) {
      setEventos((lista) => lista.map((item) => (item.id === evento.id ? atualizado : item)));
    }

    gerarDocumentoEvento(prepararEventoDocumento(atualizado), "contrato");
  };

  const liberarData = (evento) => {
    if (!evento?.id) return;
    const confirmar = confirm(`Deseja liberar a data de ${evento.nome || "cliente"}? O cadastro será removido da agenda.`);
    if (!confirmar) return;
    setEventos((lista) => lista.filter((item) => item.id !== evento.id));
  };

  const eventosNaMesmaData = form.data ? eventos.filter((e) => !e.clienteOnly && e.data === form.data && e.id !== editandoId) : [];
  const eventosNaDataConsulta = dataConsultaAgenda ? eventos.filter((e) => !e.clienteOnly && e.data === dataConsultaAgenda && e.id !== editandoId) : [];

  const consultarEventosDaData = (dataAlvo = form.data) => {
    if (!dataAlvo) {
      alert("Escolha uma data primeiro para consultar a agenda.");
      return;
    }

    localStorage.setItem("rascunhoFormJPEventos", JSON.stringify(form));
    localStorage.setItem("rascunhoWhatsAppJPEventos", textoWhatsApp || "");
    setBusca(dataAlvo);
    setFiltroStatus("todos");
    setVoltarCadastroPendente(true);
    setEventoExpandidoId(null);
    setModoEventosExpandido(false);
    setTituloListaAberta(`Eventos da data ${dataCurtaBR(dataAlvo)}`);
    setAba("eventos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const voltarParaCadastroEmAndamento = () => {
    setVoltarCadastroPendente(false);
    setAba("cadastro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eventosOperacionais = eventos.filter((e) => !e.clienteOnly);

  const listaFiltrada = eventosOperacionais.filter((e) => {
    const texto = normalizarTexto(busca);
    const statusPagamento = ehPreCadastro(e)
      ? "pre reserva pré reserva pre cadastro pré cadastro data reservada reserva"
      : e.quitado
        ? "pago quitado recebido"
        : "pendente aberto falta pagar";

    const conteudo = `
      ${e.nome || ""}
      ${e.cpf || ""}
      ${e.whatsapp || ""}
      ${e.tipoEvento || ""}
      ${e.data || ""}
      ${dataBR(e.data) || ""}
      ${e.pacote || ""}
      ${e.pacotePersonalizado || ""}
      ${e.obs || ""}
      ${e.endereco || ""}
      ${cidadeBairroFinal(e) || ""}
      ${e.formaEntrada || ""}
      ${e.formaPagamento || ""}
      ${e.parcelas || ""}
      ${statusPagamento}
      ${e.executado ? "executado realizado" : "nao executado"}
    `;

    const passouBusca = normalizarTexto(conteudo).includes(texto);
    const passouFiltro =
      filtroStatus === "todos" ||
      filtroStatus === statusEvento(e) ||
      (filtroStatus === "executado" && e.executado) ||
      (filtroStatus === "naoExecutado" && !e.executado);

    return passouBusca && passouFiltro;
  });

  const totalRecebido = eventosOperacionais.filter((e) => e.quitado).reduce((acc, e) => acc + Number(e.valor || 0), 0);
  const totalEntradas = eventosOperacionais.reduce((acc, e) => acc + Number(e.entrada || 0), 0);
  const totalPendente = eventosOperacionais.reduce((acc, e) => acc + saldoPendenteEventoJP(e), 0);
  const eventosPagos = eventosOperacionais.filter((e) => e.quitado).length;
  const eventosPendentes = eventosOperacionais.filter((e) => !ehPreCadastro(e) && !e.quitado).length;
  const eventosPreReserva = eventosOperacionais.filter((e) => ehPreCadastro(e)).length;
  const faturamentoTotal = eventosOperacionais.reduce((acc, e) => acc + Number(e.valor || 0), 0);

  const custoTotal = eventosOperacionais.reduce((acc, e) => acc + valorNumericoJP(e.custo), 0);
  const lucroTotal = faturamentoTotal - custoTotal;
  const sinaisRecebidos = eventosOperacionais.reduce((acc, e) => acc + Number(e.entrada || 0), 0);
  const faturamentoFuturo = eventosFuturos.reduce((acc, e) => acc + Number(e.valor || 0), 0);
  const saldoReceberFuturo = eventosFuturos.reduce((acc, e) => acc + saldoPendenteEventoJP(e), 0);
  const faturamentoMesAgenda = eventosOperacionais
    .filter((e) => {
      if (!e.data) return false;
      const [ano, mes] = e.data.split("-").map(Number);
      return ano === hoje.getFullYear() && mes - 1 === hoje.getMonth();
    })
    .reduce((acc, e) => acc + Number(e.valor || 0), 0);
  const custosMesAgenda = eventosOperacionais
    .filter((e) => {
      if (!e.data) return false;
      const [ano, mes] = e.data.split("-").map(Number);
      return ano === hoje.getFullYear() && mes - 1 === hoje.getMonth();
    })
    .reduce((acc, e) => acc + valorNumericoJP(e.custo), 0);
  const lucroMesEstimado = faturamentoMesAgenda - custosMesAgenda;
  const ticketMedio = eventosOperacionais.filter((e) => reservaConfirmada(e)).length > 0
    ? faturamentoTotal / eventosOperacionais.filter((e) => reservaConfirmada(e)).length
    : 0;
  const totalPropostas = eventosOperacionais.filter((e) => ehPreCadastro(e)).length;
  const totalFechados = eventosOperacionais.filter((e) => reservaConfirmada(e)).length;
  const taxaConversao = eventosOperacionais.length > 0 ? Math.round((totalFechados / eventosOperacionais.length) * 100) : 0;
  const metaMensalNumero = Number(metaMensal || 0);
  const percentualMetaMensal = metaMensalNumero > 0 ? Math.min(100, Math.round((faturamentoMesAgenda / metaMensalNumero) * 100)) : 0;
  const margemLucroTotal = faturamentoTotal > 0 ? Math.round((lucroTotal / faturamentoTotal) * 100) : 0;
  const margemLucroMes = faturamentoMesAgenda > 0 ? Math.round((lucroMesEstimado / faturamentoMesAgenda) * 100) : 0;
  const caixaRealRecebido = totalRecebido + eventosOperacionais.filter((e) => !e.quitado).reduce((acc, e) => acc + Number(e.entrada || 0), 0);
  const lucroRealEstimado = caixaRealRecebido - custoTotal;
  const eventosComLucroRuim = eventosOperacionais.filter((e) => valorNumericoJP(e.valor) > 0 && valorNumericoJP(e.custo) > valorNumericoJP(e.valor) * 0.55);

  const rankingClientes = Object.values(
    eventosOperacionais.reduce((acc, e) => {
      const chave = normalizarTexto(e.nome || "Cliente sem nome");
      if (!acc[chave]) {
        acc[chave] = { nome: e.nome || "Cliente sem nome", qtd: 0, total: 0, fechados: 0 };
      }
      acc[chave].qtd += 1;
      acc[chave].total += Number(e.valor || 0);
      if (reservaConfirmada(e)) acc[chave].fechados += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.qtd - a.qtd || b.total - a.total);

  const historicoRecente = eventos
    .flatMap((e) =>
      (Array.isArray(e.historico) ? e.historico : []).map((h) => ({ ...h, cliente: e.nome, eventoId: e.id }))
    )
    .slice(0, 20);

  const saldoHoje = eventos
    .filter((e) => {
      if (!e.data || !e.quitado) return false;
      const [ano, mes, dia] = e.data.split("-");
      const dataEvento = new Date(Number(ano), Number(mes) - 1, Number(dia));
      return dataEvento.getTime() === hoje.getTime();
    })
    .reduce((acc, e) => acc + Number(e.valor || 0), 0);

  const quinzeDiasAtras = new Date(hoje);
  quinzeDiasAtras.setDate(hoje.getDate() - 15);

  const saldo15Dias = eventos
    .filter((e) => {
      if (!e.data || !e.quitado) return false;
      const [ano, mes, dia] = e.data.split("-");
      const dataEvento = new Date(Number(ano), Number(mes) - 1, Number(dia));
      return dataEvento >= quinzeDiasAtras && dataEvento <= hoje;
    })
    .reduce((acc, e) => acc + Number(e.valor || 0), 0);

  const saldoMes = eventos
    .filter((e) => {
      if (!e.data || !e.quitado) return false;
      const [ano, mes, dia] = e.data.split("-");
      const dataEvento = new Date(Number(ano), Number(mes) - 1, Number(dia));
      return dataEvento.getMonth() === hoje.getMonth() && dataEvento.getFullYear() === hoje.getFullYear();
    })
    .reduce((acc, e) => acc + Number(e.valor || 0), 0);

  const eventosDoMes = eventos.filter((e) => {
    if (!e.data) return false;
    const [ano, mes] = e.data.split("-").map(Number);
    return ano === anoCalendario && mes - 1 === mesCalendario;
  });

  const primeiroDiaMes = new Date(anoCalendario, mesCalendario, 1).getDay();
  const ultimoDiaMes = new Date(anoCalendario, mesCalendario + 1, 0).getDate();
  const diasCalendario = [
    ...Array.from({ length: primeiroDiaMes }, () => null),
    ...Array.from({ length: ultimoDiaMes }, (_, i) => i + 1)
  ];

  const nomesMeses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro"
  ];

  const nomeMes = `${nomesMeses[mesCalendario]} de ${anoCalendario}`;

  const mudarMes = (direcao) => {
    const novaData = new Date(anoCalendario, mesCalendario + direcao, 1);
    setMesCalendario(novaData.getMonth());
    setAnoCalendario(novaData.getFullYear());
    setDiaSelecionado(null);
  };

  const eventosDoDiaSelecionado = diaSelecionado
    ? eventosDoMes.filter((e) => Number(e.data.split("-")[2]) === diaSelecionado)
    : [];

  const GraficoFinanceiroV22 = () => {
    const maior = Math.max(faturamentoMesAgenda, custosMesAgenda, lucroMesEstimado, metaMensalNumero, 1);
    const barras = [
      { titulo: "Receita mês", valor: faturamentoMesAgenda, emoji: "💰", tipo: "receitaMesGrafico", detalhe: "Receita do mês" },
      { titulo: "Custos mês", valor: custosMesAgenda, emoji: "📤", tipo: "custosMesGrafico", detalhe: "Custos do mês" },
      { titulo: "Lucro mês", valor: lucroMesEstimado, emoji: "📈", tipo: "lucroMesGrafico", detalhe: "Lucro estimado do mês" },
      { titulo: "Meta", valor: metaMensalNumero, emoji: "🎯", tipo: "metaGrafico", detalhe: "Eventos usados na meta do mês" }
    ];

    return (
      <div style={{ ...estilos.card, borderColor: "#38bdf8" }}>
        <h3>📊 Gráfico financeiro v24</h3>
        <p style={{ color: "#c4b5fd", marginTop: -4 }}>Visão rápida de receita, custos, lucro e meta do mês.</p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: 10, alignItems: "end", minHeight: 190 }}>
          {barras.map((b) => {
            const altura = Math.max(18, Math.round((Number(b.valor || 0) / maior) * 135));
            return (
              <div key={b.titulo} onClick={() => abrirDetalheFinanceiro(b.tipo, b.detalhe)} title="Clique para abrir os detalhes" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 10, cursor: "pointer" }}>
                <div style={{ height: 145, display: "flex", alignItems: "end", justifyContent: "center" }}>
                  <div style={{
                    width: "70%",
                    minWidth: 34,
                    height: altura,
                    borderRadius: "14px 14px 6px 6px",
                    background: "linear-gradient(180deg, #a78bfa, #6d28d9)",
                    boxShadow: "0 10px 26px rgba(124,58,237,0.35)"
                  }} />
                </div>
                <strong>{b.emoji} {b.titulo}</strong><br />
                <span>{moeda(b.valor)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const CardEvento = ({ e, onVoltar = null }) => {
    const total = valorNumericoJP(e.valor);
    const entrada = valorNumericoJP(e.entrada);
    const pendente = saldoPendenteEventoJP(e);
    const lucro = total - valorNumericoJP(e.custo);

    return (
      <div style={{ ...estilos.card, borderColor: corStatus(e) }}>
        {onVoltar && <button style={estilos.botaoRoxo} onClick={onVoltar}>← Voltar para lista</button>}
        <button style={estilos.botao} onClick={() => abrirClienteDoEvento(e, aba || "eventos")}>👤 Abrir cliente</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div>
            <strong style={{ color: e.executado ? "#86efac" : "white", fontSize: 20 }}>{e.nome}</strong>
            <div style={{ marginTop: 6 }}>
              <span style={estilos.badge}>{textoStatusCurto(e)}</span>
              {e.executado && <span style={{ ...estilos.badge, background: "rgba(34,197,94,0.16)", color: "#bbf7d0" }}>✔ Executado</span>}
            </div>
          </div>
          <div style={{ textAlign: isMobile ? "left" : "right" }}>
            <strong style={{ color: "#93c5fd" }}>{dataBR(e.data)}</strong><br />
            <span>{normalizarHorarioManual(e.horaInicio) || e.horaInicio || "Não informado"} às {normalizarHorarioManual(e.horaFim) || e.horaFim || "Não informado"}</span>
          </div>
        </div>

        <div style={estilos.miniInfo}>
          <div style={estilos.linhaInfo}><strong>🎉 Evento</strong><br />{e.tipoEvento || "Não informado"}</div>
          <div style={estilos.linhaInfo}><strong>📍 Local</strong><br />{cidadeBairroFinal(e)}<br />{e.endereco || "Endereço não informado"}</div>
          <div style={estilos.linhaInfo}><strong>📦 Pacote</strong><br />{e.pacote === "Outro" ? e.pacotePersonalizado : e.pacote || "Não informado"}</div>
          <div style={estilos.linhaInfo}><strong>📞 WhatsApp / Documento</strong><br />{e.whatsapp || "Não informado"}<br />{rotuloDocumentoCliente(e.cpf)}: {e.cpf || "Não informado"}</div>
        </div>

        <div style={{ ...estilos.cardFinanceiro, marginTop: 10 }}>
          <strong>💰 Resumo financeiro</strong>
          <div style={estilos.miniInfo}>
            <span style={{ color: "#38bdf8" }}>Valor total: <strong>{moeda(total)}</strong></span>
            <span style={{ color: "#facc15" }}>Entrada / sinal: <strong>{moeda(entrada)}</strong></span>
            <span style={{ color: pendente > 0 ? "#ef4444" : "#22c55e" }}>Pendente: <strong>{moeda(pendente)}</strong></span>
            <span>Lucro estimado: <strong>{moeda(lucro)}</strong></span>
            {valorNumericoJP(e.custo) > 0 && (
              <span style={{ color: "#c4b5fd" }}>Custo: <strong>{moeda(e.custo)}</strong>{custoDescricaoFinalJP(e) ? ` - ${custoDescricaoFinalJP(e)}` : ""}</span>
            )}
          </div>
        </div>

        <div style={{ ...estilos.cardClaro, borderColor: "#38bdf8" }}>
          <strong style={{ color: "#38bdf8" }}>⚡ Atalhos do cliente</strong>
          <p style={{ color: "#c4b5fd", marginTop: 6, marginBottom: 8 }}>Clique e resolva direto: pagamento, banco, despesa, histórico, recibo ou contrato.</p>
          {(() => {
            const resumoCx = resumoFinanceiroEvento(e);
            return (
              <div style={estilos.miniInfo}>
                <span style={{ color: "#22c55e" }}>Entrou no caixa: <strong>{moeda(resumoCx.entradas)}</strong></span>
                <span style={{ color: "#ef4444" }}>Saídas do cliente/evento: <strong>{moeda(resumoCx.saidas)}</strong></span>
                <span style={{ color: resumoCx.saldo >= 0 ? "#38bdf8" : "#ef4444" }}>Resultado caixa: <strong>{moeda(resumoCx.saldo)}</strong></span>
                <span>Movimentos: <strong>{resumoCx.movs.length}</strong></span>
              </div>
            );
          })()}
        </div>

        <details style={{ ...estilos.cardClaro, marginTop: 10 }}>
          <summary style={{ cursor: "pointer", color: "#facc15", fontWeight: 900 }}>💰 Caixa financeira do cliente</summary>
          <div style={estilos.grupoAcoes}>
            <button style={{ ...estilos.botaoPequeno, background: "#ca8a04", color: "white" }} onClick={() => abrirRegistroPagamentoEvento(e, "entrada")}>+ Entrada / sinal</button>
            <button style={{ ...estilos.botaoPequeno, background: "#16a34a", color: "white" }} onClick={() => abrirRegistroPagamentoEvento(e, "total")}>+ Pagamento total / saldo</button>
            <button style={{ ...estilos.botaoPequeno, background: "#991b1b", color: "white" }} onClick={() => abrirDespesaDoEvento(e)}>+ Despesa do evento</button>
            <button style={{ ...estilos.botaoPequeno, background: "#2563eb", color: "white" }} onClick={() => abrirFinanceiroDoCliente(e)}>Ver financeiro do cliente</button>
          </div>
        </details>

        {e.obs && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer", color: "#c4b5fd", fontWeight: "bold" }}>Observações</summary>
            <p style={{ whiteSpace: "pre-wrap" }}>{limparObservacoesInternas(e.obs)}</p>
          </details>
        )}

        {resumoHistorico(e).length > 0 && (
          <details style={{ marginTop: 8, marginBottom: 8 }}>
            <summary style={{ cursor: "pointer", color: "#c4b5fd", fontWeight: "bold" }}>Histórico rápido</summary>
            {resumoHistorico(e).map((h) => (
              <div key={h.id} style={{ fontSize: 13, borderBottom: "1px solid #374151", padding: "4px 0" }}>
                {h.data} - {h.acao}{h.detalhe ? `: ${h.detalhe}` : ""}
              </div>
            ))}
          </details>
        )}

        <details style={{ ...estilos.cardClaro, marginTop: 10 }}>
          <summary style={{ cursor: "pointer", color: "#c4b5fd", fontWeight: 900 }}>📄 Documentos</summary>
          <div style={estilos.grupoAcoes}>
            <button style={estilos.botaoRoxo} onClick={() => gerarProposta(e)}>Proposta PDF</button>
            <button style={estilos.botaoPequeno} onClick={() => gerarContrato(e)}>Contrato</button>
            <button style={estilos.botaoPequeno} onClick={() => abrirRecibo(e)}>Recibo</button>
            <button style={estilos.botaoRoxo} onClick={() => fecharComCliente(e)}>Fechar com cliente</button>
          </div>
        </details>

        <details style={{ ...estilos.cardClaro, marginTop: 10 }}>
          <summary style={{ cursor: "pointer", color: "#22c55e", fontWeight: 900 }}>💬 WhatsApp</summary>
          <div style={estilos.grupoAcoes}>
            <button style={estilos.botaoPequeno} onClick={() => abrirWhatsApp(e)}>Abrir conversa</button>
            <button style={estilos.botaoPequeno} onClick={() => abrirWhatsAppCobrarSinal(e)}>Cobrar sinal</button>
            <button style={estilos.botaoPequeno} onClick={() => abrirWhatsAppLembrarPagamento(e)}>Lembrar pagamento</button>
            <button style={estilos.botaoPequeno} onClick={() => abrirWhatsAppConfirmarEvento(e)}>Confirmar evento</button>
            <button style={estilos.botaoRoxo} onClick={() => abrirWhatsAppProposta(e)}>Enviar proposta</button>
            <button style={estilos.botaoPequeno} onClick={() => abrirWhatsAppPersonalizado(e)}>Mensagem livre</button>
            <button style={estilos.botaoPequeno} onClick={() => abrirWhatsAppModelo(e, "followup", "Follow-up inteligente")}>Follow-up</button>
            <button style={estilos.botaoPequeno} onClick={() => abrirWhatsAppModelo(e, "urgente", "Última chamada da data")}>Última chamada</button>
            <button style={estilos.botaoPequeno} onClick={() => abrirWhatsAppModelo(e, "posEvento", "Pós-evento / feedback")}>Pós-evento</button>
            <button style={estilos.botaoPequeno} onClick={() => abrirWhatsAppModelo(e, "indicacao", "Pedido de indicação")}>Indicação</button>
            <button style={estilos.botaoPequeno} onClick={() => { navigator.clipboard.writeText(mensagemComPreco(e)); alert("Mensagem profissional copiada!"); }}>Copiar proposta</button>
          </div>
        </details>

        <details style={{ ...estilos.cardClaro, marginTop: 10 }}>
          <summary style={{ cursor: "pointer", color: "#93c5fd", fontWeight: 900 }}>⚙️ Gestão</summary>
          <div style={estilos.grupoAcoes}>
          <button style={estilos.botaoPequeno} onClick={() => abrirGoogleAgenda(e)}>📅 Google Agenda</button>
          <button style={estilos.botaoPequeno} onClick={() => { navigator.clipboard.writeText(textoCompleto(e)); alert("Cadastro copiado!"); }}>Copiar cadastro</button>
          <button style={estilos.botaoPequeno} onClick={() => editarEvento(e)}>✏️ Editar</button>
          <button style={{ ...estilos.botaoPequeno, background: "#16a34a", borderColor: "#22c55e", color: "white" }} onClick={() => marcarQuitado(e.id, true)}>Quitar tudo</button>
          <button style={{ ...estilos.botaoPequeno, background: "#991b1b", borderColor: "#ef4444", color: "white" }} onClick={() => marcarQuitado(e.id, false)}>Marcar pendente</button>
          <button style={estilos.botaoPequeno} onClick={() => setEventos((lista) => lista.map((ev) => (ev.id === e.id ? { ...ev, status: "pre", quitado: false, historico: [criarRegistroHistorico("Voltou para pré-reserva", "Reserva deixou de estar confirmada"), ...(Array.isArray(ev.historico) ? ev.historico : [])].slice(0, 50) } : ev)))}>Pré-reserva</button>
          <button style={estilos.botaoPequeno} onClick={() => setEventos((lista) => lista.map((ev) => (ev.id === e.id ? { ...ev, status: "confirmado", historico: [criarRegistroHistorico("Reserva confirmada", "Status alterado manualmente"), ...(Array.isArray(ev.historico) ? ev.historico : [])].slice(0, 50) } : ev)))}>Confirmar reserva</button>
          <button style={{ ...estilos.botaoPequeno, background: "#92400e" }} onClick={() => liberarData(e)}>Liberar data</button>
          <button style={estilos.botaoPequeno} onClick={() => toggleExecutado(e.id)}>{e.executado ? "✔ Executado" : "Marcar executado"}</button>
          <button style={{ ...estilos.botaoPequeno, background: "#991b1b" }} onClick={() => excluirEvento(e.id)}>🗑️ Excluir somente este evento/serviço</button>
          </div>
        </details>
      </div>
    );
  };

  const custoCadastroTextoAoVivo = String(form?.custo ?? "");
  const valorCadastroTextoAoVivo = String(form?.valor ?? "");
  const custoCadastroNumero = valorNumericoJP(custoCadastroTextoAoVivo);
  const valorCadastroNumero = valorNumericoJP(valorCadastroTextoAoVivo);
  const lucroCadastroNumero = Math.max(valorCadastroNumero - custoCadastroNumero, 0);
  const atualizarCustoCadastroAoVivo = (valorDigitado) => {
    const valorLimpo = String(valorDigitado || "").replace(/[^0-9,.]/g, "");
    setForm((atual) => ({ ...atual, custo: valorLimpo }));
  };

  const capturarTelaAtual = () => ({
    aba,
    busca,
    filtroStatus,
    eventoExpandidoId,
    modoEventosExpandido,
    tituloListaAberta,
    clienteAbertoChave,
    origemTelaAnterior,
    diaSelecionado,
    mostrarProximosComDiaSelecionado,
    diaFinanceiroSelecionado,
    clienteFinanceiroFiltro,
    painelFinanceiroDetalhe
  });

  const restaurarTela = (tela = {}) => {
    setAba(tela.aba || "");
    setBusca(tela.busca || "");
    setFiltroStatus(tela.filtroStatus || "todos");
    setEventoExpandidoId(tela.eventoExpandidoId || null);
    setModoEventosExpandido(Boolean(tela.modoEventosExpandido));
    setTituloListaAberta(tela.tituloListaAberta || "");
    setClienteAbertoChave(tela.clienteAbertoChave || null);
    setOrigemTelaAnterior(tela.origemTelaAnterior || null);
    setDiaSelecionado(tela.diaSelecionado || null);
    setMostrarProximosComDiaSelecionado(Boolean(tela.mostrarProximosComDiaSelecionado));
    setDiaFinanceiroSelecionado(tela.diaFinanceiroSelecionado || null);
    setClienteFinanceiroFiltro(tela.clienteFinanceiroFiltro || "");
    setPainelFinanceiroDetalhe(tela.painelFinanceiroDetalhe || null);
    setMenuAberto(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const guardarTelaAnterior = () => {
    const atual = capturarTelaAtual();
    if (!atual.aba && !atual.busca && !atual.eventoExpandidoId && !atual.diaSelecionado) return;
    setHistoricoTelas((hist) => [...hist.slice(-9), atual]);
  };

  const navegarParaAba = (proximaAba, ajustes = {}) => {
    guardarTelaAnterior();
    if (Object.prototype.hasOwnProperty.call(ajustes, "busca")) setBusca(ajustes.busca || "");
    if (Object.prototype.hasOwnProperty.call(ajustes, "filtroStatus")) setFiltroStatus(ajustes.filtroStatus || "todos");
    if (Object.prototype.hasOwnProperty.call(ajustes, "eventoExpandidoId")) setEventoExpandidoId(ajustes.eventoExpandidoId || null);
    if (Object.prototype.hasOwnProperty.call(ajustes, "modoEventosExpandido")) setModoEventosExpandido(Boolean(ajustes.modoEventosExpandido));
    if (Object.prototype.hasOwnProperty.call(ajustes, "tituloListaAberta")) setTituloListaAberta(ajustes.tituloListaAberta || "");
    if (Object.prototype.hasOwnProperty.call(ajustes, "diaSelecionado")) setDiaSelecionado(ajustes.diaSelecionado || null);
    if (Object.prototype.hasOwnProperty.call(ajustes, "clienteAbertoChave")) setClienteAbertoChave(ajustes.clienteAbertoChave || null);
    setAba(proximaAba);
    setMenuAberto(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const voltarTelaAnteriorGlobal = () => {
    setHistoricoTelas((hist) => {
      const ultimo = hist[hist.length - 1];
      if (!ultimo) {
        voltarParaInicio();
        return [];
      }
      setTimeout(() => restaurarTela(ultimo), 0);
      return hist.slice(0, -1);
    });
  };

  const selecionarAbaMenu = (id) => {
    setNavegacaoAnterior(null);
    setVoltarCadastroPendente(false);
    setBusca("");
    setEventoExpandidoId(null);
    setModoEventosExpandido(false);
    setTituloListaAberta("");
    setOrigemTelaAnterior(null);
    if (aba === id) {
      setAba("");
    } else {
      guardarTelaAnterior();
      setAba(id);
    }
    setMenuAberto(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const voltarParaInicio = () => {
    setAba("");
    setBusca("");
    setVoltarCadastroPendente(false);
    setEventoExpandidoId(null);
    setModoEventosExpandido(false);
    setTituloListaAberta("");
    setOrigemTelaAnterior(null);
    setDiaSelecionado(null);
    setMostrarProximosComDiaSelecionado(false);
    setHistoricoTelas([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const abrirClienteDoEvento = (evento, origem = "eventos") => {
    guardarTelaAnterior();
    const chave = normalizarTexto(evento?.whatsapp || evento?.nome || "");
    setClienteAbertoChave(chave);
    setOrigemTelaAnterior(origem);
    setAba("clientes");
    setMenuAberto(false);
    setTimeout(() => document.getElementById(`cliente-${chave}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const novoEventoServicoParaCliente = (cliente, origem = "clientes") => {
    guardarTelaAnterior();
    setOrigemTelaAnterior(origem);
    setEditandoId(null);
    setForm({
      ...formInicial,
      nome: cliente?.nome || "",
      whatsapp: cliente?.whatsapp || "",
      cpf: cliente?.cpf || "",
      endereco: cliente?.endereco || "",
      cidade: cliente?.cidade || "",
      bairro: cliente?.bairro || "",
      servicosTexto: "",
      obsInternas: `Novo evento/serviço para cliente já cadastrado: ${cliente?.nome || ""}`
    });
    setAba("servico");
    setMenuAberto(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const voltarTelaAnteriorSegura = () => {
    if (origemTelaAnterior) {
      setAba(origemTelaAnterior);
      setOrigemTelaAnterior(null);
    } else {
      setAba("clientes");
    }
    setEventoExpandidoId(null);
    setModoEventosExpandido(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const abrirEventoDaLista = (evento, titulo = "Lista de eventos") => {
    if (eventoExpandidoId !== evento.id) guardarTelaAnterior();
    setEventoExpandidoId((atual) => (atual === evento.id ? null : evento.id));
    setModoEventosExpandido(false);
    setTituloListaAberta(titulo);
    setTimeout(() => document.getElementById(`evento-expandido-${evento.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const voltarParaListaCompacta = () => {
    setEventoExpandidoId(null);
    setModoEventosExpandido(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30);
  };

  const resumoLinhaEvento = (ev) => {
    const horario = normalizarHorarioManual(ev.horaInicio) || ev.horaInicio || "horário não informado";
    const status = eventoQuitadoJP(ev) ? "Quitado" : `Pendente ${moeda(saldoPendenteEventoJP(ev))}`;
    return `${dataBR(ev.data)} - ${horario} | ${ev.nome || "Cliente"} | ${ev.tipoEvento || "Evento/serviço"} | ${status}`;
  };

  const renderContadorEventosRealizar = (listaBase = eventosARealizar, titulo = "📊 Eventos a realizar") => {
    const resumo = contarEventosPorPeriodo(listaBase);
    const cards = [
      ["Hoje", resumo.hoje, "eventos para hoje"],
      ["Mês da agenda", resumo.mesAgenda, `${String(mesCalendario + 1).padStart(2, "0")}/${anoCalendario}`],
      ["Ano da agenda", resumo.anoAgenda, String(anoCalendario)],
      ["Total futuro", resumo.total, "a realizar"]
    ];

    return (
      <div style={{ ...estilos.card, borderColor: "#22c55e", marginTop: 10 }}>
        <h3 style={{ marginTop: 0 }}>{titulo}</h3>
        <p style={{ color: "#c4b5fd", marginTop: -4 }}>Resumo rápido para você saber quantos eventos/serviços ainda tem pela frente.</p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
          {cards.map(([rotulo, valor, detalhe]) => (
            <div key={rotulo} style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(34,197,94,0.42)", borderRadius: 12, padding: 12 }}>
              <strong style={{ color: "#86efac" }}>{rotulo}</strong>
              <h2 style={{ margin: "6px 0", color: "#38bdf8" }}>{valor}</h2>
              <span style={{ color: "#c4b5fd", fontSize: 12 }}>{detalhe}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPainelEventosControle = () => {
    const cards = [
      ["Hoje", resumoEventosPainel.hoje, `${resumoEventosPainel.hojeFaltam} falta(m) | ${resumoEventosPainel.hojeFeitos} feito(s)`, "#38bdf8"],
      ["Mês da agenda", resumoEventosPainel.mesTotal, `${resumoEventosPainel.mesFaltam} falta(m) | ${resumoEventosPainel.mesFeitos} feito(s)`, "#facc15"],
      ["Ano da agenda", resumoEventosPainel.anoTotal, `${resumoEventosPainel.anoFaltam} falta(m) | ${resumoEventosPainel.anoFeitos} feito(s)`, "#a78bfa"],
      ["Eventos futuros", resumoEventosPainel.futuros, `${resumoEventosPainel.aRealizar} ainda a realizar`, "#22c55e"],
      ["Já realizados", resumoEventosPainel.totalFeitos, "marcados como executados", "#86efac"],
      ["Faltam fazer", resumoEventosPainel.totalFaltam, "não executados no sistema", "#fb7185"]
    ];

    return (
      <div style={{ ...estilos.card, borderColor: "#38bdf8", marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>📊 Painel de eventos e serviços</h3>
        <p style={{ color: "#c4b5fd", marginTop: -4 }}>Controle rápido para saber quantos eventos/serviços você já fez e quantos ainda faltam realizar.</p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 10 }}>
          {cards.map(([rotulo, valor, detalhe, cor]) => (
            <div key={rotulo} style={{ background: "rgba(255,255,255,0.045)", border: `1px solid ${cor}`, borderRadius: 12, padding: 12 }}>
              <strong style={{ color: cor }}>{rotulo}</strong>
              <h2 style={{ margin: "6px 0", color: "white" }}>{valor}</h2>
              <span style={{ color: "#c4b5fd", fontSize: 12 }}>{detalhe}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
          <button style={estilos.botao} onClick={() => navegarParaAba("eventos", { filtroStatus: "naoExecutado" })}>Ver eventos que faltam fazer</button>
          <button style={estilos.botao} onClick={() => navegarParaAba("eventos", { filtroStatus: "executado" })}>Ver eventos já feitos</button>
          <button style={estilos.botaoRoxo} onClick={() => navegarParaAba("agenda")}>Abrir agenda do mês</button>
        </div>
      </div>
    );
  };

  const renderListaEventosCompacta = (titulo, lista, opcoes = {}) => {
    const eventosLista = Array.isArray(lista) ? lista : [];
    const eventoAberto = eventosLista.find((ev) => ev.id === eventoExpandidoId);
    const tituloFinal = tituloListaAberta || titulo;

    return (
      <div style={estilos.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{titulo}</h3>
          <div>
            {opcoes.mostrarVoltarCadastro && (
              <button style={estilos.botaoRoxo} onClick={voltarParaCadastroEmAndamento}>← Voltar ao cadastro em andamento</button>
            )}
            <button style={modoEventosExpandido ? estilos.botaoRoxo : estilos.botao} onClick={() => { setModoEventosExpandido(!modoEventosExpandido); setEventoExpandidoId(null); }}>
              {modoEventosExpandido ? "Voltar para lista" : "Ver todos em card grande"}
            </button>
          </div>
        </div>
        <p style={{ color: "#c4b5fd" }}>Padrão em lista. Clique em uma linha para abrir o card completo; clique de novo ou use voltar para fechar.</p>
        {eventosLista.length > 0 && (
          <div style={{ color: "#c4b5fd", fontSize: 13, marginBottom: 10 }}>
            Nesta lista: <strong style={{ color: "#38bdf8" }}>{eventosLista.length}</strong> evento(s).
            Hoje: <strong>{contarEventosPorPeriodo(eventosLista).hoje}</strong> |
            Mês da agenda: <strong>{contarEventosPorPeriodo(eventosLista).mesAgenda}</strong> |
            Ano da agenda: <strong>{contarEventosPorPeriodo(eventosLista).anoAgenda}</strong>
          </div>
        )}

        {eventosLista.length === 0 && <p>Nenhum evento encontrado.</p>}

        {!modoEventosExpandido && !eventoAberto && eventosLista.map((ev) => (
          <button
            key={ev.id}
            style={{ ...estilos.botao, display: "block", width: "100%", textAlign: "left", marginBottom: 6 }}
            onClick={() => abrirEventoDaLista(ev, titulo)}
          >
            {resumoLinhaEvento(ev)}
          </button>
        ))}

        {!modoEventosExpandido && eventoAberto && (
          <div id={`evento-expandido-${eventoAberto.id}`}>
            <button style={estilos.botaoRoxo} onClick={voltarParaListaCompacta}>← Voltar para {tituloFinal}</button>
            <CardEvento e={eventoAberto} onVoltar={voltarParaListaCompacta} />
          </div>
        )}

        {modoEventosExpandido && eventosLista.map((ev) => (
          <CardEvento key={ev.id} e={ev} onVoltar={() => setModoEventosExpandido(false)} />
        ))}
      </div>
    );
  };

  return (
    <div style={estilos.pagina} translate="no">
      <h1 style={estilos.titulo}>JP Eventos Pro</h1>
      <p style={estilos.subtitulo}>Sistema completo com eventos, contratos, recibos, atalhos por cliente, caixa por contas/bancos, forma de pagamento separada, cartão parcelado até 12x e calendário financeiro. v26.14 voltar inteligente e histórico de telas.</p>

      <input
        placeholder="Buscar em tudo: cliente, WhatsApp, CPF, evento, serviço, data, cidade, pacote..."
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          setAba("eventos");
        }}
        style={estilos.input}
      />

      <div style={{ marginBottom: 20 }}>
        <button
          style={estilos.botaoRoxo}
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          {menuAberto ? "▲ Fechar menu" : "☰ Menu"}
        </button>

        {menuAberto && (
          <div style={{ marginTop: 10 }}>
            {[
              ["cadastro", "Cadastro"],
              ["eventos", "Eventos"],
              ["clientes", "Clientes"],
              ["agenda", "Agenda"],
              ["dashboard", "Painel"],
              ["financeiro", "Financeiro"],
              ["config", "Configurações"]
            ].map(([id, nome]) => (
              <button
                key={id}
                onClick={() => selecionarAbaMenu(id)}
                style={aba === id ? estilos.botaoRoxo : estilos.botao}
              >
                {aba === id ? "▼ " : "▶ "}{nome}
              </button>
            ))}
          </div>
        )}
      </div>

      {(aba !== "" || historicoTelas.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <button style={estilos.botao} onClick={aba === "servico" ? voltarTelaAnteriorSegura : voltarTelaAnteriorGlobal}>← Voltar para tela anterior</button>
          <button style={estilos.botao} onClick={voltarParaInicio}>🏠 Voltar para tela inicial</button>
        </div>
      )}

      {aba === "config" && (
        <>
          <div style={{ ...estilos.card, borderColor: bancoStatus.startsWith("Online") ? "#22c55e" : bancoStatus.startsWith("Erro") ? "#ef4444" : "#6c2bd9" }}>
            <h3>☁️ Banco online</h3>
            <p>{bancoStatus}</p>
            <button style={estilos.botao} onClick={() => sincronizarEventosNoBanco(eventos)}>Forçar sincronização online</button>
            <button style={estilos.botaoRoxo} onClick={sincronizarFilaPendente}>Sincronizar pendências</button>
          </div>

          <div style={{ ...estilos.card, borderColor: onlineStatus === "online" ? "#22c55e" : "#f59e0b" }}>
            <h3>🔄 Sincronização automática v24</h3>
            <p>Status da internet: <strong>{onlineStatus === "online" ? "Online" : "Offline"}</strong></p>
            <p>Pendências aguardando envio: <strong>{filaSync.length}</strong></p>
            <p>Se a internet cair, o cadastro fica salvo neste aparelho e será enviado automaticamente quando a conexão voltar.</p>
            <button style={estilos.botaoRoxo} onClick={sincronizarFilaPendente}>Forçar sincronização agora</button>
          </div>

          <div style={{ ...estilos.card, borderColor: "#22c55e", background: "rgba(20,83,45,0.18)" }}>
            <h3>✅ V24.4 sem mensalidade</h3>
            <p>Mensagens inteligentes por modelo interno, WhatsApp editável, financeiro com entrada + saída + lucro, gráficos simples, sincronização automática e nenhum serviço pago obrigatório.</p>
          </div>

          <div style={{ ...estilos.card, borderColor: appInstalavel ? "#22c55e" : "#6c2bd9" }}>
            <h3>📱 Instalação no celular</h3>
            <p>Android/Chrome: toque nos 3 pontinhos e escolha “Adicionar à tela inicial”.</p>
            <p>iPhone/Safari: toque em Compartilhar e depois “Adicionar à Tela de Início”.</p>
            <button style={appInstalavel ? estilos.botaoRoxo : estilos.botao} onClick={instalarAppNoCelular}>
              Instalar / adicionar à tela inicial
            </button>
          </div>

          <div style={{ ...estilos.card, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div>
              <strong>💾 Segurança dos dados</strong><br />
              <span style={{ color: "#c4b5fd" }}>Faça backup para não perder seus cadastros.</span>
            </div>
            <div>
              <button style={estilos.botaoRoxo} onClick={exportarBackup}>Baixar backup</button>
              <button style={estilos.botao} onClick={() => inputBackupRef.current?.click()}>Importar backup</button>
              <input
                ref={inputBackupRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => importarBackup(e.target.files?.[0])}
              />
            </div>
          </div>

          <div style={{ ...estilos.card, background: "#3a1f00", borderColor: "#f59e0b" }}>
            <h3>🔔 Alertas inteligentes</h3>
            <p>Pré-reservas próximas: <strong>{preReservasProximas.length}</strong></p>
            <p>Clientes sem retorno: <strong>{clientesSumidos.length}</strong></p>
            <p>Pagamentos pendentes: <strong>{pendentesFinanceiros.length}</strong></p>
            <button style={estilos.botao} onClick={() => navegarParaAba("agenda")}>Ver agenda</button>
            <button style={estilos.botao} onClick={() => navegarParaAba("financeiro")}>Ver financeiro</button>
          </div>

          <div style={{ ...estilos.card, background: "#3a2e00", borderColor: "orange" }}>
            <h3>⚠️ Área de risco</h3>
            <p>Apague todos os eventos somente se já tiver feito backup.</p>
            <button style={{ ...estilos.botao, background: "#991b1b" }} onClick={apagarTudo}>Apagar todos os eventos</button>
          </div>
        </>
      )}

      {aba === "" && (
        <>
          {proximoEvento ? (
            <div
              style={{ ...estilos.card, cursor: "pointer", borderColor: corStatus(proximoEvento) }}
              onClick={() => abrirEventoRapido(proximoEvento)}
              title="Clique para abrir este cadastro"
            >
              <h3>🔥 Próximo evento</h3>
              <strong>{proximoEvento.nome}</strong><br />
              {dataBR(proximoEvento.data)}<br />
              {proximoEvento.tipoEvento}<br />
              <span style={{ color: corStatus(proximoEvento) }}>{textoStatus(proximoEvento)}</span>
              <br />
              <small style={{ color: "#c4b5fd" }}>Clique aqui para abrir o cadastro</small>
            </div>
          ) : (
            <div style={estilos.card}>
              <h3>🔥 Próximo evento</h3>
              <p>Nenhum evento futuro cadastrado ainda.</p>
              <button style={estilos.botaoRoxo} onClick={() => navegarParaAba("cadastro")}>Cadastrar cliente</button>
            </div>
          )}

          {eventosFuturos.slice(1, 4).length > 0 && (
            <div style={estilos.card}>
              <h3>📌 Próximos 3 eventos</h3>
              {eventosFuturos.slice(1, 4).map((ev) => (
                <button key={ev.id} style={{ ...estilos.botao, display: "block", width: "100%", textAlign: "left" }} onClick={() => abrirEventoRapido(ev)}>
                  {dataBR(ev.data)} - {normalizarHorarioManual(ev.horaInicio) || ev.horaInicio || "horário"} | {ev.nome} | {ev.tipoEvento} | {eventoQuitadoJP(ev) ? "Quitado" : `Pendente ${moeda(saldoPendenteEventoJP(ev))}`}
                </button>
              ))}
              <button style={estilos.botaoRoxo} onClick={() => navegarParaAba("agenda", { eventoExpandidoId: null, modoEventosExpandido: false })}>Ver todos os próximos eventos</button>
            </div>
          )}

          <details style={estilos.card}>
            <summary style={{ cursor: "pointer", fontWeight: 900, color: "#c4b5fd" }}>💰 Financeiro rápido</summary>
            <div style={{ ...estilos.miniInfo, marginTop: 10 }}>
              <div style={{ ...estilos.linhaInfo, borderColor: "#22c55e", color: "#22c55e" }}><strong>Recebido</strong><br />{moeda(totalRecebido)}</div>
              <div style={{ ...estilos.linhaInfo, borderColor: "#ef4444", color: "#ef4444" }}><strong>Pendente</strong><br />{moeda(totalPendente)}</div>
              <div style={estilos.linhaInfo}><strong>Lucro estimado</strong><br />{moeda(lucroTotal)}</div>
              <div style={estilos.linhaInfo}><strong>Meta do mês</strong><br />{percentualMetaMensal}%</div>
            </div>
            <button style={estilos.botaoRoxo} onClick={() => navegarParaAba("financeiro")}>Abrir financeiro completo</button>
          </details>
        </>
      )}

      {aba !== "" && lembretes.length > 0 && (
        <div style={{ ...estilos.card, background: "#3a2e00", borderColor: "orange" }}>
          <strong>🔔 Lembrete:</strong> você tem {lembretes.length} evento(s) nos próximos 7 dias.
          {preReservasProximas.length > 0 && (
            <p>⚠️ {preReservasProximas.length} pré-reserva(s) vencendo em até 3 dias sem confirmação.</p>
          )}
          <button style={estilos.botao} onClick={() => navegarParaAba("agenda")}>Ver agenda</button>
        </div>
      )}

      {(aba === "cadastro" || aba === "servico") && (
        <>
          <div style={{ ...estilos.card, borderColor: aba === "servico" ? "#22c55e" : "#38bdf8" }}>
            <h2>{aba === "servico" ? "Novo evento / serviço para cliente" : "Cadastro inicial"}</h2>
            <p style={{ color: "#c4b5fd" }}>{aba === "servico" ? "Cliente já cadastrado. Esta tela é só para criar novo evento/serviço deste cliente, com data, pacote, valores, pagamento e agenda." : "Use esta área para o primeiro contato. Depois o cliente fica organizado na aba Clientes."}</p>
            {aba === "servico" && <button style={estilos.botao} onClick={voltarTelaAnteriorSegura}>← Voltar sem salvar</button>}
          </div>
          <h2>{aba === "servico" ? "Novo evento / serviço" : (editandoId ? "Editar cadastro" : "Novo cadastro")}</h2>

          <div style={{ ...estilos.card, borderColor: dataConsultaAgenda && eventosNaDataConsulta.length > 0 ? "#f59e0b" : "#38bdf8", background: dataConsultaAgenda && eventosNaDataConsulta.length > 0 ? "rgba(58,46,0,0.35)" : "rgba(14,165,233,0.10)" }}>
            <h3 style={{ marginTop: 0 }}>📅 Consultar data antes de cadastrar</h3>
            <p style={{ color: "#c4b5fd" }}>Escolha uma data para conferir rapidamente se já existe evento marcado. Seu cadastro em andamento fica salvo na tela.</p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "220px 1fr", gap: 10, alignItems: "center" }}>
              <input
                type="date"
                style={{ ...estilos.input, marginBottom: 0 }}
                value={dataConsultaAgenda}
                onChange={(e) => setDataConsultaAgenda(e.target.value)}
              />
              <div>
                {dataConsultaAgenda ? (
                  eventosNaDataConsulta.length > 0 ? (
                    <strong style={{ color: "#facc15" }}>⚠️ Já existe(m) {eventosNaDataConsulta.length} evento(s) nessa data.</strong>
                  ) : (
                    <strong style={{ color: "#22c55e" }}>✅ Nenhum evento encontrado nessa data.</strong>
                  )
                ) : (
                  <strong style={{ color: "#93c5fd" }}>Escolha a data para consultar.</strong>
                )}
              </div>
            </div>
            {dataConsultaAgenda && eventosNaDataConsulta.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <button style={estilos.botaoRoxo} onClick={() => consultarEventosDaData(dataConsultaAgenda)}>Ver evento(s) dessa data</button>
                <button
                  style={estilos.botao}
                  onClick={() => {
                    usarDataNoCadastroSeguro(dataConsultaAgenda);
                  }}
                >
                  Usar essa data no cadastro
                </button>
              </div>
            )}
          </div>

          {aba === "cadastro" && (
          <div style={{ ...estilos.card, borderColor: "#22c55e" }}>
            <h3>🤖 Importar conversa do WhatsApp</h3>
            <p>Cole aqui a resposta do cliente. O sistema tenta preencher data, horário, endereço, cidade, tipo de evento e observações.</p>

            <button style={estilos.botao} onClick={copiarPerguntasPadrao}>
  Copiar perguntas padrão
</button>

            <input
              style={estilos.input}
              placeholder="WhatsApp do cliente, caso não venha automático"
              value={form.whatsapp || ""}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />

            <textarea
              style={estilos.textarea}
              placeholder="Cole aqui a conversa ou resposta do cliente..."
              value={textoWhatsApp}
              onChange={(e) => setTextoWhatsApp(e.target.value)}
            />

            <button style={estilos.botaoRoxo} onClick={extrairDadosWhatsApp}>
              Extrair dados e preencher cadastro
            </button>

            <button style={estilos.botao} onClick={limparSomenteWhatsApp}>
              Limpar somente conversa do WhatsApp
            </button>

            <button
              style={{ ...estilos.botao, background: "#991b1b" }}
              onClick={limparSomenteCadastro}
            >
              Limpar somente cadastro
            </button>
          </div>
          )}

          {aba === "servico" ? (
            <div style={{ ...estilos.card, borderColor: "#22c55e", background: "rgba(20,83,45,0.16)" }}>
              <h3 style={{ marginTop: 0 }}>👤 Cliente vinculado</h3>
              <div style={estilos.miniInfo}>
                <div style={estilos.linhaInfo}><strong>Cliente</strong><br />{form.nome || "Cliente selecionado"}</div>
                <div style={estilos.linhaInfo}><strong>WhatsApp</strong><br />{form.whatsapp || "Não informado"}</div>
                <div style={estilos.linhaInfo}><strong>Documento</strong><br />{form.cpf || "Não informado"}</div>
              </div>
              <p style={{ color: "#bbf7d0" }}>Agora preencha somente os dados do novo evento/serviço deste cliente. Não precisa cadastrar o cliente de novo.</p>
              <button style={estilos.botao} onClick={voltarTelaAnteriorSegura}>← Voltar para cliente</button>
            </div>
          ) : (
            <>
              <label style={{ fontWeight: "bold" }}>NOME:</label>
              <input style={estilos.input} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />

              <label style={{ fontWeight: "bold" }}>CPF / CNPJ:</label>
              <input style={estilos.input} placeholder="CPF ou CNPJ do cliente/empresa" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatarDocumentoCliente(e.target.value) })} />

              <label style={{ fontWeight: "bold" }}>WHATSAPP:</label>
              <input style={estilos.input} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />

              <label style={{ fontWeight: "bold" }}>ENDEREÇO DO CLIENTE:</label>
              <input style={estilos.input} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />

              <label style={{ fontWeight: "bold" }}>CIDADE / BAIRRO:</label>
              <input
                style={estilos.input}
                placeholder="Ex: Fortaleza / João XXIII"
                value={cidadeBairroFinal(form) === "Não informado" ? "" : cidadeBairroFinal(form)}
                onChange={(e) => {
                  const valor = e.target.value;
                  const partes = valor.split(/[,/|-]/).map((p) => p.trim()).filter(Boolean);
                  setForm({
                    ...form,
                    cidade: partes[0] || valor,
                    bairro: partes.slice(1).join(" / ") || ""
                  });
                }}
              />

              <label style={{ fontWeight: "bold" }}>OBSERVAÇÕES DO CLIENTE:</label>
              <textarea
                style={estilos.textarea}
                value={form.obsInternas ?? ""}
                onChange={(e) => setForm({ ...form, obsInternas: e.target.value })}
                placeholder="Observações gerais do cliente. Ex: preferência, histórico, combinado inicial..."
              />

              <button style={estilos.botaoRoxo} onClick={salvar}>Salvar cliente e abrir ficha</button>
              <button style={estilos.botao} onClick={salvarClienteEIniciarServico}>Salvar cliente e criar evento/serviço</button>
            </>
          )}

          {aba === "servico" && (<>
          <div style={{ ...estilos.card, borderColor: "#38bdf8", background: "rgba(14,165,233,0.08)" }}>
            <h3 style={{ marginTop: 0 }}>{aba === "servico" ? "🎉 Dados do novo evento / serviço" : "🎉 Dados do evento"}</h3>
          </div>

<label style={{ fontWeight: "bold" }}>TIPO DO EVENTO:</label>
<input style={estilos.input} placeholder="Ex: aniversário de 15 anos, palestra, casamento, inauguração..." value={form.tipoEvento} onChange={(e) => setForm({ ...form, tipoEvento: e.target.value })} />

<label style={{ fontWeight: "bold", color: "#22c55e" }}>SERVIÇOS CONTRATADOS:</label>
<textarea
  style={{ ...estilos.textarea, minHeight: 90 }}
  placeholder="Ex: DJ + Som + Luz; Live YouTube; Telão + Projetor; Máquina de fumaça..."
  value={form.servicosTexto || ""}
  onChange={(e) => setForm({ ...form, servicosTexto: e.target.value })}
/>
<div style={{ ...estilos.card, borderColor: "#22c55e", background: "rgba(20,83,45,0.18)", padding: 10 }}>
  <strong>Resumo:</strong> Evento = {form.tipoEvento || "a definir"} | Serviços = {form.servicosTexto || pegarPacoteFinal(form) || "a definir"}
</div>

<label style={{ fontWeight: "bold" }}>DATA DO EVENTO:</label>
<input style={estilos.input} type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />

<label style={{ fontWeight: "bold" }}>HORA INÍCIO:</label>
<input style={estilos.input} placeholder="Ex: 14, 14h ou 14:00" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} onBlur={() => setForm((atual) => ({ ...atual, horaInicio: normalizarHorarioManual(atual.horaInicio) || atual.horaInicio }))} />

<label style={{ fontWeight: "bold" }}>HORA FIM:</label>
<input style={estilos.input} placeholder="Ex: 17, 17h ou 17:00" value={form.horaFim} onChange={(e) => setForm({ ...form, horaFim: e.target.value })} onBlur={() => setForm((atual) => ({ ...atual, horaFim: normalizarHorarioManual(atual.horaFim) || atual.horaFim }))} />

<label style={{ fontWeight: "bold" }}>ENDEREÇO:</label>
<input style={estilos.input} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />

<label style={{ fontWeight: "bold" }}>CIDADE / BAIRRO:</label>
<input
  style={estilos.input}
  placeholder="Ex: Fortaleza / João XXIII"
  value={cidadeBairroFinal(form) === "Não informado" ? "" : cidadeBairroFinal(form)}
  onChange={(e) => {
    const valor = e.target.value;
    const partes = valor.split(/[,/|-]/).map((p) => p.trim()).filter(Boolean);
    setForm({
      ...form,
      cidade: partes[0] || valor,
      bairro: partes.slice(1).join(" / ") || ""
    });
  }}
/>

        {form.data && eventosNaMesmaData.length > 0 && (
            <div style={{ background: "#3a2e00", color: "yellow", padding: 12, borderRadius: 12, marginBottom: 12, border: "1px solid orange", fontWeight: "bold" }}>
              ⚠️ Já existe(m) {eventosNaMesmaData.length} evento(s) cadastrado(s) nessa data.
              <br />
              <span style={{ color: "#fde68a", fontSize: 13 }}>Você pode conferir os eventos e voltar para este cadastro sem perder o que digitou.</span>
              <div style={{ marginTop: 8 }}>
                <button style={estilos.botaoRoxo} onClick={() => consultarEventosDaData(form.data)}>
                  Ver evento(s) nessa data
                </button>
                <button style={estilos.botao} onClick={() => setDataConsultaAgenda(form.data)}>
Usar essa data no cadastro
                </button>
              </div>
            </div>
          )}

          
          <label style={{ fontWeight: "bold" }}>PACOTE:</label><select style={estilos.input} value={form.pacote} onChange={(e) => {
            const pacoteEscolhido = e.target.value;
            const info = pacoteInfo(pacoteEscolhido);
            setForm({
              ...form,
              pacote: pacoteEscolhido,
              // O pacote mostra a sugestão, mas não apaga valor/sinal que você já digitou manualmente.
              valor: campoFoiPreenchido(form.valor) ? form.valor : (info ? String(info.valor) : ""),
              entrada: campoFoiPreenchido(form.entrada) ? form.entrada : "0",
              formaEntrada: info && !form.formaEntrada ? "Pix" : form.formaEntrada,
              formaPagamento: info && !form.formaPagamento ? "Entrada / sinal" : form.formaPagamento
            });
          }}>  <option value="">Selecione o pacote</option>
            <option value="Pacote de ENTRADA 01 - DJ + Som">Pacote de ENTRADA 01 - DJ + Som</option>
            <option value="Pacote 02 de ENTRADA - DJ + Som + Iluminação + Máquina de fumaça opcional">Pacote 02 de ENTRADA - DJ + Som + Iluminação + Máquina de fumaça opcional</option>
            <option value="Pacote 03 Completo - DJ + Som + Iluminação Top + Máquina de fumaça opcional">Pacote 03 Completo - DJ + Som + Iluminação Top + Máquina de fumaça opcional</option>
            <option value="Pacote 04 - Som + Luz + Máquina de fumaça opcional + DJ/VJ mixando vídeo na TV">Pacote 04 - Som + Luz + Máquina de fumaça opcional + DJ/VJ mixando vídeo na TV</option>
            <option value="Pacote 05 - Som + Luz + Máquina de fumaça + DJ/VJ mixando vídeo no telão">Pacote 05 - Som + Luz + Máquina de fumaça + DJ/VJ mixando vídeo no telão</option>
            <option value="Pacote Kids Festa Infantil - DJ + Som + Luz + Máquina de fumaça opcional">Pacote Kids Festa Infantil - DJ + Som + Luz + Máquina de fumaça opcional</option>
            <option value="Pacote Projeção - Telão + Projetor">Pacote Projeção - Telão + Projetor</option>
            <option value="Pacote Kids Criancinha Projeção - DJ + Som + Luz + Máquina de fumaça opcional + DJ mixando ao vivo no telão">Pacote Kids Criancinha Projeção - DJ + Som + Luz + Máquina de fumaça opcional + DJ mixando ao vivo no telão</option>
            <option value="Pacote Kids Festa Infantil Projeção - DJ + Som + Luz + Máquina de fumaça opcional + DJ mixando ao vivo no telão">Pacote Kids Festa Infantil Projeção - DJ + Som + Luz + Máquina de fumaça opcional + DJ mixando ao vivo no telão</option>
            <option value="Pacote Kids Festa Infantil Projeção - Telão + Projetor + Caixa de som ativa + Tripé + 2 microfones sem fio">Pacote Kids Festa Infantil Projeção - Telão + Projetor + Caixa de som ativa + Tripé + 2 microfones sem fio</option>
            <option value="Aluguel de equipamentos">Aluguel de equipamentos</option>
            <option value="Outro">Outro</option>
          </select>

          {form.pacote === "Outro" && (
            <input style={estilos.input} placeholder="Digite o pacote personalizado" value={form.pacotePersonalizado || ""} onChange={(e) => setForm({ ...form, pacotePersonalizado: e.target.value })} />
          )}

          {form.pacote && pacoteInfo(form.pacote) && (
            <div style={{ ...estilos.card, borderColor: "#22c55e", background: "rgba(20, 83, 45, 0.28)" }}>
              <strong>🚀 Automação profissional ativada</strong><br />
              Valor final da proposta: {moeda(campoFoiPreenchido(form.valor) ? form.valor : pacoteInfo(form.pacote).valor)} | Sinal: {moeda(campoFoiPreenchido(form.entrada) ? form.entrada : 0)}
              <br />
              <span style={{ color: "#bbf7d0" }}>Sugestão original do pacote: {moeda(pacoteInfo(form.pacote).valor)} | Sinal sugerido: {moeda(pacoteInfo(form.pacote).entrada)}</span>
              <br />
              <span style={{ color: "#bbf7d0" }}>{pacoteInfo(form.pacote).descricao}</span>
              <br />
              <button style={estilos.botaoRoxo} onClick={confirmarValorManual}>Confirmar valor manual</button>
              <button style={estilos.botao} onClick={() => aplicarValorDoPacote(form.pacote)}>Usar sugestão original do pacote</button>
              <button
                style={estilos.botao}
                onClick={() => setForm({ ...form, pacote: "", pacotePersonalizado: "" })}
              >
                Limpar / trocar pacote mantendo valor
              </button>
              <button style={estilos.botao} onClick={copiarMensagemPreco}>Copiar mensagem com preço</button>
              <button style={estilos.botao} onClick={() => abrirWhatsAppProposta(form)}>Enviar proposta no WhatsApp</button>
            </div>
          )}

          <label style={{ fontWeight: "bold", color: "#38bdf8" }}>VALOR TOTAL DO EVENTO:</label>
          <input
            ref={valorInputRef}
            style={{ ...estilos.input, borderColor: "#38bdf8" }}
            placeholder="Preço final combinado com o cliente. Ex: 700"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
          />

          <label style={{ fontWeight: "bold", color: "#facc15" }}>ENTRADA / SINAL COMBINADO:</label>
          <input
            ref={entradaInputRef}
            style={{ ...estilos.input, borderColor: "#facc15" }}
            placeholder="Só preencha se foi entrada/sinal. Se pagou tudo, pode deixar 0."
            value={form.entrada}
            onChange={(e) => setForm({ ...form, entrada: e.target.value })}
          />

          <label style={{ fontWeight: "bold" }}>CUSTO DO EVENTO (VALOR EM R$):</label>
          <input
            style={estilos.input}
            placeholder="Digite só o valor. Ex: 100"
            value={form.custo ?? ""}
            inputMode="decimal"
            onChange={(e) => atualizarCustoCadastroAoVivo(e.target.value)}
          />

          <label style={{ fontWeight: "bold" }}>DESCRIÇÃO DO CUSTO:</label>
          <input
            style={estilos.input}
            placeholder="Ex: combustível, ajudante, alimentação, aluguel de equipamento..."
            value={form.custoDescricao || ""}
            onChange={(e) => setForm((atual) => ({ ...atual, custoDescricao: String(e.target.value || "") }))}
          />

          <div style={{ ...estilos.card, borderColor: "#22c55e", background: "rgba(20, 83, 45, 0.20)" }}>
            <strong>📈 Lucro estimado:</strong> {moeda(lucroCadastroNumero)}
            <br />
            <span style={{ color: "#bbf7d0" }}>
              Atualiza na hora: Valor total {moeda(valorCadastroNumero)} - Custo {moeda(custoCadastroNumero)}{form.custoDescricao ? ` (${String(form.custoDescricao)})` : ""} = {moeda(lucroCadastroNumero)}.
            </span>
          </div>

          <div style={{ ...estilos.card, borderColor: form.pagamentoCadastroTipo && form.pagamentoCadastroTipo !== "nao" ? "#22c55e" : "#38bdf8", background: form.pagamentoCadastroTipo && form.pagamentoCadastroTipo !== "nao" ? "rgba(20,83,45,0.20)" : "rgba(14,165,233,0.10)" }}>
            <h3 style={{ marginTop: 0 }}>💳 Pagamento recebido agora?</h3>
            <p style={{ color: "#c4b5fd", marginTop: -4 }}>
              Escolha aqui se o cliente já pagou. É nessa área que você informa o banco/conta onde entrou o Pix, cartão ou dinheiro.
            </p>

            <label style={{ fontWeight: 900 }}>SITUAÇÃO DO PAGAMENTO:</label>
            <select
              style={estilos.input}
              value={form.pagamentoCadastroTipo || "nao"}
              onChange={(e) => {
                const tipo = e.target.value;
                const valorTotal = String(form.valor || "").trim();
                const entradaAtual = String(form.entrada || "").trim();
                setForm({
                  ...form,
                  pagamentoCadastroTipo: tipo,
                  pagamentoCadastroValor:
                    tipo === "total" ? valorTotal :
                    tipo === "sinal" ? (entradaAtual && entradaAtual !== "0" ? entradaAtual : "") :
                    "",
                  pagamentoCadastroForma: form.pagamentoCadastroForma || "Pix",
                  pagamentoCadastroContaId: form.pagamentoCadastroContaId || contaPorId("nubank")?.id || contasFinanceiras[0]?.id || "nubank",
                  pagamentoCadastroData: form.pagamentoCadastroData || new Date().toISOString().slice(0, 10),
                  formaPagamento: tipo === "total" ? "Valor total" : tipo === "sinal" ? "Entrada / sinal" : form.formaPagamento,
                  status: tipo === "nao" ? form.status : "confirmado"
                });
              }}
            >
              <option value="nao">Não recebeu pagamento agora</option>
              <option value="sinal">Recebeu entrada / sinal</option>
              <option value="total">Recebeu pagamento total</option>
            </select>

            {form.pagamentoCadastroTipo && form.pagamentoCadastroTipo !== "nao" && (
              <>
                <div style={estilos.miniInfo}>
                  <div>
                    <label style={{ fontWeight: 900, color: form.pagamentoCadastroTipo === "total" ? "#22c55e" : "#facc15" }}>
                      {form.pagamentoCadastroTipo === "total" ? "VALOR TOTAL RECEBIDO AGORA:" : "VALOR DO SINAL RECEBIDO AGORA:"}
                    </label>
                    <input
                      style={{ ...estilos.input, borderColor: form.pagamentoCadastroTipo === "total" ? "#22c55e" : "#facc15" }}
                      placeholder={form.pagamentoCadastroTipo === "total" ? "Ex: 700" : "Ex: 200"}
                      value={form.pagamentoCadastroValor || ""}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setForm({
                          ...form,
                          pagamentoCadastroValor: valor,
                          entrada: form.pagamentoCadastroTipo === "sinal" ? valor : form.entrada
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: 900 }}>CONTA/BANCO ONDE ENTROU:</label>
                    <select
                      style={estilos.input}
                      value={form.pagamentoCadastroContaId || contaPorId("nubank")?.id || contasFinanceiras[0]?.id || "nubank"}
                      onChange={(e) => setForm({ ...form, pagamentoCadastroContaId: e.target.value })}
                    >
                      {contasFinanceiras.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 900 }}>FORMA DO RECEBIMENTO:</label>
                    <select
                      style={estilos.input}
                      value={form.pagamentoCadastroForma || "Pix"}
                      onChange={(e) => setForm({ ...form, pagamentoCadastroForma: e.target.value })}
                    >
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão de débito">Cartão de débito</option>
                      <option value="Cartão de crédito">Cartão de crédito</option>
                      <option value="Transferência bancária">Transferência bancária</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 900 }}>DATA DO RECEBIMENTO:</label>
                    <input
                      type="date"
                      style={estilos.input}
                      value={form.pagamentoCadastroData || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setForm({ ...form, pagamentoCadastroData: e.target.value })}
                    />
                  </div>
                </div>

                {form.pagamentoCadastroForma === "Cartão de crédito" && (
                  <div style={estilos.miniInfo}>
                    <div>
                      <label style={{ fontWeight: 900 }}>PARCELAS DO CARTÃO:</label>
                      <select
                        style={estilos.input}
                        value={form.pagamentoCadastroParcelas || "1"}
                        onChange={(e) => setForm({ ...form, pagamentoCadastroParcelas: e.target.value })}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: 900 }}>TAXA DA MAQUININHA %:</label>
                      <input
                        style={estilos.input}
                        placeholder="Ex: 3.5"
                        value={form.pagamentoCadastroTaxa || ""}
                        onChange={(e) => setForm({ ...form, pagamentoCadastroTaxa: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div style={{ color: form.pagamentoCadastroTipo === "total" ? "#22c55e" : "#facc15", fontWeight: 900 }}>
                  {form.pagamentoCadastroTipo === "total"
                    ? "✅ Ao salvar, o cliente fica QUITADO e o valor entra no caixa da conta escolhida."
                    : "🟡 Ao salvar, o sinal entra no caixa e o restante continua como pendente."
                  }
                </div>
              </>
            )}
          </div>

          <label style={{ fontWeight: "bold" }}>FORMA DA ENTRADA / SINAL:</label>
          <select style={estilos.input} value={form.formaEntrada || ""} onChange={(e) => setForm({ ...form, formaEntrada: e.target.value })}>
            <option value="">Forma da entrada / sinal</option>
            <option value="Pix">Pix</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão de débito">Cartão de débito</option>
            <option value="Cartão de crédito">Cartão de crédito</option>
            <option value="Transferência bancária">Transferência bancária</option>
          </select>

          <label style={{ fontWeight: "bold" }}>FORMA DE PAGAMENTO GERAL:</label>
          <select style={estilos.input} value={form.formaPagamento || ""} onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}>
            <option value="">Selecione a forma de pagamento</option>
            <option value="Entrada / sinal">Entrada / sinal</option>
            <option value="Valor total">Valor total</option>
            <option value="Pix">Pix</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão de débito">Cartão de débito</option>
            <option value="Cartão de crédito">Cartão de crédito</option>
            <option value="Valor total à vista">Valor total à vista</option>
            <option value="Transferência bancária">Transferência bancária</option>
          </select>

          {form.formaPagamento === "Cartão de crédito" && (
            <input style={estilos.input} placeholder="Parcelas (ex: 2x, 3x...)" value={form.parcelas || ""} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} />
          )}

          <label style={{ fontWeight: "bold" }}>SITUAÇÃO DA DATA:</label>
          <select
            style={estilos.input}
            value={form.status || "pre"}
            onChange={(e) => setForm({ ...form, status: e.target.value, quitado: e.target.value === "pre" ? false : form.quitado })}
          >
            <option value="pre">Pré-reserva / proposta / aguardando sinal</option>
            <option value="confirmado">Reserva confirmada com sinal ou pagamento</option>
          </select>
          <div style={{ ...estilos.card, borderColor: form.status === "pre" ? "orange" : "#22c55e", background: form.status === "pre" ? "rgba(58, 46, 0, 0.35)" : "rgba(20, 83, 45, 0.28)" }}>
            {form.status === "pre"
              ? "🟡 Pré-reserva: use Proposta PDF. Se não houver sinal, a data NÃO está garantida."
              : "🟢 Reserva confirmada: cliente fechado. Use o Contrato PDF como documento oficial."}
          </div>

          <label style={{ fontWeight: "bold" }}>OBSERVAÇÕES:</label>
          <textarea
            style={estilos.textarea}
            value={form.obsInternas ?? ""}
            onChange={(e) => setForm({ ...form, obsInternas: e.target.value })}
            placeholder="Observações internas do cadastro. Esse campo não copia mais automaticamente para Observações Extras."
          />

          <label style={{ fontWeight: 900, display: "block", marginBottom: 6 }}>OBSERVAÇÕES EXTRAS:</label>
          <textarea
            style={{ ...estilos.textarea, minHeight: 120, lineHeight: 1.5 }}
            value={form.obsExtras || ""}
            onChange={(e) => setForm({ ...form, obsExtras: e.target.value })}
            placeholder="Digite aqui observações para aparecer na proposta, contrato e recibo. Esse campo é separado das observações de cima."
          />

<button style={estilos.botaoRoxo} onClick={salvar}>{editandoId ? "Salvar edição do evento/serviço" : "Salvar novo evento/serviço"}</button>
          <button style={estilos.botao} onClick={() => abrirWhatsAppProposta(form)}>Enviar proposta no WhatsApp</button>
          <button style={estilos.botaoRoxo} onClick={() => gerarProposta({ ...form, id: editandoId || Date.now(), dataCadastro: form.dataCadastro || new Date().toLocaleString("pt-BR") })}>Proposta PDF agora</button>
          <button style={estilos.botao} onClick={() => gerarContrato({ ...form, id: editandoId || Date.now(), dataCadastro: form.dataCadastro || new Date().toLocaleString("pt-BR"), status: "confirmado" })}>Contrato PDF agora</button>
          <button style={estilos.botaoRoxo} onClick={() => fecharComCliente({ ...form, id: editandoId || Date.now(), dataCadastro: form.dataCadastro || new Date().toLocaleString("pt-BR") })}>Fechar com cliente</button>
          {editandoId && <button style={estilos.botao} onClick={limpar}>Cancelar edição</button>}
          </>)}
        </>
      )}

      {aba === "eventos" && (
        <>
          <h2>Eventos / Serviços</h2>
          {busca.trim() && clientesBuscaGlobalJP.length > 0 && (
            <div style={{ ...estilos.card, borderColor: "#38bdf8", background: "rgba(14,165,233,0.12)" }}>
              <h3 style={{ marginTop: 0 }}>🔎 Resultado geral da busca</h3>
              <p style={{ color: "#c4b5fd" }}>Encontrei cliente(s) também. Use os atalhos abaixo para não ficar procurando.</p>
              {clientesBuscaGlobalJP.map((cliente) => (
                <div key={cliente.chave} style={{ ...estilos.cardInterno, marginBottom: 8 }}>
                  <strong>👤 {cliente.nome}</strong><br />
                  <span>WhatsApp: {cliente.whatsapp || "Não informado"} | Documento: {cliente.cpf || "Não informado"} | Eventos/serviços: {cliente.eventos.length}</span>
                  <div style={estilos.grupoAcoes}>
                    <button style={estilos.botaoRoxo} onClick={() => abrirClienteDaBuscaJP(cliente)}>Abrir cliente</button>
                    <button style={estilos.botao} onClick={() => novoEventoServicoParaCliente(cliente, "eventos")}>+ Criar evento/serviço</button>
                    <button style={estilos.botao} onClick={() => { setBusca(cliente.nome); setFiltroStatus("todos"); setEventoExpandidoId(null); setModoEventosExpandido(false); setTituloListaAberta(`Eventos/serviços de ${cliente.nome}`); }}>Ver eventos deste cliente</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ ...estilos.card, borderColor: "#22c55e", background: "rgba(20,83,45,0.12)" }}>
            <h3 style={{ marginTop: 0 }}>➕ Criar novo evento/serviço</h3>
            <p style={{ color: "#c4b5fd" }}>Para criar um evento novo, escolha primeiro o cliente. Assim o cadastro do cliente não precisa ser repetido.</p>
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 900, color: "#22c55e" }}>Escolher cliente para novo evento/serviço</summary>
              <div style={{ marginTop: 10 }}>
                {clientesAgrupadosJP.length === 0 && <p>Nenhum cliente cadastrado ainda. Vá em Cadastro para criar o primeiro cliente.</p>}
                {clientesAgrupadosJP.map((cliente) => (
                  <button
                    key={cliente.chave}
                    style={{ ...estilos.botao, display: "block", width: "100%", textAlign: "left", marginBottom: 6 }}
                    onClick={() => novoEventoServicoParaCliente(cliente, "eventos")}
                  >
                    👤 {cliente.nome} | WhatsApp: {cliente.whatsapp || "não informado"} | Eventos/serviços: {cliente.eventos.length}
                  </button>
                ))}
              </div>
            </details>
          </div>
          {voltarCadastroPendente && (
            <div style={{ ...estilos.card, borderColor: "#38bdf8", background: "linear-gradient(135deg, rgba(14,165,233,0.22), rgba(15,23,42,0.96))" }}>
              <strong>🔎 Você está conferindo os eventos da data pesquisada.</strong>
              <p style={{ margin: "6px 0", color: "#c4b5fd" }}>Seu cadastro em andamento continua salvo. Use o botão abaixo para voltar direto para ele.</p>
              <button style={estilos.botaoRoxo} onClick={voltarParaCadastroEmAndamento}>
                ← Voltar ao cadastro em andamento
              </button>
              <button
                style={estilos.botao}
                onClick={() => {
                  setBusca("");
                  setVoltarCadastroPendente(false);
                }}
              >
                Limpar filtro e ver todos
              </button>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            {[
              ["todos", "Todos"],
              ["pre", "Pré-reservas"],
              ["pago", "Pagos"],
              ["pendente", "Pendentes"],
              ["executado", "Executados"],
              ["naoExecutado", "Não executados"]
            ].map(([id, nome]) => (
              <button key={id} style={filtroStatus === id ? estilos.botaoRoxo : estilos.botao} onClick={() => setFiltroStatus(id)}>
                {nome}
              </button>
            ))}
          </div>

          <p>{listaFiltrada.length} cadastro(s) encontrado(s).</p>

          {renderListaEventosCompacta(tituloListaAberta || "Eventos encontrados", listaFiltrada, { mostrarVoltarCadastro: voltarCadastroPendente })}
        </>
      )}

      {aba === "clientes" && (
        <>
          <h2>Clientes</h2>
          <p style={{ color: "#c4b5fd" }}>Aqui os clientes aparecem agrupados. Cada cliente pode ter vários eventos/serviços.</p>
          {clientesSemEventoJP.length > 0 && (
            <div style={{ ...estilos.card, borderColor: "#facc15", background: "rgba(250,204,21,0.10)" }}>
              <h3 style={{ marginTop: 0 }}>🆕 Clientes salvos sem evento/serviço ainda</h3>
              <p style={{ color: "#c4b5fd" }}>Esses clientes foram cadastrados, mas ainda falta criar o evento/serviço deles.</p>
              {clientesSemEventoJP.map((cliente) => (
                <div key={cliente.chave} style={{ ...estilos.cardInterno, marginBottom: 8 }}>
                  <strong>{cliente.nome}</strong> — WhatsApp: {cliente.whatsapp || "Não informado"}
                  <div style={estilos.grupoAcoes}>
                    <button style={estilos.botaoRoxo} onClick={() => abrirClienteDaBuscaJP(cliente)}>Abrir cliente</button>
                    <button style={estilos.botao} onClick={() => novoEventoServicoParaCliente(cliente, "clientes")}>+ Criar evento/serviço agora</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {clientesAgrupadosJP.length === 0 && <p>Nenhum cliente salvo ainda.</p>}
          {clientesAgrupadosJP.map((cliente) => (
            <div id={`cliente-${cliente.chave}`} key={cliente.chave} style={{ ...estilos.card, borderColor: cliente.pendente > 0 ? "#f59e0b" : "#22c55e" }}>
              <button style={{ ...estilos.botao, textAlign: "left", fontWeight: 900, fontSize: 18 }} onClick={() => setClienteAbertoChave((atual) => atual === cliente.chave ? null : cliente.chave)}>
                {clienteAbertoChave === cliente.chave ? "▼" : "▶"} 👤 {cliente.nome} - {cliente.eventos.length} serviço(s)/evento(s)
              </button>
              {clienteAbertoChave === cliente.chave && <>
              <div style={{ ...estilos.miniInfo, marginTop: 10 }}>
                <div style={estilos.linhaInfo}><strong>WhatsApp</strong><br />{cliente.whatsapp || "Não informado"}</div>
                <div style={estilos.linhaInfo}><strong>Documento</strong><br />{cliente.cpf || "Não informado"}</div>
                <div style={{ ...estilos.linhaInfo, color: "#38bdf8" }}><strong>Total contratado</strong><br />{moeda(cliente.total)}</div>
                <div style={{ ...estilos.linhaInfo, color: cliente.pendente > 0 ? "#ef4444" : "#22c55e" }}><strong>Pendente</strong><br />{moeda(cliente.pendente)}</div>
              </div>
              <div style={estilos.grupoAcoes}>
                <button style={estilos.botaoRoxo} onClick={() => navegarParaAba("eventos", { busca: cliente.nome, filtroStatus: "todos", eventoExpandidoId: null, modoEventosExpandido: false, tituloListaAberta: `Eventos/serviços de ${cliente.nome}` })}>Abrir eventos/serviços deste cliente</button>
                <button style={estilos.botao} onClick={() => novoEventoServicoParaCliente(cliente, "clientes")}>+ Novo evento / serviço para este cliente</button>
                <button style={{ ...estilos.botaoPequeno, background: "#991b1b", color: "white" }} onClick={() => excluirClienteCompleto(cliente)}>🗑️ Excluir cliente completo</button>
              </div>
              {cliente.eventos.length === 0 && <p style={{ color: "#c4b5fd" }}>Cliente cadastrado sem evento ainda. Clique em + Novo evento / serviço para começar.</p>}
              {cliente.eventos.map((ev) => (
                <button key={ev.id} style={{ ...estilos.botao, display: "block", width: "100%", textAlign: "left" }} onClick={() => abrirEventoRapido(ev)}>
                  {dataBR(ev.data)} - {ev.tipoEvento || "Evento"}{ev.servicosTexto ? ` | ${ev.servicosTexto}` : ""} - {moeda(ev.valor)} - {eventoQuitadoJP(ev) ? "Quitado" : `Pendente ${moeda(saldoPendenteEventoJP(ev))}`}
                </button>
              ))}
              </>}
            </div>
          ))}
        </>
      )}

      {aba === "agenda" && (
        <>
          <h2>Agenda</h2>
          {renderPainelEventosControle()}
          {renderContadorEventosRealizar(eventosARealizar, "📊 Controle de eventos a realizar")}

          {proximoEvento && (
            <div style={{ ...estilos.card, background: "#2a1550", border: "2px solid #6c2bd9" }}>
              <h3>🔥 Próximo evento</h3>
              <strong>{proximoEvento.nome}</strong>
              <br />
              Serviço: {proximoEvento.tipoEvento}
              <br />
              Data: {dataBR(proximoEvento.data)}
              <br />
              Horário: {normalizarHorarioManual(proximoEvento.horaInicio) || proximoEvento.horaInicio || "Não informado"} às {normalizarHorarioManual(proximoEvento.horaFim) || proximoEvento.horaFim || "Não informado"}
              <br />
              Duração: {calcularDuracao(proximoEvento.horaInicio, proximoEvento.horaFim)}
              <br />
              Cidade / bairro: {cidadeBairroFinal(proximoEvento)}
              <br />
              Valor: {moeda(Number(proximoEvento.valor || 0))}
              <br />
              <span style={{ color: corStatus(proximoEvento), fontWeight: "bold" }}>Status: {textoStatus(proximoEvento)}</span>
              <br />
              <button style={estilos.botao} onClick={() => abrirWhatsApp(proximoEvento)}>WhatsApp</button>
              <button style={estilos.botao} onClick={() => abrirWhatsAppConfirmarEvento(proximoEvento)}>Confirmar pelo WhatsApp</button>
              <button style={estilos.botao} onClick={() => abrirGoogleAgenda(proximoEvento)}>📅 Google Agenda</button>
              <button
                style={estilos.botao}
                onClick={() => {
                  setBusca(proximoEvento.nome);
                  setEventoExpandidoId(proximoEvento.id);
                  setTituloListaAberta("Próximo evento");
                  setAba("eventos");
                }}
              >
                Abrir evento
              </button>
            </div>
          )}

          <div key={`calendario-${anoCalendario}-${mesCalendario}`} style={estilos.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <button style={estilos.botao} onClick={() => mudarMes(-1)}>◀</button>
              <h3 style={{ textTransform: "capitalize", textAlign: "center" }}>📅 {nomeMes}</h3>
              <button style={estilos.botao} onClick={() => mudarMes(1)}>▶</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(7, minmax(42px, 1fr))" : "repeat(7, 1fr)", gap: isMobile ? 4 : 6, textAlign: "center", overflowX: "auto", marginBottom: 8 }}>
              {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((d) => (
                <strong key={d} style={{ color: "#c4b5fd" }}>{d}</strong>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(7, minmax(54px, 1fr))" : "repeat(7, 1fr)", gap: isMobile ? 5 : 6, overflowX: "auto" }}>
              {diasCalendario.map((dia, index) => {
                const eventosDoDiaCalendario = dia ? eventosDoMes.filter((e) => Number(String(e.data || "").split("-")[2]) === dia) : [];
                const qtd = eventosDoDiaCalendario.length;
                const visualDia = resumoVisualDiaAgenda(eventosDoDiaCalendario);
                const temParcialComPendencia = eventosDoDiaCalendario.some((ev) => {
                  const ind = indicadorFinanceiroEvento(ev);
                  return Boolean(ind.corExtra);
                });
                return (
                  <button
                    key={`${dia}-${index}`}
                    disabled={!dia}
                    onClick={() => { setDiaSelecionado(dia); setMostrarProximosComDiaSelecionado(false); }}
                    title={qtd > 0 ? `${qtd} evento(s) neste dia` : "Sem evento"}
                    style={{
                      minHeight: isMobile ? 58 : 68,
                      borderRadius: 10,
                      border: diaSelecionado === dia ? "2px solid white" : qtd > 0 ? `1px solid ${visualDia.principal.cor}` : "1px solid #374151",
                      background: qtd > 0 ? "linear-gradient(135deg, #4c1d95, #6d28d9)" : "#111827",
                      color: dia ? "white" : "transparent",
                      cursor: dia ? "pointer" : "default",
                      position: "relative",
                      overflow: "hidden",
                      padding: isMobile ? "7px 4px" : "8px 6px"
                    }}
                  >
                    {qtd > 0 && (
                      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 5, display: "flex" }}>
                        {visualDia.indicadores.slice(0, 4).map((ind, i) => (
                          <span key={i} style={{ flex: 1, background: ind.cor }} />
                        ))}
                      </div>
                    )}
                    {temParcialComPendencia && (
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, display: "flex" }}>
                        <span style={{ flex: 1, background: "#facc15" }} />
                        <span style={{ flex: 1, background: "#ef4444" }} />
                      </div>
                    )}
                    <strong style={{ fontSize: isMobile ? 15 : 17 }}>{dia || "."}</strong>
                    {qtd > 0 && (
                      <>
                        <div style={{ fontSize: isMobile ? 10 : 12, marginTop: 3 }}>{qtd} evento(s)</div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                          {visualDia.indicadores.slice(0, 6).map((ind, i) => (
                            <span key={i} title={ind.texto} style={{ width: isMobile ? 7 : 9, height: isMobile ? 7 : 9, borderRadius: 999, background: ind.cor, border: "1px solid rgba(255,255,255,0.65)", display: "inline-block" }} />
                          ))}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, color: "#c4b5fd", fontSize: isMobile ? 11 : 12 }}>
              <span><b style={{ color: "#8b5cf6" }}>●</b> Agendado</span>
              <span><b style={{ color: "#38bdf8" }}>●</b> Pago/quitado</span>
              <span><b style={{ color: "#facc15" }}>●</b> Sinal/parcial</span>
              <span><b style={{ color: "#ef4444" }}>●</b> Pendente</span>
              <span><b style={{ color: "#22c55e" }}>●</b> Executado</span>
            </div>
          </div>

          {diaSelecionado && (
            <>
              <div style={estilos.card}>
                <h3>Eventos do dia {String(diaSelecionado).padStart(2, "0")}</h3>
                <p style={{ color: "#c4b5fd", marginTop: 0 }}>Você está vendo apenas os eventos desta data. Use o botão abaixo se quiser também ver os próximos eventos gerais.</p>
                {renderListaEventosCompacta(`Eventos do dia ${String(diaSelecionado).padStart(2, "0")}`, eventosDoDiaSelecionado)}
                <button
                  type="button"
                  onClick={() => setMostrarProximosComDiaSelecionado((v) => !v)}
                  style={{ ...estilos.btnGrad, marginTop: 12 }}
                >
                  {mostrarProximosComDiaSelecionado ? "Ocultar próximos eventos" : "Ver próximos eventos"}
                </button>
              </div>
              {mostrarProximosComDiaSelecionado && (
                <div style={estilos.card}>
                  <h3>Próximos eventos gerais</h3>
                  <p style={{ color: "#c4b5fd", marginTop: 0 }}>Lista geral dos próximos eventos, independente do dia selecionado.</p>
                  {renderListaEventosCompacta("Próximos eventos gerais", eventosFuturos)}
                </div>
              )}
            </>
          )}

          {!diaSelecionado && (
            <>
              <h3>Próximos eventos</h3>
              {renderListaEventosCompacta("Próximos eventos", eventosFuturos)}
            </>
          )}
        </>
      )}

      {aba === "dashboard" && (
        <>
          <h2>Painel geral</h2>
          {renderPainelEventosControle()}
          <h2>Dashboard financeiro</h2>
          <GraficoFinanceiroV22 />
          <div style={estilos.gridResumo}>
            <div onClick={() => abrirDetalheFinanceiro("eventos_total", "Todos os eventos cadastrados")} title="Clique para ver todos" style={estiloCardClicavel(estilos.cardResumo)}><strong>📅 Eventos cadastrados</strong><h2>{eventos.length}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("propostas", "Propostas / pré-reservas")} title="Clique para ver propostas" style={estiloCardClicavel(estilos.cardResumo)}><strong>📨 Propostas / pré-reservas</strong><h2>{totalPropostas}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("fechados", "Eventos fechados")} title="Clique para ver fechados" style={estiloCardClicavel(estilos.cardResumo)}><strong>✅ Fechados</strong><h2>{totalFechados}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("conversao", "Eventos da conversão")} title="Clique para ver conversão" style={estiloCardClicavel(estilos.cardResumo)}><strong>📈 Conversão</strong><h2>{taxaConversao}%</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("proximos", "Próximos eventos")} title="Clique para ver próximos" style={estiloCardClicavel(estilos.cardResumo)}><strong>🔥 Próximos</strong><h2>{eventosFuturos.length}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("mes", "Eventos do mês atual")} title="Clique para ver mês atual" style={estiloCardClicavel(estilos.cardResumo)}><strong>💰 Mês atual</strong><h2>{moeda(saldoMes)}</h2></div>
          </div>

          <div style={estilos.card}>
            <h3>🧭 Funil de vendas</h3>
            <p>Propostas/pré-reservas: <strong>{totalPropostas}</strong></p>
            <p>Eventos fechados: <strong>{totalFechados}</strong></p>
            <p>Taxa de conversão: <strong>{taxaConversao}%</strong></p>
            <div style={{ width: "100%", background: "#222", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ width: `${taxaConversao}%`, background: "#6c2bd9", padding: 8, fontWeight: "bold" }}>
                {taxaConversao}%
              </div>
            </div>
          </div>

          <div style={estilos.card}>
            <h3>🏆 Ranking de clientes</h3>
            {rankingClientes.length === 0 && <p>Nenhum cliente no ranking ainda.</p>}
            {rankingClientes.slice(0, 8).map((cliente, index) => (
              <button
                key={`${cliente.nome}-${index}`}
                style={{ ...estilos.botao, display: "block", width: "100%", textAlign: "left" }}
                onClick={() => navegarParaAba("eventos", { busca: cliente.nome })}
              >
                #{index + 1} {cliente.nome} - {cliente.qtd} evento(s) - {cliente.fechados} fechado(s) - {moeda(cliente.total)}
              </button>
            ))}
          </div>

          <div style={{ ...estilos.card, borderColor: clientesSumidos.length > 0 ? "#f59e0b" : "#6c2bd9" }}>
            <h3>🧠 Notificações inteligentes</h3>
            {clientesSumidos.length === 0 && preReservasProximas.length === 0 && <p>Nenhum alerta crítico agora.</p>}
            {clientesSumidos.length > 0 && (
              <>
                <strong>Clientes sumidos há 2 dias ou mais:</strong>
                {clientesSumidos.slice(0, 8).map((e) => (
                  <button key={e.id} style={{ ...estilos.botao, display: "block", width: "100%", textAlign: "left" }} onClick={() => abrirEventoRapido(e)}>
                    {e.nome} - {diasDesdeCadastro(e)} dia(s) sem fechamento - {dataCurtaBR(e.data)}
                  </button>
                ))}
              </>
            )}
            {preReservasProximas.length > 0 && (
              <>
                <strong>Pré-reservas vencendo em até 3 dias:</strong>
                {preReservasProximas.map((e) => (
                  <button key={e.id} style={{ ...estilos.botao, display: "block", width: "100%", textAlign: "left" }} onClick={() => abrirEventoRapido(e)}>
                    {dataCurtaBR(e.data)} - {e.nome} - {textoStatus(e)}
                  </button>
                ))}
              </>
            )}
          </div>

          <div style={estilos.card}>
            <h3>🕘 Histórico automático recente</h3>
            {historicoRecente.length === 0 && <p>Nenhum histórico registrado ainda. As próximas ações já serão salvas automaticamente.</p>}
            {historicoRecente.slice(0, 12).map((h) => (
              <div key={h.id} style={{ borderBottom: "1px solid #374151", padding: "8px 0" }}>
                <strong>{h.cliente}</strong> - {h.acao}
                <br />
                <span style={{ color: "#c4b5fd" }}>{h.data}{h.detalhe ? ` - ${h.detalhe}` : ""}</span>
              </div>
            ))}
          </div>

          <div style={estilos.card}>
            <h3>🔔 Eventos nos próximos 7 dias</h3>
            {lembretes.length === 0 && <p>Nenhum evento nos próximos 7 dias.</p>}
            {lembretes.map((e) => (
              <div key={e.id} style={{ borderBottom: "1px solid #374151", padding: "8px 0", cursor: "pointer" }} onClick={() => abrirEventoRapido(e)}>
                <strong>{e.nome}</strong> - {dataBR(e.data)} - {e.horaInicio || "Horário não informado"} - <span style={{ color: corStatus(e) }}>{textoStatus(e)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {aba === "config" && (
        <>
          <h2>Configurações</h2>

          <div style={estilos.card}>
            <h3>💾 Backup dos dados</h3>
            <p>Use essa área para salvar uma cópia dos seus eventos e restaurar depois, caso troque de navegador, computador ou celular.</p>
            <button style={estilos.botaoRoxo} onClick={exportarBackup}>Baixar backup agora</button>
            <button style={estilos.botao} onClick={() => inputBackupRef.current?.click()}>Importar backup</button>
          </div>

          <div style={estilos.card}>
            <h3>🤖 Atendimento inteligente sem pagar API</h3>
            <p>Esta versão não usa robô pago, API externa nem mensalidade. Ela monta mensagens profissionais por modelos internos e você sempre revisa antes de enviar.</p>
            <label style={{ fontWeight: "bold" }}>Tom padrão das mensagens:</label>
            <select style={estilos.input} value={tomWhatsApp} onChange={(e) => setTomWhatsApp(e.target.value)}>
              <option value="profissional">Profissional completo</option>
              <option value="curto">Curto e direto</option>
            </select>
            <p style={{ color: "#bbf7d0" }}>Controle total: editar, apagar, copiar ou enviar só quando quiser.</p>
          </div>

          <div style={estilos.card}>
            <h3>📱 Modo celular / instalação</h3>
            <p>O sistema ajusta botões, cards e campos automaticamente para celular.</p>
            <p><strong>Tamanho detectado:</strong> {larguraTela}px</p>
            <p><strong>Dica:</strong> depois de instalar, abra pelo ícone na tela inicial para ficar com aparência de aplicativo.</p>
            <button style={appInstalavel ? estilos.botaoRoxo : estilos.botao} onClick={instalarAppNoCelular}>Instalar app / adicionar à tela inicial</button>
            <p style={{ color: "#c4b5fd" }}>No celular: abra o link, toque nos 3 pontinhos do navegador e escolha “Adicionar à tela inicial”.</p>
          </div>

          <div style={{ ...estilos.card, borderColor: "#991b1b" }}>
            <h3>⚠️ Área de risco</h3>
            <p>Apague todos os eventos somente se já tiver feito backup.</p>
            <button style={{ ...estilos.botao, background: "#991b1b" }} onClick={apagarTudo}>Apagar todos os eventos</button>
          </div>
        </>
      )}

      {aba === "financeiro" && (
        <>
          <h2>Caixa Financeiro Premium v25.4</h2>

          {navegacaoAnterior && (
            <div style={{
              ...estilos.card,
              borderColor: "#22c55e",
              background: "linear-gradient(135deg, rgba(20,83,45,0.34), rgba(15,23,42,0.92))",
              position: "relative"
            }}>
              <strong style={{ color: "#bbf7d0" }}>🧭 Navegação rápida</strong>
              <p style={{ color: "#c4b5fd", marginTop: 6 }}>Você veio do cliente <strong>{navegacaoAnterior.clienteNome}</strong>. Use os botões abaixo para voltar sem procurar tudo de novo.</p>
              <div style={estilos.grupoAcoes}>
                <button style={estilos.botaoRoxo} onClick={voltarParaTelaAnterior}>{navegacaoAnterior.titulo || "← Voltar"}</button>
                <button style={estilos.botaoPequeno} onClick={abrirClientePeloFinanceiro}>Abrir ficha do cliente</button>
                <button style={estilos.botaoPequeno} onClick={() => { setClienteFinanceiroFiltro(navegacaoAnterior.clienteNome || ""); setDiaFinanceiroSelecionado(null); }}>Ver só financeiro deste cliente</button>
                <button style={estilos.botaoPequeno} onClick={() => { setClienteFinanceiroFiltro(""); setDiaFinanceiroSelecionado(null); }}>Ver caixa geral</button>
              </div>
            </div>
          )}

          <GraficoFinanceiroV22 />

          <div style={{ ...estilos.card, borderColor: "#38bdf8" }}>
            <h3>🏦 Fluxo de caixa completo</h3>
            <p style={{ color: "#c4b5fd" }}>Agora você controla entradas, saídas, transferências, saldo por conta e lucro líquido real.</p>
            <div style={estilos.gridResumo}>
              <div onClick={() => abrirDetalheFinanceiro("entradasCaixa", "Entradas lançadas no caixa")} title="Clique para ver entradas" style={estiloCardClicavel({ ...estilos.cardResumo, borderColor: "#22c55e", color: "#22c55e" })}><strong>🟢 Entradas lançadas</strong><h2>{moeda(totalEntradasCaixa)}</h2></div>
              <div onClick={() => abrirDetalheFinanceiro("saidasCaixa", "Saídas lançadas no caixa")} title="Clique para ver saídas" style={estiloCardClicavel({ ...estilos.cardResumo, borderColor: "#ef4444", color: "#ef4444" })}><strong>🔴 Saídas lançadas</strong><h2>{moeda(totalSaidasCaixa)}</h2></div>
              <div onClick={() => abrirDetalheFinanceiro("lucroCaixa", "Lucro líquido do caixa")} title="Clique para ver entradas e saídas" style={estiloCardClicavel({ ...estilos.cardResumo, borderColor: lucroLiquidoCaixa >= 0 ? "#38bdf8" : "#ef4444", color: lucroLiquidoCaixa >= 0 ? "#38bdf8" : "#ef4444" })}><strong>🔵 Lucro líquido</strong><h2>{moeda(lucroLiquidoCaixa)}</h2></div>
              <div onClick={() => abrirDetalheFinanceiro("lucroMesCaixa", "Lucro do mês no caixa")} title="Clique para ver o mês" style={estiloCardClicavel({ ...estilos.cardResumo, borderColor: "#a78bfa" })}><strong>📆 Lucro do mês</strong><h2>{moeda(lucroMesCaixa)}</h2></div>
            </div>
          </div>

          <div style={{ ...estilos.card, borderColor: "#38bdf8" }}>
            <h3>🔎 Filtro rápido do financeiro</h3>
            <p style={{ color: "#c4b5fd" }}>Digite um cliente para ver só os pagamentos, despesas e parcelas dele. Os botões dentro do cliente já preenchem isso automaticamente.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                style={{ ...estilos.input, flex: 1, minWidth: 220, marginBottom: 0 }}
                placeholder="Filtrar por cliente, descrição ou categoria"
                value={clienteFinanceiroFiltro}
                onChange={(e) => setClienteFinanceiroFiltro(e.target.value)}
              />
              <button style={estilos.botao} onClick={() => { setClienteFinanceiroFiltro(""); setDiaFinanceiroSelecionado(null); }}>Limpar filtro</button>
            </div>
          </div>

          <div style={{ ...estilos.card, borderColor: "#a78bfa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button style={estilos.botao} onClick={() => mudarMes(-1)}>◀</button>
              <h3 style={{ textTransform: "capitalize", textAlign: "center", margin: 0 }}>📆 Calendário financeiro - {nomeMes}</h3>
              <button style={estilos.botao} onClick={() => mudarMes(1)}>▶</button>
            </div>
            <p style={{ color: "#c4b5fd" }}>Entradas, saídas, parcelas futuras do cartão e lucro do mês. Clique em um dia para ver os lançamentos.</p>
            <div style={estilos.gridResumo}>
              <div onClick={() => abrirDetalheFinanceiro("entradasFinanceiroMes", "Entradas do calendário financeiro")} title="Clique para ver entradas do mês" style={estiloCardClicavel({ ...estilos.cardResumo, borderColor: "#22c55e", color: "#22c55e" })}><strong>Entradas do mês</strong><h2>{moeda(entradasFinanceiroMes)}</h2></div>
              <div onClick={() => abrirDetalheFinanceiro("saidasFinanceiroMes", "Saídas do calendário financeiro")} title="Clique para ver saídas do mês" style={estiloCardClicavel({ ...estilos.cardResumo, borderColor: "#ef4444", color: "#ef4444" })}><strong>Saídas do mês</strong><h2>{moeda(saidasFinanceiroMes)}</h2></div>
              <div onClick={() => abrirDetalheFinanceiro("resultadoFinanceiroMes", "Resultado do calendário financeiro")} title="Clique para ver resultado do mês" style={estiloCardClicavel({ ...estilos.cardResumo, borderColor: lucroFinanceiroMes >= 0 ? "#38bdf8" : "#ef4444", color: lucroFinanceiroMes >= 0 ? "#38bdf8" : "#ef4444" })}><strong>Resultado do mês</strong><h2>{moeda(lucroFinanceiroMes)}</h2></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(7, minmax(42px, 1fr))" : "repeat(7, 1fr)", gap: isMobile ? 4 : 6, textAlign: "center", overflowX: "auto", marginBottom: 8 }}>
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <strong key={d} style={{ color: "#c4b5fd" }}>{d}</strong>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(7, minmax(42px, 1fr))" : "repeat(7, 1fr)", gap: isMobile ? 4 : 6, overflowX: "auto" }}>
              {diasCalendario.map((dia, index) => {
                const resumoDia = dia ? resumoDiaFinanceiro(dia) : { qtd: 0, entradas: 0, saidas: 0, saldo: 0 };
                return (
                  <button
                    key={`financeiro-${dia}-${index}`}
                    disabled={!dia}
                    onClick={() => { setDiaFinanceiroSelecionado(dia); setPainelFinanceiroDetalhe(null); }}
                    style={{
                      minHeight: 76,
                      borderRadius: 10,
                      border: diaFinanceiroSelecionado === dia ? "2px solid white" : "1px solid #374151",
                      background: resumoDia.qtd > 0 ? "rgba(124,58,237,0.55)" : "#111827",
                      color: dia ? "white" : "transparent",
                      cursor: dia ? "pointer" : "default",
                      padding: 6,
                      textAlign: "left"
                    }}
                  >
                    <strong>{dia || "."}</strong>
                    {resumoDia.qtd > 0 && (
                      <div style={{ fontSize: 11, marginTop: 4 }}>
                        <div style={{ color: "#22c55e" }}>+ {moeda(resumoDia.entradas)}</div>
                        <div style={{ color: "#ef4444" }}>- {moeda(resumoDia.saidas)}</div>
                        <div style={{ color: resumoDia.saldo >= 0 ? "#38bdf8" : "#ef4444", fontWeight: 900 }}>{moeda(resumoDia.saldo)}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {diaFinanceiroSelecionado && (
              <div style={{ ...estilos.cardClaro, marginTop: 12 }}>
                <h4>Lançamentos do dia {String(diaFinanceiroSelecionado).padStart(2, "0")}</h4>
                {movimentosDoDiaFinanceiro.length === 0 && <p>Nenhum lançamento neste dia.</p>}
                {movimentosDoDiaFinanceiro.map((m) => (
                  <div key={m.id} style={{ borderBottom: "1px solid #374151", padding: "8px 0" }}>
                    <strong style={{ color: m.tipo === "entrada" ? "#22c55e" : m.tipo === "saida" ? "#ef4444" : "#38bdf8" }}>{m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "-" : "⇄"} {moeda(m.valor)}</strong>
                    <br />
                    {m.descricao} {m.cliente ? `- ${m.cliente}` : ""}
                    <br />
                    <span style={{ color: "#c4b5fd" }}>{m.tipo === "transferencia" ? `${contaPorId(m.contaId).nome} → ${contaPorId(m.contaDestinoId).nome}` : contaPorId(m.contaId).nome} | {m.categoria} | {m.formaPagamento}{m.parcelaNumero ? ` | Parcela ${m.parcelaNumero}/${m.parcelas}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {renderDetalheFinanceiro()}

          <div style={{ ...estilos.card, borderColor: "#22c55e" }}>
            <h3>💳 Contas / bancos</h3>
            <div style={estilos.miniInfo}>
              {contasFinanceiras.map((conta) => (
                <div key={conta.id} style={{ ...estilos.linhaInfo, borderColor: saldoDaConta(conta.id) >= 0 ? "#22c55e" : "#ef4444" }}>
                  {contaFinanceiraEditando?.id === conta.id ? (
                    <>
                      <input
                        style={{ ...estilos.input, marginBottom: 8 }}
                        value={contaFinanceiraEditando.nome}
                        onChange={(e) => setContaFinanceiraEditando({ ...contaFinanceiraEditando, nome: e.target.value })}
                        placeholder="Nome da conta"
                      />
                      <button style={estilos.botaoRoxo} onClick={() => renomearContaFinanceira(conta.id, contaFinanceiraEditando.nome)}>Salvar nome</button>
                      <button style={estilos.botaoPequeno} onClick={() => setContaFinanceiraEditando(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <strong>{conta.nome}</strong><br />
                      <span style={{ color: saldoDaConta(conta.id) >= 0 ? "#22c55e" : "#ef4444", fontWeight: 900 }}>{moeda(saldoDaConta(conta.id))}</span>
                      <br />
                      <button style={estilos.botaoPequeno} onClick={() => setContaFinanceiraEditando({ id: conta.id, nome: conta.nome })}>Editar nome</button>
                      <button style={estilos.botaoPequeno} onClick={() => removerContaFinanceira(conta.id)}>Remover</button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <input style={{ ...estilos.input, flex: 1, minWidth: 220, marginBottom: 0 }} placeholder="Nova conta/banco. Ex: Mercado Pago, Santander, Bradesco" value={novaContaFinanceira} onChange={(e) => setNovaContaFinanceira(e.target.value)} />
              <button style={estilos.botaoRoxo} onClick={adicionarContaFinanceira}>Adicionar conta</button>
              <button style={estilos.botao} onClick={aplicarContasPadraoJP}>Usar padrão JP Eventos: Nubank, Caixa e Carteira</button>
            </div>
          </div>

          <div style={{ ...estilos.card, borderColor: "#facc15" }}>
            <h3>🧾 Novo lançamento de caixa</h3>
            <div style={estilos.miniInfo}>
              <select style={estilos.input} value={novoMovimento.tipo} onChange={(e) => setNovoMovimento({ ...novoMovimento, tipo: e.target.value })}>
                <option value="entrada">Entrada / recebimento</option>
                <option value="saida">Saída / despesa</option>
                <option value="transferencia">Transferência entre contas</option>
              </select>
              <input style={estilos.input} type="date" value={novoMovimento.data} onChange={(e) => setNovoMovimento({ ...novoMovimento, data: e.target.value })} />
              <input style={estilos.input} placeholder="Descrição. Ex: gasolina, ajudante, sinal cliente" value={novoMovimento.descricao} onChange={(e) => setNovoMovimento({ ...novoMovimento, descricao: e.target.value })} />
              <input style={estilos.input} placeholder="Valor" value={novoMovimento.valor} onChange={(e) => setNovoMovimento({ ...novoMovimento, valor: e.target.value })} />
              <select style={estilos.input} value={novoMovimento.categoria} onChange={(e) => setNovoMovimento({ ...novoMovimento, categoria: e.target.value })}>
                <option value="Recebimento de cliente">Recebimento de cliente</option>
                <option value="Entrada / sinal">Entrada / sinal</option>
                <option value="Combustível">Combustível</option>
                <option value="Ajudante / funcionário">Ajudante / funcionário</option>
                <option value="Equipamentos">Equipamentos</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Aluguel">Aluguel</option>
                <option value="Anúncios / tráfego">Anúncios / tráfego</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Outros">Outros</option>
              </select>
              <select style={estilos.input} value={novoMovimento.contaId} onChange={(e) => setNovoMovimento({ ...novoMovimento, contaId: e.target.value })}>
                {contasFinanceiras.map((conta) => <option key={conta.id} value={conta.id}>{novoMovimento.tipo === "transferencia" ? "Sai de: " : "Conta: "}{conta.nome}</option>)}
              </select>
              {novoMovimento.tipo === "transferencia" && (
                <select style={estilos.input} value={novoMovimento.contaDestinoId} onChange={(e) => setNovoMovimento({ ...novoMovimento, contaDestinoId: e.target.value })}>
                  {contasFinanceiras.map((conta) => <option key={conta.id} value={conta.id}>Entra em: {conta.nome}</option>)}
                </select>
              )}
              <select style={estilos.input} value={novoMovimento.formaPagamento} onChange={(e) => setNovoMovimento({ ...novoMovimento, formaPagamento: e.target.value })}>
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de débito">Cartão de débito</option>
                <option value="Cartão de crédito">Cartão de crédito</option>
                <option value="Transferência bancária">Transferência bancária</option>
              </select>
              {novoMovimento.formaPagamento === "Cartão de crédito" && novoMovimento.tipo === "entrada" && (
                <>
                  <select style={estilos.input} value={novoMovimento.parcelas || "1"} onChange={(e) => setNovoMovimento({ ...novoMovimento, parcelas: e.target.value })}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x</option>)}
                  </select>
                  <input style={estilos.input} placeholder="Taxa da maquininha %. Ex: 3.5" value={novoMovimento.taxaCartao || ""} onChange={(e) => setNovoMovimento({ ...novoMovimento, taxaCartao: e.target.value })} />
                </>
              )}
            </div>
            <textarea style={estilos.textarea} placeholder="Observação opcional" value={novoMovimento.observacao} onChange={(e) => setNovoMovimento({ ...novoMovimento, observacao: e.target.value })} />
            <button style={estilos.botaoRoxo} onClick={salvarMovimentoManual}>Salvar lançamento</button>
          </div>

          <div style={{ ...estilos.card, borderColor: "#a78bfa" }}>
            <h3>📋 Histórico do fluxo de caixa</h3>
            {movimentosCaixa.length === 0 && <p>Nenhum lançamento de caixa ainda.</p>}
            {movimentosCaixa.slice(0, 80).map((m) => (
              <div key={m.id} style={{ borderBottom: "1px solid #374151", padding: "10px 0" }}>
                <strong style={{ color: m.tipo === "entrada" ? "#22c55e" : m.tipo === "saida" ? "#ef4444" : "#38bdf8" }}>
                  {m.tipo === "entrada" ? "Entrada" : m.tipo === "saida" ? "Saída" : "Transferência"}: {moeda(m.valor)}
                </strong>
                <br />
                {dataCurtaBR(m.data)} - {m.descricao} {m.cliente ? `- ${m.cliente}` : ""}
                <br />
                <span style={{ color: "#c4b5fd" }}>
                  {m.tipo === "transferencia" ? `${contaPorId(m.contaId).nome} → ${contaPorId(m.contaDestinoId).nome}` : contaPorId(m.contaId).nome} | {m.categoria} | {m.formaPagamento}
                  {m.parcelaNumero ? ` | Parcela ${m.parcelaNumero}/${m.parcelas}` : ""}
                  {Number(m.taxaCartao || 0) > 0 ? ` | Taxa ${m.taxaCartao}% | Bruto ${moeda(m.valorBruto)} | Líquido ${moeda(m.valor)}` : ""}
                </span>
                {m.observacao && <p style={{ whiteSpace: "pre-wrap" }}>{m.observacao}</p>}
                <button style={{ ...estilos.botaoPequeno, background: "#991b1b" }} onClick={() => excluirMovimentoCaixa(m.id)}>Excluir lançamento</button>
              </div>
            ))}
          </div>

          <div style={{ ...estilos.card, borderColor: "#22c55e", background: "linear-gradient(135deg, rgba(6,78,59,0.55), rgba(17,24,39,0.96))" }}>
            <h3>🎯 Meta do mês</h3>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "220px 1fr", gap: 12, alignItems: "center" }}>
              <input
                style={{ ...estilos.input, marginBottom: 0 }}
                placeholder="Meta mensal. Ex: 10000"
                value={metaMensal}
                onChange={(e) => setMetaMensal(e.target.value)}
              />
              <div>
                <strong>{moeda(faturamentoMesAgenda)} de {moeda(metaMensalNumero)}</strong>
                <div style={{ width: "100%", height: 18, background: "rgba(255,255,255,0.12)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
                  <div style={{ width: `${percentualMetaMensal}%`, height: "100%", background: "linear-gradient(90deg, #22c55e, #a3e635)", borderRadius: 999 }} />
                </div>
                <small style={{ color: "#bbf7d0" }}>{percentualMetaMensal}% da meta | Lucro do mês: {moeda(lucroMesEstimado)} ({margemLucroMes}%)</small>
              </div>
            </div>
          </div>

          <div style={estilos.gridResumo}>
            <div onClick={() => abrirDetalheFinanceiro("hoje", "Eventos de hoje")} title="Clique para ver eventos de hoje" style={estiloCardClicavel(estilos.cardResumo)}><strong>💰 Hoje</strong><h2>{moeda(saldoHoje)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("ultimos15", "Eventos dos últimos 15 dias")} title="Clique para ver últimos 15 dias" style={estiloCardClicavel(estilos.cardResumo)}><strong>📅 Últimos 15 dias</strong><h2>{moeda(saldo15Dias)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("mes", "Eventos do mês")} title="Clique para ver eventos do mês" style={estiloCardClicavel(estilos.cardResumo)}><strong>📆 Mês</strong><h2>{moeda(saldoMes)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("valorTotal", "Eventos com valor total")} title="Clique para ver eventos com valor" style={estiloCardClicavel({ ...estilos.cardResumo, borderColor: "#38bdf8", color: "#38bdf8" })}><strong>💰 Valor total</strong><h2>{moeda(faturamentoTotal)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("entradaSinal", "Clientes com entrada / sinal")} title="Clique para ver sinais" style={estiloCardClicavel({ ...estilos.cardResumo, borderColor: "#facc15", color: "#facc15" })}><strong>🧾 Entrada / sinal</strong><h2>{moeda(totalEntradas)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("pendente", "Clientes com saldo pendente")} title="Clique para ver pendentes" style={estiloCardClicavel({ ...estilos.cardResumo, borderColor: "#ef4444", color: "#ef4444" })}><strong>⚠️ Pendente</strong><h2>{moeda(totalPendente)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("custos", "Eventos com custos lançados")} title="Clique para ver custos" style={estiloCardClicavel(estilos.cardResumo)}><strong>📉 Custos</strong><h2>{moeda(custoTotal)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("lucroEstimado", "Lucro estimado por evento")} title="Clique para ver lucro" style={estiloCardClicavel(estilos.cardResumo)}><strong>📈 Lucro estimado</strong><h2>{moeda(lucroTotal)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("sinais", "Sinais recebidos")} title="Clique para ver sinais recebidos" style={estiloCardClicavel(estilos.cardResumo)}><strong>🔐 Sinais recebidos</strong><h2>{moeda(sinaisRecebidos)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("faturamentoFuturo", "Faturamento futuro")} title="Clique para ver futuros" style={estiloCardClicavel(estilos.cardResumo)}><strong>📆 Faturamento futuro</strong><h2>{moeda(faturamentoFuturo)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("aReceberFuturo", "A receber em eventos futuros")} title="Clique para ver a receber" style={estiloCardClicavel(estilos.cardResumo)}><strong>⏳ A receber futuro</strong><h2>{moeda(saldoReceberFuturo)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("ticketMedio", "Eventos usados no ticket médio")} title="Clique para ver ticket médio" style={estiloCardClicavel(estilos.cardResumo)}><strong>🎯 Ticket médio</strong><h2>{moeda(ticketMedio)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("caixaReal", "Caixa real recebido")} title="Clique para ver caixa real" style={estiloCardClicavel(estilos.cardResumo)}><strong>🏦 Caixa real recebido</strong><h2>{moeda(caixaRealRecebido)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("lucroReal", "Lucro real estimado")} title="Clique para ver lucro real" style={estiloCardClicavel(estilos.cardResumo)}><strong>💎 Lucro real estimado</strong><h2>{moeda(lucroRealEstimado)}</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("margem", "Eventos da margem geral")} title="Clique para ver margem" style={estiloCardClicavel(estilos.cardResumo)}><strong>📊 Margem geral</strong><h2>{margemLucroTotal}%</h2></div>
            <div onClick={() => abrirDetalheFinanceiro("conversao", "Eventos da conversão")} title="Clique para ver conversão" style={estiloCardClicavel(estilos.cardResumo)}><strong>🔁 Conversão</strong><h2>{taxaConversao}%</h2></div>
          </div>


          <div style={{ ...estilos.card, borderColor: "#22c55e" }}>
            <h3>🏦 Painel financeiro automático</h3>
            <p><strong>Faturamento previsto do mês:</strong> {moeda(faturamentoMesAgenda)}</p>
            <p><strong>Saídas/custos do mês:</strong> {moeda(custosMesAgenda)}</p>
            <p><strong>Lucro estimado do mês:</strong> {moeda(lucroMesEstimado)} ({margemLucroMes}%)</p>
            <p><strong>Saldo a receber em eventos futuros:</strong> {moeda(saldoReceberFuturo)}</p>
            <p><strong>Sinais/entradas lançados:</strong> {moeda(sinaisRecebidos)}</p>
            <p><strong>Propostas:</strong> {totalPropostas} | <strong>Fechados:</strong> {totalFechados} | <strong>Taxa de fechamento:</strong> {taxaConversao}%</p>
          </div>

          {eventosComLucroRuim.length > 0 && (
            <div style={{ ...estilos.card, borderColor: "#f59e0b", background: "rgba(58,46,0,0.35)" }}>
              <h3>⚠️ Atenção no lucro</h3>
              <p>Eventos com custo alto em relação ao valor total. Vale revisar preço, transporte, ajudante ou aluguel.</p>
              {eventosComLucroRuim.slice(0, 5).map((e) => (
                <button key={e.id} style={{ ...estilos.botao, display: "block", width: "100%", textAlign: "left" }} onClick={() => abrirEventoRapido(e)}>
                  {e.nome} - valor {moeda(e.valor)} | custo {moeda(e.custo || 0)}{custoDescricaoFinalJP(e) ? ` (${custoDescricaoFinalJP(e)})` : ""} | lucro {moeda(valorNumericoJP(e.valor) - valorNumericoJP(e.custo))}
                </button>
              ))}
            </div>
          )}

          <div style={estilos.card}>
            <h3>📊 Gráfico financeiro</h3>
            {[
              ["Valor total", faturamentoTotal, "#38bdf8"],
              ["Entrada / sinal", totalEntradas, "#facc15"],
              ["Pendente", totalPendente, "#ef4444"]
            ].map(([nome, valor, cor]) => (
              <div key={nome} style={{ marginBottom: 12 }}>
                <p>{nome}</p>
                <div style={{ width: "100%", background: "#222", borderRadius: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      width: faturamentoTotal > 0 ? `${Math.max((valor / faturamentoTotal) * 100, valor > 0 ? 8 : 0)}%` : "0%",
                      background: cor,
                      padding: 8,
                      color: "white",
                      fontWeight: "bold",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {moeda(valor)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={estilos.card}>
            <h3>📄 Histórico financeiro</h3>
            {agendaOrdenada.length === 0 && <p>Nenhum lançamento.</p>}
            {agendaOrdenada.map((e) => (
              <div key={e.id} style={{ borderBottom: "1px solid #374151", padding: "10px 0" }}>
                <strong>{dataCurtaBR(e.data)} - {e.nome}</strong>
                <br />
                Total: {moeda(e.valor)} | Entrada: {moeda(e.entrada)} | Custo: {moeda(e.custo || 0)}{custoDescricaoFinalJP(e) ? ` (${custoDescricaoFinalJP(e)})` : ""} | Lucro: {moeda(valorNumericoJP(e.valor) - valorNumericoJP(e.custo))} | Pendente: {e.quitado ? moeda(0) : moeda(Math.max(Number(e.valor || 0) - Number(e.entrada || 0), 0))}
                <br />
                <span style={{ color: corStatus(e), fontWeight: "bold" }}>{textoStatus(e)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {whatsAppEditor && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12, boxSizing: "border-box" }}>
          <div style={{ ...estilos.card, width: "min(760px, 100%)", maxHeight: "92vh", overflow: "auto", borderColor: "#22c55e" }}>
            <h2 style={{ marginTop: 0 }}>💬 {whatsAppEditor.titulo}</h2>
            <p style={{ color: "#bbf7d0", marginTop: -6 }}>Você tem controle total: pode editar, apagar, trocar o número, copiar ou enviar.</p>

            <label style={{ fontWeight: "bold" }}>WHATSAPP DO CLIENTE:</label>
            <input
              style={estilos.input}
              placeholder="DDD + número. Ex: 85999999999"
              value={whatsAppEditor.numero || ""}
              onChange={(e) => setWhatsAppEditor({ ...whatsAppEditor, numero: e.target.value })}
            />

            <label style={{ fontWeight: "bold" }}>MODELOS RÁPIDOS SEM MENSALIDADE:</label>
            <div style={{ ...estilos.grupoAcoes, marginBottom: 12 }}>
              <button style={estilos.botaoPequeno} onClick={() => setWhatsAppEditor({ ...whatsAppEditor, mensagem: mensagemPremiumSemIA(whatsAppEditor.evento, "followup") })}>Follow-up</button>
              <button style={estilos.botaoPequeno} onClick={() => setWhatsAppEditor({ ...whatsAppEditor, mensagem: mensagemPremiumSemIA(whatsAppEditor.evento, "confirmacao") })}>Confirmar dados</button>
              <button style={estilos.botaoPequeno} onClick={() => setWhatsAppEditor({ ...whatsAppEditor, mensagem: mensagemPremiumSemIA(whatsAppEditor.evento, "pagamento") })}>Pagamento</button>
              <button style={estilos.botaoPequeno} onClick={() => setWhatsAppEditor({ ...whatsAppEditor, mensagem: mensagemPremiumSemIA(whatsAppEditor.evento, "posEvento") })}>Pós-evento</button>
              <button style={estilos.botaoPequeno} onClick={() => setWhatsAppEditor({ ...whatsAppEditor, mensagem: mensagemPremiumSemIA(whatsAppEditor.evento, "indicacao") })}>Indicação</button>
            </div>

            <label style={{ fontWeight: "bold" }}>MENSAGEM QUE SERÁ ENVIADA:</label>
            <textarea
              style={{ ...estilos.textarea, minHeight: 260 }}
              value={whatsAppEditor.mensagem || ""}
              onChange={(e) => setWhatsAppEditor({ ...whatsAppEditor, mensagem: e.target.value })}
            />

            <div style={estilos.grupoAcoes}>
              <button style={estilos.botaoRoxo} onClick={enviarMensagemEditada}>Enviar no WhatsApp</button>
              <button style={estilos.botao} onClick={copiarMensagemEditada}>Copiar mensagem</button>
              <button style={estilos.botaoPequeno} onClick={() => setWhatsAppEditor({ ...whatsAppEditor, mensagem: "" })}>Apagar texto</button>
              <button style={estilos.botaoPequeno} onClick={() => setWhatsAppEditor(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {pagamentoEvento && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, padding: 12, boxSizing: "border-box" }}>
          <div style={{ ...estilos.card, width: "min(520px, 100%)", maxHeight: "92vh", overflow: "auto", borderColor: "#22c55e" }}>
            <h2>💰 Registrar pagamento no caixa</h2>
            <p><strong>{pagamentoEvento.cliente}</strong></p>

            <label style={{ fontWeight: "bold" }}>TIPO:</label>
            <select style={estilos.input} value={pagamentoEvento.tipo} onChange={(e) => setPagamentoEvento({ ...pagamentoEvento, tipo: e.target.value })}>
              <option value="entrada">Entrada / sinal</option>
              <option value="total">Pagamento total / saldo</option>
            </select>

            <label style={{ fontWeight: "bold" }}>VALOR RECEBIDO:</label>
            <input style={estilos.input} value={pagamentoEvento.valor} onChange={(e) => setPagamentoEvento({ ...pagamentoEvento, valor: e.target.value })} />

            <label style={{ fontWeight: "bold" }}>CONTA/BANCO ONDE ENTROU:</label>
            <p style={{ color: "#c4b5fd", marginTop: -6 }}>Escolha o banco/carteira real. Ex: PIX do Nubank = Conta Nubank + Forma Pix.</p>
            <select style={estilos.input} value={pagamentoEvento.contaId} onChange={(e) => setPagamentoEvento({ ...pagamentoEvento, contaId: e.target.value })}>
              {contasFinanceiras.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
            </select>

            <label style={{ fontWeight: "bold" }}>FORMA DE PAGAMENTO:</label>
            <p style={{ color: "#c4b5fd", marginTop: -6 }}>Aqui você escolhe o meio: Pix, crédito, débito, dinheiro ou transferência.</p>
            <select style={estilos.input} value={pagamentoEvento.formaPagamento} onChange={(e) => setPagamentoEvento({ ...pagamentoEvento, formaPagamento: e.target.value })}>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão de débito">Cartão de débito</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
              <option value="Transferência bancária">Transferência bancária</option>
            </select>

            {pagamentoEvento.formaPagamento === "Cartão de crédito" && (
              <div style={{ ...estilos.cardClaro, marginBottom: 12, borderColor: "#38bdf8" }}>
                <strong style={{ color: "#38bdf8" }}>💳 Parcelamento no cartão</strong>
                <p style={{ color: "#c4b5fd", marginTop: 4 }}>O valor do cliente conta como pago no evento. No caixa, o sistema lança as parcelas futuras e desconta a taxa da maquininha se você informar.</p>
                <label style={{ fontWeight: "bold" }}>PARCELAS:</label>
                <select style={estilos.input} value={pagamentoEvento.parcelas || "1"} onChange={(e) => setPagamentoEvento({ ...pagamentoEvento, parcelas: e.target.value })}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x de {moeda(Number(pagamentoEvento.valor || 0) / n)}</option>)}
                </select>
                <label style={{ fontWeight: "bold" }}>TAXA DA MAQUININHA (%):</label>
                <input style={estilos.input} placeholder="Ex: 3.5" value={pagamentoEvento.taxaCartao || ""} onChange={(e) => setPagamentoEvento({ ...pagamentoEvento, taxaCartao: e.target.value })} />
                <p style={{ color: "#bbf7d0" }}>
                  Bruto: {moeda(Number(pagamentoEvento.valor || 0))} | Líquido previsto: {moeda(Math.max(Number(pagamentoEvento.valor || 0) - ((Number(pagamentoEvento.valor || 0) * Number(String(pagamentoEvento.taxaCartao || "0").replace(",", "."))) / 100), 0))}
                </p>
              </div>
            )}

            <label style={{ fontWeight: "bold" }}>DATA DA 1ª PARCELA / RECEBIMENTO:</label>
            <input type="date" style={estilos.input} value={pagamentoEvento.data} onChange={(e) => setPagamentoEvento({ ...pagamentoEvento, data: e.target.value })} />

            <label style={{ fontWeight: "bold" }}>DESCRIÇÃO:</label>
            <input style={estilos.input} value={pagamentoEvento.descricao} onChange={(e) => setPagamentoEvento({ ...pagamentoEvento, descricao: e.target.value })} />

            <button style={estilos.botaoRoxo} onClick={salvarPagamentoEvento}>Salvar no caixa</button>
            <button style={estilos.botao} onClick={() => setPagamentoEvento(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {reciboAberto && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#222", padding: 20, borderRadius: 8, width: 340, border: "1px solid #555" }}>
            <h2>Gerar Recibo</h2>
            <p><strong>{reciboAberto.nome}</strong></p>

            <label>Tipo do recibo:</label>
            <select value={tipoRecibo} onChange={(e) => setTipoRecibo(e.target.value)} style={{ ...estilos.input, background: "white", color: "black" }}>
              <option value="sinal">Sinal / Entrada</option>
              <option value="total">Valor total</option>
            </select>

            <label>Forma de pagamento:</label>
            <select value={pagamentoRecibo} onChange={(e) => setPagamentoRecibo(e.target.value)} style={{ ...estilos.input, background: "white", color: "black" }}>
              <option value="">Selecione a forma de pagamento</option>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
              <option value="Cartão de débito">Cartão de débito</option>
              <option value="Valor total à vista">Valor total à vista</option>
              <option value="Transferência bancária">Transferência bancária</option>
            </select>

            <button style={estilos.botaoRoxo} onClick={gerarRecibo}>Gerar PDF</button>
            <button style={estilos.botao} onClick={() => setReciboAberto(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
