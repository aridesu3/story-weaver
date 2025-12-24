import { useState, useEffect } from 'react';
import { Character, World, RPGStats } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, User, Scroll, Swords, BookOpen } from 'lucide-react';

interface CharacterFormProps {
  character?: Character | null;
  worlds: World[];
  onSubmit: (data: Partial<Character>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const defaultStats: RPGStats = {
  hp: 100,
  max_hp: 100,
  strength: 10,
  dexterity: 10,
  intelligence: 10,
  charisma: 10,
};

export default function CharacterForm({ character, worlds, onSubmit, onCancel, isLoading }: CharacterFormProps) {
  const [name, setName] = useState(character?.name || '');
  const [description, setDescription] = useState(character?.description || '');
  const [personality, setPersonality] = useState(character?.personality || '');
  const [backstory, setBackstory] = useState(character?.backstory || '');
  const [speakingStyle, setSpeakingStyle] = useState(character?.speaking_style || '');
  const [rules, setRules] = useState(character?.rules || '');
  const [exampleMessages, setExampleMessages] = useState(character?.example_messages || '');
  const [worldId, setWorldId] = useState<string | null>(character?.world_id || null);
  const [isRpgEnabled, setIsRpgEnabled] = useState(character?.is_rpg_enabled || false);
  const [baseStats, setBaseStats] = useState<RPGStats>(
    character?.base_stats || defaultStats
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || null,
      personality: personality || null,
      backstory: backstory || null,
      speaking_style: speakingStyle || null,
      rules: rules || null,
      example_messages: exampleMessages || null,
      world_id: worldId,
      is_rpg_enabled: isRpgEnabled,
      base_stats: baseStats,
    });
  };

  const updateStat = (stat: keyof RPGStats, value: number) => {
    setBaseStats((prev) => ({ ...prev, [stat]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ScrollArea className="h-[60vh] pr-4">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/50">
            <TabsTrigger value="basic" className="text-xs">
              <User className="w-3 h-3 mr-1" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="personality" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Persona
            </TabsTrigger>
            <TabsTrigger value="lore" className="text-xs">
              <BookOpen className="w-3 h-3 mr-1" />
              Lore
            </TabsTrigger>
            <TabsTrigger value="rpg" className="text-xs">
              <Swords className="w-3 h-3 mr-1" />
              RPG
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Character Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter character name"
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
                placeholder="Physical appearance, age, notable features..."
                className="input-fantasy min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="world">World/Setting</Label>
              <Select value={worldId || 'none'} onValueChange={(v) => setWorldId(v === 'none' ? null : v)}>
                <SelectTrigger className="input-fantasy">
                  <SelectValue placeholder="Select a world (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific world</SelectItem>
                  {worlds.map((world) => (
                    <SelectItem key={world.id} value={world.id}>
                      {world.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="personality" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="personality">Personality Traits</Label>
              <Textarea
                id="personality"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="Brave, curious, sarcastic, compassionate..."
                className="input-fantasy min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="speakingStyle">Speaking Style</Label>
              <Textarea
                id="speakingStyle"
                value={speakingStyle}
                onChange={(e) => setSpeakingStyle(e.target.value)}
                placeholder="How does this character talk? Formal, casual, uses specific phrases..."
                className="input-fantasy min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exampleMessages">Example Messages</Label>
              <Textarea
                id="exampleMessages"
                value={exampleMessages}
                onChange={(e) => setExampleMessages(e.target.value)}
                placeholder="Example dialogue to show how this character speaks..."
                className="input-fantasy min-h-[100px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="lore" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backstory">Backstory</Label>
              <Textarea
                id="backstory"
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                placeholder="Character's history, origins, important life events..."
                className="input-fantasy min-h-[150px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rules">Rules & Limitations</Label>
              <Textarea
                id="rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Things this character would never do, boundaries, restrictions..."
                className="input-fantasy min-h-[100px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="rpg" className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="space-y-1">
                <Label htmlFor="rpg-mode" className="font-display">Enable RPG Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Add stats, inventory, and dice rolls to chats
                </p>
              </div>
              <Switch
                id="rpg-mode"
                checked={isRpgEnabled}
                onCheckedChange={setIsRpgEnabled}
              />
            </div>

            {isRpgEnabled && (
              <div className="space-y-6 p-4 rounded-lg bg-muted/20 border border-border/50">
                <h4 className="font-display text-sm text-muted-foreground">Base Stats</h4>
                
                <div className="grid gap-6">
                  {[
                    { key: 'max_hp', label: 'Max HP', max: 200 },
                    { key: 'strength', label: 'Strength', max: 20 },
                    { key: 'dexterity', label: 'Dexterity', max: 20 },
                    { key: 'intelligence', label: 'Intelligence', max: 20 },
                    { key: 'charisma', label: 'Charisma', max: 20 },
                  ].map(({ key, label, max }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-sm">{label}</Label>
                        <span className="text-sm text-primary font-mono">
                          {baseStats[key as keyof RPGStats]}
                        </span>
                      </div>
                      <Slider
                        value={[baseStats[key as keyof RPGStats]]}
                        onValueChange={([value]) => updateStat(key as keyof RPGStats, value)}
                        max={max}
                        min={1}
                        step={1}
                        className="cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>

      <div className="flex gap-3 pt-4 border-t border-border/50">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="fantasy" className="flex-1" disabled={isLoading || !name.trim()}>
          {isLoading ? (
            <Sparkles className="w-4 h-4 animate-spin" />
          ) : character ? (
            'Save Changes'
          ) : (
            'Create Character'
          )}
        </Button>
      </div>
    </form>
  );
}
