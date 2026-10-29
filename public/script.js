let menuData = null;
let orderState = {
  nome: '',
  telefone: '',
  entrega: 'delivery',
  address: '',
  marmitas: []
};
let calculatedOrderResult = null;

const BACKEND_URL = 'https://two-sistem-delivery-backend.vercel.app';

async function loadMenu() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/menu`);
    const data = await response.json();
    menuData = data;
    document.getElementById('storeName').textContent = data.nomeRestaurante || "Restaurante do Irmão";
  } catch (err) {
    console.error("Erro ao carregar menu:", err);
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
  if (!menuData || !menuData.itens) return [];
  return menuData.itens.filter(i => categorias.includes(i.categoria) && i.disponivel === 'true');
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
        return `
          <div class="qty-row">
            <span>${esc(item.nome)} (${money(item.preco)})</span>
            <div class="qty-controls">
              <button type="button" class="qty-btn" onclick="changeQty(${marmitaIndex}, '${keyName}', '${item.id}', -1)">-</button>
              <span id="q-${keyName}-${marmitaIndex}-${item.id}">${currentQ}</span>
              <button type="button" class="qty-btn" onclick="changeQty(${marmitaIndex}, '${keyName}', '${item.id}', 1)">+</button>
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
  const basePrice = menuData ? menuData.basePrice : 20;

  container.innerHTML = orderState.marmitas.map((m, i) => `
    <div class="marmita">
      <h3>Marmita ${String(i + 1).padStart(2, '0')} — Base ${money(basePrice)}</h3>

      <div class="choice-group">
        <h4>Guarnições <span class="limit">(máx. 4)</span></h4>
        <div class="choices">
          ${available(['Guarnições']).map(x => `
            <label class="check">
              <input type="checkbox" data-kind="g" data-index="${i}" data-id="${x.id}" ${m.guarnicoes.includes(String(x.id)) ? 'checked' : ''}>
              ${esc(x.nome)}
            </label>
          `).join('')}
        </div>
      </div>

      <div class="choice-group">
        <h4>Proteínas <span class="limit">(escolha 1 ou 2)</span></h4>
        <div class="choices">
          ${available(['Proteínas']).map(x => `
            <label class="check">
              <input type="checkbox" data-kind="p" data-index="${i}" data-id="${x.id}" ${m.proteinas.includes(String(x.id)) ? 'checked' : ''}>
              ${esc(x.nome)}
            </label>
          `).join('')}
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
  orderState.marmitas.forEach((m, i) => {
    m.guarnicoes = [];
    m.proteinas = [];
  });

  document.querySelectorAll('#marmitasContainer input[data-kind]:checked').forEach(el => {
    const i = Number(el.dataset.index);
    const key = el.dataset.kind === 'g' ? 'guarnicoes' : 'proteinas';
    orderState.marmitas[i][key].push(String(el.dataset.id));
  });

  document.querySelectorAll('#marmitasContainer textarea[data-obs]').forEach(el => {
    const i = Number(el.dataset.obs);
    if (orderState.marmitas[i]) {
      orderState.marmitas[i].observacao = el.value;
    }
  });
}

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

  try {
    const response = await fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderState)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.erro || 'Erro ao calcular pedido.');
    }

    calculatedOrderResult = data;
    document.getElementById('orderSummaryText').textContent = data.mensagem;
    document.getElementById('finalTotalText').textContent = `Total: ${money(data.total)}`;
    setStep(3);
  } catch (err) {
    const errEl = document.getElementById('orderError2');
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
}

function sendToWhatsApp() {
  if (!calculatedOrderResult) return;
  const phone = menuData.whatsapp || '5581920036280';
  const text = encodeURIComponent(calculatedOrderResult.mensagem);
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}