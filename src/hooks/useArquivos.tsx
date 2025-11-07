import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateStoragePath, validateFile, getFileSizeWarning } from "@/lib/fileUtils";

export interface Arquivo {
  id: string;
  user_id: string;
  entidade: string;
  entidade_id: string;
  tipo: string | null;
  nome: string;
  url: string;
  created_at: string;
}

export interface ArquivoWithRelations extends Arquivo {
  entidade_nome?: string;
  size?: number;
}

export interface ArquivoFilters {
  search?: string;
  entidade?: string;
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface ArquivoKPIs {
  totalArquivos: number;
  porEntidade: {
    clientes: number;
    contratos: number;
    propostas: number;
    leads: number;
    visitas: number;
  };
  uploadsMes: number;
}

export interface UploadFileData {
  file: File;
  entidade: string;
  entidade_id: string;
  tipo: string;
  nome?: string;
}

// Hook separado para buscar arquivos por entidade
export function useArquivosByEntidade(entidade: string, entidadeId: string) {
  return useQuery({
    queryKey: ["arquivos", entidade, entidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arquivos")
        .select("*")
        .eq("entidade", entidade)
        .eq("entidade_id", entidadeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Arquivo[];
    },
  });
}

export function useArquivos(filters?: ArquivoFilters) {
  const queryClient = useQueryClient();

  // Query principal com filtros
  const { data: arquivos = [], isLoading } = useQuery({
    queryKey: ["arquivos", filters],
    queryFn: async () => {
      let query = supabase
        .from("arquivos")
        .select(`
          *,
          clientes:entidade_id(nome),
          contratos:entidade_id(id),
          propostas:entidade_id(id),
          leads:entidade_id(id),
          visitas:entidade_id(id)
        `)
        .order("created_at", { ascending: false });

      if (filters?.entidade && filters.entidade !== "todos") {
        query = query.eq("entidade", filters.entidade);
      }

      if (filters?.tipo && filters.tipo !== "todos") {
        query = query.eq("tipo", filters.tipo);
      }

      if (filters?.dataInicio) {
        query = query.gte("created_at", filters.dataInicio);
      }

      if (filters?.dataFim) {
        query = query.lte("created_at", filters.dataFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ArquivoWithRelations[];
    },
  });

  // KPIs
  const { data: kpis } = useQuery({
    queryKey: ["arquivos-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arquivos")
        .select("entidade, created_at");

      if (error) throw error;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const kpis: ArquivoKPIs = {
        totalArquivos: data.length,
        porEntidade: {
          clientes: data.filter((a) => a.entidade === "cliente").length,
          contratos: data.filter((a) => a.entidade === "contrato").length,
          propostas: data.filter((a) => a.entidade === "proposta").length,
          leads: data.filter((a) => a.entidade === "lead").length,
          visitas: data.filter((a) => a.entidade === "visita").length,
        },
        uploadsMes: data.filter(
          (a) => new Date(a.created_at) >= firstDayOfMonth
        ).length,
      };

      return kpis;
    },
  });

  // Upload de arquivo
  const uploadArquivo = useMutation({
    mutationFn: async (data: UploadFileData) => {
      const { file, entidade, entidade_id, tipo, nome } = data;

      // Validar arquivo
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Aviso para arquivos grandes (não bloqueia)
      const sizeWarning = getFileSizeWarning(file.size);
      if (sizeWarning) {
        console.log(sizeWarning);
      }

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Gerar path no storage
      const storagePath = generateStoragePath(
        user.id,
        entidade,
        entidade_id,
        file.name
      );

      // Upload para storage
      const { error: uploadError } = await supabase.storage
        .from("arquivos")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("arquivos").getPublicUrl(storagePath);

      // Criar registro na tabela
      const { data: arquivo, error: dbError } = await supabase
        .from("arquivos")
        .insert({
          user_id: user.id,
          entidade,
          entidade_id,
          tipo,
          nome: nome || file.name,
          url: storagePath, // Guardamos o path, não a URL pública
        })
        .select()
        .single();

      if (dbError) {
        // Se falhar, deletar do storage
        await supabase.storage.from("arquivos").remove([storagePath]);
        throw dbError;
      }

      return arquivo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arquivos"] });
      queryClient.invalidateQueries({ queryKey: ["arquivos-kpis"] });
      toast.success("Arquivo enviado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao enviar arquivo");
    },
  });

  // Deletar arquivo
  const deleteArquivo = useMutation({
    mutationFn: async (arquivo: Arquivo) => {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from("arquivos")
        .remove([arquivo.url]);

      if (storageError) throw storageError;

      // Deletar do banco
      const { error: dbError } = await supabase
        .from("arquivos")
        .delete()
        .eq("id", arquivo.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arquivos"] });
      queryClient.invalidateQueries({ queryKey: ["arquivos-kpis"] });
      toast.success("Arquivo deletado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao deletar arquivo");
    },
  });

  // Download de arquivo
  const downloadArquivo = async (arquivo: Arquivo) => {
    try {
      const { data, error } = await supabase.storage
        .from("arquivos")
        .download(arquivo.url);

      if (error) throw error;

      // Criar URL temporária e fazer download
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = arquivo.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Registrar download no histórico
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Buscar nome do cliente se for arquivo de cliente
        let clienteNome = null;
        if (arquivo.entidade === 'cliente') {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('nome')
            .eq('id', arquivo.entidade_id)
            .single();
          clienteNome = cliente?.nome || null;
        }

        await supabase.from('arquivo_downloads').insert({
          user_id: user.id,
          arquivo_id: arquivo.id,
          entidade: arquivo.entidade,
          cliente_nome: clienteNome,
          tipo_arquivo: arquivo.tipo,
          nome_arquivo: arquivo.nome,
        });
      }

      toast.success("Download iniciado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer download");
    }
  };

  // Obter URL assinada (para preview)
  const getSignedUrl = async (storagePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("arquivos")
      .createSignedUrl(storagePath, 3600); // 1 hora

    if (error) throw error;
    return data.signedUrl;
  };

  // Renomear arquivo
  const renameArquivo = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from("arquivos")
        .update({ nome })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arquivos"] });
      toast.success("Arquivo renomeado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao renomear arquivo");
    },
  });

  return {
    arquivos,
    isLoading,
    kpis,
    uploadArquivo,
    deleteArquivo,
    downloadArquivo,
    getSignedUrl,
    renameArquivo,
  };
}

// Hook para buscar histórico de downloads
export function useDownloadHistory() {
  return useQuery({
    queryKey: ["arquivo-downloads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arquivo_downloads")
        .select("*")
        .order("downloaded_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });
}
