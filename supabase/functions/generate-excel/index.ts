import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Workbook } from "https://esm.sh/exceljs@4.4.0";

// Configuração dos headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extrair o ID da contagem da URL
    const url = new URL(req.url);
    const contagemId = url.pathname.split("/").pop();

    if (!contagemId) {
      return new Response(
        JSON.stringify({ error: "ID da contagem não fornecido" }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Buscar dados da contagem
    const { data: contagem, error: contagemError } = await supabaseClient
      .from("contagens")
      .select(`
        id,
        data,
        itens_contagem (
          id,
          produto_id,
          nome_livre,
          pallets,
          lastros,
          pacotes,
          unidades,
          total,
          produtos (
            id,
            codigo,
            nome,
            unidades_por_pacote,
            pacotes_por_lastro,
            lastros_por_pallet
          )
        )
      `)
      .eq("id", contagemId)
      .single();

    if (contagemError) throw contagemError;
    if (!contagem) throw new Error("Contagem não encontrada");

    // Criar workbook
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet("Contagem");

    // Configurar colunas
    worksheet.columns = [
      { header: "Código", key: "codigo", width: 15 },
      { header: "Produto", key: "nome", width: 30 },
      { header: "Pallets", key: "pallets", width: 10 },
      { header: "Lastros", key: "lastros", width: 10 },
      { header: "Pacotes", key: "pacotes", width: 10 },
      { header: "Unidades", key: "unidades", width: 10 },
      { header: "Total", key: "total", width: 15 },
    ];

    // Adicionar dados
    contagem.itens_contagem.forEach((item) => {
      worksheet.addRow({
        codigo: item.produtos?.codigo || "N/A",
        nome: item.produtos?.nome || item.nome_livre || "N/A",
        pallets: item.pallets || 0,
        lastros: item.lastros || 0,
        pacotes: item.pacotes || 0,
        unidades: item.unidades || 0,
        total: item.total || 0,
      });
    });

    // Estilizar cabeçalho
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Gerar buffer do Excel
    const buffer = await workbook.xlsx.writeBuffer();

    // Retornar arquivo
    return new Response(buffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="contagem_${contagemId}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar Excel:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao gerar arquivo Excel" }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
}); 