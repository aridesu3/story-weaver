import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getProfile, updateProfile } from '@/lib/supabase-helpers';
import type { Profile } from '@/types/database';
import { Sparkles, Shield, User } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [safeMode, setSafeMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const data = await getProfile(user.id);
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || '');
      setSafeMode(data.safe_mode);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfile(user.id, {
        display_name: displayName || null,
        safe_mode: safeMode,
      });
      toast.success('Settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Sparkles className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <MainLayout>
      <div className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl text-gradient-gold mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile
              </CardTitle>
              <CardDescription>Manage your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email || ''}
                  disabled
                  className="input-fantasy opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your adventurer name"
                  className="input-fantasy"
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Settings */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                Content Controls
              </CardTitle>
              <CardDescription>Manage content filtering preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="safe-mode">Safe Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Filter explicit and mature content in roleplay
                  </p>
                </div>
                <Switch
                  id="safe-mode"
                  checked={safeMode}
                  onCheckedChange={setSafeMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="fantasy"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                'Save Changes'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="flex-1"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
