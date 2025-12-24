import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  getChatSession,
  getChatSessions,
  createChatSession,
  updateChatSession,
  getMessages,
  createMessage,
  getMemories,
  getCharacter,
  rollDice,
} from '@/lib/supabase-helpers';
import type { ChatSession, Message, Character, MemoryEntry, RPGState, World } from '@/types/database';
import {
  Send,
  ArrowLeft,
  Plus,
  Swords,
  Heart,
  Package,
  Sparkles,
  Dice6,
  User,
  BookOpen,
  Brain,
  Settings,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function ChatPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { user, session: authSession } = useAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [safeMode, setSafeMode] = useState(true);
  const [newMemory, setNewMemory] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (characterId && user) {
      loadCharacter();
      loadSessions();
    }
  }, [characterId, user]);

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id);
    }
  }, [currentSession?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadCharacter = async () => {
    if (!characterId) return;
    const char = await getCharacter(characterId);
    if (char) {
      setCharacter(char);
      const mems = await getMemories(characterId, char.world_id || undefined);
      setMemories(mems);
    }
  };

  const loadSessions = async () => {
    if (!characterId) return;
    const sessionList = await getChatSessions(characterId);
    setSessions(sessionList);
    if (sessionList.length > 0) {
      setCurrentSession(sessionList[0]);
    }
  };

  const loadMessages = async (sessionId: string) => {
    const msgs = await getMessages(sessionId);
    setMessages(msgs);
  };

  const createNewSession = async () => {
    if (!character || !user) return;
    try {
      const defaultRpgState: RPGState = {
        hp: character.base_stats.max_hp,
        max_hp: character.base_stats.max_hp,
        inventory: [],
        skills: [],
        status_effects: [],
      };
      const newSession = await createChatSession({
        user_id: user.id,
        character_id: character.id,
        title: `Chat ${sessions.length + 1}`,
        is_rpg_mode: character.is_rpg_enabled,
        rpg_state: defaultRpgState,
      });
      setSessions([newSession, ...sessions]);
      setCurrentSession(newSession);
      setMessages([]);
      toast.success('New chat created!');
    } catch (error) {
      toast.error('Failed to create new chat');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || !character || !authSession) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setIsStreaming(true);

    // Create user message
    try {
      const savedUserMessage = await createMessage({
        session_id: currentSession.id,
        role: 'user',
        content: userMessage,
        is_dice_roll: false,
        dice_result: null,
      });
      setMessages((prev) => [...prev, savedUserMessage]);
    } catch (error) {
      toast.error('Failed to send message');
      setIsLoading(false);
      setIsStreaming(false);
      return;
    }

    // Prepare messages for API
    const apiMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          character: {
            name: character.name,
            description: character.description || '',
            personality: character.personality || '',
            backstory: character.backstory || '',
            speaking_style: character.speaking_style || '',
            rules: character.rules || '',
          },
          world: character.world
            ? {
                name: character.world.name,
                description: character.world.description || '',
                lore: character.world.lore || '',
                rules: character.world.rules || '',
              }
            : undefined,
          memories: memories.map((m) => m.content),
          isRpgMode: currentSession.is_rpg_mode,
          rpgState: currentSession.rpg_state,
          safeMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      // Add placeholder assistant message
      const placeholderMessage: Message = {
        id: 'streaming',
        session_id: currentSession.id,
        role: 'assistant',
        content: '',
        is_dice_roll: false,
        dice_result: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, placeholderMessage]);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === 'streaming' ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            // Incomplete JSON, continue
          }
        }
      }

      // Save the assistant message
      const savedAssistantMessage = await createMessage({
        session_id: currentSession.id,
        role: 'assistant',
        content: assistantContent,
        is_dice_roll: false,
        dice_result: null,
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === 'streaming' ? savedAssistantMessage : m))
      );

      // Process RPG commands in the response
      if (currentSession.is_rpg_mode) {
        processRpgCommands(assistantContent);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
      // Remove streaming message
      setMessages((prev) => prev.filter((m) => m.id !== 'streaming'));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const processRpgCommands = async (content: string) => {
    if (!currentSession) return;

    const newState = { ...currentSession.rpg_state };
    let stateChanged = false;

    // Process dice rolls
    const diceMatches = content.matchAll(/\[DICE:(\d+d\d+(?:[+-]\d+)?)\]/gi);
    for (const match of diceMatches) {
      const result = rollDice(match[1]);
      toast.info(`🎲 Rolled ${result.dice}: ${result.rolls.join(' + ')} = ${result.total}`);
    }

    // Process stat changes
    const statMatches = content.matchAll(/\[STAT_CHANGE:(\w+):([+-]?\d+)\]/gi);
    for (const match of statMatches) {
      const stat = match[1].toLowerCase();
      const change = parseInt(match[2]);
      if (stat === 'hp') {
        newState.hp = Math.max(0, Math.min(newState.max_hp, newState.hp + change));
        stateChanged = true;
        if (change > 0) {
          toast.success(`❤️ Healed ${change} HP`);
        } else {
          toast.error(`💔 Took ${Math.abs(change)} damage`);
        }
      }
    }

    // Process item changes
    const itemMatches = content.matchAll(/\[ITEM:([+-])([^\]]+)\]/gi);
    for (const match of itemMatches) {
      const action = match[1];
      const item = match[2].trim();
      if (action === '+') {
        newState.inventory.push(item);
        toast.success(`📦 Acquired: ${item}`);
      } else {
        newState.inventory = newState.inventory.filter((i) => i !== item);
        toast.info(`📦 Lost: ${item}`);
      }
      stateChanged = true;
    }

    if (stateChanged) {
      setCurrentSession({ ...currentSession, rpg_state: newState });
      await updateChatSession(currentSession.id, { rpg_state: newState });
    }
  };

  const handleDiceRoll = async (notation: string) => {
    const result = rollDice(notation);
    const rollMessage = `*rolls ${result.dice}* 🎲 [${result.rolls.join(', ')}] = **${result.total}**`;
    
    if (currentSession) {
      await createMessage({
        session_id: currentSession.id,
        role: 'system',
        content: rollMessage,
        is_dice_roll: true,
        dice_result: result,
      });
      await loadMessages(currentSession.id);
    }
    toast.info(`🎲 Rolled ${result.dice}: ${result.total}`);
  };

  const addMemory = async () => {
    if (!newMemory.trim() || !character || !user) return;
    try {
      await supabase.from('memory_entries').insert({
        user_id: user.id,
        character_id: character.id,
        world_id: character.world_id,
        content: newMemory.trim(),
        category: 'general',
        is_pinned: true,
      });
      setNewMemory('');
      const mems = await getMemories(character.id, character.world_id || undefined);
      setMemories(mems);
      toast.success('Memory saved!');
    } catch (error) {
      toast.error('Failed to save memory');
    }
  };

  if (!character) {
    return (
      <MainLayout>
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">Loading character...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Left Sidebar - Character Info & Sessions */}
        <div className="hidden lg:flex w-80 border-r border-border/50 flex-col glass-card">
          {/* Character Header */}
          <div className="p-4 border-b border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border-2 border-primary/30">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg truncate">{character.name}</h2>
                {character.world && (
                  <p className="text-xs text-muted-foreground truncate">
                    {character.world.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* RPG Stats (if enabled) */}
          {currentSession?.is_rpg_mode && currentSession.rpg_state && (
            <div className="p-4 border-b border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-display flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  HP
                </span>
                <span className="text-sm font-mono">
                  {currentSession.rpg_state.hp}/{currentSession.rpg_state.max_hp}
                </span>
              </div>
              <div className="rpg-hp-bar">
                <div
                  className="rpg-hp-bar-fill"
                  style={{
                    width: `${(currentSession.rpg_state.hp / currentSession.rpg_state.max_hp) * 100}%`,
                  }}
                />
              </div>

              {currentSession.rpg_state.inventory.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Inventory
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {currentSession.rpg_state.inventory.map((item, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Dice Rolls */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDiceRoll('1d20')}
                  className="flex-1"
                >
                  <Dice6 className="w-3 h-3 mr-1" />
                  d20
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDiceRoll('1d6')}
                  className="flex-1"
                >
                  d6
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDiceRoll('2d6')}
                  className="flex-1"
                >
                  2d6
                </Button>
              </div>
            </div>
          )}

          {/* Chat Sessions */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border/50 flex items-center justify-between">
              <span className="text-sm font-display">Chats</span>
              <Button variant="ghost" size="icon" onClick={createNewSession}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setCurrentSession(session)}
                    className={`w-full p-2 rounded-lg text-left text-sm transition-colors ${
                      currentSession?.id === session.id
                        ? 'bg-primary/20 border border-primary/30'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{session.title || 'Untitled Chat'}</span>
                    </div>
                    {session.is_rpg_mode && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        <Swords className="w-3 h-3 mr-1" />
                        RPG
                      </Badge>
                    )}
                  </button>
                ))}
                {sessions.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No chats yet. Start a new one!
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Memory & Settings */}
          <div className="p-3 border-t border-border/50 space-y-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  <Brain className="w-4 h-4 mr-2" />
                  Memories ({memories.length})
                </Button>
              </SheetTrigger>
              <SheetContent className="glass-card">
                <SheetHeader>
                  <SheetTitle className="font-display">Pinned Memories</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a memory..."
                      value={newMemory}
                      onChange={(e) => setNewMemory(e.target.value)}
                      className="input-fantasy"
                    />
                  </div>
                  <Button
                    variant="fantasy"
                    size="sm"
                    onClick={addMemory}
                    disabled={!newMemory.trim()}
                    className="w-full"
                  >
                    Save Memory
                  </Button>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {memories.map((mem) => (
                        <div
                          key={mem.id}
                          className="p-2 rounded-lg bg-muted/30 text-sm"
                        >
                          {mem.content}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center justify-between px-2">
              <Label htmlFor="safe-mode" className="text-sm">
                Safe Mode
              </Label>
              <Switch
                id="safe-mode"
                checked={safeMode}
                onCheckedChange={setSafeMode}
              />
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <div className="lg:hidden p-3 border-b border-border/50 flex items-center gap-3 glass-card">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="font-display truncate">{character.name}</h2>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="glass-card">
                <SheetHeader>
                  <SheetTitle className="font-display">Chat Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <Button
                    variant="fantasy"
                    onClick={createNewSession}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                  <div className="flex items-center justify-between">
                    <Label>Safe Mode</Label>
                    <Switch checked={safeMode} onCheckedChange={setSafeMode} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Messages */}
          {!currentSession ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <MessageSquare className="w-16 h-16 text-muted-foreground/50 mx-auto" />
                <p className="text-muted-foreground">No chat selected</p>
                <Button variant="fantasy" onClick={createNewSession}>
                  <Plus className="w-4 h-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <Sparkles className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                      <p className="text-muted-foreground font-prose italic">
                        Begin your adventure with {character.name}...
                      </p>
                    </div>
                  )}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      } animate-fade-in`}
                    >
                      <div
                        className={`max-w-[80%] ${
                          message.role === 'user'
                            ? 'chat-bubble-user'
                            : message.role === 'system'
                            ? 'chat-bubble-system'
                            : 'chat-bubble-assistant'
                        }`}
                      >
                        <p className="font-prose whitespace-pre-wrap">{message.content}</p>
                        {message.is_dice_roll && message.dice_result && (
                          <div className="dice-roll mt-2">
                            <Dice6 className="w-4 h-4" />
                            <span>{message.dice_result.total}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isStreaming && (
                    <div className="flex justify-start">
                      <div className="chat-bubble-assistant">
                        <Sparkles className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t border-border/50 glass-card">
                <div className="max-w-3xl mx-auto flex gap-2">
                  <Input
                    placeholder={`Message ${character.name}...`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="input-fantasy flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    variant="fantasy"
                    size="icon"
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
