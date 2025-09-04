import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthForm from './AuthForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, User } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isApproved, isAdmin, loading, profile, signOut } = useAuth();

  // Debug logs
  console.log('ProtectedRoute - isAuthenticated:', isAuthenticated);
  console.log('ProtectedRoute - isApproved:', isApproved);
  console.log('ProtectedRoute - isAdmin:', isAdmin);
  console.log('ProtectedRoute - profile:', profile);

  // Se está carregando, mostrar loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não está autenticado, mostrar form de login
  if (!isAuthenticated) {
    return <AuthForm />;
  }

  // Se requer admin e não é admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se é admin, sempre pode acessar (prioridade máxima)
  if (isAdmin) {
    console.log('Admin detectado no ProtectedRoute, acesso liberado');
    return <>{children}</>;
  }

  // Se está autenticado mas perfil ainda não carregou, aguardar um pouco mais
  if (isAuthenticated && !profile) {
    console.log('Aguardando carregamento do perfil...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground">Carregando perfil...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não foi aprovado, mostrar tela de espera
  if (isAuthenticated && profile && !isApproved) {
    console.log('Usuário não aprovado no ProtectedRoute, mostrando tela de espera');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-medical-amber rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-medical-amber-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Aguardando Aprovação</h2>
            <p className="text-muted-foreground mb-4">
              Sua conta foi criada com sucesso! Um administrador irá revisar e aprovar seu acesso em breve.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Usuário: {profile?.nome} ({profile?.tipo_usuario})
            </p>
            <Button onClick={signOut} variant="outline" size="sm">
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se chegou até aqui, o usuário está aprovado e pode acessar
  console.log('Usuário aprovado no ProtectedRoute, acesso liberado');
  return <>{children}</>;
}