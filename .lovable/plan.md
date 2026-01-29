
# Melhoria do Editor de Parcelas no Formulário de Contrato

## Problemas Identificados

Analisando a tela e o código atual do `ParcelasFormEditor.tsx`:

1. **Campo de valor muito pequeno**: O input de valor na tabela usa `w-32` (128px), que é muito estreito para valores monetários brasileiros
2. **Layout confuso**: A tabela é densa e difícil de ler
3. **Falta de formatação visual**: Os valores não mostram o prefixo "R$" de forma clara
4. **Botões de ação pequenos e sem destaque**: Os botões "Gerar Cronograma", "Distribuir Saldo" e "Adicionar Parcela" são discretos demais
5. **Fluxo não intuitivo**: O usuário não entende claramente a sequência de ações

---

## Melhorias Propostas

### 1. Ampliar o campo de valor na tabela
- Aumentar de `w-32` para `w-40` ou `w-44` 
- Adicionar prefixo visual "R$" antes do input

### 2. Melhorar o layout da tabela
- Aumentar o espaçamento entre colunas
- Usar cells com padding mais generoso
- Melhorar a legibilidade das datas

### 3. Reformular os botões de ação
- Dar mais destaque ao botão "Gerar Cronograma" (botão principal)
- Organizar os botões em uma disposição mais clara
- Adicionar tooltips explicativos

### 4. Adicionar feedback visual
- Mostrar valor formatado ao lado do input numérico
- Colorir a linha de forma diferente quando tem erro

### 5. Simplificar o fluxo
- Gerar automaticamente as parcelas quando mudar quantidade ou periodicidade (após confirmação)
- Mostrar instrução clara de uso no estado vazio

---

## Alterações Técnicas

### Arquivo: `src/components/forms/ParcelasFormEditor.tsx`

**Mudanças na tabela (linhas 374-451):**
```text
- Aumentar largura da coluna de valor de `w-32` para `w-44`
- Adicionar prefixo "R$" visual ao lado do input
- Melhorar padding das células
- Adicionar formatação visual do valor abaixo do input
```

**Mudanças nos botões (linhas 315-344):**
```text
- Reorganizar botões com hierarquia visual clara
- "Gerar Cronograma" como botão primário (variant="default")
- Outros como botões secundários
- Adicionar descrição explicativa abaixo dos controles
```

**Mudanças no header da tabela (linhas 378-385):**
```text
- Aumentar larguras mínimas das colunas
- Melhorar alinhamento dos headers
```

**Mudanças no estado vazio (linhas 477-484):**
```text
- Adicionar instruções mais claras passo-a-passo
- Mostrar ícone ilustrativo
```

---

## Resultado Esperado

Antes:
- Campo de valor pequeno e sem contexto visual
- Layout denso e confuso
- Usuário não sabe por onde começar

Depois:
- Campo de valor amplo com prefixo "R$" visível
- Layout espaçado e fácil de ler
- Fluxo claro: configurar -> gerar -> ajustar
- Feedback visual imediato sobre valores
