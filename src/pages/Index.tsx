import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import CharacterCard from '@/components/characters/CharacterCard';
import CharacterForm from '@/components/characters/CharacterForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { getCharacters, getWorlds, createCharacter, updateCharacter, deleteCharacter } from '@/lib/supabase-helpers';
import type { Character, World } from '@/types/database';
import { Plus, Sparkles, Users } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [deletingCharacterId, setDeletingCharacterId] = useState<string | null>(null);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoadingCharacters(true);
    try {
      const [chars, wrlds] = await Promise.all([
        getCharacters(user.id),
        getWorlds(user.id),
      ]);
      setCharacters(chars);
      setWorlds(wrlds);
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  const handleCreateOrUpdate = async (data: Partial<Character>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (editingCharacter) {
        await updateCharacter(editingCharacter.id, data);
        toast.success('Character updated!');
      } else {
        await createCharacter({
          ...data,
          user_id: user.id,
        } as Omit<Character, 'id' | 'created_at' | 'updated_at'>);
        toast.success('Character created!');
      }
      setIsFormOpen(false);
      setEditingCharacter(null);
      loadData();
    } catch (error) {
      toast.error('Failed to save character');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCharacterId) return;
    try {
      await deleteCharacter(deletingCharacterId);
      toast.success('Character deleted');
      setDeletingCharacterId(null);
      loadData();
    } catch (error) {
      toast.error('Failed to delete character');
    }
  };

  const openEditForm = (character: Character) => {
    setEditingCharacter(character);
    setIsFormOpen(true);
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
            <h1 className="font-display text-3xl text-gradient-gold mb-2">Your Characters</h1>
            <p className="text-muted-foreground font-prose">
              Create and manage your roleplay characters
            </p>
          </div>
          <Button
            variant="fantasy"
            onClick={() => {
              setEditingCharacter(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Character
          </Button>
        </div>

        {/* Characters Grid */}
        {isLoadingCharacters ? (
          <div className="flex items-center justify-center py-12">
            <Sparkles className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-xl">
            <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="font-display text-xl mb-2">No characters yet</h2>
            <p className="text-muted-foreground mb-6 font-prose">
              Create your first character to begin your adventure
            </p>
            <Button
              variant="fantasy"
              onClick={() => {
                setEditingCharacter(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Character
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onEdit={openEditForm}
                onDelete={setDeletingCharacterId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Character Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="glass-card max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingCharacter ? 'Edit Character' : 'Create Character'}
            </DialogTitle>
          </DialogHeader>
          <CharacterForm
            character={editingCharacter}
            worlds={worlds}
            onSubmit={handleCreateOrUpdate}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingCharacter(null);
            }}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCharacterId} onOpenChange={() => setDeletingCharacterId(null)}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete Character?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this character and all their chat history. This action cannot be undone.
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
