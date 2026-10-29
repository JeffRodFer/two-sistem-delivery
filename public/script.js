let menuData = [];
let orderState = {
  nome: '',
  telefone: '',
  entrega: 'delivery',
  address: '',
  marmitas: []
};
let calculatedOrderResult = null;
let adminToken = '';

// URL do seu Backend Vercel
const BACKEND_URL = 'https://two-sistem-delivery-backend.vercel.app';

async function loadMenu() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/cardapio`);
    const data = await response.json();
    menuData = data;
  } catch (err) {
    console.error("Erro ao carregar cardápio:", err);
    alert("Não foi possível carregar o cardápio do servidor.");
  }
}

loadMenu();

function setStep(step) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  document.getElementById(`step${step}`).classList.add('active');
  window.scrollTo(0, 0);
}

function toggleAddress() {
  const type = document.getElementById('deliveryType').value;
  document.getElementById('addressField').style.display = type === 'delivery' ? 'block' : 'none';
}

function goToStep2() {
  const nome = document.getElementById('clientName').value.trim();
  const telefone = document.getElementById('clientPhone').value.trim();
  const entrega = document.getElementById('deliveryType').value;
  const address = document.getElementById('clientAddress').value.trim();
  const qtd = parseInt(document.getElementById('marmitaCount').value) || 1;

  if (!nome || !telefone || (entrega === 'delivery' && !address)) {
    document.getElementById('step1Error').style.display = 'block';
    return;
  }
  document.getElementById('step1Error').style.display = 'none';

  orderState.nome = nome;
  orderState.telefone = telefone;
  orderState.entrega = entrega;
  orderState.address = address;

  orderState.marmitas = Array.from({ length: qtd }, () => ({
    guarnicoes: [],
    proteinas: [],
    bebidas: {},
    sobremesas: {},
    observacao: ''
  }));

  renderMarmitas();
  setStep(2);
}

function available(categorias) {
  if (!menuData) return [];
  return menuData.filter(i => categorias.includes(i.categoria));
}

function money(val) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function esc(str) {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function qtySection(titulo, categorias, marmitaIndex, keyName) {
  const items = available(categorias);
  if (items.length === 0) return '';

  return `
    <div class="choice-group">
      <h4>${titulo}</h4>
      ${items.map(item => {
        const currentQ = orderState.marmitas[marmitaIndex][keyName][item.id] || 0;
        const esgotado = !item.disponivel || item.estoque <= 0;
        return `
          <div class="qty-row">
            <span>${esc(item.nome)} (${money(item.preco)}) ${esgotado ? '<b style="color:red">(Esgotado)</b>' : ''}</span>
            <div class="qty-controls">
              <button type="button" class="qty-btn" ${esgotado ? 'disabled' : ''} onclick="changeQty(${marmitaIndex}, '${keyName}', ${item.id}, -1)">-</button>
              <span id="q-${keyName}-${marmitaIndex}-${item.id}">${currentQ}</span>
              <button type="button" class="qty-btn" ${esgotado ? 'disabled' : ''} onclick="changeQty(${marmitaIndex}, '${keyName}', ${item.id}, 1)">+</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function changeQty(mIndex, keyName, itemId, delta) {
  syncFormToState();
  const current = orderState.marmitas[mIndex][keyName][itemId] || 0;
  const next = Math.max(0, current + delta);
  
  if (next === 0) {
    delete orderState.marmitas[mIndex][keyName][itemId];
  } else {
    orderState.marmitas[mIndex][keyName][itemId] = next;
  }
  renderMarmitas();
}

function renderMarmitas() {
  const container = document.getElementById('marmitasContainer');
  const basePrice = 20; // Preço base fixo da marmita

  container.innerHTML = orderState.marmitas.map((m, i) => `
    <div class="marmita">
      <h3>Marmita ${String(i + 1).padStart(2, '0')} — Base ${money(basePrice)}</h3>

      <div class="choice-group">
        <h4>Guarnições <span class="limit">(máx. 4)</span></h4>
        <div class="choices">
          ${available(['Guarnições']).map(x => {
            const esgotado = !x.disponivel || x.estoque <= 0;
            return `
              <label class="check ${esgotado ? 'esgotado' : ''}">
                <input type="checkbox" data-kind="g" data-index="${i}" data-id="${x.id}" ${esgotado ? 'disabled' : ''} ${m.guarnicoes.includes(x.id) ? 'checked' : ''}>
                ${esc(x.nome)} ${esgotado ? '(Esgotado)' : ''}
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="choice-group">
        <h4>Proteínas <span class="limit">(escolha 1 ou 2)</span></h4>
        <div class="choices">
          ${available(['Proteínas']).map(x => {
            const esgotado = !x.disponivel || x.estoque <= 0;
            return `
              <label class="check ${esgotado ? 'esgotado' : ''}">
                <input type="checkbox" data-kind="p" data-index="${i}" data-id="${x.id}" ${esgotado ? 'disabled' : ''} ${m.proteinas.includes(x.id) ? 'checked' : ''}>
                ${esc(x.nome)} ${esgotado ? '(Esgotado)' : ''}
              </label>
            `;
          }).join('')}
        </div>
      </div>

      ${qtySection('Bebidas', ['Gaseificadas', 'Sucos Naturais 350ml', 'Polpas 500ml'], i, 'bebidas')}
      ${qtySection('Sobremesas', ['Sobremesas'], i, 'sobremesas')}

      <div class="field">
        <label>Observação <span class="limit">(máx. 90 caracteres)</span></label>
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

// CRUCIAL: Envia para /api/registrar-venda PRIMEIRO, depois abre o WhatsApp
async function goToStep3() {
  syncFormToState();
  document.getElementById('orderError2').style.display = 'none';

  const invalid = orderState.marmitas.findIndex(m => m.proteinas.length < 1 || m.proteinas.length > 2 || m.guarnicoes.length > 4);
  if (invalid >= 0) {
    const errEl = document.getElementById('orderError2');
    errEl.textContent = `Marmita ${invalid + 1}: escolha 1 ou 2 proteínas e no máximo 4 guarnições.`;
    errEl.style.display = 'block';
    return;
  }

  // Agrupar itens para o carrinho (para a baixa no estoque)
  let itensCarrinhoMap = {};
  
  orderState.marmitas.forEach(m => {
    // Cada marmita consome 1 unidade de base ou pode computar proteínas/guarnições se necessário. 
    // Aqui contabilizamos os itens avulsos (bebidas e sobremesas) e as proteínas/guarnições se o estoque controlar itens individuais:
    m.proteinas.forEach(id => { itensCarrinhoMap[id] = (itensCarrinhoMap[id] || 0) + 1; });
    m.guarnicoes.forEach(id => { itensCarrinhoMap[id] = (itensCarrinhoMap[id] || 0) + 1; });
    
    Object.entries(m.bebidas).forEach(([id, q]) => {
      itensCarrinhoMap[Number(id)] = (itensCarrinhoMap[Number(id)] || 0) + q;
    });
    Object.entries(m.sobremesas).forEach(([id, q]) => {
      itensCarrinhoMap[Number(id)] = (itensCarrinhoMap[Number(id)] || 0) + q;
    });
  });

  const itensCarrinho = Object.entries(itensCarrinhoMap).map(([id, quantidade]) => ({
    id: Number(id),
    quantidade
  }));

  try {
    // 1. CHAMA O BACKEND PARA DAR BAIXA NO ESTOQUE PRIMEIRO
    const responseVenda = await fetch(`${BACKEND_URL}/api/registrar-venda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itensCarrinho })
    });

    const dataVenda = await responseVenda.json();
    if (!responseVenda.ok) {
      throw new Error(dataVenda.erro || 'Estoque insuficiente para concluir o pedido.');
    }

    // 2. MONTA A MENSAGEM DO PEDIDO
    let totalMarmitas = orderState.marmitas.length * 20;
    let taxaEntrega = orderState.entrega === 'delivery' ? 5 : 0;
    let totalGeral = totalMarmitas; // (Adicionar soma de bebidas/sobremesas se houver preço adicional) + taxaEntrega

    // Mapeamento rápido de nomes por ID
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
      
      const bebidasList = Object.entries(m.bebidas).map(([id, q]) => `${q}x ${nomeItem(Number(id))}`).join(', ');
      if (bebidasList) resumoMensagem += `- Bebidas: ${bebidasList}\n`;

      const sobremesasList = Object.entries(m.sobremesas).map(([id, q]) => `${q}x ${nomeItem(Number(id))}`).join(', ');
      if (sobremesasList) resumoMensagem += `- Sobremesas: ${sobremesasList}\n`;

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
    const errEl = document.getElementById('orderError2');
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
}

function sendToWhatsApp() {
  if (!calculatedOrderResult) return;
  const phone = '5581920036280';
  const text = encodeURIComponent(calculatedOrderResult.mensagem);
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}

// ==========================================
// PAINEL ADMINISTRATIVO
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
      adminToken = data.token;
      setStep('admin');
      renderAdminTable();
    } else {
      alert("Senha incorreta!");
    }
  })
  .catch(() => alert("Erro ao conectar com o servidor."));
}

async function renderAdminTable() {
  await loadMenu();
  const tbody = document.getElementById('adminTableBody');
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
      document.getElementById('adminMsg').textContent = data.mensagem;
      document.getElementById('adminMsg').style.display = 'block';
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