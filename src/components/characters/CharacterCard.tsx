import { Character } from '@/types/database';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Edit, Trash2, Swords, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CharacterCardProps {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (characterId: string) => void;
}

export default function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  return (
    <Card className="glass-card border-border/50 group hover:border-primary/30 transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border-2 border-primary/30 shadow-lg">
            {character.avatar_url ? (
              <img
                src={character.avatar_url}
                alt={character.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-primary" />
            )}
          </div>
          
          {/* Name and badges */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg truncate group-hover:text-primary transition-colors">
              {character.name}
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {character.is_rpg_enabled && (
                <Badge variant="secondary" className="text-xs">
                  <Swords className="w-3 h-3 mr-1" />
                  RPG
                </Badge>
              )}
              {character.world && (
                <Badge variant="outline" className="text-xs">
                  {character.world.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Description */}
        {character.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 font-prose">
            {character.description}
          </p>
        )}
        
        {/* Personality tags */}
        {character.personality && (
          <p className="text-xs text-muted-foreground/70 line-clamp-1 italic">
            "{character.personality.substring(0, 60)}..."
          </p>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Link to={`/chat/${character.id}`} className="flex-1">
            <Button variant="fantasy" size="sm" className="w-full">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(character)}
            className="hover:bg-muted"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(character.id)}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
