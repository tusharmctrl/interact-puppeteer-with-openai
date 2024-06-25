export const SYSTEM_PROMPT = {
  role: "system",
  content: `
## OBJECTIVE ##
You have been tasked with crawling the internet based on a task given by the user. You are connected to a web browser which you can control via function calls to navigate to pages and list elements on the page. You can also type into search boxes and other input fields and send forms. You can also click links on the page. You will behave as a human browsing the web.

## NOTES ##
You will try to navigate directly to the most relevant web address. If you were given a URL, go to it directly. If you encounter a Page Not Found error, try another URL. If multiple URLs don't work, you are probably using an outdated version of the URL scheme of that website. In that case, try navigating to their front page and using their search bar or try navigating to the right place with links.

## WHEN TASK IS FINISHED ##
When you have executed all the operations needed for the original task, call answer_user to give a response to the user.`.trim(),
};

export const functionDefinitions = [
  {
    name: "goto_url",
    description: "Goes to a specific URL and gets the content",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to go to (including protocol)",
        },
      },
    },
    required: ["url"],
  },
  {
    name: "click_link",
    description:
      "Clicks a link with the given pgpt_id on the page. Note that pgpt_id is required and you must use the corresponding pgpt-id attribute from the page content. Add the text of the link to confirm that you are clicking the right link.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text on the link you want to click",
        },
        pgpt_id: {
          type: "number",
          description:
            "The pgpt-id of the link to click (from the page content)",
        },
      },
    },
    required: ["reason", "pgpt_id"],
  },
  // {
  //   name: "type_text",
  //   description: "Types text to input fields and optionally submit the form",
  //   parameters: {
  //     type: "object",
  //     properties: {
  //       form_data: {
  //         type: "array",
  //         items: {
  //           type: "object",
  //           properties: {},
  //         },
  //       },
  //     },
  //   },
  //   required: ["form_data"],
  // },
  {
    name: "fill_form",
    description:
      "Fills the text to input fields and optionally submit the form",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The URL to go to (including protocol) of the form page we're about to scrap.",
        },
      },
    },
    required: ["url"],
  },
  {
    name: "answer_user",
    description:
      "Give an answer to the user and end the navigation. Use when the given task has been completed. Summarize the relevant parts of the page content first and give an answer to the user based on that.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description:
            "A summary of the relevant parts of the page content that you base the answer on",
        },
        answer: {
          type: "string",
          description: "The response to the user",
        },
      },
    },
    required: ["summary", "answer"],
  },
  {
    name: "capture_screenshot",
    description:
      "Capture a screenshot of the given URL and provide the user with the screenshot path or any additional information they requested.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL of the webpage to capture the screenshot from.",
        },
        response: {
          type: "string",
          description:
            "The response to the user, possibly including the location of the screenshot and any additional requested information.",
        },
      },
      required: ["url", "response"],
    },
  },
];
