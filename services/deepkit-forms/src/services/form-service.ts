import pool from './database';
import { Form, Question, Response, CreateFormRequest, CreateQuestionRequest, SubmitResponseRequest } from '../types';

export const createForm = async (request: CreateFormRequest): Promise<Form> => {
  const result = await pool.query(
    'INSERT INTO forms (title, description, settings) VALUES ($1, $2, $3) RETURNING *',
    [request.title, request.description || null, request.settings || {}]
  );
  return result.rows[0];
};

export const getAllForms = async (): Promise<Form[]> => {
  const result = await pool.query('SELECT * FROM forms ORDER BY created_at DESC');
  return result.rows;
};

export const getFormById = async (id: number): Promise<Form | null> => {
  const result = await pool.query('SELECT * FROM forms WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const addQuestion = async (formId: number, request: CreateQuestionRequest): Promise<Question> => {
  const result = await pool.query(
    `INSERT INTO questions (form_id, type, question_text, options, validation, position, logic)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [formId, request.type, request.questionText, request.options || null, request.validation || null, request.position, request.logic || null]
  );
  return result.rows[0];
};

export const getFormQuestions = async (formId: number): Promise<Question[]> => {
  const result = await pool.query(
    'SELECT * FROM questions WHERE form_id = $1 ORDER BY position',
    [formId]
  );
  return result.rows;
};

export const submitResponse = async (formId: number, request: SubmitResponseRequest): Promise<Response> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const responseResult = await client.query(
      'INSERT INTO responses (form_id, respondent_id) VALUES ($1, $2) RETURNING *',
      [formId, request.respondentId || null]
    );
    const response = responseResult.rows[0];

    for (const answer of request.answers) {
      await client.query(
        'INSERT INTO answers (response_id, question_id, answer_data, behavior_data) VALUES ($1, $2, $3, $4)',
        [response.id, answer.questionId, answer.answerData, answer.behaviorData || null]
      );
    }

    // Calculate traits (simplified - just average slider values)
    const traits: any = {};
    const sliderAnswers = request.answers.filter(a => a.answerData && typeof a.answerData.value === 'number');
    if (sliderAnswers.length > 0) {
      const avg = sliderAnswers.reduce((sum, a) => sum + a.answerData.value, 0) / sliderAnswers.length;
      traits.engagement = Math.round(avg);
    }

    await client.query(
      'UPDATE responses SET completed_at = NOW(), traits = $1 WHERE id = $2',
      [traits, response.id]
    );

    await client.query('COMMIT');

    const finalResult = await pool.query('SELECT * FROM responses WHERE id = $1', [response.id]);
    return finalResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getFormResponses = async (formId: number): Promise<Response[]> => {
  const result = await pool.query(
    'SELECT * FROM responses WHERE form_id = $1 ORDER BY started_at DESC',
    [formId]
  );
  return result.rows;
};
