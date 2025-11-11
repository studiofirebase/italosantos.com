"use client";

import { useState, useEffect } from 'react';
import { DollarSign, Users, CreditCard, Activity, MessageSquare, Star, Package, Eye, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getDashboardStats, getTopPages, invalidateStatsCache } from './actions';

interface DashboardStats {
  totalSubscribers: number;
  totalConversations: number;
  totalProducts: number;
  pendingReviews: number;
}

interface TopPage {
  id: string;
  path: string;
  count: number;
}


export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllData = async (skipCache = false) => {
    const loadingState = skipCache ? setIsRefreshing : setIsLoading;
    loadingState(true);
    
    try {
      if (skipCache) {
        await invalidateStatsCache();
      }
      
      const [dashboardStats, topPagesData] = await Promise.all([
          getDashboardStats(),
          getTopPages()
      ]);
      setStats(dashboardStats);
      setTopPages(topPagesData);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      loadingState(false);
      if (!skipCache) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRefresh = () => {
    fetchAllData(true);
  };

  const StatCard = ({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-10 w-1/2 bg-muted rounded animate-pulse" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total de Assinantes" 
          value={stats?.totalSubscribers ?? 0}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Total de usuarios que assinaram"
        />
        <StatCard 
          title="Conversas Ativas" 
          value={stats?.totalConversations ?? 0}
          icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
          description="Chats com atividade nos últimos 7 dias"
        />
        <StatCard 
          title="Produtos Cadastrados" 
          value={stats?.totalProducts ?? 0}
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
          description="Itens disponíveis na loja"
        />
        <StatCard 
          title="Avaliações Pendentes" 
          value={stats?.pendingReviews ?? 0}
          icon={<Star className="h-4 w-4 text-muted-foreground" />}
          description="Comentários aguardando moderação"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <Card>
            <CardHeader>
                <CardTitle>Páginas Mais Acessadas</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="h-24 bg-muted rounded animate-pulse" />
                ) : topPages.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Página</TableHead>
                                <TableHead className="text-right">Visualizações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topPages.map(page => (
                                <TableRow key={page.id}>
                                    <TableCell className="font-medium">{page.path}</TableCell>
                                    <TableCell className="text-right">{page.count}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center text-muted-foreground py-4">
                        <p>Nenhum dado de visualização de página ainda.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}
