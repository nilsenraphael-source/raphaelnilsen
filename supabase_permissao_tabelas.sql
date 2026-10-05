-- =========================================================================
-- SISTEMA FINANCEIRO RAPHAEL NILSEN
-- Script de Liberação Completa de Acesso (RLS & Permissões) para as Tabelas
-- Execute este script no SQL Editor do Supabase para liberar inserções e edições
-- =========================================================================

-- 1. Permissões de Esquema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Políticas de Acesso Total (Leitura, Inserção, Atualização e Exclusão)
-- Garante funcionamento 100% automático mesmo com RLS ativo no Supabase

-- contas_bancarias
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_Contas" ON public.contas_bancarias;
CREATE POLICY "Permissao_Total_Contas" ON public.contas_bancarias FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- receitas
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_Receitas" ON public.receitas;
CREATE POLICY "Permissao_Total_Receitas" ON public.receitas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- despesas_fixas
ALTER TABLE public.despesas_fixas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_DespFixas" ON public.despesas_fixas;
CREATE POLICY "Permissao_Total_DespFixas" ON public.despesas_fixas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- despesas_variaveis
ALTER TABLE public.despesas_variaveis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_DespVar" ON public.despesas_variaveis;
CREATE POLICY "Permissao_Total_DespVar" ON public.despesas_variaveis FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- compras_cartao
ALTER TABLE public.compras_cartao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_Cartao" ON public.compras_cartao;
CREATE POLICY "Permissao_Total_Cartao" ON public.compras_cartao FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- investimentos_bolsa
ALTER TABLE public.investimentos_bolsa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_Bolsa" ON public.investimentos_bolsa;
CREATE POLICY "Permissao_Total_Bolsa" ON public.investimentos_bolsa FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- investimentos_caixinhas
ALTER TABLE public.investimentos_caixinhas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_Caixinhas" ON public.investimentos_caixinhas;
CREATE POLICY "Permissao_Total_Caixinhas" ON public.investimentos_caixinhas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- troco_jotur
ALTER TABLE public.troco_jotur ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_Jotur" ON public.troco_jotur;
CREATE POLICY "Permissao_Total_Jotur" ON public.troco_jotur FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- cofre_senhas
ALTER TABLE public.cofre_senhas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_Senhas" ON public.cofre_senhas;
CREATE POLICY "Permissao_Total_Senhas" ON public.cofre_senhas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- sonhos_metas
ALTER TABLE public.sonhos_metas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_Sonhos" ON public.sonhos_metas;
CREATE POLICY "Permissao_Total_Sonhos" ON public.sonhos_metas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- bombeiro_ressarcimento
ALTER TABLE public.bombeiro_ressarcimento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_Bombeiro" ON public.bombeiro_ressarcimento;
CREATE POLICY "Permissao_Total_Bombeiro" ON public.bombeiro_ressarcimento FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- financial_vault
ALTER TABLE public.financial_vault ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permissao_Total_Vault" ON public.financial_vault;
CREATE POLICY "Permissao_Total_Vault" ON public.financial_vault FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
