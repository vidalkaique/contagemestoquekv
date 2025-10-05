import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface Estoque {
  id: string;
  nome: string;
  created_at: string;
}

function StocksPage() {
  const { toast } = useToast();
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [newEstoqueName, setNewEstoqueName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstoques();
  }, []);

  const fetchEstoques = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("estoques").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Erro ao buscar estoques:", error);
      toast({
        title: "Erro",
        description: "Erro ao buscar estoques.",
        variant: "destructive",
      });
    } else {
      setEstoques(data || []);
    }
    setLoading(false);
  };

  const handleAddEstoque = async () => {
    if (!newEstoqueName.trim()) {
      toast({
        title: "Aviso",
        description: "O nome do estoque não pode ser vazio.",
        variant: "default",
      });
      return;
    }

    const { data, error } = await supabase
      .from("estoques")
      .insert([{ nome: newEstoqueName.trim() }])
      .select();

    if (error) {
      console.error("Erro ao adicionar estoque:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar estoque.",
        variant: "destructive",
      });
    } else if (data) {
      toast({
        title: "Sucesso",
        description: `Estoque "${data[0].nome}" adicionado com sucesso!`,
        variant: "default",
      });
      setEstoques([data[0], ...estoques]);
      setNewEstoqueName("");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gestão de Estoques</h1>

      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Adicionar Novo Estoque</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newEstoqueName}
            onChange={(e) => setNewEstoqueName(e.target.value)}
            placeholder="Ex: Estoque 11, Matriz, Filial SP"
            className="input input-bordered w-full"
          />
          <button onClick={handleAddEstoque} className="btn btn-primary">
            Adicionar
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Estoques Cadastrados</h2>
        {loading ? (
          <p>Carregando estoques...</p>
        ) : estoques.length > 0 ? (
          <ul className="space-y-2">
            {estoques.map((estoque) => (
              <li key={estoque.id} className="p-3 bg-base-200 rounded-lg">
                {estoque.nome}
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum estoque cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}

export default StocksPage;
