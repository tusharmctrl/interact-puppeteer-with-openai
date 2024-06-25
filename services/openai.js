import { redact_messages } from "../utils/helpers.js";
import axios from "axios";

export async function fetchOpenAIResponse({
  messages,
  definitions = [],
  function_call = "auto",
  json_response = false
}) {
  try {
    const MODEL = "gpt-4o";
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const API_URL = "https://api.openai.com/v1/chat/completions";

    const response = await axios.post(
      API_URL,
      {
        model: MODEL,
        ...(json_response ? { response_format: { type: "json_object" } } : {}),
        messages: redact_messages(messages),
        ...(definitions.length > 0
          ? { function_call: function_call, functions: definitions }
          : {}),
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
