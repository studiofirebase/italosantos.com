import type { Metadata } from 'next';
import './globals.css';
import '@/styles/braintree.css';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Inter } from 'next/font/google';
import WhatsAppButton from '@/components/whatsapp-button';
import Script from 'next/script';
import ScreenProtector from '@/components/screen-protector';
import { ConditionalProviders } from '@/components/ConditionalProviders';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Italo Santos',
  description: 'Sistema profissional de autenticação e pagamentos.',
  icons: {
    icon: [
      {
        url: '/logo.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/logo.png',
        sizes: '16x16',
        type: 'image/png',
      }
    ],
    apple: [
      {
        url: '/logo.png',
        sizes: '180x180',
        type: 'image/png',
      }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d6efd" />
        <Script id="error-handler" strategy="beforeInteractive">
          {`
            // Capturar erros de segurança cross-origin e outros erros relacionados a iframes
            window.addEventListener('error', function(event) {
              if (event.message && event.message.includes('cross-origin')) {
                // Silenciar erros de cross-origin
                event.preventDefault();
                return false;
              }
            });
            
            // Capturar erros de segurança específicos
            window.addEventListener('securitypolicyviolation', function(event) {
              // Silenciar violações de política de segurança
            });
            
            // Capturar erros de Firebase e silenciar alguns
            window.addEventListener('unhandledrejection', function(event) {
              if (event.reason && event.reason.message && 
                  (event.reason.message.includes('Missing or insufficient permissions') ||
                   event.reason.message.includes('FirebaseError'))) {
                // Silenciar erros de permissão do Firebase em desenvolvimento
                event.preventDefault();
                return false;
              }
            });
          `}
        </Script>
      </head>
      <body className={`font-sans ${inter.variable} antialiased bg-background`} suppressHydrationWarning>
        <Script id="google-tag-manager" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-XXXXXXX');
            `}
        </Script>
        <noscript>
            <iframe
                src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
            ></iframe>
        </noscript>
        
        <div id="fb-root"></div>
        <Script id="facebook-jssdk" strategy="afterInteractive">
          {`
            window.fbAsyncInit = function() {
              FB.init({
                appId      : '1029313609296207',
                cookie     : true,
                xfbml      : true,
                version    : 'v18.0'
              });
              
              FB.AppEvents.logPageView();
              
            };

            (function(d, s, id){
               var js, fjs = d.getElementsByTagName(s)[0];
               if (d.getElementById(id)) {return;}
               js = d.createElement(s); js.id = id;
               js.src = "https://connect.facebook.net/en_US/sdk.js";
               fjs.parentNode.insertBefore(js, fjs);
             }(document, 'script', 'facebook-jssdk'));
          `}
        </Script>
        
        {/* Google Pay Script */}
        <Script id="google-pay-script" strategy="afterInteractive">
          {`
            // Carregar Google Pay API
            (function() {
              var script = document.createElement('script');
              script.src = 'https://pay.google.com/gp/p/js/pay.js';
              script.onload = function() {
                window.dispatchEvent(new Event('google-pay-ready'));
              };
              script.onerror = function() {
                // Silenciar erro de carregamento do Google Pay
              };
              document.head.appendChild(script);
            })();
          `}
        </Script>
        
        <ConditionalProviders>
          {children}
        </ConditionalProviders>
        <Toaster />
        <Sonner />
        <WhatsAppButton />
        <ScreenProtector />
        {/* PWA: registra o Service Worker */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
