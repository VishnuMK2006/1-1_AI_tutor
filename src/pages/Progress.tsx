import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Award, BarChart2, PieChart as PieChartIcon, LineChart, ArrowUp, ArrowDown } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/supabase';

const COLORS = ['#7E22CE', '#9B87F5', '#E5DEFF', '#4C1D95', '#2E1065'];

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
  last_active: string;
}

const Progress = () => {
  const [timeframe, setTimeframe] = useState('weekly');
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
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-thinkforge-purple"></div>
        </div>
      </Layout>
    );
  }

  if (!progress) {
    return (
      <Layout>
        <div className="text-center py-10">
          <p className="text-lg text-foreground/70">No progress data available yet. Start taking quizzes to track your progress!</p>
        </div>
      </Layout>
    );
  }

  // Prepare data for charts
  const subjectDistributionData = progress.subjects.map(subject => ({
    name: subject.subject,
    value: subject.total_attempts
  }));

  const progressData = progress.subjects.map(subject => ({
    name: subject.subject,
    score: subject.average_score
  }));

  const strengthsData = progress.subjects.flatMap(subject =>
    subject.strong_topics.map(topic => ({
      name: topic,
      score: subject.average_score
    }))
  ).slice(0, 5);

  const weaknessesData = progress.subjects.flatMap(subject =>
    subject.weak_topics.map(topic => ({
      name: topic,
      score: subject.average_score
    }))
  ).slice(0, 5);

  // Calculate week-over-week improvement
  const calculateImprovement = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <Layout>
      <div className="pb-10">
        <h1 className="text-2xl font-bold mb-6">Progress Report</h1>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/70">Total Quizzes</p>
                <p className="text-2xl font-bold">{progress.total_quizzes}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-thinkforge-purple/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-thinkforge-purple" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-green-400">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>{calculateImprovement(progress.total_quizzes, 0)}% increase</span>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/70">Average Score</p>
                <p className="text-2xl font-bold">{progress.average_score.toFixed(1)}%</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-thinkforge-purple/20 flex items-center justify-center">
                <Award className="h-5 w-5 text-thinkforge-purple" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-green-400">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>{calculateImprovement(progress.average_score, 0)}% increase</span>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/70">Subjects Covered</p>
                <p className="text-2xl font-bold">{progress.subjects.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-thinkforge-purple/20 flex items-center justify-center">
                <BarChart2 className="h-5 w-5 text-thinkforge-purple" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-green-400">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>{calculateImprovement(progress.subjects.length, 0)}% increase</span>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/70">Last Active</p>
                <p className="text-2xl font-bold">
                  {new Date(progress.last_active).toLocaleDateString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-thinkforge-purple/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-thinkforge-purple" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs for Different Charts */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="strengths">Strengths</TabsTrigger>
            <TabsTrigger value="weaknesses">Weaknesses</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Performance by Subject</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#7E22CE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Subject Distribution</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {subjectDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="strengths" className="space-y-4">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Strong Areas</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={strengthsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#22C55E" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="weaknesses" className="space-y-4">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Areas for Improvement</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weaknessesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Recent Activity */}
        <div className="glass-card p-6 rounded-xl mt-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {progress.subjects.slice(0, 5).map((subject, idx) => (
              <div key={idx} className="glass-dark p-4 rounded-lg flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">
                    {subject.subject} Quiz
                  </h4>
                  <p className="text-xs text-foreground/70 mt-1">
                    Completed {new Date(subject.last_attempt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{subject.average_score.toFixed(1)}%</p>
                  <p className="text-xs text-foreground/70 mt-1">
                    {subject.total_attempts} attempts
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Progress;
