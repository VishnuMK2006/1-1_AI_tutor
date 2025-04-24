import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { BookOpen, AlertCircle, CheckCircle2, Clock, X, MessageSquare, ArrowLeft, HelpCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from 'react-router-dom';

interface TopicReview {
  topic: string;
  subject: string;
  incorrect_attempts: number;
  total_attempts: number;
  last_attempted: string;
  average_score: number;
  incorrect_questions: Array<{
    question: string;
    user_answer: string;
    correct_answer: string;
    explanation?: string;
  }>;
}

const TopicsToReview = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<TopicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicReview | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [explanationLoading, setExplanationLoading] = useState(false);

  useEffect(() => {
    const fetchTopicsToReview = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch quiz attempts with incorrect answers
        const { data: quizAttempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (attemptsError) {
          console.error('Error fetching quiz attempts:', attemptsError);
          return;
        }

        // Process quiz attempts to identify topics needing review
        const topicStats = new Map<string, TopicReview>();

        quizAttempts.forEach(attempt => {
          attempt.questions.forEach((question: any) => {
            if (!question.isCorrect) {
              const topic = question.topic || attempt.subject;
              const key = `${topic}-${attempt.subject}`;

              if (!topicStats.has(key)) {
                topicStats.set(key, {
                  topic,
                  subject: attempt.subject,
                  incorrect_attempts: 0,
                  total_attempts: 0,
                  last_attempted: attempt.created_at,
                  average_score: 0,
                  incorrect_questions: []
                });
              }

              const stats = topicStats.get(key)!;
              stats.incorrect_attempts++;
              stats.total_attempts++;
              stats.last_attempted = attempt.created_at;
              stats.average_score = (stats.average_score * (stats.total_attempts - 1) + question.score) / stats.total_attempts;
              
              // Add incorrect question details
              stats.incorrect_questions.push({
                question: question.question,
                user_answer: question.userAnswer,
                correct_answer: question.correctAnswer
              });
            }
          });
        });

        // Convert to array and sort by incorrect attempts
        const topicsArray = Array.from(topicStats.values())
          .sort((a, b) => b.incorrect_attempts - a.incorrect_attempts);

        setTopics(topicsArray);
      } catch (error) {
        console.error('Error fetching topics to review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopicsToReview();
  }, []);

  const fetchExplanation = async (question: string, userAnswer: string, correctAnswer: string) => {
    try {
      setExplanationLoading(true);
      const prompt = `Please explain why the answer "${userAnswer}" is incorrect and why "${correctAnswer}" is correct for the following question: "${question}". Provide a clear and concise explanation.`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral',
          prompt: prompt,
          stream: false,
        }),
      });

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error fetching explanation:', error);
      return 'Failed to generate explanation. Please try again.';
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleReviewClick = async (topic: TopicReview) => {
    setSelectedTopic(topic);
    setIsDialogOpen(true);

    // Fetch explanations for incorrect questions
    const updatedTopic = { ...topic };
    for (let question of updatedTopic.incorrect_questions) {
      if (!question.explanation) {
        question.explanation = await fetchExplanation(
          question.question,
          question.user_answer,
          question.correct_answer
        );
      }
    }
    setSelectedTopic(updatedTopic);
  };

  const handleExplainInChat = async (question: any, topic: TopicReview, isUnderstandingCheck: boolean = false) => {
    try {
      // Create a new chat conversation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert([{
          user_id: user.id,
          title: `Review: ${topic.topic} - ${topic.subject}`
        }])
        .select()
        .single();

      if (convError) throw convError;

      // Add the question and explanation as initial messages
      const userMessage = {
        role: 'user',
        content: isUnderstandingCheck 
          ? `Please check if I understand this question correctly: "${question.question}"\nMy answer was: "${question.user_answer}"\nThe correct answer is: "${question.correct_answer}"\n\nPlease ask me questions to verify my understanding.`
          : `Please explain this question in detail: "${question.question}"\nMy answer was: "${question.user_answer}"\nThe correct answer is: "${question.correct_answer}"`,
        user_id: user.id,
        conversation_id: conversation.id,
        created_at: new Date().toISOString()
      };

      const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert([userMessage]);

      if (userMsgError) throw userMsgError;

      // Navigate to chat with the new conversation
      navigate('/chat', { state: { conversationId: conversation.id } });
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const filteredTopics = selectedSubject
    ? topics.filter(topic => topic.subject === selectedSubject)
    : topics;

  const subjects = Array.from(new Set(topics.map(topic => topic.subject)));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-thinkforge-purple"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-foreground/70 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Topics to Review</h1>
          </div>
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-thinkforge-purple" />
            <span className="text-sm text-foreground/70">
              {topics.length} topics need attention
            </span>
          </div>
        </div>

        {/* Subject Filter */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedSubject(null)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                !selectedSubject
                  ? 'bg-thinkforge-purple text-white'
                  : 'bg-foreground/5 hover:bg-foreground/10'
              }`}
            >
              All Subjects
            </button>
            {subjects.map(subject => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedSubject === subject
                    ? 'bg-thinkforge-purple text-white'
                    : 'bg-foreground/5 hover:bg-foreground/10'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTopics.map((topic, index) => (
            <Card key={index} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{topic.topic}</h3>
                    <p className="text-sm text-foreground/70">{topic.subject}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-500">
                      {topic.incorrect_attempts} mistakes
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-medium">
                      {((1 - topic.incorrect_attempts / topic.total_attempts) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={(1 - topic.incorrect_attempts / topic.total_attempts) * 100}
                    className="h-2"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-foreground/70" />
                    <span className="text-foreground/70">
                      Last attempted {new Date(topic.last_attempted).toLocaleDateString()}
                    </span>
                  </div>
                  <Button 
                    onClick={() => handleReviewClick(topic)}
                    variant="ghost"
                    className="text-thinkforge-purple hover:text-thinkforge-purple/80 hover:bg-thinkforge-purple/10"
                  >
                    Review Now
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredTopics.length === 0 && (
          <div className="text-center py-10">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg text-foreground/70">
              {selectedSubject
                ? `No topics need review in ${selectedSubject}`
                : 'No topics need review at the moment!'}
            </p>
          </div>
        )}

        {/* Explanation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span>Review: {selectedTopic?.topic}</span>
              </DialogTitle>
              <DialogDescription>
                Let's go through the questions you got wrong and understand why.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {selectedTopic?.incorrect_questions.map((question, index) => (
                  <div key={index} className="space-y-4 p-4 rounded-lg bg-foreground/5">
                    <div className="space-y-2">
                      <h4 className="font-medium">Question {index + 1}</h4>
                      <p className="text-sm">{question.question}</p>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-red-500">Your answer: {question.user_answer}</span>
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-green-500">Correct answer: {question.correct_answer}</span>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={() => handleExplainInChat(question, selectedTopic!, false)}
                        variant="outline"
                        size="sm"
                        className="text-thinkforge-purple hover:text-thinkforge-purple/80 hover:bg-thinkforge-purple/10"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Explain in Chat
                      </Button>
                      <Button
                        onClick={() => handleExplainInChat(question, selectedTopic!, true)}
                        variant="outline"
                        size="sm"
                        className="text-thinkforge-purple hover:text-thinkforge-purple/80 hover:bg-thinkforge-purple/10"
                      >
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Do you understand?
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default TopicsToReview; 