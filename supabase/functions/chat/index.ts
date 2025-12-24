import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  character: {
    name: string;
    description: string;
    personality: string;
    backstory: string;
    speaking_style: string;
    rules: string;
  };
  world?: {
    name: string;
    description: string;
    lore: string;
    rules: string;
  };
  memories?: string[];
  isRpgMode: boolean;
  rpgState?: {
    hp: number;
    max_hp: number;
    inventory: string[];
    skills: string[];
    status_effects: string[];
  };
  safeMode: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, character, world, memories, isRpgMode, rpgState, safeMode } = await req.json() as ChatRequest;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the system prompt
    let systemPrompt = `You are ${character.name}, a character in an immersive roleplay experience.

CHARACTER PROFILE:
- Name: ${character.name}
${character.description ? `- Description: ${character.description}` : ''}
${character.personality ? `- Personality: ${character.personality}` : ''}
${character.backstory ? `- Backstory: ${character.backstory}` : ''}
${character.speaking_style ? `- Speaking Style: ${character.speaking_style}` : ''}
${character.rules ? `- Character Rules: ${character.rules}` : ''}
`;

    if (world) {
      systemPrompt += `
WORLD/SETTING:
- World Name: ${world.name}
${world.description ? `- Description: ${world.description}` : ''}
${world.lore ? `- Lore: ${world.lore}` : ''}
${world.rules ? `- World Rules: ${world.rules}` : ''}
`;
    }

    if (memories && memories.length > 0) {
      systemPrompt += `
IMPORTANT MEMORIES (things you remember from past interactions):
${memories.map(m => `- ${m}`).join('\n')}
`;
    }

    if (isRpgMode && rpgState) {
      systemPrompt += `
RPG MODE ACTIVE:
You are participating in a text-based RPG. Current player stats:
- HP: ${rpgState.hp}/${rpgState.max_hp}
- Inventory: ${rpgState.inventory.length > 0 ? rpgState.inventory.join(', ') : 'Empty'}
- Skills: ${rpgState.skills.length > 0 ? rpgState.skills.join(', ') : 'None'}
- Status Effects: ${rpgState.status_effects.length > 0 ? rpgState.status_effects.join(', ') : 'None'}

When the user performs actions, you should:
1. Describe the outcome narratively
2. If combat or skill checks are involved, indicate when dice rolls are needed using [DICE:XdY] format (e.g., [DICE:1d20] for a skill check)
3. Suggest stat changes using [STAT_CHANGE:hp:-10] or [ITEM:+Rusty Sword] format
4. Keep the story engaging and reactive to player choices
`;
    }

    if (safeMode) {
      systemPrompt += `
CONTENT GUIDELINES:
- Keep all content appropriate and safe
- Avoid explicit violence, gore, or adult themes
- Focus on adventure, story, and character development
`;
    } else {
      systemPrompt += `
CONTENT GUIDELINES:
- Mature themes are allowed but keep it tasteful
- Focus on narrative quality and character depth
`;
    }

    systemPrompt += `
ROLEPLAY INSTRUCTIONS:
- Stay in character at all times
- Write in a narrative style with dialogue and action descriptions
- Use *asterisks* for actions and descriptions
- React authentically based on your personality and the situation
- Create engaging, immersive responses that advance the story
- Keep responses between 100-300 words for good pacing
`;

    console.log('Sending request to Lovable AI Gateway');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to get AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Chat function error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
