import TestUpload from '@/components/test-upload';

export default function TestUploadPage() {
    return (
        <div className="min-h-screen p-8 bg-background">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold">Teste de Upload</h1>
                    <p className="text-muted-foreground">
                        Use esta página para testar o upload de arquivos para o Firebase Storage
                    </p>
                </div>

                <TestUpload />

                <div className="mt-8 p-4 border rounded-lg bg-muted/50">
                    <h2 className="text-lg font-semibold mb-2">Informações de Debug</h2>
                    <div className="space-y-1 text-sm text-muted-foreground">
                        <p>• Storage Bucket: facepass-afhid.firebasestorage.app</p>
                        <p>• Pasta de Upload: uploads/test/</p>
                        <p>• Regras: Leitura pública, escrita para usuários autenticados</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
