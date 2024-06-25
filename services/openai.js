import { redact_messages } from "../utils/helpers.js";
import axios from "axios";

export async function fetchOpenAIResponse(
  messages,
  definitions,
  function_call = "auto"
) {
  try {
    const MODEL = "gpt-4o";
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const API_URL = "https://api.openai.com/v1/chat/completions";

    const response = await axios.post(
      API_URL,
      {
        model: MODEL,
        messages: redact_messages(messages),
        functions: definitions,
        function_call: function_call,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
      }
    );
    return response.data;
  } catch (e) {
    console.error("Error occurred while fetching OpenAI response:", e);
    throw e;
  }
}
