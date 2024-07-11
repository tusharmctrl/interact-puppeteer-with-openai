import { redact_messages } from "../utils/helpers.js";
import axios from "axios";

export async function fetchOpenAIResponse({
  messages,
  definitions = [],
  temperature,
  function_call = "auto",
  json_response = false,
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
        // ...(temperature ? { temperature } : {}),
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
    console.log(e.response);
    throw e;
  }
}

export const generalOpenAIResponse = async (message) => {
  const msgArray = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: message,
        },
        // {
        //   type: "image_url",
        //   image_url: {
        //     url: `data:image/png;base64, ${imageBase64}`,
        //   },
        // },
      ],
    },
  ];
  try {
    const MODEL = "gpt-4o";
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const API_URL = "https://api.openai.com/v1/chat/completions";
    const response = await axios.post(
      API_URL,
      {
        model: MODEL,
        response_format: { type: "json_object" },
        messages: msgArray,
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
    console.log(e.response.data);
    throw e;
  }
};
