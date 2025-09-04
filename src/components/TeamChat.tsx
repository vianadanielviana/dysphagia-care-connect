import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { User, Send, Phone, Calendar, MessageCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TeamMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_type: string;
  content: string;
  message_type: string;
  reply_to_id?: string;
  created_at: string;
  updated_at: string;
}

const TeamChat: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Rolar para o final das mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Buscar mensagens
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mensagens",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Buscar contagem de mensagens não lidas
  const fetchUnreadCount = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_unread_messages_count', {
        user_uuid: profile.id
      });

      if (error) throw error;
      setUnreadCount(data || 0);
    } catch (error) {
      console.error('Erro ao buscar mensagens não lidas:', error);
    }
  };

  // Marcar mensagem como lida
  const markMessageAsRead = async (messageId: string) => {
    if (!profile?.id) return;

    try {
      await supabase.rpc('mark_message_as_read', {
        message_uuid: messageId,
        user_uuid: profile.id
      });
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  };

  // Enviar mensagem
  const sendMessage = async () => {
    if (!newMessage.trim() || !profile?.id || !profile?.nome) {
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('team_messages')
        .insert([
          {
            sender_id: profile.id,
            sender_name: profile.nome,
            sender_type: profile.tipo_usuario || 'cuidador',
            content: newMessage.trim(),
            message_type: 'text'
          }
        ]);

      if (error) throw error;

      setNewMessage('');
      toast({
        title: "Sucesso",
        description: "Mensagem enviada!",
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

  // Setup realtime subscription
  useEffect(() => {
    fetchMessages();
    fetchUnreadCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('team_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages'
        },
        (payload) => {
          console.log('Nova mensagem:', payload);
          setMessages(prev => [...prev, payload.new as TeamMessage]);
          
          // Se a mensagem não é do usuário atual, marcar como não lida
          if (payload.new.sender_id !== profile?.id) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Marcar mensagens como lidas ao visualizar
  useEffect(() => {
    messages.forEach(message => {
      if (message.sender_id !== profile?.id) {
        markMessageAsRead(message.id);
      }
    });
  }, [messages, profile?.id]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getProfessionalBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      fisioterapeuta: 'bg-blue-100 text-blue-800',
      fonoaudiologo: 'bg-green-100 text-green-800',
      nutricionista: 'bg-orange-100 text-orange-800',
      enfermeiro: 'bg-pink-100 text-pink-800',
      medico: 'bg-red-100 text-red-800',
      cuidador: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando mensagens...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6" />
              Chat da Equipe
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chat Messages */}
              <div className="lg:col-span-2">
                <div className="border rounded-lg h-96 p-4 mb-4 overflow-y-auto bg-muted/30">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhuma mensagem ainda. Seja o primeiro a enviar!</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isOwnMessage = message.sender_id === profile?.id;
                        const messageDate = formatDate(message.created_at);
                        const messageTime = formatTime(message.created_at);

                        return (
                          <div
                            key={message.id}
                            className={`flex items-start space-x-3 ${
                              isOwnMessage ? 'justify-end' : ''
                            }`}
                          >
                            {!isOwnMessage && (
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                            
                            <Card className={`max-w-xs ${
                              isOwnMessage 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-background'
                            }`}>
                              <CardContent className="p-3">
                                {!isOwnMessage && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium">
                                      {message.sender_name}
                                    </p>
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${getProfessionalBadgeColor(message.sender_type)}`}
                                    >
                                      {message.sender_type}
                                    </Badge>
                                  </div>
                                )}
                                <p className="text-sm whitespace-pre-wrap">
                                  {message.content}
                                </p>
                                <p className={`text-xs mt-1 ${
                                  isOwnMessage 
                                    ? 'text-primary-foreground/70' 
                                    : 'text-muted-foreground'
                                }`}>
                                  {messageDate} às {messageTime}
                                </p>
                              </CardContent>
                            </Card>

                            {isOwnMessage && (
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Input */}
                <div className="flex space-x-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem... (Enter para enviar)"
                    className="flex-1 min-h-[44px] max-h-32 resize-none"
                    rows={1}
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    size="icon"
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Seu Perfil
                    </h4>
                    <p className="text-sm text-foreground">{profile?.nome}</p>
                    <p className="text-sm text-muted-foreground capitalize">{profile?.tipo_usuario}</p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Chat em Tempo Real
                    </h4>
                    <p className="text-sm text-green-700">
                      Todas as mensagens são sincronizadas automaticamente entre todos os membros da equipe.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contato de Emergência
                    </h4>
                    <p className="text-sm text-blue-700">
                      Em caso de emergência, ligue diretamente para o profissional responsável.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamChat;