"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";

export default function AdminProfilePage() {
  const { user, userProfile, updateUserProfile, updateUserEmail, updateUserPassword } = useAuth();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await updateUserProfile({ displayName });
      toast.success("Nome atualizado com sucesso");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !currentPasswordForEmail) {
      toast.error("Informe o novo email e a senha atual");
      return;
    }
    try {
      setSavingEmail(true);
      await updateUserEmail(newEmail, currentPasswordForEmail);
      toast.success("Verifique sua caixa de entrada para confirmar o novo email");
      setNewEmail("");
      setCurrentPasswordForEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar email");
    } finally {
      setSavingEmail(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Informe a senha atual e a nova senha");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    try {
      setSavingPassword(true);
      await updateUserPassword(currentPassword, newPassword);
      toast.success("Senha atualizada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar senha");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Perfil do Administrador</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
          <CardDescription>Dados básicos da sua conta administrativa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile?.photoURL} alt={userProfile?.displayName || user?.email || "Admin"} />
              <AvatarFallback>{(userProfile?.displayName || "A").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{userProfile?.displayName || "Administrador"}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>ic
          </div>

          <Separator className="my-4" />

          <form onSubmit={onSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input id="displayName" value={displayName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)} placeholder="Seu nome" />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Alterar Email</CardTitle>
            <CardDescription>Você receberá um email de verificação para confirmar a troca</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onChangeEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Novo email</Label>
                <Input id="newEmail" type="email" value={newEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)} placeholder="novo@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentPasswordForEmail">Senha atual</Label>
                <Input id="currentPasswordForEmail" type="password" value={currentPasswordForEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPasswordForEmail(e.target.value)} placeholder="Sua senha atual" />
              </div>
              <Button type="submit" disabled={savingEmail}>
                {savingEmail ? "Atualizando..." : "Atualizar email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>Defina uma nova senha segura</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)} placeholder="Sua senha atual" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? "Atualizando..." : "Atualizar senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
