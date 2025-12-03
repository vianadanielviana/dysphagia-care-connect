import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
}

interface Paciente {
  id: string;
  nome: string;
  professional_id?: string;
  caregiver_id?: string;
}

interface DelegacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: Paciente | null;
  usuarios: Usuario[];
  onSuccess: () => void;
}

const DelegacaoModal = ({
  open,
  onOpenChange,
  paciente,
  usuarios,
  onSuccess,
}: DelegacaoModalProps) => {
  const [professionalId, setProfessionalId] = useState<string>('none');
  const [caregiverId, setCaregiverId] = useState<string>('none');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (paciente) {
      setProfessionalId(paciente.professional_id || 'none');
      setCaregiverId(paciente.caregiver_id || 'none');
    }
  }, [paciente]);

  const handleSave = async () => {
    if (!paciente) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('pacientes')
        .update({
          professional_id: professionalId === 'none' ? null : professionalId,
          caregiver_id: caregiverId === 'none' ? null : caregiverId,
        })
        .eq('id', paciente.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Responsáveis atualizados com sucesso',
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao delegar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar responsáveis',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const profissionais = usuarios.filter(
    (u) => u.tipo_usuario === 'fonoaudiologo' || u.tipo_usuario === 'admin' || u.tipo_usuario === 'nutricionista'
  );
  const cuidadores = usuarios.filter((u) => u.tipo_usuario === 'cuidador');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Delegar Responsáveis
          </DialogTitle>
          <DialogDescription>
            Defina o profissional e cuidador responsáveis por{' '}
            <strong>{paciente?.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Profissional Responsável</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {profissionais.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.nome} ({usuario.tipo_usuario})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cuidador Responsável</Label>
            <Select value={caregiverId} onValueChange={setCaregiverId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cuidador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {cuidadores.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DelegacaoModal;
