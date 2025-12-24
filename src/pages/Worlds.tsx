import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { getWorlds, createWorld, updateWorld, deleteWorld } from '@/lib/supabase-helpers';
import type { World } from '@/types/database';
import { Plus, Sparkles, Globe, Edit, Trash2 } from 'lucide-react';

export default function Worlds() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<World | null>(null);
  const [deletingWorldId, setDeletingWorldId] = useState<string | null>(null);
  const [isLoadingWorlds, setIsLoadingWorlds] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lore, setLore] = useState('');
  const [rules, setRules] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadWorlds();
    }
  }, [user]);

  useEffect(() => {
    if (editingWorld) {
      setName(editingWorld.name);
      setDescription(editingWorld.description || '');
      setLore(editingWorld.lore || '');
      setRules(editingWorld.rules || '');
    } else {
      resetForm();
    }
  }, [editingWorld]);

  const loadWorlds = async () => {
    if (!user) return;
    setIsLoadingWorlds(true);
    try {
      const data = await getWorlds(user.id);
      setWorlds(data);
    } finally {
      setIsLoadingWorlds(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setLore('');
    setRules('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setIsSaving(true);
    try {
      if (editingWorld) {
        await updateWorld(editingWorld.id, {
          name,
          description: description || null,
          lore: lore || null,
          rules: rules || null,
        });
        toast.success('World updated!');
      } else {
        await createWorld({
          user_id: user.id,
          name,
          description: description || null,
          lore: lore || null,
          rules: rules || null,
        });
        toast.success('World created!');
      }
      setIsFormOpen(false);
      setEditingWorld(null);
      resetForm();
      loadWorlds();
    } catch (error) {
      toast.error('Failed to save world');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingWorldId) return;
    try {
      await deleteWorld(deletingWorldId);
      toast.success('World deleted');
      setDeletingWorldId(null);
      loadWorlds();
    } catch (error) {
      toast.error('Failed to delete world');
    }
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
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl text-gradient-gold mb-2">Worlds & Lore</h1>
            <p className="text-muted-foreground font-prose">
              Create rich settings for your roleplay adventures
            </p>
          </div>
          <Button
            variant="fantasy"
            onClick={() => {
              setEditingWorld(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New World
          </Button>
        </div>

        {/* Worlds Grid */}
        {isLoadingWorlds ? (
          <div className="flex items-center justify-center py-12">
            <Sparkles className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : worlds.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-xl">
            <Globe className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="font-display text-xl mb-2">No worlds yet</h2>
            <p className="text-muted-foreground mb-6 font-prose">
              Create a world to give your characters a rich setting
            </p>
            <Button
              variant="fantasy"
              onClick={() => {
                setEditingWorld(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create World
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {worlds.map((world) => (
              <Card key={world.id} className="glass-card border-border/50 group hover:border-primary/30 transition-all">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Globe className="w-5 h-5 text-accent" />
                    {world.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {world.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 font-prose">
                      {world.description}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingWorld(world);
                        setIsFormOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingWorldId(world.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* World Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingWorld(null);
          resetForm();
        }
      }}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingWorld ? 'Edit World' : 'Create World'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">World Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Realm of Eldoria"
                className="input-fantasy"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief overview of this world..."
                className="input-fantasy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lore">Lore & History</Label>
              <Textarea
                id="lore"
                value={lore}
                onChange={(e) => setLore(e.target.value)}
                placeholder="The deep history, legends, and mythology..."
                className="input-fantasy min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rules">World Rules</Label>
              <Textarea
                id="rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Magic systems, laws of nature, social rules..."
                className="input-fantasy"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingWorld(null);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="fantasy"
                className="flex-1"
                disabled={isSaving || !name.trim()}
              >
                {isSaving ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : editingWorld ? (
                  'Save Changes'
                ) : (
                  'Create World'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingWorldId} onOpenChange={() => setDeletingWorldId(null)}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete World?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this world. Characters using this world will no longer be linked to it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
