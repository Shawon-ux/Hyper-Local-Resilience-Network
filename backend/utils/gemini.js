const Groq = require('groq-sdk');

let groq = null;

if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '') {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

const getSkillSuggestions = async (taskDescription) => {
  if (!groq) {
    console.warn('GROQ_API_KEY is missing. Returning fallback empty skill suggestions.');
    return [];
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are a skill matching assistant. Analyze the micro-task and suggest 3-5 relevant skills from: plumbing, first-aid, electrician, driver, cooking, cleaning, gardening, carpentry, pet care, technology support, tutoring, moving help, sewing. Return only a JSON array of skill names.'
        },
        {
          role: 'user',
          content: taskDescription
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
    });

    const response = completion.choices?.[0]?.message?.content || '';
    const jsonMatch = response.match(/\[.*\]/s);

    if (jsonMatch) {
      console.log(`Skill suggestions: ${jsonMatch[0]}`);
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    console.error('Groq API error:', error.message || error);
    return [];
  }
};

module.exports = { getSkillSuggestions };