import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import MCQQuestion from '../components/MCQQuestion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Cache for generated questions
const questionCache = new Map();

// Time limits in milliseconds for each difficulty
const TIME_LIMITS = {
  easy: 20000,    // 20 seconds
  medium: 60000,  // 60 seconds
  hard: 120000    // 120 seconds
};

const subjects = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'History',
  'Geography',
  'English Literature',
  'Economics',
  'Psychology'
];

interface Question {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizHistoryItem {
  questionId: string;
  selectedAnswer?: number;
  isCorrect: boolean;
  explanation: string;
  skipped: boolean;
  timeSpent: number;
}

const MCQQuiz = () => {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

  // Memoize the current question to prevent unnecessary re-renders
  const currentQuestion = useMemo(() => 
    questions[currentQuestionIndex], 
    [questions, currentQuestionIndex]
  );

  // Optimize timer effect
  useEffect(() => {
    if (!quizStarted || !currentQuestion) return;

    const timeLimit = TIME_LIMITS[currentQuestion.difficulty];
    setTimeLeft(timeLimit);
    setStartTime(Date.now());

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(timer);
          handleTimeExpired();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    setTimerId(timer);

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [currentQuestionIndex, currentQuestion, quizStarted]);

  const handleTimeExpired = useCallback(() => {
    if (!currentQuestion) return;

    const timeSpent = Date.now() - startTime;
    setQuizHistory(prev => [
      ...prev,
      {
        questionId: currentQuestion.id,
        isCorrect: false,
        explanation: currentQuestion.explanation,
        skipped: true,
        timeSpent
      }
    ]);

    toast.error(`Time's up! Question skipped.`);
    handleNext();
  }, [currentQuestion, startTime]);

  const handleStartQuiz = useCallback(async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject first');
      return;
    }

    setIsLoading(true);
    setQuizStarted(true);

    try {
      // Check cache first
      const cacheKey = `${selectedSubject}-${Date.now()}`;
      if (questionCache.has(cacheKey)) {
        setQuestions(questionCache.get(cacheKey));
        setCurrentQuestionIndex(0);
        setQuizHistory([]);
        setSelectedAnswers({});
        setStartTime(Date.now());
        setIsLoading(false);
        return;
      }

      const generatedQuestions = await generateQuestions(selectedSubject);
      if (generatedQuestions && generatedQuestions.length > 0) {
        // Cache the generated questions
        questionCache.set(cacheKey, generatedQuestions);
        setQuestions(generatedQuestions);
        setCurrentQuestionIndex(0);
        setQuizHistory([]);
        setSelectedAnswers({});
        setStartTime(Date.now());
      } else {
        throw new Error('Failed to generate questions');
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast.error('Failed to generate questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject]);

  const handleMCQAnswer = useCallback((questionId: string, selectedAnswer: number) => {
    if (!currentQuestion) return;

    const timeSpent = Date.now() - startTime;
    const isCorrect = selectedAnswer === currentQuestion.correctOption;

    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: selectedAnswer
    }));

    setQuizHistory(prev => {
      const existingAnswer = prev.find(q => q.questionId === questionId);
      if (existingAnswer) {
        return prev.map(q => 
          q.questionId === questionId 
            ? { ...q, selectedAnswer, isCorrect, timeSpent }
            : q
        );
      }
      return [
        ...prev,
        {
          questionId,
          selectedAnswer,
          isCorrect,
          explanation: currentQuestion.explanation,
          skipped: false,
          timeSpent
        }
      ];
    });

    if (isCorrect) {
      toast.success('Correct!');
    } else {
      toast.error('Incorrect. Try again!');
    }
  }, [currentQuestion, startTime]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const handleNext = useCallback(async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      await saveProgress();
      toast.success('Quiz completed!');
      setQuizStarted(false);
      setCurrentQuestionIndex(0);
      setQuizHistory([]);
      setSelectedAnswers({});
      navigate('/chat');
    }
  }, [currentQuestionIndex, questions.length, navigate]);

  const exitQuiz = useCallback(() => {
    if (timerId) {
      clearInterval(timerId);
    }
    setQuizStarted(false);
    setSelectedSubject('');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setQuizHistory([]);
    setSelectedAnswers({});
    setStartTime(0);
    setTimeLeft(0);
  }, [timerId]);

  const saveProgress = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate score percentage
      const score = (quizHistory.filter(q => q.isCorrect).length / questions.length) * 100;

      // Insert quiz attempt
      const { error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          subject: selectedSubject,
          score,
          total_questions: questions.length,
          time_spent: quizHistory.reduce((acc, q) => acc + q.timeSpent, 0),
          questions: quizHistory.map(q => ({
            question: questions.find(question => question.id === q.questionId)?.question || '',
            selectedAnswer: q.selectedAnswer,
            correctAnswer: questions.find(question => question.id === q.questionId)?.correctOption || 0,
            isCorrect: q.isCorrect,
            explanation: questions.find(question => question.id === q.questionId)?.explanation || ''
          }))
        });

      if (attemptError) throw attemptError;

      // Update user progress
      const { data: userProgress, error: userError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userError && userError.code !== 'PGRST116') throw userError;

      const { error: upsertUserError } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          total_quizzes: (userProgress?.total_quizzes || 0) + 1,
          average_score: userProgress
            ? ((userProgress.average_score * userProgress.total_quizzes + score) / (userProgress.total_quizzes + 1))
            : score,
          last_active: new Date().toISOString()
        });

      if (upsertUserError) throw upsertUserError;

      // Update subject progress
      const { data: subjectProgress, error: subjectError } = await supabase
        .from('subject_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject', selectedSubject)
        .single();

      if (subjectError && subjectError.code !== 'PGRST116') throw subjectError;

      // Calculate weak and strong topics
      const weakTopics = questions
        .filter(q => !q.isCorrect)
        .map(q => q.topic || selectedSubject);
      const strongTopics = questions
        .filter(q => q.isCorrect)
        .map(q => q.topic || selectedSubject);

      const { error: upsertSubjectError } = await supabase
        .from('subject_progress')
        .upsert({
          user_id: user.id,
          subject: selectedSubject,
          total_attempts: (subjectProgress?.total_attempts || 0) + 1,
          average_score: subjectProgress
            ? ((subjectProgress.average_score * subjectProgress.total_attempts + score) / (subjectProgress.total_attempts + 1))
            : score,
          last_attempt: new Date().toISOString(),
          weak_topics: [...new Set([...(subjectProgress?.weak_topics || []), ...weakTopics])],
          strong_topics: [...new Set([...(subjectProgress?.strong_topics || []), ...strongTopics])]
        });

      if (upsertSubjectError) throw upsertSubjectError;
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
    }
  }, [quizHistory, questions, selectedSubject]);

  const generateQuestions = async (subject: string) => {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral',
          prompt: `Generate 5 multiple choice questions about ${subject}. 
          Format the response as a JSON array with the following structure:
          [
            {
              "id": "1",
              "question": "Question text",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctOption": 0,
              "explanation": "Explanation of the correct answer",
              "difficulty": "easy"
            }
          ]
          
          Rules:
          1. Each question must have exactly 4 options
          2. correctOption must be 0-3 (representing A-D)
          3. Each question must have a unique explanation
          4. Difficulty should be one of: "easy", "medium", "hard"
          5. Include 2 easy, 2 medium, and 1 hard question
          6. Ensure options are unique and not repeated
          7. Vary the position of correct answers (don't make them all A or B)
          8. Make questions clear and unambiguous
          9. Include the explanation for each answer`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Ollama');
      }

      const data = await response.json();
      const responseText = data.response.trim();
      
      // Try to parse the response as JSON
      let questions;
      try {
        questions = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse questions:', parseError);
        console.log('Raw response:', responseText);
        throw new Error('Invalid question format');
      }

      // Validate questions
      if (!Array.isArray(questions) || questions.length !== 5) {
        throw new Error('Invalid number of questions');
      }

      // Validate each question
      questions.forEach((q, index) => {
        if (!q.id || !q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctOption !== 'number' || q.correctOption < 0 || q.correctOption > 3 ||
            !q.explanation || !['easy', 'medium', 'hard'].includes(q.difficulty)) {
          throw new Error(`Invalid question format at index ${index}`);
        }
      });

      // Check for duplicate options
      questions.forEach(q => {
        const uniqueOptions = new Set(q.options);
        if (uniqueOptions.size !== 4) {
          throw new Error('Duplicate options found in question');
        }
      });

      // Check difficulty distribution
      const difficulties = questions.map(q => q.difficulty);
      const easyCount = difficulties.filter(d => d === 'easy').length;
      const mediumCount = difficulties.filter(d => d === 'medium').length;
      const hardCount = difficulties.filter(d => d === 'hard').length;

      if (easyCount !== 2 || mediumCount !== 2 || hardCount !== 1) {
        throw new Error('Invalid difficulty distribution');
      }

      return questions;
    } catch (error) {
      console.error('Error generating questions:', error);
      throw error;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="glass-card p-6">
          {!quizStarted ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-center">Select a Subject</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`p-4 rounded-lg border transition-colors ${
                      selectedSubject === subject
                        ? 'bg-thinkforge-purple text-white border-thinkforge-purple'
                        : 'hover:bg-foreground/5'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={handleStartQuiz}
                  disabled={!selectedSubject || isLoading}
                  className={`px-6 py-2 rounded-lg text-white transition-colors ${
                    selectedSubject && !isLoading
                      ? 'bg-thinkforge-purple hover:bg-thinkforge-purple/90'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? 'Starting Quiz...' : 'Start Quiz'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{selectedSubject} Quiz</h2>
                <button
                  onClick={exitQuiz}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Exit Quiz
                </button>
              </div>

              {questions.length > 0 && currentQuestionIndex < questions.length ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground/60">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">
                        {questions[currentQuestionIndex].difficulty}
                      </span>
                      <span className="text-sm font-medium text-thinkforge-purple">
                        Time left: {Math.ceil(timeLeft / 1000)}s
                      </span>
                    </div>
                  </div>

                  <MCQQuestion
                    question={questions[currentQuestionIndex]}
                    onAnswerSelect={(answer) => handleMCQAnswer(questions[currentQuestionIndex].id, answer)}
                    selectedAnswer={selectedAnswers[questions[currentQuestionIndex].id]}
                    showFeedback={quizHistory.some(q => q.questionId === questions[currentQuestionIndex].id)}
                    explanation={questions[currentQuestionIndex].explanation}
                  />

                  <div className="flex justify-between">
                    <button
                      onClick={handlePrevious}
                      disabled={currentQuestionIndex === 0}
                      className="px-4 py-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleNext}
                      className="px-4 py-2 rounded-lg bg-thinkforge-purple text-white hover:bg-thinkforge-purple/90 transition-colors"
                    >
                      {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-thinkforge-purple mx-auto"></div>
                  <p className="mt-4">Generating questions...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MCQQuiz; 