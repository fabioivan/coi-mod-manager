---
name: commit
description: >
  Roda o build do projeto, analisa as alterações e gera mensagem de commit
  em português no padrão Conventional Commits. Sem co-autor.
  Usar quando o usuário pedir para commitar ou gerar mensagem de commit.
user_invocable: true
model: sonnet
---

# Gerar Commit — CoI Mod Manager

Siga os passos abaixo RIGOROSAMENTE.

## Passo 1 — Verificar repositório

Confirme que está no diretório do projeto `coi-mod-manager` e que é um repositório git válido.

## Passo 2 — Rodar o build

Este projeto é Tauri (Rust + Node). Execute na ordem:

```bash
npm run build
```
```bash
cd src-tauri && cargo check
```

**Se qualquer um falhar: PARE.** Reporte o erro exato e não prossiga com o commit.  
Só continue se ambos passarem.

## Passo 3 — Analisar as alterações

Execute:
- `git diff --cached --stat` e `git diff --cached` (arquivos stageados)
- Se não houver staged: `git diff --stat` e `git diff`
- `git log --oneline -5` para entender o padrão do histórico

## Passo 4 — Gerar a mensagem de commit

Formato **Conventional Commits em português**, verbos no **pretérito perfeito**:

```
<tipo>(<escopo>): <descrição concisa>

- <bullet descrevendo uma alteração lógica>
- <bullet descrevendo outra alteração>
```

### Regras da mensagem

- Subject ≤ 50 caracteres
- Escopo opcional — use quando ajudar a localizar a mudança (ex: `ui`, `db`, `scraper`, `commands`)
- Corpo com bullets somente quando o "por quê" não for óbvio pelo subject
- Verbos: "adicionado", "corrigido", "refatorado", "removido", "atualizado", "implementado"
- **Nunca** adicionar linha `Co-Authored-By`

### Tipos

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `chore` | Tarefas de manutenção, dependências |
| `docs` | Documentação |
| `test` | Testes |
| `build` | Build, CI, configurações |
| `ui` | Alterações visuais/frontend sem nova feature |

### Exemplos

```
feat(scraper): adicionado parsing de mods por categoria
```

```
fix(db): corrigido upsert que sobrescrevia version_installed

- Ajustado query para preservar version_installed quando mod já existe
- Adicionado índice em last_scraped_at para acelerar queries de throttle
```

```
chore: atualizado tauri-plugin-sql para 2.1.0
```

## Passo 5 — Verificar arquivos não stageados

Execute `git status --short`. Se houver arquivos modificados/untracked não stageados (linhas `??`, ` M`, ` D`), liste-os ao usuário.

## Passo 6 — Apresentar ao usuário

Mostre a mensagem gerada e pergunte:

1. **Commitar somente os stageados** — `git commit -m "<mensagem>"`
2. **Adicionar arquivos não stageados antes** *(só exibir se houver)* — liste os pendentes, pergunte quais adicionar, execute `git add <arquivos>` e depois o commit
3. **Ajustar a mensagem** antes de commitar
4. **Apenas copiar a mensagem** sem commitar

**NUNCA** execute `git add -A` ou `git add .` automaticamente.
