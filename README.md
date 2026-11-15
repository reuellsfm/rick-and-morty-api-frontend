# Rick and Morty - Personagens

Projeto da disciplina **Web Development Front-End**: site estático que consome a
[Rick and Morty API](https://rickandmortyapi.com/) e cria os cards dos personagens
dinamicamente com JavaScript.

## Tecnologias
- HTML5
- CSS3 puro (sem frameworks)
- JavaScript puro (`fetch`, `then`, `createElement`, `appendChild`)

## Funcionalidades
- Cards gerados automaticamente a partir da API (nome, imagem, status, espécie, gênero, origem e localização)
- Botão de favorito (coração) em cada card
- Busca de personagem pelo nome
- Botão "Carregar mais" (paginação da API)
- Layout responsivo (computador e celular)

## Como executar
Basta abrir o arquivo `index.html` no navegador. Não precisa instalar nada nem usar token.

## Estrutura
```
index.html   -> estrutura da página (container vazio para os cards)
style.css    -> visual e responsividade
script.js    -> consumo da API e criação dos cards
sem-imagem.svg -> imagem padrão quando a foto não carrega
```
