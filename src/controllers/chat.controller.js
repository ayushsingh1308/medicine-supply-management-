const { z } = require('zod');
const chatbot = require('../services/chatbot.service');
const asyncHandler = require('../utils/asyncHandler');

exports.schema = z.object({
  message: z.string().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(20)
    .optional(),
});

exports.chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  res.json(await chatbot.chat(message, history));
});
