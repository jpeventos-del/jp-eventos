const supabaseUrl = "https://cgzbrkbobftmlbbuenyl.supabase.co";
const supabaseKey = "sb_publishable_5CPJ9eL2Wqdp0IXmYQbXTQ_DxUVNfRZ";

const TIMEOUT = 8000;

async function fetchComTimeout(url, options) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchComRetry(url, options, tentativas = 2) {
  try {
    return await fetchComTimeout(url, options);
  } catch (err) {
    if (tentativas <= 0) throw err;
    return fetchComRetry(url, options, tentativas - 1);
  }
}

function criarQuery(tabela) {
  const estado = {
    tabela,
    metodo: "GET",
    corpo: null,
    filtros: [],
    ordenar: null,
    unico: false,
    upsert: false
  };

  const executar = async () => {
    let url = `${supabaseUrl}/rest/v1/${estado.tabela}`;
    const params = [];

    if (estado.upsert) params.push("on_conflict=id");

    estado.filtros.forEach((f) => {
      params.push(`${f.coluna}=${f.operador || "eq"}.${encodeURIComponent(f.valor)}`);
    });

    if (estado.ordenar) {
      params.push(`order=${estado.ordenar.coluna}.${estado.ordenar.ascending ? "asc" : "desc"}`);
    }

    if (params.length) url += `?${params.join("&")}`;

    try {
      const resposta = await fetchComRetry(url, {
        method: estado.metodo,
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: estado.upsert
            ? "resolution=merge-duplicates,return=representation"
            : "return=representation"
        },
        body: estado.corpo ? JSON.stringify(estado.corpo) : null
      });

      const texto = await resposta.text();
      let data = null;

      try {
        data = texto ? JSON.parse(texto) : null;
      } catch {
        data = texto;
      }

      if (!resposta.ok) {
        console.error("Supabase erro:", data);
        return { data: null, error: data };
      }

      if (estado.unico && Array.isArray(data)) data = data[0] || null;

      return { data, error: null };
    } catch (err) {
      console.error("Erro de conexão:", err);

      return {
        data: null,
        error: "Falha de conexão com o servidor"
      };
    }
  };

  const builder = {
    select() {
      estado.metodo = "GET";
      return builder;
    },
    insert(dados) {
      estado.metodo = "POST";
      estado.corpo = dados;
      estado.upsert = true;
      return builder;
    },
    update(dados) {
      estado.metodo = "PATCH";
      estado.corpo = dados;
      return builder;
    },
    delete() {
      estado.metodo = "DELETE";
      return builder;
    },
    eq(coluna, valor) {
      estado.filtros.push({ coluna, valor });
      return builder;
    },
    neq(coluna, valor) {
      estado.filtros.push({ coluna, valor, operador: "neq" });
      return builder;
    },
    order(coluna, opcoes = {}) {
      estado.ordenar = {
        coluna,
        ascending: opcoes.ascending !== false
      };
      return builder;
    },
    single() {
      estado.unico = true;
      return builder;
    },
    then(resolve, reject) {
      return executar().then(resolve, reject);
    }
  };

  return builder;
}

export const supabase = {
  from(tabela) {
    return criarQuery(tabela);
  }
};