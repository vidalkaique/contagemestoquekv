# contadordeestoque - Sistema de Controle de Estoque

## 📋 Visão Geral
O Contadordeestoque é um sistema de gerenciamento de inventário desenvolvido para controle de estoque, permitindo a contagem de itens, gerenciamento de produtos e geração de relatórios.

## 🚀 Tecnologias Utilizadas

### Frontend
- **React** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Adiciona tipagem estática ao JavaScript
- **Vite** - Build tool e servidor de desenvolvimento
- **TanStack Query** - Gerenciamento de estado e cache de dados
- **Shadcn/ui** - Componentes de UI acessíveis e estilizáveis
- **Radix UI** - Componentes primitivos acessíveis
- **Tailwind CSS** - Framework CSS utilitário
- **Date-fns** - Manipulação de datas
- **Zod** - Validação de esquemas
- **React Hook Form** - Gerenciamento de formulários
- **React Router** - Navegação entre páginas
- **XLSX** - Geração de planilhas Excel
- **Luxon** - Manipulação de datas e horas

### Backend
- **Supabase** - Backend como serviço (BaaS) com PostgreSQL
- **PostgreSQL** - Banco de dados relacional
- **Supabase Auth** - Autenticação de usuários
- **Supabase Realtime** - Atualizações em tempo real

## 🛠️ Configuração do Ambiente

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm ou yarn
- Conta no Supabase
- PostgreSQL (para desenvolvimento local, opcional)

### Instalação

1. **Clonar o repositório**
   ```bash
   git clone https://github.com/vidalkaique/contagemestoquekv.git
   cd contagemestoquekv
   ```

2. **Instalar dependências**
   ```bash
   npm install
   # ou
   yarn
   ```

3. **Configurar variáveis de ambiente**
   Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   ```

4. **Iniciar o servidor de desenvolvimento**
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

## 📦 Estrutura do Projeto

```
contagemestoquekv/
├── client/                 # Aplicação frontend
│   ├── public/             # Arquivos estáticos
│   ├── src/                # Código-fonte
│   │   ├── assets/         # Recursos estáticos (imagens, ícones)
│   │   ├── components/     # Componentes React reutilizáveis
│   │   ├── hooks/          # Hooks personalizados
│   │   ├── lib/            # Utilitários e configurações
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── App.tsx         # Componente raiz
│   │   └── main.tsx        # Ponto de entrada
│   └── ...
├── migrations/             # Migrações do banco de dados
├── shared/                 # Código compartilhado entre frontend e backend
└── ...
```

## 🔄 Funcionalidades Principais

### Módulo de Contagem
- Contagem de itens por pallet, lastro e pacotes
- Cálculo automático de totais
- Suporte a múltiplos produtos
- Histórico de contagens

### Gerenciamento de Produtos
- Cadastro e edição de produtos
- Definição de conversões (unidades por pacote, pacotes por lastro, etc.)
- Busca e filtragem de produtos

### Relatórios
- Exportação para Excel
- Histórico de contagens
- Relatórios de divergências

### Autenticação
- Proteção de rotas
- Gerenciamento de sessão

## 🛡️ Segurança

### Armazenamento Seguro
- Dados sensíveis são armazenados de forma segura no Supabase
- Controle de acesso baseado em funções (RBAC)
- Validação de dados no cliente e servidor

### Autenticação
- Sessões gerenciadas pelo Supabase Auth
- Tokens JWT para autenticação
- Proteção contra CSRF

## 📊 Banco de Dados

### Principais Tabelas
- `contagens` - Armazena as contagens realizadas
- `itens_contagem` - Itens contados em cada contagem
- `produtos` - Cadastro de produtos
- `estoques` - Controle de estoques


## 🧪 Testes

### Executando Testes
```bash
npm test
# ou
yarn test
```

## 🚀 Deploy

### Produção
O deploy pode ser feito em qualquer serviço de hospedagem estática (Vercel, Netlify, etc.) ou em um servidor próprio.

### Variáveis de Ambiente de Produção
Certifique-se de configurar as seguintes variáveis de ambiente no ambiente de produção:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Faça commit das suas alterações (`git commit -m 'Add some AmazingFeature'`)
4. Faça push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request


## 👨‍💻 Desenvolvedor

- **Kaique Vidal** - [GitHub](https://github.com/vidalkaique)


---

<div align="center">
  Desenvolvido por Kaique Azevedo
</div>
