-- ============================================================================
-- Segmento comercial (roteiro de diagnóstico por segmento, 2026-07-13).
-- Eixo de ROTEAMENTO comercial: define quais perguntas de qualificação se
-- aplicam ao lead (empilhadeira não se pergunta a síndico; assembleia não se
-- pergunta a gerente industrial). Complementa tipo_imovel (eixo físico).
-- A função whatsapp-triagem é retrocompatível: sem a coluna, grava só v1/v2.
-- ============================================================================

ALTER TABLE public.contatos
  ADD COLUMN IF NOT EXISTS segmento TEXT
    CHECK (segmento IN ('condominio', 'industria', 'alimenticio', 'comercio_auto',
                        'obra_nova', 'residencial') OR segmento IS NULL);

COMMENT ON COLUMN public.contatos.segmento IS
  'Segmento comercial p/ roteiro de diagnóstico: condominio (síndico/assembleia) | industria (empilhadeira/parada) | alimenticio (vigilância/choque térmico) | comercio_auto (estética/vaga parada) | obra_nova (cura 28d/prazo de entrega) | residencial (roteiro curto PF)';
