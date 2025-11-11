
"use client";

import Link from "next/link";
import {
  Bell,
  Home,
  // LineChart,
  Package,
  Package2,
  ShoppingCart,
  Users,
  User,
  MessageSquare,
  LogOut,
  Image as ImageIcon,
  Video,
  Link2,
  Star,
  UploadCloud,
  // KeyRound,
  Settings,
  ThumbsUp,
  // Database,
  // Twitter,
  CreditCard,
  Crown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

interface AdminSidebarProps {
    onLogout: () => void;
    onClose?: () => void;
}

export default function AdminSidebar({ onLogout, onClose }: AdminSidebarProps) {
    const pathname = usePathname();

    const navLinks = [
        { href: "/admin", label: "Dashboard", icon: Home },
        { href: "/admin/conversations", label: "Conversas", icon: MessageSquare },
        // { href: "/admin/chat-management", label: "Gerenciar Chat", icon: Database },
        // { href: "/admin/subscribers", label: "Assinantes", icon: Users },
        { href: "/admin/subscriptions", label: "Assinaturas", icon: CreditCard },
        { href: "/admin/exclusive-content", label: "Conteúdo Exclusivo", icon: Crown },
        { href: "/admin/products", label: "Loja", icon: Package },
        { href: "/admin/photos", label: "Fotos", icon: ImageIcon },
        { href: "/admin/videos", label: "Vídeos", icon: Video },
        { href: "/admin/uploads", label: "Uploads", icon: UploadCloud },
        // { href: "/admin/x-settings", label: "Configurar X", icon: Twitter },
        // { href: "/admin/x-status", label: "Status do X", icon: LineChart },
        { href: "/admin/integrations", label: "Integrações", icon: Link2 },
        { href: "/admin/reviews", label: "Avaliações", icon: ThumbsUp },
        // { href: "/admin/cloudflare-chat-info", label: "Chat Externo", icon: KeyRound },
        { href: "/admin/settings", label: "Configurações", icon: Settings },
    ];

    return (
        <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/admin" className="flex items-center gap-2 font-semibold">
                    <Package2 className="h-6 w-6 text-primary" />
                    <span className="hidden sm:inline">Admin Panel</span>
                    <span className="sm:hidden">Admin</span>
                </Link>
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <Bell className="h-4 w-4" />
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                    {onClose && (
                        <Button variant="outline" size="icon" className="h-8 w-8 md:hidden" onClick={onClose}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close menu</span>
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50 ${pathname === link.href ? 'bg-muted text-primary' : ''}`}
                        >
                            <link.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{link.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="mt-auto p-4 border-t">
                <Button size="sm" variant="secondary" className="w-full" onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Sair</span>
                    <span className="sm:hidden">Logout</span>
                </Button>
            </div>
        </div>
    );
}
