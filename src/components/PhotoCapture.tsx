import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Camera, 
  Upload, 
  X, 
  RotateCcw,
  Check,
  Loader2
} from 'lucide-react';

interface PhotoCaptureProps {
  onPhotosChange: (photoUrls: string[]) => void;
  maxPhotos?: number;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ 
  onPhotosChange, 
  maxPhotos = 5 
}) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Usa câmera traseira por padrão
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraOpen(true);
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Define tamanho do canvas baseado no vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenha frame atual do vídeo no canvas
    context.drawImage(video, 0, 0);

    // Converte para blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      await uploadPhoto(blob, 'captured');
    }, 'image/jpeg', 0.8);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < Math.min(files.length, maxPhotos - photos.length); i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await uploadPhoto(file, 'uploaded');
      }
    }

    // Reset input
    event.target.value = '';
  };

  const uploadPhoto = async (file: Blob, source: 'captured' | 'uploaded') => {
    if (photos.length >= maxPhotos) {
      toast({
        title: "Limite atingido",
        description: `Máximo de ${maxPhotos} fotos permitidas.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const fileExt = source === 'captured' ? 'jpg' : file.type.split('/')[1];
      const fileName = `${user.data.user.id}/${Date.now()}_${source}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('daily-records')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública da foto
      const { data: urlData } = supabase.storage
        .from('daily-records')
        .getPublicUrl(uploadData.path);

      const newPhotoUrl = urlData.publicUrl;
      const updatedPhotos = [...photos, newPhotoUrl];
      
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);

      toast({
        title: "Foto adicionada",
        description: "Foto carregada com sucesso!",
      });

      // Para câmera, pode fechar após capturar
      if (source === 'captured') {
        stopCamera();
      }

    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error);
      toast({
        title: "Erro no upload",
        description: "Erro ao carregar foto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = async (photoUrl: string, index: number) => {
    try {
      // Extrair path da URL para deletar do storage
      const urlParts = photoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const userFolder = urlParts[urlParts.length - 2];
      const filePath = `${userFolder}/${fileName}`;

      const { error } = await supabase.storage
        .from('daily-records')
        .remove([filePath]);

      if (error) {
        console.error('Erro ao deletar arquivo:', error);
      }

      const updatedPhotos = photos.filter((_, i) => i !== index);
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);

      toast({
        title: "Foto removida",
        description: "Foto removida com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera View */}
      {isCameraOpen && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
                style={{ maxHeight: '300px' }}
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <Button
                  onClick={capturePhoto}
                  disabled={isUploading}
                  size="lg"
                  className="rounded-full bg-white text-black hover:bg-gray-100"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6" />
                  )}
                </Button>
                <Button
                  onClick={stopCamera}
                  variant="destructive"
                  size="lg"
                  className="rounded-full"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canvas para captura (oculto) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Botões de ação */}
      {!isCameraOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Tirar foto</p>
              <Button
                onClick={startCamera}
                variant="outline"
                size="sm"
                disabled={photos.length >= maxPhotos}
              >
                <Camera className="h-4 w-4 mr-2" />
                Abrir Câmera
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Carregar da galeria</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                disabled={photos.length >= maxPhotos}
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Foto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview das fotos */}
      {photos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Fotos Capturadas ({photos.length}/{maxPhotos})</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photoUrl, index) => (
                <div key={index} className="relative">
                  <img
                    src={photoUrl}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <Button
                    onClick={() => removePhoto(photoUrl, index)}
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {photos.length >= maxPhotos && (
        <p className="text-sm text-muted-foreground text-center">
          Limite máximo de {maxPhotos} fotos atingido.
        </p>
      )}
    </div>
  );
};

export default PhotoCapture;