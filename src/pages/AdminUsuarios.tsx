import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Users, Calendar, ArrowLeft, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AdminUsuarios = () => {
  const { isAdmin, pendingUsers, approveUser, denyUser, loading } = useAdminAuth();
  const navigate = useNavigate();

  // Redirect if not admin
  if (!loading && !isAdmin) {
    navigate('/');
    return null;
  }

  const handleApproveUser = async (userId: string, userName: string) => {
    const result = await approveUser(userId);
    
    if (result.success) {
      toast({
        title: "Usuário aprovado",
        description: `${userName} foi aprovado e pode fazer login.`,
      });
      console.log('[AdminApproval]', userId);
    } else {
      toast({
        title: "Erro ao aprovar usuário",
        description: "Tente novamente em alguns momentos.",
        variant: "destructive",
      });
    }
  };

  const handleDenyUser = async (userId: string, userName: string) => {
    const result = await denyUser(userId);
    
    if (result.success) {
      toast({
        title: "Usuário negado",
        description: `Cadastro de ${userName} foi rejeitado e removido do sistema.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Erro ao negar usuário",
        description: "Tente novamente em alguns momentos.",
        variant: "destructive",
      });
    }
  };

  const handleBackToApp = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToApp}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao App
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Painel de Aprovação de Usuários
        </h1>
        <p className="text-muted-foreground">
          Gerencie aprovações de novos usuários do sistema DisfagiaMonitor
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários Pendentes de Aprovação
          </CardTitle>
          <CardDescription>
            {pendingUsers.length} usuário(s) aguardando aprovação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Não há usuários pendentes de aprovação no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2 sm:space-y-1 mb-4 sm:mb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {user.nome || 'Nome não informado'}
                      </h3>
                      <Badge variant="secondary" className="w-fit">
                        {user.tipo_usuario === 'fonoaudiologo' ? 'Fonoaudiólogo' : 'Cuidador'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Cadastrado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => handleApproveUser(user.id, user.nome)}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                      size="sm"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => handleDenyUser(user.id, user.nome)}
                      variant="destructive"
                      className="flex-1 sm:flex-none"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Negar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsuarios;