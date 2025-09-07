import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Download, Eye, Image, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PatientDocument {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: Record<string, any> | null;
}

interface PatientDocumentsProps {
  patientId: string;
  patientName: string;
  canUpload?: boolean;
}

const PatientDocuments: React.FC<PatientDocumentsProps> = ({ 
  patientId, 
  patientName, 
  canUpload = false 
}) => {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('patient-documents')
        .list(patientId, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Erro ao carregar documentos:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os documentos",
          variant: "destructive",
        });
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar tipo de arquivo
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Arquivo não suportado",
          description: "Apenas imagens (JPG, PNG, GIF, WebP), PDFs, documentos Word e arquivos de texto são permitidos.",
          variant: "destructive",
        });
        return;
      }

      // Verificar tamanho (10MB)
      if (file.size > 10485760) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      
      // Gerar nome único para o arquivo
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const filePath = `${patientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient-documents')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        toast({
          title: "Erro no upload",
          description: uploadError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso",
      });

      // Limpar estado e recarregar documentos
      setSelectedFile(null);
      setIsUploadDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado no upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('patient-documents')
        .download(`${patientId}/${fileName}`);

      if (error) {
        console.error('Erro no download:', error);
        toast({
          title: "Erro",
          description: "Não foi possível baixar o arquivo",
          variant: "destructive",
        });
        return;
      }

      // Criar URL para download
      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro no download:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado no download",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (fileName: string, mimeType: string) => {
    try {
      // Apenas para imagens e PDFs
      if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
        toast({
          title: "Visualização não disponível",
          description: "Este tipo de arquivo não pode ser visualizado. Use o download para acessar o conteúdo.",
        });
        return;
      }

      // Para buckets privados, precisamos fazer download e criar uma URL temporária
      const { data, error } = await supabase.storage
        .from('patient-documents')
        .download(`${patientId}/${fileName}`);

      if (error) {
        console.error('Erro na visualização:', error);
        toast({
          title: "Erro",
          description: "Não foi possível visualizar o arquivo",
          variant: "destructive",
        });
        return;
      }

      const blob = new Blob([data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Erro na visualização:', error);
      toast({
        title: "Erro",
        description: "Não foi possível visualizar o arquivo",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o arquivo "${fileName}"?`)) return;

    try {
      const { error } = await supabase.storage
        .from('patient-documents')
        .remove([`${patientId}/${fileName}`]);

      if (error) {
        console.error('Erro ao excluir:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o arquivo",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Arquivo excluído com sucesso",
      });

      fetchDocuments();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir arquivo",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Limpar URL quando fechar o preview
  const handleClosePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setIsPreviewOpen(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Documentos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Carregando documentos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Documentos</span>
              <span className="text-sm font-normal text-muted-foreground">
                ({documents.length})
              </span>
            </CardTitle>
            {canUpload && (
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Fazer Upload de Documento</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="file">Arquivo</Label>
                      <Input
                        id="file"
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileSelect}
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Formatos aceitos: JPG, PNG, GIF, WebP, PDF, DOC, DOCX, TXT (máx. 10MB)
                      </p>
                    </div>
                    
                    {selectedFile && (
                      <div className="p-3 border rounded-md bg-muted">
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsUploadDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                      >
                        {uploading ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum documento anexado</p>
              {canUpload && (
                <p className="text-sm text-muted-foreground mt-2">
                  Clique em "Upload" para adicionar documentos
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {getFileIcon(doc.metadata?.mimetype || '')}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(doc.metadata?.size || 0)} • {doc.created_at ? new Date(doc.created_at).toLocaleString('pt-BR') : 'Data não disponível'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    {(doc.metadata?.mimetype?.startsWith('image/') || doc.metadata?.mimetype === 'application/pdf') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePreview(doc.name, doc.metadata?.mimetype || '')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(doc.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canUpload && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(doc.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Visualização do Documento</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center overflow-auto max-h-[60vh]">
            {previewUrl && (
              <div className="w-full h-full">
                {previewUrl.includes('pdf') || previewUrl.startsWith('data:application/pdf') ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-96 border rounded-md"
                    title="Visualização do documento"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Visualização do documento"
                    className="max-w-full max-h-full object-contain rounded-md"
                  />
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PatientDocuments;