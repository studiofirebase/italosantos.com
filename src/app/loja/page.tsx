
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, AlertCircle, Lock, Eye, Play } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, orderBy, query, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { SmartVideoThumbnail } from '@/components/smart-video-player';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  videoUrl?: string;
  type?: 'photo' | 'video';
  status: 'active' | 'inactive';
  sales?: number;
  createdAt?: any;
  sellerId?: string; // ID do usuário que está vendendo o produto
  storageType?: string;
}

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

function LojaPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasedProducts, setPurchasedProducts] = useState<Set<string>>(new Set());
  const [playingProductId, setPlayingProductId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  // Buscar produtos da loja
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/products');
        const data = await response.json();
        if (data.success) {
          const activeProducts = (data.products || []).filter((p: Product) => p.status === 'active' && p.videoUrl);
          setProducts(activeProducts);
        } else {
          toast({ variant: "destructive", title: "Erro ao carregar a loja", description: data.message });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Erro de rede", description: "Não foi possível buscar os produtos." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [toast]);

  // Buscar compras do usuário
  useEffect(() => {
    const fetchUserPurchases = async () => {
      if (!user?.uid) {
        setPurchasedProducts(new Set());
        return;
      }
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setPurchasedProducts(new Set(userDoc.data().purchasedProducts || []));
        }
      } catch (error) {
        console.error("Erro ao buscar compras do usuário: ", error);
      }
    };
    fetchUserPurchases();
  }, [user?.uid]);

  // Carregar script do PayPal Cart
  useEffect(() => {
    // Verificar se o script já foi carregado
    if (document.getElementById('paypal-cart-script')) {
      return;
    }

    // Criar e adicionar o script
    const script = document.createElement('script');
    script.id = 'paypal-cart-script';
    script.src = 'https://www.paypalobjects.com/ncp/cart/cart.js';
    script.setAttribute('data-merchant-id', '4N9NF77PTG5TS');
    script.async = true;

    script.onload = () => {
      console.log('[PayPal Cart] Script carregado com sucesso');
    };

    script.onerror = () => {
      console.error('[PayPal Cart] Erro ao carregar script');
    };

    document.body.appendChild(script);

    // Cleanup: remover script ao desmontar
    return () => {
      const existingScript = document.getElementById('paypal-cart-script');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const handleProductClick = (product: Product) => {
    if (!user) {
      toast({ title: "Login necessário", description: "Você precisa estar logado para visualizar produtos.", variant: "destructive" });
      router.push('/auth/face');
      return;
    }
    if (purchasedProducts.has(product.id)) {
      setPlayingProductId(playingProductId === product.id ? null : product.id);
    } else {
      toast({ title: "Produto Bloqueado", description: "Compre o produto para ter acesso.", variant: "destructive" });
    }
  };

  // Ação chamada no frontend após a API de captura confirmar o pagamento
  const handlePurchaseSuccess = (productId: string, payer: any) => {
    const newPurchased = new Set(purchasedProducts);
    newPurchased.add(productId);
    setPurchasedProducts(newPurchased);

    const product = products.find(p => p.id === productId);
    if (product) {
      const updatedProducts = products.map(p =>
        p.id === productId ? { ...p, sales: (p.sales || 0) + 1 } : p
      );
      setProducts(updatedProducts);
      setPlayingProductId(productId); // Auto-play
    }

    toast({
      title: "Compra Aprovada!",
      description: `Obrigado, ${payer?.name?.given_name || 'Cliente'}! O vídeo é seu.`
    });
  };


  return (
    <Card className="w-full max-w-6xl animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
      <CardHeader className="flex-row items-center justify-between border-b border-primary/20 pb-4">
        <CardTitle className="text-3xl text-white text-center flex-1">Store</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-12">
        <div>
          <CardTitle className="text-2xl text-white flex items-center gap-3 mb-4">
            <ShoppingCart /> Produtos da Loja
          </CardTitle>
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <Card key={product.id} className="overflow-hidden bg-card/50 border-primary/20 hover:border-primary hover:shadow-neon-red-light transition-all duration-300 flex flex-col group">
                  <CardHeader className="p-0">
                    <div className="relative aspect-video group">
                      {playingProductId === product.id && purchasedProducts.has(product.id) ? (
                        <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                          <video src={product.videoUrl} controls autoPlay muted playsInline className="w-full h-full object-contain" onEnded={() => setPlayingProductId(null)} />
                        </div>
                      ) : (
                        <>
                          {product.videoUrl ? (
                            <SmartVideoThumbnail url={product.videoUrl} title={product.name} className="aspect-video" onClick={() => handleProductClick(product)} />
                          ) : (
                            <div className="aspect-video bg-muted flex items-center justify-center cursor-pointer" onClick={() => handleProductClick(product)}><Play className="w-12 h-12 text-muted-foreground" /></div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" size="sm" className="p-2" onClick={() => handleProductClick(product)}>
                              {purchasedProducts.has(product.id) ? <Play className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="absolute top-2 left-2">
                            <Badge variant={purchasedProducts.has(product.id) ? 'default' : 'secondary'}>
                              {purchasedProducts.has(product.id) ? '✓ Comprado' : 'Bloqueado'}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">{product.description}</CardDescription>
                    <p className="text-primary font-semibold text-xl mt-2">
                      {(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </CardContent>
                  <CardFooter className="p-4 mt-auto">
                    <div className="w-full">
                      {purchasedProducts.has(product.id) ? (
                        <div className="text-center p-3 bg-green-500/10 rounded-lg"><p className="text-green-600 font-medium">✓ Produto Comprado</p></div>
                      ) : !user ? (
                        <Button onClick={() => router.push('/auth/face')} className="w-full">🔐 Fazer Login para Comprar</Button>
                      ) : PAYPAL_CLIENT_ID ? (
                        <PayPalButtons
                          style={{ layout: 'horizontal', color: 'gold', shape: 'rect', label: 'buynow' }}
                          createOrder={async (data, actions) => {
                            try {
                              const res = await fetch('/api/paypal/create-order', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ productId: product.id }),
                              });
                              const order = await res.json();
                              if (order.orderId) {
                                return order.orderId;
                              } else {
                                throw new Error(order.error || 'Falha ao criar pedido no servidor.');
                              }
                            } catch (err: any) {
                              toast({ variant: "destructive", title: "Erro ao Iniciar Compra", description: err.message });
                              return Promise.reject(err);
                            }
                          }}
                          onApprove={async (data, actions) => {
                            try {
                              const res = await fetch('/api/paypal/capture-order', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  orderId: data.orderID,
                                  productId: product.id,
                                  userId: user?.uid
                                }),
                              });
                              const result = await res.json();
                              if (result.success) {
                                handlePurchaseSuccess(product.id, result.details);
                              } else {
                                throw new Error(result.message || 'Falha ao processar a compra no servidor.');
                              }
                            } catch (err: any) {
                              toast({ variant: "destructive", title: "Erro ao Finalizar Compra", description: err.message });
                            }
                          }}
                          onError={(err) => {
                            toast({ variant: "destructive", title: "Erro no PayPal", description: "Ocorreu um problema com o pagamento." });
                          }}
                        />
                      ) : (
                        <div className="text-center p-3 bg-destructive/10 rounded-lg"><p className="text-destructive font-medium">PayPal não configurado</p></div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <ShoppingCart className="h-16 w-16 text-muted-foreground" />
              <p className="mt-4 text-xl">Nenhum produto disponível.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LojaPage() {
  return (
    <PayPalScriptProvider options={{ "clientId": PAYPAL_CLIENT_ID || '', components: 'buttons', currency: 'BRL' }}>
      <main className="flex flex-1 w-full flex-col items-center p-4 bg-background">
        <LojaPageContent />
      </main>
    </PayPalScriptProvider>
  );
}
