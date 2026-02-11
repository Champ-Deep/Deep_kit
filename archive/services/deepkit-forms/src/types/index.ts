export type QuestionType = 'text' | 'multiple_choice' | 'slider' | 'grid_2d';

export interface Form {
  id: number;
  title: string;
  description: string | null;
  settings: any; // JSONB - trait formulas, persona definitions
  created_at: Date;
  updated_at: Date;
}

export interface Question {
  id: number;
  form_id: number;
  type: QuestionType;
  question_text: string;
  options: any | null; // JSONB
  validation: any | null; // JSONB
  position: number;
  logic: any | null; // JSONB - skip logic
}

export interface Response {
  id: number;
  form_id: number;
  respondent_id: string | null;
  started_at: Date;
  completed_at: Date | null;
  traits: any | null; // JSONB - calculated trait scores
  persona: string | null;
  recommendations: any | null; // JSONB
}

export interface Answer {
  id: number;
  response_id: number;
  question_id: number;
  answer_data: any; // JSONB - text, selection, coordinates, slider values
  behavior_data: any | null; // JSONB - dwell_time, interaction data
}

export interface CreateFormRequest {
  title: string;
  description?: string;
  settings?: any;
}

export interface CreateQuestionRequest {
  type: QuestionType;
  questionText: string;
  options?: any;
  validation?: any;
  position: number;
  logic?: any;
}

export interface SubmitResponseRequest {
  respondentId?: string;
  answers: {
    questionId: number;
    answerData: any;
    behaviorData?: any;
  }[];
}
