import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  nome: string;
  tipo_usuario: string;
  created_at: string;
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getUser();
      const email = sessionData.user?.email;

      if (email !== 'viana.vianadaniel@outlook.com') {
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Apenas o admin pode acessar essa página.",
        });
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nome, tipo_usuario, created_at')
        .eq('is_approved', false);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao buscar usuários pendentes.",
        });
      } else {
        setUsuarios(data || []);
      }

      setLoading(false);
    })();
  }, []);

  const aprovarUsuario = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao aprovar usuário.",
      });
    } else {
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      toast({
        title: "Usuário aprovado",
        description: "Usuário aprovado com sucesso!",
      });
      console.log('[AdminApproval]', id);
    }
  };

  if (loading) return <p className="p-4">Carregando usuários...</p>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Usuários Pendentes</h1>
      {usuarios.length === 0 ? (
        <p>Nenhum usuário pendente para aprovação.</p>
      ) : (
        <ul className="space-y-4">
          {usuarios.map((user) => (
            <li
              key={user.id}
              className="border p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between"
            >
              <div className="mb-2 md:mb-0">
                <p className="font-medium">{user.nome} ({user.tipo_usuario})</p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-400">
                  Criado em: {new Date(user.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => aprovarUsuario(user.id)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl"
              >
                Aprovar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}