export const subjects = [
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

export const chatConfig = {
  maxMessageLength: 1000,
  maxConversationLength: 50,
  defaultSubject: 'General',
  modelEndpoint: 'http://localhost:11434/api/generate',
  modelName: 'mistral'
}; 