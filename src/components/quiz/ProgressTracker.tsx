import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';

interface SubjectProgress {
  subject: string;
  total_attempts: number;
  average_score: number;
  last_attempt: string;
  weak_topics: string[];
  strong_topics: string[];
}

interface UserProgress {
  total_quizzes: number;
  average_score: number;
  subjects: SubjectProgress[];
}

export default function ProgressTracker() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user progress
        const { data: userProgress, error: userError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user progress:', userError);
          return;
        }

        // Fetch subject progress
        const { data: subjectProgress, error: subjectError } = await supabase
          .from('subject_progress')
          .select('*')
          .eq('user_id', user.id);

        if (subjectError) {
          console.error('Error fetching subject progress:', subjectError);
          return;
        }

        setProgress({
          ...userProgress,
          subjects: subjectProgress || []
        });
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) {
    return <div>Loading progress...</div>;
  }

  if (!progress) {
    return <div>No progress data available</div>;
  }

  // Prepare data for the line chart
  const chartData = progress.subjects.map(subject => ({
    subject: subject.subject,
    score: subject.average_score,
    attempts: subject.total_attempts
  }));

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Overall Progress</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-foreground/60">Total Quizzes</p>
            <p className="text-2xl font-bold">{progress.total_quizzes}</p>
          </div>
          <div>
            <p className="text-sm text-foreground/60">Average Score</p>
            <p className="text-2xl font-bold">{progress.average_score.toFixed(1)}%</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Performance by Subject</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {progress.subjects.map(subject => (
          <Card key={subject.subject} className="p-6">
            <h3 className="text-lg font-semibold mb-4">{subject.subject}</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/60">Average Score</p>
                <Progress value={subject.average_score} className="mt-2" />
                <p className="text-sm mt-1">{subject.average_score.toFixed(1)}%</p>
              </div>

              <div>
                <p className="text-sm text-foreground/60">Total Attempts</p>
                <p className="text-lg font-medium">{subject.total_attempts}</p>
              </div>

              {subject.weak_topics.length > 0 && (
                <div>
                  <p className="text-sm text-foreground/60">Areas for Improvement</p>
                  <ul className="mt-2 space-y-1">
                    {subject.weak_topics.map(topic => (
                      <li key={topic} className="text-sm text-red-500">
                        • {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {subject.strong_topics.length > 0 && (
                <div>
                  <p className="text-sm text-foreground/60">Strong Areas</p>
                  <ul className="mt-2 space-y-1">
                    {subject.strong_topics.map(topic => (
                      <li key={topic} className="text-sm text-green-500">
                        • {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 