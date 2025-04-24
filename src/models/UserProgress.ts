import mongoose from 'mongoose';

const QuizAttemptSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  date: { type: Date, default: Date.now },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeSpent: { type: Number, required: true }, // in seconds
  questions: [{
    question: String,
    selectedAnswer: Number,
    correctAnswer: Number,
    isCorrect: Boolean,
    explanation: String
  }]
});

const SubjectProgressSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  totalAttempts: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  lastAttempt: { type: Date },
  weakTopics: [String],
  strongTopics: [String],
  attempts: [QuizAttemptSchema]
});

const UserProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  subjects: [SubjectProgressSchema],
  totalQuizzes: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Update subject progress after each quiz attempt
UserProgressSchema.methods.updateSubjectProgress = async function(
  subject: string,
  score: number,
  totalQuestions: number,
  timeSpent: number,
  questions: any[]
) {
  const subjectIndex = this.subjects.findIndex(s => s.subject === subject);
  
  if (subjectIndex === -1) {
    // New subject
    this.subjects.push({
      subject,
      totalAttempts: 1,
      averageScore: score,
      lastAttempt: new Date(),
      weakTopics: [],
      strongTopics: [],
      attempts: [{
        subject,
        date: new Date(),
        score,
        totalQuestions,
        timeSpent,
        questions
      }]
    });
  } else {
    // Update existing subject
    const subjectProgress = this.subjects[subjectIndex];
    subjectProgress.totalAttempts += 1;
    subjectProgress.averageScore = 
      (subjectProgress.averageScore * (subjectProgress.totalAttempts - 1) + score) / 
      subjectProgress.totalAttempts;
    subjectProgress.lastAttempt = new Date();
    subjectProgress.attempts.push({
      subject,
      date: new Date(),
      score,
      totalQuestions,
      timeSpent,
      questions
    });

    // Update weak and strong topics
    const incorrectQuestions = questions.filter(q => !q.isCorrect);
    const correctQuestions = questions.filter(q => q.isCorrect);
    
    // Update weak topics (subjects where user frequently makes mistakes)
    if (incorrectQuestions.length > 0) {
      subjectProgress.weakTopics = [...new Set([
        ...subjectProgress.weakTopics,
        ...incorrectQuestions.map(q => q.topic || subject)
      ])];
    }

    // Update strong topics (subjects where user performs well)
    if (correctQuestions.length > 0) {
      subjectProgress.strongTopics = [...new Set([
        ...subjectProgress.strongTopics,
        ...correctQuestions.map(q => q.topic || subject)
      ])];
    }
  }

  // Update overall progress
  this.totalQuizzes += 1;
  this.averageScore = 
    (this.averageScore * (this.totalQuizzes - 1) + score) / 
    this.totalQuizzes;
  this.lastActive = new Date();

  await this.save();
};

export const UserProgress = mongoose.models.UserProgress || 
  mongoose.model('UserProgress', UserProgressSchema); 