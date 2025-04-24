import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Fetch overall user progress
      const { data: userProgress, error: userError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user progress:', userError);
        return res.status(500).json({ message: 'Error fetching user progress' });
      }

      // Fetch subject progress
      const { data: subjectProgress, error: subjectError } = await supabase
        .from('subject_progress')
        .select('*')
        .eq('user_id', userId);

      if (subjectError) {
        console.error('Error fetching subject progress:', subjectError);
        return res.status(500).json({ message: 'Error fetching subject progress' });
      }

      return res.status(200).json({
        ...userProgress,
        subjects: subjectProgress || []
      });
    } catch (error) {
      console.error('Error fetching progress:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { userId, subject, score, totalQuestions, timeSpent, questions } = req.body;

      if (!userId || !subject || typeof score !== 'number' || !Array.isArray(questions)) {
        return res.status(400).json({ message: 'Invalid request data' });
      }

      // Start a transaction
      const { data: userProgress, error: userError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching user progress:', userError);
        return res.status(500).json({ message: 'Error updating progress' });
      }

      // Insert or update user progress
      const { error: upsertUserError } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          total_quizzes: (userProgress?.total_quizzes || 0) + 1,
          average_score: userProgress
            ? ((userProgress.average_score * userProgress.total_quizzes + score) / (userProgress.total_quizzes + 1))
            : score,
          last_active: new Date().toISOString()
        });

      if (upsertUserError) {
        console.error('Error updating user progress:', upsertUserError);
        return res.status(500).json({ message: 'Error updating progress' });
      }

      // Insert quiz attempt
      const { error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: userId,
          subject,
          score,
          total_questions: totalQuestions,
          time_spent,
          questions
        });

      if (attemptError) {
        console.error('Error inserting quiz attempt:', attemptError);
        return res.status(500).json({ message: 'Error updating progress' });
      }

      // Update subject progress
      const { data: subjectProgress, error: subjectError } = await supabase
        .from('subject_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('subject', subject)
        .single();

      if (subjectError && subjectError.code !== 'PGRST116') {
        console.error('Error fetching subject progress:', subjectError);
        return res.status(500).json({ message: 'Error updating progress' });
      }

      // Calculate weak and strong topics
      const weakTopics = questions
        .filter(q => !q.isCorrect)
        .map(q => q.topic || subject);
      const strongTopics = questions
        .filter(q => q.isCorrect)
        .map(q => q.topic || subject);

      // Insert or update subject progress
      const { error: upsertSubjectError } = await supabase
        .from('subject_progress')
        .upsert({
          user_id: userId,
          subject,
          total_attempts: (subjectProgress?.total_attempts || 0) + 1,
          average_score: subjectProgress
            ? ((subjectProgress.average_score * subjectProgress.total_attempts + score) / (subjectProgress.total_attempts + 1))
            : score,
          last_attempt: new Date().toISOString(),
          weak_topics: [...new Set([...(subjectProgress?.weak_topics || []), ...weakTopics])],
          strong_topics: [...new Set([...(subjectProgress?.strong_topics || []), ...strongTopics])]
        });

      if (upsertSubjectError) {
        console.error('Error updating subject progress:', upsertSubjectError);
        return res.status(500).json({ message: 'Error updating progress' });
      }

      return res.status(200).json({ message: 'Progress updated successfully' });
    } catch (error) {
      console.error('Error updating progress:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
} 