let menu = [];

    let basePrice = 20;

    let deliveryPrice = 5;

    let orderState = null;

    let calculatedOrder = null;

    let adminDraft = [];


    const $ =
      id => document.getElementById(id);


    const money =
      value =>
        Number(value).toLocaleString(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL'
          }
        );


    function esc(s) {

      return String(s ?? '')
        .replace(
          /[&<>"']/g,
          m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
          }[m])
        );

    }


    function available(cats) {

      return menu.filter(
        item =>
          cats.includes(
            item.categoria
          ) &&
          item.disponivel
      );

    }


    /* RELÓGIO */

    function updateClock() {

      const d =
        new Date();


      $('datetime').textContent =
        d.toLocaleString(
          'pt-BR',
          {
            timeZone: 'America/Recife',
            dateStyle: 'short',
            timeStyle: 'medium'
          }
        );

    }


    setInterval(
      updateClock,
      1000
    );

    updateClock();


    /* CARREGAR CARDÁPIO */

    async function loadMenu() {
      try {
        const response =
          await fetch(
            'https://sistema-delivery-backend.vercel.app/api/menu',
            {
              cache: 'no-store'
            }
          );

        if (!response.ok) {
          throw new Error();
        }


        const data =
          await response.json();


        menu =
          data.itens;


        basePrice =
          Number(
            data.basePrice
          );


        deliveryPrice =
          Number(
            data.deliveryPrice
          );


      } catch {

        console.warn(
          'Não foi possível carregar o cardápio.'
        );

        menu = [];

      }


      renderMenu();

    }


    /* RENDERIZAÇÃO DO CARDÁPIO */

    function section(title, cats, accent, hidePrice) {
      // O .trim() garante que espaços fantasmas não quebram a lista
      const all = menu.filter(x => {
        if (!x || !x.categoria) return false;
        return cats.includes(x.categoria.trim());
      });

      return `
    <section class="section">
      <h2>${title}</h2>
      <div class="grid">
        ${all.map(x => `
          <div class="card ${accent}${x.disponivel ? '' : 'unavailable'}">
            <strong>${esc(x.nome)}</strong>${!hidePrice ? `<span>${money(x.preco)}</span>` : ''}
            ${x.disponivel ? '' : '<span class="badge">Indisponível hoje</span>'}
          </div>
        `).join('')}
      </div>
    </section>
  `;
    }

    function renderMenu() {
      $('menu').innerHTML =
        section(
          'Guarnições',
          ['Guarnições', 'Guarnição'], // Nomes alternativos por segurança
          'accent-guarnicoes',
          true // true = esconde o preço
        )
        +
        section(
          'Proteínas',
          ['Proteínas', 'Proteína'],
          'accent-proteinas',
          true // true = esconde o preço
        )
        +
        section(
          'Bebidas e Sucos',
          ['Bebidas e Sucos', 'Bebidas', 'Bebida'], // Cobre qualquer variação!
          'accent-bebidas',
          false // FALSE = Mostra o preço das bebidas na tela!
        )
        +
        section(
          'Sobremesas',
          ['Sobremesas', 'Sobremesa'],
          'accent-sobremesas',
          false // FALSE = Mostra o preço das sobremesas na tela!
        );
    }


    /* MODAIS */

    function openOverlay(id) {

      $(id)
        .classList
        .remove('hidden');

    }


    function closeOverlay(id) {

      $(id)
        .classList
        .add('hidden');

    }


    function setStep(n) {

      [
        'orderStep1',
        'orderStep2',
        'orderStep3'
      ].forEach(
        (id, i) =>
          $(id)
            .classList
            .toggle(
              'active',
              i === n - 1
            )
      );

    }


    function showErr(
      id,
      msg
    ) {

      $(id).textContent =
        msg;

      $(id)
        .classList
        .remove('hidden');

    }


    function clearErr(id) {

      $(id)
        .classList
        .add('hidden');

    }


    /* MÁSCARA TELEFONE */

    function maskPhone(v) {

      let d =
        v
          .replace(/\D/g, '')
          .slice(0, 11);


      if (d.length <= 10) {

        return d
          .replace(
            /(\d{2})(\d{4})(\d{0,4})/,
            '($1) $2-$3'
          )
          .replace(/-$/, '');

      }


      return d
        .replace(
          /(\d{2})(\d{5})(\d{0,4})/,
          '($1) $2-$3'
        )
        .replace(/-$/, '');

    }


    $('customerPhone')
      .addEventListener(
        'input',
        e =>
          e.target.value =
          maskPhone(
            e.target.value
          )
      );


    /* ABRIR PEDIDO */

    /* ABRIR PEDIDO */
    $('openOrder').onclick = () => {
      orderState = null;
      openOverlay('orderOverlay'); // Certifique-se de usar openOverlay (com 'p')
      setStep(1);
    };


    $('closeOrder1').onclick =
      () =>
        closeOverlay(
          'orderOverlay'
        );


    $('backStep1').onclick =
      () =>
        setStep(1);


    $('cancelFinal').onclick =
      () => {

        closeOverlay(
          'orderOverlay'
        );

        resetOrder();

      };


    /* CRIAR MARMITAS */

    function makeMarmitas(n) {

      return Array.from(
        {
          length: n
        },
        () => ({
          guarnicoes: [],
          proteinas: [],
          bebidas: {},
          sobremesas: {},
          observacao: ''
        })
      );

    }


    /* HTML DE UMA MARMITA */

    function choiceHTML(
      m,
      i
    ) {

      const g =
        available([
          'Guarnições'
        ]);


      const p =
        available([
          'Proteínas'
        ]);


      return `

    <div class="marmita">

      <h3>
        Marmita
        ${String(i + 1).padStart(2, '0')}
        — base ${money(basePrice)}
      </h3>


      <div class="choice-group">

        <h4>
          Guarnições
          <span class="limit">
            (máx. 4)
          </span>
        </h4>


        <div class="choices">

          ${g.map(x => `

            <label class="check">

              <input
                type="checkbox"
                data-kind="g"
                data-index="${i}"
                data-id="${x.id}"
              >

              ${esc(x.nome)}

            </label>

          `).join('')}

        </div>

      </div>


      <div class="choice-group">

        <h4>
          Proteínas
          <span class="limit">
            (escolha 1 ou 2)
          </span>
        </h4>


        <div class="choices">

          ${p.map(x => `

            <label class="check">

              <input
                type="checkbox"
                data-kind="p"
                data-index="${i}"
                data-id="${x.id}"
              >

              ${esc(x.nome)}

            </label>

          `).join('')}

        </div>

      </div>


      <!-- GAVETA DE BEBIDAS -->
      <details style="margin-top: 15px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 8px; padding: 10px;">
        <summary style="font-size: 1.1em; font-weight: bold; cursor: pointer; list-style: none; outline: none;">
          🥤 Bebidas (Clique para abrir as opções)
        </summary>
        
        <div style="margin-top: 15px;">
          ${qtySection(
        'Bebidas',
        ['Bebidas', 'Bebida', 'Bebidas e Sucos', 'Gaseificadas', 'Sucos Naturais 350ml', 'Polpas 500ml'],
        i,
        'bebidas'
      )}
        </div>
      </details>


      <!-- GAVETA DE SOBREMESAS -->
      <details style="margin-bottom: 15px; border: 1px solid #ccc; border-radius: 8px; padding: 10px;">
        <summary style="font-size: 1.1em; font-weight: bold; cursor: pointer; list-style: none; outline: none;">
          🍮 Sobremesas (Clique para abrir as opções)
        </summary>
        
        <div style="margin-top: 15px;">
          ${qtySection(
        'Sobremesas',
        ['Sobremesas'],
        i,
        'sobremesas'
      )}
        </div>
      </details>
        }


      <div class="field">

        <label>

          Observação

          <span class="limit">
            (máx. 90 caracteres)
          </span>

        </label>


        <textarea
          maxlength="90"
          data-obs="${i}"
          placeholder="Ex.: Bastante molho de fígado."
        ></textarea>

      </div>

    </div>

  `;

    }


    /*
      CONTROLES DE QUANTIDADE.
    
      O + e o - ficam obrigatoriamente
      na mesma linha.
    */

    function qtySection(
      title,
      cats,
      i,
      key
    ) {

      const items =
        available(cats);


      return `

    <div class="choice-group">

      <h4>
        ${title}
      </h4>


      <div class="limit">

        Use 0 para:
        Não quero
        ${key === 'bebidas'
          ? 'bebida'
          : 'sobremesa'}.

      </div>


      <div class="qty-list">

        ${items.map(x => `

          <div class="qty-row">

            <span class="qty-name">
              ${esc(x.nome)}
            </span>


            <span class="qty-price">
              ${money(x.preco)}
            </span>


            <button
              type="button"
              class="qty-btn"
              data-qaction="minus"
              data-key="${key}"
              data-index="${i}"
              data-id="${x.id}"
            >
              −
            </button>


            <span
              class="qty-value"
              id="q-${key}-${i}-${x.id}"
            >
              0
            </span>


            <button
              type="button"
              class="qty-btn"
              data-qaction="plus"
              data-key="${key}"
              data-index="${i}"
              data-id="${x.id}"
            >
              +
            </button>

          </div>

        `).join('')}

      </div>

    </div>

  `;

    }


    /* RENDERIZAR MARMITAS */

    function renderMarmitas() {

      $('marmitas').innerHTML =
        orderState.marmitas
          .map(choiceHTML)
          .join('');


      syncFormToState();

    }


    function syncFormToState() {

      document
        .querySelectorAll(
          '#marmitas input[data-kind]'
        )
        .forEach(
          el => {

            const i =
              Number(
                el.dataset.index
              );


            const key =
              el.dataset.kind === 'g'
                ? 'guarnicoes'
                : 'proteinas';


            el.checked =
              orderState
                .marmitas[i][key]
                .includes(
                  el.dataset.id
                );

          }
        );


      document
        .querySelectorAll(
          '#marmitas textarea[data-obs]'
        )
        .forEach(
          el => {

            el.value =
              orderState
                .marmitas[
                Number(el.dataset.obs)
              ]
                .observacao;

          }
        );


      for (
        const [
          i,
          m
        ]
        of orderState.marmitas.entries()
      ) {

        for (
          const key
          of [
            'bebidas',
            'sobremesas'
          ]
        ) {

          for (
            const [
              id,
              q
            ]
            of Object.entries(
              m[key]
            )
          ) {

            const el =
              $(
                `q-${key}-${i}-${id}`
              );


            if (el) {

              el.textContent =
                q;

            }

          }

        }

      }

    }


    /* CHECKBOXES */

    $('marmitas')
      .addEventListener(
        'change',
        e => {

          const el =
            e.target;


          if (
            el.matches(
              'input[data-kind]'
            )
          ) {

            const i =
              Number(
                el.dataset.index
              );


            const key =
              el.dataset.kind === 'g'
                ? 'guarnicoes'
                : 'proteinas';


            const arr =
              orderState
                .marmitas[i][key];


            if (el.checked) {

              if (
                key === 'guarnicoes' &&
                arr.length >= 4
              ) {

                el.checked =
                  false;

                return;

              }


              if (
                !arr.includes(
                  el.dataset.id
                )
              ) {

                arr.push(
                  el.dataset.id
                );

              }

            } else {

              orderState
                .marmitas[i][key] =
                arr.filter(
                  x =>
                    x !==
                    el.dataset.id
                );

            }

          }


          if (
            el.matches(
              'textarea[data-obs]'
            )
          ) {

            orderState
              .marmitas[
              Number(el.dataset.obs)
            ]
              .observacao =
              el.value
                .slice(0, 90);

          }

        }
      );


    /* BOTÕES + E - */

    $('marmitas')
      .addEventListener(
        'click',
        e => {

          const button =
            e.target.closest(
              'button[data-qaction]'
            );


          if (!button) {
            return;
          }


          const i =
            Number(
              button.dataset.index
            );


          const key =
            button.dataset.key;


          const id =
            button.dataset.id;


          const m =
            orderState
              .marmitas[i];


          const old =
            Number(
              m[key][id] || 0
            );


          const next =
            button.dataset.qaction === 'plus'
              ? Math.min(
                20,
                old + 1
              )
              : Math.max(
                0,
                old - 1
              );


          if (next === 0) {

            delete m[key][id];

          } else {

            m[key][id] =
              next;

          }


          const display =
            $(
              `q-${key}-${i}-${id}`
            );


          if (display) {

            display.textContent =
              next;

          }

        }
      );


    /* PASSO 1 -> PASSO 2 */

    $('toStep2').onclick =
      () => {

        clearErr(
          'orderError1'
        );


        const name =
          $('customerName')
            .value
            .trim();


        const phone =
          $('customerPhone')
            .value
            .replace(
              /\D/g,
              ''
            );


        const address =
          $('customerAddress')
            .value
            .trim();


        const n =
          Number(
            $('mealCount')
              .value
          );


        if (name.length < 2) {

          return showErr(
            'orderError1',
            'Informe o nome completo.'
          );

        }


        if (phone.length < 10) {

          return showErr(
            'orderError1',
            'Informe um telefone válido.'
          );

        }


        if (address.length < 5) {

          return showErr(
            'orderError1',
            'Informe o endereço.'
          );

        }


        if (
          !Number.isInteger(n) ||
          n < 1 ||
          n > 20
        ) {

          return showErr(
            'orderError1',
            'Quantidade de marmitas inválida.'
          );

        }


        orderState = {

          nome: name,

          telefone: phone,

          address: address,

          entrega:
            document
              .querySelector(
                'input[name="delivery"]:checked'
              )
              .value === 'true',

          marmitas:
            makeMarmitas(n)

        };


        renderMarmitas();

        setStep(2);

      };


    /* =====================================================
       CALCULAR PEDIDO NO SERVIDOR
       ===================================================== */

    async function calculateOrder() {

      clearErr(
        'orderError2'
      );

      // 1. Palavras-chave dos pratos especiais
      const palavrasEspeciais = ["arrumadinho", "cozido", "feijoada", "yakisoba"];

      // 2. O fiscal analisa marmita por marmita
      const invalid = orderState.marmitas.findIndex(m => {
        const qtProteinas = m.proteinas.length;
        const qtGuarnicoes = m.guarnicoes.length;

        // A MÁGICA ACONTECE AQUI:
        const temEspecial = m.proteinas.some(idProteina => {
          // Vamos ao cardápio global (menu) procurar o item que tem este ID
          const itemCardapio = menu.find(item => String(item.id) === String(idProteina));

          // Se encontrou o item no cardápio, lê o nome dele
          if (itemCardapio) {
            const nomeTexto = (itemCardapio.nome || itemCardapio.titulo || "").toLowerCase();
            return palavrasEspeciais.some(palavra => nomeTexto.includes(palavra));
          }
          return false;
        });

        if (temEspecial) {
          // REGRA DO PRATO ESPECIAL: Só pode ter 1 proteína e 0 guarnições.
          if (qtProteinas === 1 && qtGuarnicoes === 0) {
            return false; // APROVADO!
          } else {
            return true;  // REPROVADO!
          }
        } else {
          // REGRA DO PRATO NORMAL: De 1 a 4 guarnições E de 1 a 2 proteínas.
          if (qtGuarnicoes >= 1 && qtGuarnicoes <= 4 && qtProteinas >= 1 && qtProteinas <= 2) {
            return false; // APROVADO!
          } else {
            return true;  // REPROVADO!
          }
        }
      });

      // 3. Aviso rigoroso se falhar
      if (invalid >= 0) {
        showErr(
          'orderError2',
          `Marmita ${invalid + 1}: Pratos normais exigem de 1 a 4 guarnições e 1 a 2 proteínas. Pratos especiais (ex: Arrumadinho, Cozido, Feijoada e Yakisoba) devem ser pedidos sozinhos, sem guarnições.`
        );
        return false;
      }


      const payload = {

        nome:
          orderState.nome,

        telefone:
          orderState.telefone,

        endereco:
          orderState.address,

        entrega:
          orderState.entrega,

        marmitas:
          orderState.marmitas

      };


      const response =
        await fetch(
          'https://sistema-delivery-backend.vercel.app/api/orders',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body:
              JSON.stringify(
                payload
              )
          }
        );


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (!response.ok) {

        showErr(
          'orderError2',
          data.erro ||
          'Não foi possível calcular o pedido.'
        );

        return false;

      }


      calculatedOrder =
        data;


      return true;

    }


    /* PASSO 2 -> PASSO 3 */

    $('toStep3').onclick =
      async (event) => {

        event.preventDefault();

        console.log('TESTE 1: clicou em Encerrar e seguir');

        const ok =
          await calculateOrder();

        console.log('TESTE 2: calculateOrder terminou:', ok);

        if (!ok) {
          return;
        }

        console.log('TESTE 3: antes de setStep(3)');

        $('orderSummary')
          .textContent =
          calculatedOrder
            .mensagem;

        $('finalTotal')
          .textContent =
          `Total: ${money(
            calculatedOrder.total
          )}`;

        setStep(3);

        console.log('TESTE 4: depois de setStep(3)');
      };




    /* WHATSAPP */
    function sendWA(number) {
      const text = encodeURIComponent(calculatedOrder.mensagem);

      // Pega o número dinâmico do config.json
      const waNumber = restauranteConfig?.whatsapp || number || "5581920036280";

      // Limpa para deixar apenas números
      const cleanNumber = String(waNumber).replace(/\D/g, '');

      window.open(
        `https://wa.me/${cleanNumber}?text=${text}`,
        '_blank',
        'noopener'
      );
    }

    /* ENVIAR PEDIDO AO RESTAURANTE (PROTEGIDO VIA BACKEND) */
    $('sendRestaurant').onclick = async () => {
      if (!calculatedOrder) return;

      const PRATOS_COMPLETOS = ['Arrumadinho', 'Feijoada', 'Yakisoba'];
      let summaryText = $('orderSummary').innerText;

      const temPratoCompleto = PRATOS_COMPLETOS.some(prato =>
        summaryText.toLowerCase().includes(prato.toLowerCase())
      );

      if (!temPratoCompleto && calculatedOrder.guarnicoesCount === 0) {
        alert('Por favor, selecione as guarnições antes de enviar o pedido.');
        return;
      }

      // ==========================================
      // 🛡️ BLINDAGEM DO PIX (COM O NOME CORRETO!)
      // ==========================================
      try {
        const pixSeguro = typeof restauranteConfig !== 'undefined'
          ? restauranteConfig.chavePix
          : null;

        if (pixSeguro) {
          summaryText += `\n\n💳 *Pagamento via PIX:*\n`;
          summaryText += `Chave: ${pixSeguro}\n`;
          summaryText += `(Por favor, envie o comprovante por aqui!)`;
        }
      } catch (erro) {
        console.log('Erro ao adicionar PIX:', erro);
      }
      // ==========================================

      try {
        const response = await fetch(
          'https://sistema-delivery-backend.vercel.app/api/create-whatsapp-link',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(
              { orderSummary: summaryText }
            )
          }
        );

        if (!response.ok) {
          throw new Error(`Erro do servidor: ${response.status}`);
        }

        const data = await response.json();

        if (data.url) {
          window.open(data.url, '_blank');
          closeOverlay('orderOverlay');
          resetOrder();
        } else {
          alert('Erro ao gerar o link para o WhatsApp.');
        }
      } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Erro de conexão ao enviar o pedido.');
      }
    };

    /* RESET */
    function resetOrder() {
      orderState = null;
      calculatedOrder = null;
      $('customerName').value = ''; $('customerPhone').value = '';
      $('customerAddress').value = ''; $('mealCount').value = 1;
    }

    /* =====================================================
       ADMIN
       ===================================================== */

    $('openAdmin').onclick = () => {
      clearErr('adminError');
      $('adminLogin').classList.remove('hidden');
      $('adminPanel').classList.add('hidden'); $('adminPassword').value = '';
      openOverlay('adminOverlay');
    };

    $('closeAdminLogin').onclick = () => closeOverlay('adminOverlay');

    /* LOGIN */
    $('adminLoginBtn').onclick = async () => {
      clearErr('adminError');

      const response = await fetch(
        'https://sistema-delivery-backend.vercel.app/api/admin/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            username: $('adminUser').value,
            password: $('adminPassword').value
          })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return showErr(
          'adminError',
          data.erro || 'Falha no login.'
        );
      }

      adminDraft = menu.map(x => ({ ...x }));
      renderAdmin();
      $('adminLogin').classList.add('hidden'); $('adminPanel').classList.remove('hidden');
    };

    /* ADMIN RENDER */
    function renderAdmin() {
      const groups = [
        ['Guarnições', ['Guarnições', 'Guarnição']],
        ['Proteínas', ['Proteínas', 'Proteína']],
        ['Bebidas', ['Bebidas', 'Bebida', 'Bebidas e Sucos', 'Gaseificadas', 'Sucos Naturais 350ml', 'Polpas 500ml']],
        ['Sobremesas', ['Sobremesas', 'Sobremesa']]
      ];

      $('adminItems').innerHTML = groups.map(([title, cats]) => {
        const catAceites = cats.map(c => c.trim().toLowerCase());
        return `
          <div class="admin-section">
            <h3>${title}</h3>
            ${adminDraft
            .filter(x => {
              if (!x || !x.categoria) return false;
              const catBanco = x.categoria.trim().toLowerCase();
              return catAceites.includes(catBanco);
            })
            .map(x => `
                <div class="admin-item">
                  <span>${esc(x.nome)}</span>
                  <label class="switch">
                    <input type="checkbox" data-admin-id="${x.id}" ${x.disponivel ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>
              `).join('')}
          </div>
        `;
      }).join('');
    }

    /* ALTERAR SWITCH */
    $('adminItems').addEventListener('change', e => {
      const id = e.target.dataset.adminId;
      if (!id) return;
      const item = adminDraft.find(i => i.id === id);
      if (item) item.disponivel = e.target.checked;
    });

    /* SALVAR ADMIN */
    $('adminSave').onclick = async () => {
      const response = await fetch('https://sistema-delivery-backend.vercel.app/api/admin/menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          changes: adminDraft.map(x => ({
            id: x.id,
            disponivel: x.disponivel
          }))
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          showErr('adminError', 'Sua sessão expirou. Faça login novamente.');
          $('adminLogin').classList.remove('hidden'); $('adminPanel').classList.add('hidden');
        } else {
          showErr('adminError', data.erro || 'Não foi possível salvar.');
        }
        return;
      }

      menu = data.itens;
      renderMenu();
      alert('Alterações salvas.');
      closeOverlay('adminOverlay');
    };

    /* LOGOUT */
    $('adminClose').onclick = async () => {
      await fetch('/api/admin/logout', { method: 'POST' }).catch(() => { });
      closeOverlay('adminOverlay');
    };

    closeOverlay('adminOverlay');

    /* CONFIGURAÇÃO DINÂMICA DO RESTAURANTE */
    let restauranteConfig = {};

    async function carregarConfiguracoes() {
      try {
        const resposta = await fetch('/api/config');
        if (resposta.ok) {
          restauranteConfig = await resposta.json();
          console.log('Configurações carregadas com sucesso:', restauranteConfig);

          const elementoNome = document.getElementById('nome-restaurante');
          if (elementoNome && restauranteConfig.nomeRestaurante) {
            elementoNome.textContent = restauranteConfig.nomeRestaurante;
          }

          const linkWa = document.getElementById('wa-float-link');
          if (linkWa && restauranteConfig.whatsapp) {
            const numeroLimpo = String(restauranteConfig.whatsapp).replace(/\D/g, '');
            linkWa.href = `https://wa.me/${numeroLimpo}`;
          }
        }
      } catch (erro) {
        console.error('Erro ao buscar /api/config:', erro);
      }
    }

    /* INICIAR */
    carregarConfiguracoes();
    loadMenu();