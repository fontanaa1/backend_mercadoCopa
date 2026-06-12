# ⚙️ Mercado da Copa - Backend (Supabase + Node.js)

**API e banco de dados para o marketplace de itens esportivos da Copa.**  
Autenticação, RLS (Row Level Security), Realtime e Storage integrados.

## 📦 Estrutura do Banco
| Tabela | Descrição |
|--------|-----------|
| `produtos` | Camisas, bonés e casacos (venda/troca) |
| `carrinho_itens` | Carrinho persistente por usuário |
| `avaliacoes` | Ratings e comentários dos vendedores |

## 🔒 Políticas RLS Ativas
- ✅ SELECT público para produtos
- ✅ INSERT/UPDATE/DELETE restrito ao dono
- ✅ Carrinho acessível apenas pelo próprio usuário

## 🚀 Recursos Supabase
- **Auth** — Login/cadastro seguro
- **Realtime** — Atualizações instantâneas (estoque, carrinho)
- **Storage** — Upload de imagens dos produtos

## 🌐 Endpoints (Exemplos)
- `GET /api/produtos` — Lista todos os produtos disponíveis
- `POST /api/carrinho` — Adiciona item ao carrinho
- `GET /api/avaliacoes/:vendedor_id` — Busca avaliações
