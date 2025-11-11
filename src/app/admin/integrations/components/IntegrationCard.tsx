
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface IntegrationCardProps {
  platform: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => void;
  syncing?: boolean;
}

export default function IntegrationCard({
  platform,
  title,
  description,
  icon,
  isConnected,
  isLoading,
  onConnect,
  onDisconnect,
  onSync,
  syncing
}: IntegrationCardProps) {
  const brandColors: Record<string, string> = {
    twitter: 'bg-[#1DA1F2] hover:bg-[#1A91DA]',
    facebook: 'bg-[#1877F2] hover:bg-[#166FE5]',
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
    paypal: 'bg-[#00457C] hover:bg-[#003057]',
    mercadopago: 'bg-[#00B1EA] hover:bg-[#009DD8]',
  };

  const buttonClass = `w-32 ${brandColors[platform] || 'bg-gray-500 hover:bg-gray-600'} text-white`;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 flex items-center justify-center rounded-lg">
            {icon}
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
            <Button
              onClick={isConnected ? onDisconnect : onConnect}
              disabled={isLoading}
              className={buttonClass}
            >
              {isLoading ? 'Carregando...' : (isConnected ? 'Desconectar' : 'Conectar')}
            </Button>
            {isConnected && onSync && (
              <Button onClick={onSync} disabled={syncing} variant="outline">
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
