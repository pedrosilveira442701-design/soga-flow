

# Corrigir Salvamento das Preferências de Notificação

## Problema

O `updatePreferences` usa `.update().eq("user_id", ...)` sem verificar se linhas foram realmente atualizadas. Quando o Supabase retorna `{ data: null, error: null }` (0 linhas afetadas por timeout ou RLS), o sistema mostra "sucesso" sem ter salvo nada. Além disso, os switches não refletem visualmente a mudança até o refetch completar.

## Mudanças

### Arquivo: `src/hooks/useNotificationPreferences.tsx`

1. **Adicionar `.select().single()` após o `.update()`** para confirmar que a atualização realmente persistiu e detectar falhas silenciosas
2. **Adicionar `{ count: 'exact' }` ou verificar `data` retornado** para garantir que pelo menos 1 linha foi afetada
3. **Adicionar `onMutate` com optimistic update** no React Query para que os switches reflitam a mudança imediatamente, com rollback automático se falhar

Mudança principal no `mutationFn`:

```typescript
// De:
const { error } = await supabase
  .from("notificacao_preferencias")
  .update(updates)
  .eq("user_id", user.id);
if (error) throw error;

// Para:
const { data, error } = await supabase
  .from("notificacao_preferencias")
  .update(updates)
  .eq("user_id", user.id)
  .select()
  .single();
if (error) throw error;
if (!data) throw new Error("Nenhuma preferência atualizada");
```

Adicionar optimistic update:

```typescript
onMutate: async (updates) => {
  await queryClient.cancelQueries({ queryKey: ["notificacao_preferencias"] });
  const previous = queryClient.getQueryData(["notificacao_preferencias"]);
  queryClient.setQueryData(["notificacao_preferencias"], (old) => ({ ...old, ...updates }));
  return { previous };
},
onError: (err, updates, context) => {
  queryClient.setQueryData(["notificacao_preferencias"], context?.previous);
  toast.error("Erro ao atualizar preferências");
},
```

### Arquivo único alterado
| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useNotificationPreferences.tsx` | `.select().single()` + optimistic updates + rollback |

