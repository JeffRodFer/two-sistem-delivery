let menuData = [];
let orderState = {
  nome: '',
  telefone: '',
  entrega: 'delivery',
  address: '',
  marmitas: []
};
let calculatedOrderResult = null;

// URL do seu Backend Vercel
const BACKEND_URL = 'https://two-sistem-delivery-backend.vercel.app';

// 1. Carrega o cardápio ao abrir a página
async function loadMenu() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/cardapio`);
    const data = await response.json();
    menuData = data;
    console.log("Cardápio carregado com sucesso:", menuData);
  } catch (err) {
    console.error("Erro ao carregar cardápio:", err);
    alert("Não foi possível carregar o cardápio do servidor.");
  }
}

loadMenu();

// Gestão de Passos (Ecrãs)
function setStep(step) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  
  if (step === 'admin') {
    document.getElementById('step-admin').classList.add('active');
    renderAdminTable();
  } else {
    document.getElementById(`step${step}`).classList.add('active');
  }
  window.scrollTo(0, 0);
}

function toggleAddress() {
  const type = document.getElementById('deliveryType').value;
  document.getElementById('addressField').style.display = type === 'delivery' ? 'block' : 'none';
}

// Botão "Faça seu Pedido" (Inicia o Passo 2)
function iniciarPedido() {
  const nome = document.getElementById('clientName').value.trim();
  const telefone = document.getElementById('clientPhone').value.trim();
  const entrega = document.getElementById('deliveryType').value;
  const address = document.getElementById('clientAddress').value.trim();
  const qtd = parseInt(document.getElementById('marmitaCount').value) || 1;

  if (!nome || !telefone || (entrega === 'delivery' && !address)) {
    const errEl = document.getElementById('step1Error');
    if (errEl) {
      errEl.textContent = "Preencha todos os campos obrigatórios corretamente.";
      errEl.style.display = 'block';
    }
    return;
  }
  
  const errEl = document.getElementById('step1Error');
  if (errEl) errEl.style.display = 'none';

  orderState.nome = nome;
  orderState.telefone = telefone;
  orderState.entrega = entrega;
  orderState.address = address;

  orderState.marmitas = Array.from({ length: qtd }, () => ({
    guarnicoes: [],
    proteinas: [],
    observacao: ''
  }));

  renderMarmitas();
  setStep(2);
}

function available(categorias) {
  if (!menuData || !Array.isArray(menuData)) return [];
  return menuData.filter(i => categorias.includes(i.categoria));
}

function money(val) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function esc(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Renderiza as marmitas com o layout de cartões
function renderMarmitas() {
  const container = document.getElementById('marmitasContainer');
  if (!container) return;
  const basePrice = 20;

  container.innerHTML = orderState.marmitas.map((m, i) => `
    <div class="card" style="border: 1px dashed var(--primary); background: #fffdfa;">
      <h3>Marmita ${String(i + 1).padStart(2, '0')} — Base ${money(basePrice)}</h3>

      <div class="section-title" style="font-size: 1.1rem; margin-top: 15px;">Guarnições <span style="font-size:0.8rem; color:#666">(máx. 4)</span></div>
      <div class="items-grid">
        ${available(['Guarnições']).map(x => {
          const esgotado = !x.disponivel || x.estoque <= 0;
          return `
            <label class="item-box ${esgotado ? 'esgotado' : ''}">
              <span>${esc(x.nome)}</span>
              <input type="checkbox" data-kind="g" data-index="${i}" data-id="${x.id}" ${esgotado ? 'disabled' : ''} ${m.guarnicoes.includes(x.id) ? 'checked' : ''}>
            </label>
          `;
        }).join('')}
      </div>

      <div class="section-title" style="font-size: 1.1rem; margin-top: 15px;">Proteínas <span style="font-size:0.8rem; color:#666">(escolha 1 ou 2)</span></div>
      <div class="items-grid">
        ${available(['Proteínas']).map(x => {
          const esgotado = !x.disponivel || x.estoque <= 0;
          return `
            <label class="item-box protein ${esgotado ? 'esgotado' : ''}">
              <span>${esc(x.nome)}</span>
              <input type="checkbox" data-kind="p" data-index="${i}" data-id="${x.id}" ${esgotado ? 'disabled' : ''} ${m.proteinas.includes(x.id) ? 'checked' : ''}>
            </label>
          `;
        }).join('')}
      </div>

      <div class="field" style="margin-top: 15px;">
        <label>Observação <span style="font-size:0.8rem; color:#666">(máx. 90 caracteres)</span></label>
        <textarea maxlength="90" data-obs="${i}" placeholder="Ex.: Sem cebola.">${m.observacao}</textarea>
      </div>
    </div>
  `).join('');
}

function syncFormToState() {
  orderState.marmitas.forEach(m => {
    m.guarnicoes = [];
    m.proteinas = [];
  });

  document.querySelectorAll('#marmitasContainer input[data-kind]:checked').forEach(el => {
    const i = Number(el.dataset.index);
    const key = el.dataset.kind === 'g' ? 'guarnicoes' : 'proteinas';
    orderState.marmitas[i][key].push(Number(el.dataset.id));
  });

  document.querySelectorAll('#marmitasContainer textarea[data-obs]').forEach(el => {
    const i = Number(el.dataset.obs);
    if (orderState.marmitas[i]) {
      orderState.marmitas[i].observacao = el.value;
    }
  });
}

// Envia a venda para o backend e vai para o Passo 3 (Resumo)
async function goToStep3() {
  syncFormToState();
  const errEl = document.getElementById('orderError2');
  if (errEl) errEl.style.display = 'none';

  const invalid = orderState.marmitas.findIndex(m => m.proteinas.length < 1 || m.proteinas.length > 2 || m.guarnicoes.length > 4);
  if (invalid >= 0) {
    if (errEl) {
      errEl.textContent = `Marmita ${invalid + 1}: escolha 1 ou 2 proteínas e no máximo 4 guarnições.`;
      errEl.style.display = 'block';
    }
    return;
  }

  let itensCarrinhoMap = {};
  orderState.marmitas.forEach(m => {
    m.proteinas.forEach(id => { itensCarrinhoMap[id] = (itensCarrinhoMap[id] || 0) + 1; });
    m.guarnicoes.forEach(id => { itensCarrinhoMap[id] = (itensCarrinhoMap[id] || 0) + 1; });
  });

  const itensCarrinho = Object.entries(itensCarrinhoMap).map(([id, quantidade]) => ({
    id: Number(id),
    quantidade
  }));

  try {
    const responseVenda = await fetch(`${BACKEND_URL}/api/registrar-venda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itensCarrinho })
    });

    const dataVenda = await responseVenda.json();
    if (!responseVenda.ok) {
      throw new Error(dataVenda.erro || 'Estoque insuficiente para concluir o pedido.');
    }

    let totalMarmitas = orderState.marmitas.length * 20;
    let taxaEntrega = orderState.entrega === 'delivery' ? 5 : 0;
    let totalGeral = totalMarmitas + taxaEntrega;

    const nomeItem = id => {
      const it = menuData.find(x => x.id === id);
      return it ? it.nome : `Item #${id}`;
    };

    let resumoMensagem = `*Novo Pedido - Restaurante do Irmão*\n\n`;
    resumoMensagem += `*Cliente:* ${orderState.nome}\n*Telefone:* ${orderState.telefone}\n`;
    if (orderState.entrega === 'delivery') {
      resumoMensagem += `*Endereço:* ${orderState.address}\n\n`;
    } else {
      resumoMensagem += `*Retirada no Local*\n\n`;
    }

    orderState.marmitas.forEach((m, index) => {
      resumoMensagem += `*Marmita ${String(index + 1).padStart(2, '0')}*\n`;
      resumoMensagem += `- Proteínas: ${m.proteinas.map(nomeItem).join(', ')}\n`;
      resumoMensagem += `- Guarnições: ${m.guarnicoes.map(nomeItem).join(', ')}\n`;
      if (m.observacao) resumoMensagem += `- Obs: ${m.observacao}\n`;
      resumoMensagem += `\n`;
    });

    resumoMensagem += `*Taxa de Entrega:* ${money(taxaEntrega)}\n`;
    resumoMensagem += `*Total a Pagar:* R$ ${totalGeral.toFixed(2)}`;

    calculatedOrderResult = { total: totalGeral, mensagem: resumoMensagem };
    document.getElementById('orderSummaryText').textContent = resumoMensagem;
    document.getElementById('finalTotalText').textContent = `Total: ${money(totalGeral)}`;
    
    setStep(3);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  }
}

function sendToWhatsApp() {
  if (!calculatedOrderResult) return;
  const phone = '5581920036280';
  const text = encodeURIComponent(calculatedOrderResult.mensagem);
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}

// ==========================================
// PAINEL ADMINISTRATIVO (GERENCIAR)
// ==========================================
function abrirPainelAdmin() {
  const senha = prompt("Digite a senha do Administrador:");
  if (!senha) return;

  fetch(`${BACKEND_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha })
  })
  .then(res => res.json())
  .then(data => {
    if (data.autorizado) {
      setStep('admin');
    } else {
      alert("Senha incorreta!");
    }
  })
  .catch(() => alert("Erro ao conectar com o servidor."));
}

async function renderAdminTable() {
  await loadMenu();
  const tbody = document.getElementById('adminTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = menuData.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${esc(item.nome)}</td>
      <td>${esc(item.categoria)}</td>
      <td><input type="number" step="0.01" id="adm-preco-${item.id}" value="${item.preco}"></td>
      <td><input type="number" id="adm-estoque-${item.id}" value="${item.estoque}"></td>
      <td><input type="checkbox" id="adm-disp-${item.id}" ${item.disponivel ? 'checked' : ''}></td>
    </tr>
  `).join('');
}

async function salvarAlteracoesAdmin() {
  const produtosAtualizados = menuData.map(item => {
    const preco = parseFloat(document.getElementById(`adm-preco-${item.id}`).value) || 0;
    const estoque = parseInt(document.getElementById(`adm-estoque-${item.id}`).value) || 0;
    const disponivel = document.getElementById(`adm-disp-${item.id}`).checked;
    return { id: item.id, preco, estoque, disponivel };
  });

  try {
    const res = await fetch(`${BACKEND_URL}/admin/atualizar-lote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtos: produtosAtualizados })
    });
    const data = await res.json();
    if (res.ok) {
      const msg = document.getElementById('adminMsg');
      if (msg) {
        msg.textContent = data.mensagem;
        msg.style.display = 'block';
      }
      loadMenu();
    } else {
      alert(data.erro || "Erro ao salvar.");
    }
  } catch (err) {
    alert("Erro de conexão ao salvar alterações.");
  }
}

async function fazerEstornoAdmin() {
  const id = parseInt(prompt("Digite o ID do produto para estornar (devolver ao estoque):"));
  const qtd = parseInt(prompt("Digite a quantidade a devolver:"));

  if (!id || !qtd || qtd <= 0) return;

  try {
    const res = await fetch(`${BACKEND_URL}/admin/estornar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itensEstorno: [{ id, quantidade: qtd }] })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.mensagem);
      renderAdminTable();
    } else {
      alert(data.erro || "Erro no estorno.");
    }
  } catch (err) {
    alert("Erro de conexão.");
  }
}

function avancarParaPasso2() {
  const nome = document.getElementById('customerName').value.trim();
  const telefone = document.getElementById('customerPhone').value.trim();
  const endereco = document.getElementById('customerAddress').value.trim();
  const qtdMarmitas = parseInt(document.getElementById('mealCount').value) || 1;
  
  const entregaRadio = document.querySelector('input[name="delivery"]:checked');
  const isDelivery = entregaRadio ? entregaRadio.value === 'true' : true;

  const errorDiv = document.getElementById('orderError1');

  if (!nome || !telefone || (isDelivery && !endereco)) {
    if (errorDiv) {
      errorDiv.textContent = 'Por favor, preencha todos os campos obrigatórios (Nome, Telefone e Endereço).';
      errorDiv.style.display = 'block';
    }
    return;
  }

  if (errorDiv) {
    errorDiv.style.display = 'none';
  }

  orderState.nome = nome;
  orderState.telefone = telefone;
  orderState.entrega = isDelivery ? 'delivery' : 'retirada';
  orderState.address = endereco;

  orderState.marmitas = Array.from({ length: qtdMarmitas }, () => ({
    guarnicoes: [],
    proteinas: [],
    observacao: ''
  }));

  renderMarmitas();
  setStep(2); // Muda para o passo 2 das marmitas
}