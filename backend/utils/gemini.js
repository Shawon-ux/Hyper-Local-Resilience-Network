const Groq = require('groq-sdk');

let groq = null;

if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '') {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

const AGENT_TAXONOMY = [
  'Medical',
  'Mechanical',
  'Delivery',
  'Technical',
  'Cleaning',
  'Construction',
  'Transportation',
  'Food',
  'Childcare',
  'Pet Care',
  'First Aid',
  'Automotive',
  'Energy',
  'Communication',
  'Logistics',
];

const parseAnalysisResponse = (output) => {
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { intent: '', skills: [] };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const skills = Array.isArray(parsed.skills)
      ? parsed.skills.map((skill) => skill.toString().trim()).filter(Boolean)
      : [];

    return {
      intent: parsed.intent ? parsed.intent.toString().trim() : '',
      skills,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error.message || error);
    return { intent: '', skills: [] };
  }
};

const analyzeTaskDescription = async (taskDescription) => {
  if (!groq) {
    console.warn('GROQ_API_KEY is missing. Returning fallback response.');
    return { intent: '', skills: [] };
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are an extraction assistant for a hyperlocal resilience network. Your only output must be valid JSON matching the schema: {"intent": string, "skills": string[]}. Do not output markdown, explanations, or additional fields.\n\nTaxonomy: Medical, Mechanical, Delivery, Technical, Cleaning, Construction, Transportation, Food, Childcare, Pet Care, First Aid, Automotive, Energy, Communication, Logistics.\n\nIf more than one relevant skill applies, include all that match. If none match, return an empty skills array. Example output: {"intent": "jump start car", "skills": ["Mechanical", "Automotive"]}.'
        },
        {
          role: 'user',
          content: taskDescription,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
    });

    const response = completion.choices?.[0]?.message?.content || '';
    return parseAnalysisResponse(response);
  } catch (error) {
    console.error('Groq API error:', error.message || error);
    return { intent: '', skills: [] };
  }
};

const getSkillSuggestions = async (taskDescription) => {
  const analysis = await analyzeTaskDescription(taskDescription);
  return analysis.skills;
};

module.exports = { getSkillSuggestions, analyzeTaskDescription, AGENT_TAXONOMY };