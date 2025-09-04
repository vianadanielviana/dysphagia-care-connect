import React from 'react';
import PacientesManager from '@/components/PacientesManager';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Pacientes = () => {
  const { profile, signOut, isAdmin, isProfessional } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center cursor-pointer"
                onClick={() => navigate('/dashboard')}
              >
                <span className="text-primary-foreground font-bold text-sm">D</span>
              </div>
              <h1 className="text-xl font-semibold text-foreground">DisfagiaMonitor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {profile?.tipo_usuario === 'fonoaudiologo' ? 'Fonoaudiólogo' : 'Cuidador'}: {profile?.nome}
              </span>
              {(isAdmin || isProfessional) && (
                <Button 
                  onClick={() => navigate('/admin/usuarios')}
                  variant="ghost"
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {isAdmin ? 'Admin' : 'Gerenciar'}
                </Button>
              )}
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="sm"
              >
                Dashboard
              </Button>
              <Button 
                onClick={signOut}
                variant="ghost"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
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