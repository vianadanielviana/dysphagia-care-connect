import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle,
  User,
  Stethoscope
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_type: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
  reply_to_id?: string;
}

const CommunicationView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { profile, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('team_messages')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'team_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [payload.new as Message, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mensagens",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('team_messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          sender_name: profile.nome,
          sender_type: profile.tipo_usuario,
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      toast({
        title: "Mensagem Enviada",
        description: "Sua mensagem foi enviada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 0 ? 'agora' : `${diffInMinutes}min atrás`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getUserIcon = (userType: string) => {
    switch (userType) {
      case 'fonoaudiologo':
        return <Stethoscope className="h-4 w-4" />;
      case 'cuidador':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'fonoaudiologo':
        return 'Fonoaudiólogo';
      case 'cuidador':
        return 'Cuidador';
      case 'admin':
        return 'Administrador';
      default:
        return 'Usuário';
    }
  };

  const getUserTypeBadgeColor = (userType: string) => {
    switch (userType) {
      case 'fonoaudiologo':
        return 'bg-primary text-primary-foreground';
      case 'cuidador':
        return 'bg-medical-green text-medical-green-foreground';
      case 'admin':
        return 'bg-medical-amber text-medical-amber-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Comunicação da Equipe</h2>
          <p className="text-muted-foreground">Canal de comunicação entre cuidadores e profissionais</p>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <Badge variant="outline">Canal Geral</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Mensagens da Equipe
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-sm text-muted-foreground">Seja o primeiro a iniciar a conversa</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                        message.sender_id === user?.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      } rounded-lg p-3`}>
                        {message.sender_id !== user?.id && (
                          <div className="flex items-center mb-2">
                            <div className="flex items-center space-x-2">
                              {getUserIcon(message.sender_type)}
                              <span className="font-medium text-sm">{message.sender_name}</span>
                              <Badge 
                                className={`${getUserTypeBadgeColor(message.sender_type)} text-xs`}
                                variant="secondary"
                              >
                                {getUserTypeLabel(message.sender_type)}
                              </Badge>
                            </div>
                          </div>
                        )}
                        
                        <p className="text-sm">{message.content}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 opacity-70" />
                            <span className="text-xs opacity-70">
                              {formatDateTime(message.created_at)}
                            </span>
                          </div>
                          
                          {message.sender_id === user?.id && (
                            <CheckCircle className="h-3 w-3 opacity-70" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="border-t pt-4">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim() || sending}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pressione Enter para enviar, Shift+Enter para nova linha
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seu Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              {profile && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getUserIcon(profile.tipo_usuario)}
                    <span className="font-medium">{profile.nome}</span>
                  </div>
                  <Badge className={getUserTypeBadgeColor(profile.tipo_usuario)}>
                    {getUserTypeLabel(profile.tipo_usuario)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diretrizes de Comunicação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-medical-amber flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Emergências</p>
                  <p className="text-xs text-muted-foreground">
                    Para situações urgentes, contate diretamente o profissional
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-medical-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Seja Claro</p>
                  <p className="text-xs text-muted-foreground">
                    Forneça informações específicas sobre o paciente
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Users className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Respeite a Equipe</p>
                  <p className="text-xs text-muted-foreground">
                    Mantenha comunicação profissional e respeitosa
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setNewMessage('Preciso de orientação sobre...')}
              >
                💡 Solicitar Orientação
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setNewMessage('Relato sobre paciente:')}
              >
                📋 Relatar Situação
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setNewMessage('Dúvida sobre procedimento:')}
              >
                ❓ Tirar Dúvida
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommunicationView;