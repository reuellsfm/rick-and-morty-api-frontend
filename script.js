// Endereço base da API (pública, sem token)
const API_URL = 'https://rickandmortyapi.com/api/character';

// Pegando os elementos do HTML
const listaCards = document.getElementById('lista-cards');
const mensagem = document.getElementById('mensagem');
const btnMais = document.getElementById('btnMais');
const inputBusca = document.getElementById('busca');
const btnBuscar = document.getElementById('btnBuscar');

// Guarda o link da próxima página que a API devolve
let proximaPagina = null;
let totalPaginas = 1;

// Traduções para exibir em português
const traducaoStatus = { Alive: 'Vivo', Dead: 'Morto', unknown: 'Desconhecido' };
const traducaoGenero = { Male: 'Masculino', Female: 'Feminino', Genderless: 'Sem gênero', unknown: 'Desconhecido' };

// 1) BUSCA OS DADOS NA API COM FETCH
// "tentativa" serve para tentar de novo se a internet/API falhar
function buscarPersonagens(url, limpar, tentativa = 1) {
  mensagem.textContent = 'Carregando personagens...';
  btnMais.disabled = true; // evita vários cliques enquanto carrega
  cota--; // a chamada da API também conta no limite de pedidos (ver item 3)

  fetch(url)
    .then(function (resposta) {
      if (resposta.status === 404) {
        throw new Error('Nenhum personagem encontrado');
      }
      if (!resposta.ok) {
        throw new Error('Erro ao acessar a API');
      }
      return resposta.json(); // converte a resposta para objeto JS
    })
    .then(function (dados) {
      console.log('Dados recebidos da API:', dados); // para mostrar no console

      if (limpar) {
        listaCards.innerHTML = '';
      }

      // percorre a lista de personagens e cria um card para cada um
      dados.results.forEach(function (personagem) {
        criarCard(personagem);
      });

      proximaPagina = dados.info.next;
      totalPaginas = dados.info.pages;
      btnMais.style.display = proximaPagina ? 'block' : 'none';
      btnMais.disabled = false;
      mensagem.textContent = 'Total de personagens encontrados: ' + dados.info.count;
    })
    .catch(function (erro) {
      // busca sem resultado: limpa a lista e avisa
      if (erro.message === 'Nenhum personagem encontrado') {
        listaCards.innerHTML = '';
        btnMais.style.display = 'none';
        mensagem.textContent = erro.message;
        return;
      }

      // falha de conexão: a API bloqueia por até 10 segundos quando recebe muitos
      // pedidos seguidos (as fotos também contam). Espera 3 s, depois 6 s, depois 10 s.
      // O "&t=" muda a URL para não pegar uma resposta antiga do cache da API.
      const esperas = [3, 6, 10];
      if (tentativa <= esperas.length) {
        const segundos = esperas[tentativa - 1];
        mensagem.textContent = 'A API recebeu muitos pedidos seguidos. Tentando de novo em ' + segundos + ' s...';
        const novaUrl = url.split('&t=')[0] + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
        setTimeout(function () {
          buscarPersonagens(novaUrl, limpar, tentativa + 1);
        }, segundos * 1000);
        return;
      }

      // não apaga os cards que já estão na tela
      btnMais.disabled = false;
      mensagem.textContent = 'Falha na conexão com a API. Clique em "Carregar mais" ou "Buscar" para tentar de novo.';

      // se uma página não carregar de jeito nenhum, pula para a próxima para o site não travar
      const pagina = url.match(/page=(\d+)/);
      if (pagina && Number(pagina[1]) < totalPaginas) {
        proximaPagina = url.split('&t=')[0].replace(/page=\d+/, 'page=' + (Number(pagina[1]) + 1));
        mensagem.textContent = 'A página ' + pagina[1] + ' não carregou. Clique em "Carregar mais" para continuar.';
      }
    });
}

// 2) CRIA O CARD DINAMICAMENTE COM createElement + appendChild
function criarCard(personagem) {
  const card = document.createElement('div');
  card.classList.add('card');

  // Botão de favorito (coração)
  const favorito = document.createElement('button');
  favorito.classList.add('favorito');
  favorito.textContent = '♡';
  favorito.title = 'Favoritar';
  favorito.addEventListener('click', function () {
    favorito.textContent = favorito.textContent === '♡' ? '♥' : '♡';
  });

  // Nome
  const nome = document.createElement('h3');
  nome.textContent = personagem.name;

  // Imagem (o endereço da foto é colocado pela fila de fotos, no fim do arquivo)
  const imagem = document.createElement('img');
  imagem.alt = personagem.name;

  // quando a foto carrega, guarda o endereço para não gastar cota de novo
  imagem.addEventListener('load', function () {
    fotosCarregadas.add(personagem.image);
  });

  // se a foto não carregar: volta para a fila e tenta de novo (até 3 vezes);
  // depois disso, mostra uma imagem padrão
  let errosImagem = 0;
  imagem.addEventListener('error', function () {
    if (imagem.src.includes('sem-imagem.svg')) return;
    errosImagem++;
    cota = Math.min(cota, -3); // a API bloqueou: a fila dá uma pausa
    if (errosImagem <= 3) {
      pedirFoto(imagem, personagem.image + '?t=' + Date.now());
    } else {
      imagem.src = 'sem-imagem.svg';
    }
  });

  // Status (vivo, morto, desconhecido)
  const status = document.createElement('p');
  status.classList.add('status', personagem.status.toLowerCase());
  status.textContent = (traducaoStatus[personagem.status] || personagem.status) + ' - ' + personagem.species;

  // Informações adicionais
  const genero = document.createElement('p');
  genero.textContent = 'Gênero: ' + (traducaoGenero[personagem.gender] || personagem.gender);

  const origem = document.createElement('p');
  origem.textContent = 'Origem: ' + personagem.origin.name;

  const local = document.createElement('p');
  local.textContent = 'Última localização: ' + personagem.location.name;

  // Monta o card colocando cada elemento dentro dele
  card.appendChild(favorito);
  card.appendChild(nome);
  card.appendChild(imagem);
  card.appendChild(status);
  card.appendChild(genero);
  card.appendChild(origem);
  card.appendChild(local);

  // Coloca o card dentro da lista na página
  listaCards.appendChild(card);

  // Pede a foto pela fila
  pedirFoto(imagem, personagem.image);
}

// 3) FILA DE FOTOS
// A API bloqueia por alguns segundos quem faz muitos pedidos seguidos
// (cerca de 20 a cada 10 s, e cada foto conta como um pedido).
// Por isso as fotos não são pedidas todas de uma vez: entram numa fila
// e saem no ritmo que a API aceita, usando uma "cota" de pedidos.
const COTA_MAXIMA = 10;   // quantas fotos podem ser pedidas de uma vez
const RECARGA_MS = 600;   // a cada 0,6 s a cota ganha mais 1 pedido
let cota = COTA_MAXIMA;
const filaFotos = [];
const fotosCarregadas = new Set(); // fotos que o navegador já tem guardadas

function pedirFoto(imagem, url) {
  // foto já carregada antes: o navegador tem no cache, não gasta cota
  if (fotosCarregadas.has(url)) {
    imagem.src = url;
    return;
  }
  filaFotos.push({ imagem: imagem, url: url });
  processarFila();
}

function processarFila() {
  while (cota > 0 && filaFotos.length > 0) {
    const item = filaFotos.shift();
    if (!item.imagem.isConnected) continue; // card apagado por uma nova busca
    cota--;
    item.imagem.src = item.url;
  }
}

// recarrega a cota aos poucos e continua a fila
setInterval(function () {
  if (cota < COTA_MAXIMA) {
    cota++;
  }
  processarFila();
}, RECARGA_MS);

// 4) EVENTOS DOS BOTÕES
btnMais.addEventListener('click', function () {
  if (proximaPagina) {
    buscarPersonagens(proximaPagina, false);
  }
});

function pesquisar() {
  const nome = inputBusca.value.trim();
  buscarPersonagens(API_URL + '?name=' + encodeURIComponent(nome), true);
}

btnBuscar.addEventListener('click', pesquisar);
inputBusca.addEventListener('keyup', function (evento) {
  if (evento.key === 'Enter') {
    pesquisar();
  }
});

// Carrega a primeira página assim que o site abre
buscarPersonagens(API_URL, true);
