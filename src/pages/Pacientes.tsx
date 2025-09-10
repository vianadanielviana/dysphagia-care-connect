import React from 'react';
import PacientesManager from '@/components/PacientesManager';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Pacientes = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img 
                src="/lovable-uploads/4fc3d8d5-aa4a-4c2c-9b26-e7162b91a5b6.png" 
                alt="Gama Logo" 
                className="h-6 w-6 sm:h-8 sm:w-8 cursor-pointer"
                onClick={() => navigate('/dashboard')}
              />
              <h1 className="text-sm lg:text-lg xl:text-xl font-normal text-foreground truncate">Gama - Soluções em Saúde</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:inline text-sm text-muted-foreground truncate">
                {profile?.tipo_usuario === 'fonoaudiologo' ? 'Fonoaudiólogo' : 'Cuidador'}: {profile?.nome}
              </span>
              <span className="sm:hidden text-xs text-muted-foreground">
                {profile?.nome?.split(' ')[0]}
              </span>
              {isAdmin && (
                <Button 
                  onClick={() => navigate('/admin/usuarios')}
                  variant="ghost"
                  size="sm"
                  className="p-2 sm:px-3"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:ml-2 sm:inline">Admin</span>
                </Button>
              )}
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="sm"
                className="p-2 sm:px-3"
              >
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Home</span>
              </Button>
              <Button 
                onClick={signOut}
                variant="ghost"
                size="sm"
                className="p-2 sm:px-3"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:ml-2 sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <PacientesManager />
        </div>
      </main>
    </div>
  );
};

export default Pacientes;