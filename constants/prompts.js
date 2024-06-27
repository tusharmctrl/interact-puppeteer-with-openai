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

export const REGISTER_HEURISTIC_PROMPT = `You have all the necessary screenshots and page content as well. Try to identify these heuristics I have given here. I want you to perform following heuristics and you have to answer them in such an array. 
[{title: sring, observation: string, result: "passed/failed/couldnt'determine", suggestions: string}]
You have to verify all the below questions through screenshots and need to give us the JSON object with response field which contains response of yours based on that. It should be strictly an array. Title should be same as the one I am providing below, and observations should be very descriptive. Suggestions must be added to give ideas about how we can enhance the user accessibility in the platform.

- Ensure the registration Call to Action (CTA) is prominently displayed and easily accessible on all pages of the website for non-logged-in users. This CTA should be consistently visible in a fixed location, such as the header or sidebar, to guide new visitors towards account creation effortlessly.

- Ensure the registration area opens in the same tab or window, providing a seamless user experience without redirecting users to a new tab, window, or modal/popup. This maintains continuity and reduces potential confusion during the registration process."

- Ensure the registration page content is straightforward and easy to understand. Instructions and required actions should be immediately clear at first glance, enabling users to effortlessly complete the registration process."

- Ensure that the registration process to maintain user control and awareness. Specifically, for multi-step registrations, include clear visual indicators that show users their current step, the total number of steps, and which steps are remaining. This ensures users understand their progress and what to expect next, enhancing their overall experience."

- Ensure that the registration process includes easily accessible live help options. Does it Integrate features like live chat or instant customer support access, ensuring users can get immediate assistance at any point during the registration."

- Review the registration form to confirm it is simple and user-friendly. Ensure that there are no unnecessary fields, incoherent groupings, or illogical orderings, providing a streamlined registration experience for users.

- Review the registration form to confirm that all fields include appropriate hints, guidelines, or examples to demonstrate the expected input. This helps users understand exactly what information is required, enhancing the overall registration experience.

- Review the registration form to ensure that all fields contain appropriate hints, guidelines, or examples to demonstrate the expected input. This helps users understand what information is required and how to provide it correctly, enhancing the overall registration experience."

- Review the registration form to ensure that fields are designed appropriately. It uses pull-down menus, radio buttons, and checkboxes in preference to text entry fields where applicable. This simplifies data entry and improves the user experience."

- Review the registration form to ensure there is a clear distinction between 'required' and 'optional' fields. This helps users understand which information is mandatory and which is optional, improving the overall registration experience."

- Review the registration form to ensure that all text boxes are appropriately sized for the expected input. For example, the age text box should be short, while the name text box should have a suitable width to accommodate longer entries."

- Ensure that data formats are clearly indicated for input (e.g., dates) and output (e.g., units of values) in the registration form. Use appropriate fields and labels, such as date pickers for dates and numerical input fields for numbers, to enhance user understanding and input accuracy."

- Ensure that users can complete simple tasks by entering only essential information, with the system automatically providing non-essential information by default. This simplifies the user experience and streamlines the completion of tasks."

- Ensure there is a clearly visible password strength indicator that includes expected security parameters, such as the use of different symbols. This helps users create strong and secure passwords

- Make sure the website shows clear error messages when fields are filled out incorrectly or incompletely. This helps users fix their mistakes quickly."`;

// [{
//   name: "goto_url",
//   description: "Goes to a specific URL and gets the content",
//   parameters: {
//     type: "object",
//     properties: {
//       url: {
//         type: "string",
//         description: "The URL to go to (including protocol)",
//       },
//     },
//   },
//   required: ["url"],
// },

// {
//   name: "answer_user",
//   description:
//     "Give an answer to the user and end the navigation. Use when the given task has been completed. Summarize the relevant parts of the page content first and give an answer to the user based on that.",
//   parameters: {
//     type: "object",
//     properties: {
//       summary: {
//         type: "string",
//         description:
//           "A summary of the relevant parts of the page content that you base the answer on",
//       },
//       answer: {
//         type: "string",
//         description: "The response to the user",
//       },
//     },
//   },
//   required: ["summary", "answer"],
// },

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
// }]
