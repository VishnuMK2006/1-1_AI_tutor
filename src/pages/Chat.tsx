import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ChatHeader from '@/features/chat/components/ChatHeader';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  topic?: string;
  subject?: string;
  conversation_id: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const Chat = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    const conversationId = location.state?.conversationId;
    if (conversationId) {
      const conversation = conversations.find(conv => conv.id === conversationId);
      if (conversation) {
        handleConversationSelect(conversation).then(async () => {
          const { data: messages } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (messages && messages.length === 1) { // Only one message means it's a new conversation
            try {
              setIsLoading(true);
              const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'mistral',
                  prompt: `You are a helpful AI tutor. The user is reviewing questions they got wrong in a quiz. 
                  This conversation was started from the "Explain in Chat" button.
                  Provide a detailed explanation of the concept and then ask 2-3 questions to verify their understanding.
                  
                  User's question: ${messages[0].content}`,
                  stream: false,
                }),
              });

              const data = await response.json();
              const aiMessage = {
                role: 'assistant' as const,
                content: data.response,
                user_id: user?.id,
                conversation_id: conversationId,
                created_at: new Date().toISOString()
              };

              const { data: aiMessageData, error: aiError } = await supabase
                .from('chat_messages')
                .insert([aiMessage])
                .select()
                .single();

              if (aiError) throw aiError;

              await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', conversationId);

              setMessages(prev => [...prev, aiMessageData]);
              fetchConversations();
            } catch (error) {
              console.error('Error generating AI response:', error);
            } finally {
              setIsLoading(false);
            }
          }
        });
      }
    }
  }, [conversations, location.state]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleConversationSelect = async (conversation: Conversation) => {
    setMessages([]);
    setCurrentConversation(conversation);
    await fetchMessages(conversation.id);
  };

  const fetchMessages = async (conversationId?: string) => {
    const targetConversationId = conversationId || currentConversation?.id;
    if (!targetConversationId) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', targetConversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const createNewChat = async () => {
    if (!user || !newChatTitle.trim()) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          user_id: user.id,
          title: newChatTitle.trim()
        }])
        .select()
        .single();

      if (error) throw error;

      // Clear messages and set new conversation before any other operations
      setMessages([]);
      setCurrentConversation(data);
      setConversations(prev => [data, ...prev]);
      setNewChatTitle('');
      setIsNewChatDialogOpen(false);

      // If there's a message from navigation state, add it to the new chat
      const conversationId = location.state?.conversationId;
      if (conversationId) {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (messages && messages.length === 1) {
          // Copy the message to the new chat
          const { data: newMessage, error: messageError } = await supabase
            .from('chat_messages')
            .insert([{
              role: messages[0].role,
              content: messages[0].content,
              user_id: user.id,
              conversation_id: data.id,
              created_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (messageError) throw messageError;

          // Generate AI response for the new chat
          const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'mistral',
              prompt: `You are a helpful AI tutor. The user is reviewing questions they got wrong in a quiz. 
              This conversation was started from the "Explain in Chat" button.
              Provide a detailed explanation of the concept and then ask 2-3 questions to verify their understanding.
              
              User's question: ${messages[0].content}`,
              stream: false,
            }),
          });

          const aiData = await response.json();
          const aiMessage = {
            role: 'assistant' as const,
            content: aiData.response,
            user_id: user.id,
            conversation_id: data.id,
            created_at: new Date().toISOString()
          };

          const { data: aiMessageData, error: aiError } = await supabase
            .from('chat_messages')
            .insert([aiMessage])
            .select()
            .single();

          if (aiError) throw aiError;

          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', data.id);

          setMessages([newMessage, aiMessageData]);
        }
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !currentConversation) return;

    const userMessage = {
      role: 'user' as const,
      content: input.trim(),
      user_id: user.id,
      conversation_id: currentConversation.id,
      created_at: new Date().toISOString()
    };

    try {
      setIsLoading(true);
      setInput('');

      // Insert user message
      const { data: userMessageData, error: userError } = await supabase
        .from('chat_messages')
        .insert([userMessage])
        .select()
        .single();

      if (userError) throw userError;

      // Get conversation history for context
      const { data: history } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', currentConversation.id)
        .order('created_at', { ascending: true });

      // Format conversation history for the prompt
      const conversationHistory = history?.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n') || '';

      // Get AI response
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral',
          prompt: `You are a helpful AI tutor. The user is reviewing questions they got wrong in a quiz. 
          Provide clear, detailed explanations and help them understand the concepts better.
          Only ask questions to verify understanding if the conversation was started from the "Explain in Chat" button.
          For regular chat messages, respond naturally without asking questions.
          
          Previous conversation:
          ${conversationHistory}
          
          Current message: ${input.trim()}`,
          stream: false,
        }),
      });

      const data = await response.json();
      const aiMessage = {
        role: 'assistant' as const,
        content: data.response,
        user_id: user.id,
        conversation_id: currentConversation.id,
        created_at: new Date().toISOString()
      };

      // Insert AI message
      const { data: aiMessageData, error: aiError } = await supabase
        .from('chat_messages')
        .insert([aiMessage])
        .select()
        .single();

      if (aiError) throw aiError;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversation.id);

      // Update messages state with the new messages
      setMessages(prev => [...prev, userMessageData, aiMessageData]);
      
      // Refresh conversations to update order
      await fetchConversations();
      
      // Ensure we're still on the current conversation
      setCurrentConversation(prev => {
        if (prev?.id === currentConversation.id) {
          return {
            ...prev,
            updated_at: new Date().toISOString()
          };
        }
        return prev;
      });
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-6rem)]">
        {/* Sidebar */}
        <div className="w-64 border-r p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-foreground/70 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => setIsNewChatDialogOpen(true)}
              className="flex-1 bg-thinkforge-purple hover:bg-thinkforge-purple/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                    currentConversation?.id === conversation.id
                      ? 'bg-thinkforge-purple/10'
                      : 'hover:bg-foreground/5'
                  }`}
                >
                  <div
                    className="flex-1 truncate mr-2"
                    onClick={() => handleConversationSelect(conversation)}
                  >
                    {conversation.title}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteConversation(conversation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatHeader />
          {currentConversation ? (
            <>
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-thinkforge-purple text-white'
                            : 'bg-foreground/5'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-foreground/5 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={isLoading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">Welcome to ThinkForge Chat</h2>
                <p className="text-foreground/70">Select a conversation or create a new one to get started</p>
                <Button
                  onClick={() => setIsNewChatDialogOpen(true)}
                  className="bg-thinkforge-purple hover:bg-thinkforge-purple/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Chat</DialogTitle>
            <DialogDescription>
              Give your new chat a title to get started.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            placeholder="Enter chat title..."
            className="mt-4"
          />
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setIsNewChatDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createNewChat}
              className="bg-thinkforge-purple hover:bg-thinkforge-purple/90"
            >
              Create Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Chat; 