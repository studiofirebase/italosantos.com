"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, XCircle } from "lucide-react";
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function TestUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleUpload = async () => {
        if (!file) {
            setError('Selecione um arquivo primeiro');
            return;
        }

        setUploading(true);
        setError('');
        setUploadedUrl('');

        try {
            // Criar referência no Storage
            const timestamp = Date.now();
            const fileName = `test-${timestamp}-${file.name}`;
            const storagePath = `uploads/test/${fileName}`;
            const storageRef = ref(storage, storagePath);

            console.log('📤 Iniciando upload para:', storagePath);
            console.log('📦 Bucket:', storage.app.options.storageBucket);
            console.log('📄 Arquivo:', file.name, file.type, file.size);

            // Upload do arquivo
            const uploadResult = await uploadBytes(storageRef, file, {
                contentType: file.type,
                customMetadata: {
                    uploadedAt: new Date().toISOString(),
                    originalName: file.name
                }
            });

            console.log('✅ Upload completo:', uploadResult);

            // Obter URL pública
            const downloadURL = await getDownloadURL(storageRef);
            console.log('🔗 URL pública:', downloadURL);

            setUploadedUrl(downloadURL);
            setFile(null);
        } catch (err: any) {
            console.error('❌ Erro no upload:', err);
            setError(err.message || 'Erro desconhecido');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Teste de Upload - Firebase Storage
                </CardTitle>
                <CardDescription>
                    Teste se o upload para Firebase Storage está funcionando
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) {
                                setFile(selectedFile);
                                setError('');
                                setUploadedUrl('');
                            }
                        }}
                        disabled={uploading}
                    />
                    {file && (
                        <p className="text-sm text-muted-foreground">
                            Arquivo selecionado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                    )}
                </div>

                <Button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full"
                >
                    {uploading ? 'Enviando...' : 'Fazer Upload'}
                </Button>

                {error && (
                    <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive rounded-lg">
                        <XCircle className="h-5 w-5 text-destructive" />
                        <div>
                            <p className="font-semibold text-destructive">Erro no Upload</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    </div>
                )}

                {uploadedUrl && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="font-semibold text-green-500">Upload Concluído!</p>
                                <p className="text-sm text-muted-foreground">Arquivo enviado com sucesso</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">URL do arquivo:</p>
                            <div className="p-2 bg-muted rounded border text-xs break-all">
                                {uploadedUrl}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(uploadedUrl);
                                }}
                            >
                                Copiar URL
                            </Button>
                        </div>

                        {file?.type.startsWith('image/') && (
                            <div className="mt-4">
                                <p className="text-sm font-medium mb-2">Preview:</p>
                                <img
                                    src={uploadedUrl}
                                    alt="Upload preview"
                                    className="max-w-full h-auto rounded-lg border"
                                />
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
